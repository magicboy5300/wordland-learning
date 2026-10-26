import {reviewSelection,scopeReviewQueue,firstReviewLessons} from './review-selection.js';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getLesson, publicLesson, publicQuestion } from './lessons.js';
import { reviewBank } from './review-bank.js';
import { scheduledReview, selectReviewQuestions } from './learning-evidence.js';

const now = () => new Date().toISOString();
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
export function createReviewService({ store, identity, pointMap }) {
  function needs(owner) {
    const evidence = store.all(`SELECT r.id,a.lesson_id,r.correct,r.hinted,r.created_at FROM responses r
      JOIN attempts a ON a.id=r.attempt_id WHERE a.owner=? AND (r.correct=0 OR r.hinted=1)`, [owner]);
    const reviewEvidence = store.all(`SELECT r.id,r.lesson_id,r.correct,r.hinted,r.created_at FROM review_responses r
      JOIN review_sessions s ON s.id=r.session_id WHERE s.owner=? AND (r.correct=0 OR r.hinted=1)`, [owner]);
    const grouped = new Map();
    for (const item of [...evidence, ...reviewEvidence]) {
      if (!reviewBank[item.lesson_id]) continue;
      const group = grouped.get(item.lesson_id) || [];
      group.push(item); grouped.set(item.lesson_id, group);
    }
    return [...grouped.entries()].map(([lessonId, items]) => ({
      lessonId, mistakeCount: items.filter((item) => !item.correct).length,
      hintCount: items.filter((item) => item.hinted).length,
      lastAt: items.map((item) => item.created_at).sort().at(-1),
      // A fingerprint of all difficulty evidence avoids millisecond timestamp ties.
      needVersion: createHash('sha256').update(items.map((item) => item.id).sort().join('|')).digest('hex'),
    }));
  }
  function queue(owner,selection={}) {
    const marks = new Map(store.all('SELECT * FROM review_marks WHERE owner=?', [owner]).map((mark) => [mark.lesson_id, mark]));
    const items = needs(owner).map((need) => ({
      ...need, lesson: publicLesson(getLesson(need.lessonId)),
      consolidated: marks.get(need.lessonId)?.need_version === need.needVersion,
      lastReviewedAt: marks.get(need.lessonId)?.last_reviewed_at || null,
    }));
    for (const [lessonId, mark] of marks) {
      if (!items.some((item) => item.lessonId === lessonId) && reviewBank[lessonId]) items.push({
        lessonId, lesson: publicLesson(getLesson(lessonId)), mistakeCount: 0, hintCount: 0,
        lastAt: mark.last_reviewed_at, needVersion: mark.need_version,
        consolidated: mark.need_version === 'no-difficulty-evidence', lastReviewedAt: mark.last_reviewed_at,
      });
    }
    items.sort((a, b) => a.lesson.order - b.lesson.order);
    const completedIds = store.all('SELECT DISTINCT lesson_id FROM attempts WHERE owner=? AND status=?', [owner, 'completed']).map((row) => row.lesson_id);
    const available = [...new Set([...completedIds, ...items.map((item) => item.lessonId)])].filter((id) => reviewBank[id]);
    const ongoing = store.get('SELECT id,step,updated_at FROM review_sessions WHERE owner=? AND status=? ORDER BY updated_at DESC LIMIT 1', [owner, 'in_progress']) || null;
    const sessions = store.all('SELECT * FROM review_sessions WHERE owner=?',[owner]);
    const scheduled = scheduledReview(items, store.all('SELECT lesson_id,MAX(completed_at) AS completed_at FROM attempts WHERE owner=? AND status=? GROUP BY lesson_id',[owner,'completed']), sessions, (id)=>publicLesson(getLesson(id)));
    return scopeReviewQueue({ items: scheduled, dueCount: scheduled.filter((item)=>item.due).length, pendingCount: items.filter((item) => !item.consolidated).length, availableLessons: available.map((id) => publicLesson(getLesson(id))), ongoing },sessions,selection,getLesson);
  }
  function find(req, res, id) {
    const { owner } = identity(req, res);
    const session = store.get('SELECT * FROM review_sessions WHERE id=? AND owner=?', [id, owner]);
    if (!session) fail(404, '没有找到这段复习，请返回小花园重新进入');
    return session;
  }
  function lessonFor(session) {
    const questions = JSON.parse(session.questions_json);
    const originals = [...new Set(questions.map((question) => question.lessonId))].map(getLesson);
    return {
      id: 'review', title: '把小小发现，记得更牢', subtitle: originals.map((lesson) => lesson.subtitle).join(' · '),
      category: '复习小花园', semester: [...new Set(originals.map((lesson) => lesson.semester))].join(' / '),
      scene: 'flower', minutes: 5, color: 'green', grade: originals[0]?.grade || 1, order: 0, version: 1, reward: 0,
      knowledgeIds: [...new Set(originals.flatMap((lesson) => lesson.knowledgeIds))], questionCount: questions.length,
      story: '小书狐把熟悉的知识藏进了新的故事。慢慢读、仔细想，看看换一个情境，你还能不能找到线索。',
      intro: '把学过的方法用在新故事里。需要帮助时随时看提示，每一次尝试都会留下成长的足迹。',
    };
  }
  function view(session) {
    const questions = JSON.parse(session.questions_json);
    const lesson = lessonFor(session);
    const current = questions[session.step];
    const rows = store.all('SELECT * FROM review_responses WHERE session_id=? ORDER BY rowid', [session.id]);
    return {
      id: session.id, lesson_id: 'review', content_version: 1, kind: 'review', step: session.step, status: session.status,
      active_ms: session.active_ms, started_at: session.started_at, updated_at: session.updated_at, completed_at: session.completed_at,
      lesson, question: current ? publicQuestion(current, session.id) : null,
      currentHint: current && store.get('SELECT 1 FROM review_hints WHERE session_id=? AND question_id=?', [session.id, current.id]) ? current.hint : null,
      results: rows.map(({ answer_json, ...row }) => ({ ...row, answer: JSON.parse(answer_json) })),
      sources: lesson.knowledgeIds.map((id) => pointMap.get(id)).filter(Boolean),
    };
  }
  function stats(owner) {
    const sessions = store.all('SELECT * FROM review_sessions WHERE owner=?', [owner]);
    const independent = store.get(`SELECT COUNT(*) AS count FROM review_responses r JOIN review_sessions s ON s.id=r.session_id
      WHERE s.owner=? AND r.correct=1 AND r.hinted=0 AND NOT EXISTS (SELECT 1 FROM review_responses p
      WHERE p.session_id=r.session_id AND p.question_id=r.question_id AND p.rowid<r.rowid)`, [owner]).count;
    return { completed: sessions.filter((session) => session.status === 'completed').length, activeMs: sessions.reduce((total, session) => total + session.active_ms, 0), independent };
  }
  function moveGuest(oldOwner, newOwner) {
    store.run('UPDATE review_sessions SET owner=? WHERE owner=?', [newOwner, oldOwner]);
    store.run('INSERT OR IGNORE INTO review_marks (owner,lesson_id,need_version,last_reviewed_at) SELECT ?,lesson_id,need_version,last_reviewed_at FROM review_marks WHERE owner=?', [newOwner, oldOwner]);
    store.run('DELETE FROM review_marks WHERE owner=?', [oldOwner]);
  }
  function history(owner) {
    return store.all('SELECT * FROM review_sessions WHERE owner=?', [owner]).map((session) => {
      const { question, results, sources, ...item } = view(session);
      return { ...item, answers: results.length };
    });
  }
  function registerRoutes(app, route) {
    app.get('/api/review', route((req, res) => res.json(queue(identity(req, res).owner,reviewSelection.parse(req.query)))));
    app.post('/api/review/start', route((req, res) => {
      const { lessonId, ...selection } = reviewSelection.extend({ lessonId: z.string().max(100).optional() }).parse(req.body);
      const { owner } = identity(req, res);
      const state = queue(owner,selection);
      let selected;
      if (lessonId) {
        if (!state.availableLessons.some((lesson) => lesson.id === lessonId)) fail(400, '请先学习这段故事，再来复习');
        selected = [lessonId];
      } else {
        const pending = state.items.filter((item) => !item.consolidated || item.due).map((item) => item.lessonId);
        selected = firstReviewLessons(pending,state.availableLessons,getLesson);
      }
      if (!selected.length) fail(409, '先去冒险地图发现一个故事，再来小花园复习吧');
      const sessions = store.all('SELECT * FROM review_sessions WHERE owner=? ORDER BY updated_at DESC',[owner]);
      const existing = sessions.find((session)=>session.status==='in_progress' && [...new Set(JSON.parse(session.questions_json).map((q)=>q.lessonId))].sort().join(',') === [...selected].sort().join(','));
      if (existing) return res.json(view(existing));
      const questions = selectReviewQuestions(reviewBank, selected, sessions);
      const id = randomUUID();
      store.transaction(() => store.run('INSERT INTO review_sessions (id,owner,questions_json,started_at,updated_at) VALUES (?,?,?,?,?)', [id, owner, JSON.stringify(questions), now(), now()]));
      res.json(view(store.get('SELECT * FROM review_sessions WHERE id=?', [id])));
    }));
    app.get('/api/review/sessions/:id', route((req, res) => res.json(view(find(req, res, req.params.id)))));
    app.post('/api/review/sessions/:id/hint', route((req, res) => {
      const session = find(req, res, req.params.id);
      const { questionId } = z.object({ questionId: z.string() }).parse(req.body);
      const question = JSON.parse(session.questions_json)[session.step];
      if (!question || question.id !== questionId) fail(409, '复习进度已变化，请重新打开');
      store.transaction(() => store.run('INSERT OR IGNORE INTO review_hints VALUES (?,?)', [session.id, questionId]));
      res.json({ hint: question.hint });
    }));
    app.post('/api/review/sessions/:id/answer', route((req, res) => {
      const session = find(req, res, req.params.id);
      const data = z.object({ submissionId: z.string().uuid(), questionId: z.string().max(100), answer: z.union([z.string().max(500),z.array(z.string().max(500)).max(12)]), activeMs: z.number().int().min(0).max(120000).default(0) }).parse(req.body);
      const existing = store.get('SELECT * FROM review_responses WHERE id=?', [data.submissionId]);
      if (existing) {
        if (existing.session_id !== session.id || existing.question_id !== data.questionId || existing.answer_json !== JSON.stringify(data.answer)) fail(409, '提交标识已使用，请刷新进度');
        return res.json({ correct: !!existing.correct, explanation: existing.explanation, attempt: view(session) });
      }
      const questions = JSON.parse(session.questions_json);
      const question = questions[session.step];
      if (!question || question.id !== data.questionId) fail(409, '复习进度已在其他页面更新，请重新打开');
      const correct = JSON.stringify(question.answer) === JSON.stringify(data.answer);
      const hinted = !!store.get('SELECT 1 FROM review_hints WHERE session_id=? AND question_id=?', [session.id, question.id]);
      const step = session.step + Number(correct);
      const completed = step === questions.length;
      store.transaction(() => {
        store.run('INSERT INTO review_responses VALUES (?,?,?,?,?,?,?,?,?,?)', [data.submissionId, session.id, question.lessonId, question.id, question.prompt, JSON.stringify(data.answer), Number(correct), Number(hinted), question.explanation, now()]);
        store.run('UPDATE review_sessions SET step=?,status=?,active_ms=active_ms+?,updated_at=?,completed_at=? WHERE id=?', [step, completed ? 'completed' : 'in_progress', data.activeMs, now(), completed ? now() : null, session.id]);
        if (completed) {
          const results = store.all('SELECT * FROM review_responses WHERE session_id=? ORDER BY rowid', [session.id]);
          const currentNeeds = new Map(needs(session.owner).map((need) => [need.lessonId, need.needVersion]));
          for (const lessonId of new Set(questions.map((q) => q.lessonId))) {
            const independent = questions.filter((q) => q.lessonId === lessonId).every((q) => {
              const first = results.find((result) => result.question_id === q.id);
              return first && first.correct && !first.hinted;
            });
            if (independent) store.run('INSERT INTO review_marks VALUES (?,?,?,?) ON CONFLICT(owner,lesson_id) DO UPDATE SET need_version=excluded.need_version,last_reviewed_at=excluded.last_reviewed_at', [session.owner, lessonId, currentNeeds.get(lessonId) || 'no-difficulty-evidence', now()]);
          }
        }
      });
      res.json({ correct, explanation: question.explanation, attempt: view(store.get('SELECT * FROM review_sessions WHERE id=?', [session.id])) });
    }));
  }
  return { queue, stats, moveGuest, history, registerRoutes, skillFor: (id, questionId) => JSON.parse(store.get('SELECT questions_json FROM review_sessions WHERE id=?',[id]).questions_json).find((q)=>q.id===questionId)?.skillId || questionId };
}
