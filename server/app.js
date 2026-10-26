import express from 'express';
import rateLimit from 'express-rate-limit';
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { openDatabase } from './database.js';
import { lessons, characterLessons, characterTerms, gradeCatalog, getLesson, publicLesson, publicQuestion } from './lessons.js';
import { createReviewService } from './reviews.js';
import { targetEvidence } from './learning-evidence.js';
import { practiceInput, validatePractice, publicPractice } from './practice.js';

const scrypt = promisify(scryptCallback);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataset = JSON.parse(fs.readFileSync(path.join(root, 'data/primary-knowledge.json'), 'utf8'));
const pointMap = new Map(dataset.knowledge_points.map((point) => [point.id, point]));
const hash = (value) => createHash('sha256').update(value).digest('hex');
const now = () => new Date().toISOString();
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const email = z.string().trim().toLowerCase().email('请填写有效的邮箱地址').max(254);
const password = z.string().min(8, '密码至少需要 8 位').max(128, '密码最长 128 位');
const registration = z.object({ email, password, nickname: z.string().trim().min(1).max(16).default('小侦探'), importGuest: z.boolean().default(true) });
const login = z.object({ email, password: z.string().min(1).max(128), importGuest: z.boolean().default(false) });
const profile = z.object({ nickname: z.string().trim().min(1).max(16), grade: z.number().int().min(1).max(6), semester: z.enum(['上册', '下册']) });

async function passwordHash(value) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(value, salt, 64);
  return `scrypt:${salt}:${Buffer.from(key).toString('hex')}`;
}
async function passwordMatches(value, stored) {
  const [, salt, digest] = stored.split(':');
  const actual = Buffer.from(await scrypt(value, salt, 64));
  const expected = Buffer.from(digest, 'hex');
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}
function readCookie(req, name) {
  return req.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}
const safeUser = (user) => user ? ({ id: user.id, email: user.email, nickname: user.nickname, grade: user.grade, semester: user.semester }) : null;

