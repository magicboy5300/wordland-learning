// Shared between Express and the hosted Worker. No secrets or storage dependencies.
export function shuffledQuestion(question, seed = '') {
  if (!question) return null;
  let state = 2166136261;
  for (const char of `${seed}:${question.id}`) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
  const options = [...question.options];
  for (let i = options.length - 1; i > 0; i--) {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    const j = (state >>> 0) % (i + 1);
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { ...question, options };
}

export function targetEvidence(lessons, rows, practiceRows = []) {
  const first = new Map();
  for (const row of rows) {
    const key = `${row.attempt_id || row.session_id}:${row.question_id}`;
    if (!first.has(key)) first.set(key, row);
  }
  const evidence = [...first.values()];
  return lessons.flatMap((lesson) => lesson.questions.map((question) => {
    const matching = evidence.filter((row) => row.lesson_id === lesson.id && (row.question_id === question.id || (row.skill_id && row.skill_id === question.skillId)));
    const independent = matching.filter((row) => row.correct && !row.hinted);
    const review = independent.filter((row) => row.kind === 'review');
    return { id: question.skillId || question.id, lessonId: lesson.id, label: question.skillLabel || question.prompt, status: review.length ? 'reviewed' : independent.length ? 'independent' : matching.length ? 'practiced' : 'unseen', independentCount: independent.length, lastAt: matching.map((row) => row.created_at).sort().at(-1) || null };
  })).concat(practiceRows.map((row) => ({ id: `activity:${row.lesson_id}:${row.activity_id}`, lessonId: row.lesson_id, label: row.activity_title, status: JSON.parse(row.content_json).status==='draft' ? 'draft' : row.checked_by === 'parent' ? 'parent-checked' : 'self-recorded', independentCount: 0, lastAt: row.updated_at })));
}

export function scheduledReview(items, completedLessons, sessions, getLesson, timestamp = Date.now()) {
  const byLesson = new Map();
  for (const session of sessions.filter((row) => row.status === 'completed')) {
    for (const id of new Set(JSON.parse(session.questions_json).map((q) => q.lessonId))) {
      const rows = byLesson.get(id) || []; rows.push(session); byLesson.set(id, rows);
    }
  }
  for (const completion of completedLessons) {
    const id = completion.lesson_id;
    if (!items.some((item) => item.lessonId === id)) items.push({ lessonId: id, lesson: getLesson(id), consolidated: true, mistakeCount: 0, hintCount: 0, lastAt: completion.completed_at, lastReviewedAt: null });
  }
  const intervals = [1, 3, 7, 14, 30];
  return items.map((item) => {
    const rounds = (byLesson.get(item.lessonId) || []).sort((a, b) => b.completed_at.localeCompare(a.completed_at));
    const last = rounds[0]?.completed_at || item.lastAt;
    const days = intervals[Math.min(Math.max(rounds.length - 1, 0), intervals.length - 1)];
    const nextReviewAt = last ? new Date(Date.parse(last) + days * 86400000).toISOString() : null;
    return { ...item, rounds: rounds.length, nextReviewAt, due: !!nextReviewAt && Date.parse(nextReviewAt) <= timestamp, intervalDays: days };
  });
}

export function selectReviewQuestions(bank, selected, sessions) {
  return selected.flatMap((id) => {
    const rounds = sessions.filter((session) => session.status === 'completed' && JSON.parse(session.questions_json).some((q) => q.lessonId === id)).length;
    const pool = bank[id]; const start = (rounds * 2) % pool.length;
    return Array.from({length:Math.min(2,pool.length)},(_,index)=>pool[(start+index)%pool.length]);
  });
}