export async function createApp({ databasePath = path.join(root, '.runtime/wordland.sqlite'), secureCookies = process.env.SECURE_COOKIES === 'true' } = {}) {
  const store = await openDatabase(databasePath);
  const app = express();
  const allowedOrigins = new Set((process.env.APP_ORIGINS || 'http://localhost:5178,http://127.0.0.1:5178').split(',').map((origin) => origin.trim()));
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (req.get('X-Wordland-Request') !== '1') return res.status(403).json({ error: '请求校验失败，请刷新页面重试' });
      if (req.get('origin') && req.get('origin') !== `${req.protocol}://${req.get('host')}` && !allowedOrigins.has(req.get('origin'))) return res.status(403).json({ error: '不允许跨站提交' });
    }
    next();
  });
  const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: secureCookies, path: '/' };
  function identity(req, res) {
    const token = readCookie(req, 'wordland_session');
    const session = token && store.get('SELECT users.* FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND expires_at>?', [hash(token), Date.now()]);
    if (session) return { owner: `user:${session.id}`, user: session };
    let guest = readCookie(req, 'wordland_guest');
    if (!guest || !/^[a-f0-9]{48}$/.test(guest)) {
      guest = randomBytes(24).toString('hex');
      res.cookie('wordland_guest', guest, { ...cookieOptions, maxAge: 365 * 86400000 });
    }
    return { owner: `guest:${hash(guest)}`, user: null };
  }
  function openSession(res, userId) {
    const token = randomBytes(32).toString('hex');
    store.run('DELETE FROM sessions WHERE expires_at<?', [Date.now()]);
    store.run('INSERT INTO sessions VALUES (?,?,?)', [hash(token), userId, Date.now() + 30 * 86400000]);
    res.cookie('wordland_session', token, { ...cookieOptions, maxAge: 30 * 86400000 });
  }
  function moveGuest(req, userId) {
    const guest = readCookie(req, 'wordland_guest');
    if (guest && /^[a-f0-9]{48}$/.test(guest)) {
      const oldOwner = `guest:${hash(guest)}`, newOwner = `user:${userId}`;
      store.run('UPDATE attempts SET owner=? WHERE owner=?', [newOwner, oldOwner]);
      reviews.moveGuest(oldOwner, newOwner);
      store.run('INSERT OR IGNORE INTO practice_records SELECT ?,lesson_id,activity_id,activity_title,content_json,checked_by,updated_at FROM practice_records WHERE owner=?', [newOwner,oldOwner]);
      store.run('DELETE FROM practice_records WHERE owner=?',[oldOwner]);
      const oldRoom = store.get('SELECT * FROM room_preferences WHERE owner=?', [oldOwner]);
      if (oldRoom) {
        const existing = room(newOwner);
        const placed = [...new Set([...existing.placed, ...JSON.parse(oldRoom.placed_json)])];
        store.run('INSERT INTO room_preferences VALUES (?,?,?,?) ON CONFLICT(owner) DO UPDATE SET placed_json=excluded.placed_json,revision=excluded.revision,updated_at=excluded.updated_at', [newOwner, JSON.stringify(placed), existing.revision + 1, now()]);
        store.run('DELETE FROM room_preferences WHERE owner=?', [oldOwner]);
      }
    }
  }
  const reviews = createReviewService({ store, identity, pointMap });
  function room(owner) {
    const record = store.get('SELECT * FROM room_preferences WHERE owner=?', [owner]);
    return { placed: record ? JSON.parse(record.placed_json) : [], revision: record?.revision || 0, updatedAt: record?.updated_at || null };
  }
  function summary(owner) {
    const attempts = store.all('SELECT * FROM attempts WHERE owner=? ORDER BY updated_at DESC', [owner]);
    const completed = [...new Set(attempts.filter((attempt) => attempt.status === 'completed').map((attempt) => attempt.lesson_id))];
    const latestCompleted = [...new Set(attempts.filter((attempt) => attempt.status === 'completed' && attempt.content_version === getLesson(attempt.lesson_id)?.version).map((attempt) => attempt.lesson_id))];
    const practiceRows = store.all('SELECT * FROM practice_records WHERE owner=?',[owner]);
    const evidence = store.all('SELECT r.*,a.lesson_id FROM responses r JOIN attempts a ON a.id=r.attempt_id WHERE a.owner=? ORDER BY r.rowid',[owner]);
    const reviewEvidence = store.all('SELECT r.* FROM review_responses r JOIN review_sessions s ON s.id=r.session_id WHERE s.owner=? ORDER BY r.rowid',[owner]).map((row)=>({ ...row, kind:'review', skill_id: reviews.skillFor(row.session_id,row.question_id) }));
    const targets = targetEvidence([...lessons,...characterLessons],[...evidence,...reviewEvidence],practiceRows);
    const correct = store.get(`SELECT COUNT(*) AS total FROM responses r JOIN attempts a ON a.id=r.attempt_id
      WHERE a.owner=? AND r.correct=1 AND r.hinted=0 AND NOT EXISTS
      (SELECT 1 FROM responses prior WHERE prior.attempt_id=r.attempt_id AND prior.question_id=r.question_id AND prior.rowid<r.rowid)`, [owner]);
    const review = reviews.queue(owner).items.filter((item) => !item.consolidated || item.due).map((item) => item.lessonId);
    const reviewStats = reviews.stats(owner);
    return { attempts, completed, latestCompleted, targets, practiceCount: practiceRows.length, stars: completed.reduce((sum,id)=>sum+(getLesson(id)?.reward || 0),0), activeMs: attempts.reduce((sum, attempt) => sum + attempt.active_ms, 0) + reviewStats.activeMs,
      independentAnswers: correct.total + reviewStats.independent, review, completedReviews: reviewStats.completed };
  }
  function findAttempt(req, res, id) {
    const auth = identity(req, res);
    const attempt = store.get('SELECT * FROM attempts WHERE id=? AND owner=?', [id, auth.owner]);
    if (!attempt) fail(404, '没有找到这段冒险，请返回地图重新进入');
    return attempt;
  }
  function attemptView(attempt) {
    const lesson = getLesson(attempt.lesson_id, attempt.content_version);
    const current = lesson.questions[attempt.step];
    const results = store.all('SELECT id,question_id,prompt,answer_json,correct,hinted,explanation,created_at FROM responses WHERE attempt_id=? ORDER BY rowid', [attempt.id]);
    return {
      ...attempt, lesson: publicLesson(lesson), question: current ? publicQuestion(current, attempt.id) : null,
      currentHint: current && store.get('SELECT 1 FROM hints WHERE attempt_id=? AND question_id=?', [attempt.id, current.id]) ? current.hint : null,
      results: results.map(({ answer_json, ...row }) => ({ ...row, answer: JSON.parse(answer_json) })),
      sources: lesson.knowledgeIds.map((id) => pointMap.get(id)).filter(Boolean),
    };
  }
  const route = (handler) => (req, res, next) => Promise.resolve().then(() => handler(req, res)).catch(next);
  const authLimit = rateLimit({ windowMs: 15 * 60000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: '尝试次数较多，请稍后再试' } });

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.get('/api/bootstrap', route((req, res) => {
    const auth = identity(req, res);
    res.json({ user: safeUser(auth.user), lessons: lessons.map(publicLesson), metadata: dataset.metadata, grades: gradeCatalog, progress: summary(auth.owner) });
  }));
  app.post('/api/auth/register', authLimit, route(async (req, res) => {
    const data = registration.parse(req.body);
    if (store.get('SELECT id FROM users WHERE email=?', [data.email])) fail(409, '这个邮箱已注册，请登录');
    const digest = await passwordHash(data.password);
    // Recheck after asynchronous password hashing to keep registration atomic.
    const userId = randomUUID();
    store.transaction(() => {
      if (store.get('SELECT id FROM users WHERE email=?', [data.email])) fail(409, '这个邮箱已注册，请登录');
      store.run('INSERT INTO users (id,email,password_hash,nickname,created_at) VALUES (?,?,?,?,?)', [userId, data.email, digest, data.nickname, now()]);
      if (data.importGuest) moveGuest(req, userId);
      openSession(res, userId);
    });
    res.status(201).json({ user: safeUser(store.get('SELECT * FROM users WHERE id=?', [userId])) });
  }));
  app.post('/api/auth/login', authLimit, route(async (req, res) => {
    const data = login.parse(req.body);
    const user = store.get('SELECT * FROM users WHERE email=?', [data.email]);
    const fallback = 'scrypt:4e229fc762fb80ecf1ecf2969f5bfd88:' + '0'.repeat(128);
    const valid = await passwordMatches(data.password, user?.password_hash || fallback);
    if (!user || !valid) fail(401, '邮箱或密码不正确');
    store.transaction(() => {
      if (data.importGuest) moveGuest(req, user.id);
      const old = readCookie(req, 'wordland_session');
      if (old) store.run('DELETE FROM sessions WHERE token_hash=?', [hash(old)]);
      openSession(res, user.id);
    });
    res.json({ user: safeUser(user) });
  }));
  app.post('/api/auth/logout', route((req, res) => {
    const token = readCookie(req, 'wordland_session');
    store.transaction(() => { if (token) store.run('DELETE FROM sessions WHERE token_hash=?', [hash(token)]); });
    res.clearCookie('wordland_session', cookieOptions);
    res.clearCookie('wordland_guest', cookieOptions);
    res.json({ ok: true });
  }));
  app.put('/api/profile', route((req, res) => {
    const { user } = identity(req, res);
    if (!user) fail(401, '请先登录后保存学习档案');
    const data = profile.parse(req.body);
    store.transaction(() => store.run('UPDATE users SET nickname=?,grade=?,semester=? WHERE id=?', [data.nickname, data.grade, data.semester, user.id]));
    res.json({ user: safeUser(store.get('SELECT * FROM users WHERE id=?', [user.id])) });
  }));
  app.get('/api/room', route((req, res) => res.json(room(identity(req, res).owner))));
  app.put('/api/room', route((req, res) => {
    const { owner } = identity(req, res);
    const data = z.object({ placed: z.array(z.enum(['books', 'plant', 'moon'])).max(3).refine((items) => new Set(items).size === items.length, '装饰不能重复'), revision: z.number().int().nonnegative() }).parse(req.body);
    const stars = store.get('SELECT COUNT(DISTINCT lesson_id)*3 AS total FROM attempts WHERE owner=? AND status=?', [owner, 'completed']).total;
    const required = { books: 3, plant: 6, moon: 12 };
    if (data.placed.some((id) => stars < required[id])) fail(403, '这件装饰还没有解锁，先去完成新的故事吧');
    store.transaction(() => {
      if (room(owner).revision !== data.revision) fail(409, '书屋已在其他页面更新，请重新选择');
      store.run('INSERT INTO room_preferences VALUES (?,?,?,?) ON CONFLICT(owner) DO UPDATE SET placed_json=excluded.placed_json,revision=excluded.revision,updated_at=excluded.updated_at', [owner, JSON.stringify(data.placed), data.revision + 1, now()]);
    });
    res.json(room(owner));
  }));
  app.get('/api/characters', route((_req,res)=>res.json({terms:characterTerms,items:characterLessons.map(publicLesson)})));
  app.get('/api/knowledge', route((req, res) => {
    const query = z.object({ grade: z.coerce.number().int().min(1).max(6).default(1), q: z.string().max(100).default(''), category: z.string().max(30).default('全部'), semester: z.enum(['全部', '上册', '下册']).default('全部'), page: z.coerce.number().int().min(1).max(1000).default(1) }).parse(req.query);
    const items = dataset.knowledge_points.filter((point) =>
      point.textbooks.some((book)=>book.grade===`${['','一','二','三','四','五','六'][query.grade]}年级` && (query.semester==='全部'||book.volume===query.semester)) &&
      (query.category === '全部' || point.category === query.category) &&
      (query.semester === '全部' || point.semesters.includes(query.semester)) &&
      (!query.q || `${point.name} ${point.aliases.join(' ')} ${point.objectives.join(' ')} ${point.textbooks.map((t) => t.chapter_path.join(' ')).join(' ')}`.toLowerCase().includes(query.q.toLowerCase())));
    res.json({ items: items.slice((query.page - 1) * 20, query.page * 20), total: items.length, page: query.page, pageSize: 20 });
  }));
  app.post('/api/attempts', route((req, res) => {
    const data = z.object({ lessonId: z.string(), restart: z.boolean().default(false) }).parse(req.body);
    const { owner } = identity(req, res);
    const lesson = getLesson(data.lessonId);
    if (!lesson) fail(404, '这一关还在准备中');
    let attempt = !data.restart && store.get('SELECT * FROM attempts WHERE owner=? AND lesson_id=? AND status=? AND content_version=? ORDER BY updated_at DESC LIMIT 1', [owner, lesson.id, 'in_progress', lesson.version]);
    if (!attempt) {
      const id = randomUUID();
      store.transaction(() => store.run('INSERT INTO attempts (id,owner,lesson_id,content_version,started_at,updated_at) VALUES (?,?,?,?,?,?)', [id, owner, lesson.id, lesson.version, now(), now()]));
      attempt = store.get('SELECT * FROM attempts WHERE id=?', [id]);
    }
    res.json(attemptView(attempt));
  }));
  app.get('/api/attempts/:id', route((req, res) => res.json(attemptView(findAttempt(req, res, req.params.id)))));
  app.post('/api/attempts/:id/hint', route((req, res) => {
    const attempt = findAttempt(req, res, req.params.id);
    const { questionId } = z.object({ questionId: z.string() }).parse(req.body);
    const question = getLesson(attempt.lesson_id, attempt.content_version).questions[attempt.step];
    if (!question || question.id !== questionId) fail(409, '进度已经变化，请重新打开这一关');
    store.transaction(() => store.run('INSERT OR IGNORE INTO hints VALUES (?,?)', [attempt.id, question.id]));
    res.json({ hint: question.hint });
  }));
  app.post('/api/attempts/:id/answer', route((req, res) => {
    const attempt = findAttempt(req, res, req.params.id);
    const data = z.object({ submissionId: z.string().uuid(), questionId: z.string().max(80), answer: z.union([z.string().max(500), z.array(z.string().max(500)).max(12)]), activeMs: z.number().int().min(0).max(120000).default(0) }).parse(req.body);
    const existing = store.get('SELECT * FROM responses WHERE id=?', [data.submissionId]);
    if (existing) {
      if (existing.attempt_id !== attempt.id || existing.question_id !== data.questionId || existing.answer_json !== JSON.stringify(data.answer)) fail(409, '提交标识已使用，请刷新进度');
      return res.json({ correct: !!existing.correct, explanation: existing.explanation, attempt: attemptView(attempt) });
    }
    const lesson = getLesson(attempt.lesson_id, attempt.content_version);
    const question = lesson.questions[attempt.step];
    if (!question || question.id !== data.questionId) fail(409, '进度已在其他页面更新，请重新打开这一关');
    const correct = JSON.stringify(question.answer) === JSON.stringify(data.answer);
    const hinted = !!store.get('SELECT 1 FROM hints WHERE attempt_id=? AND question_id=?', [attempt.id, question.id]);
    const nextStep = attempt.step + Number(correct);
    const completed = nextStep === lesson.questions.length;
    store.transaction(() => {
      store.run('INSERT INTO responses VALUES (?,?,?,?,?,?,?,?,?)', [data.submissionId, attempt.id, question.id, question.prompt, JSON.stringify(data.answer), Number(correct), Number(hinted), question.explanation, now()]);
      store.run('UPDATE attempts SET step=?,status=?,updated_at=?,completed_at=?,active_ms=active_ms+? WHERE id=?', [nextStep, completed ? 'completed' : 'in_progress', now(), completed ? now() : null, data.activeMs, attempt.id]);
    });
    res.json({ correct, explanation: question.explanation, attempt: attemptView(store.get('SELECT * FROM attempts WHERE id=?', [attempt.id])) });
  }));
  app.get('/api/practice', route((req,res)=> {
    const { owner } = identity(req,res);
    res.json({ items: store.all('SELECT * FROM practice_records WHERE owner=? ORDER BY updated_at DESC',[owner]).map(publicPractice) });
  }));
  app.post('/api/practice', route((req,res)=> {
    const { owner } = identity(req,res);
    const input = practiceInput.parse(req.body);
    const data = validatePractice(input,getLesson(input.lessonId));
    store.transaction(()=>store.run('INSERT INTO practice_records VALUES (?,?,?,?,?,?,?) ON CONFLICT(owner,lesson_id,activity_id) DO UPDATE SET activity_title=excluded.activity_title,content_json=excluded.content_json,checked_by=excluded.checked_by,updated_at=excluded.updated_at',[owner,data.lessonId,data.activityId,data.activityTitle,JSON.stringify({text:data.text,strokes:data.strokes,paper:data.paper,checks:data.checks,status:data.status}),data.checkedBy,now()]));
    res.json(publicPractice(store.get('SELECT * FROM practice_records WHERE owner=? AND lesson_id=? AND activity_id=?',[owner,data.lessonId,data.activityId])));
  }));
  app.get('/api/history', route((req, res) => {
    const { owner } = identity(req, res);
    const history = store.all('SELECT * FROM attempts WHERE owner=? ORDER BY updated_at DESC', [owner]);
    const adventures = history.map((attempt) => ({ ...attempt, kind: 'adventure', lesson: publicLesson(getLesson(attempt.lesson_id, attempt.content_version)), answers: store.get('SELECT COUNT(*) AS count FROM responses WHERE attempt_id=?', [attempt.id]).count }));
    res.json({ items: [...adventures, ...reviews.history(owner)].sort((a, b) => b.updated_at.localeCompare(a.updated_at)) });
  }));
  reviews.registerRoutes(app, route);
  app.use('/api', (_req, res) => res.status(404).json({ error: '没有找到这个接口' }));
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(root, 'dist'), { index: false }));
    app.get('*', (_req, res) => res.sendFile(path.join(root, 'dist/index.html')));
  }
  app.use((error, _req, res, _next) => {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues[0].message });
    if (error instanceof SyntaxError && error.status === 400) return res.status(400).json({ error: '请求内容格式不正确' });
    if (!error.status) console.error(error);
    res.status(error.status || 500).json({ error: error.status ? error.message : '保存遇到问题，请稍后重试' });
  });
  return { app, store };
}
