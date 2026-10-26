import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { createApp } from '../server/app.js';
import { grade1Lessons as lessons } from '../server/lessons.js';
import { reviewBank } from '../server/review-bank.js';
import { getLesson } from '../server/lessons.js';
import { scheduledReview } from '../server/learning-evidence.js';

let service, server, base, folder;
async function serve() {
  service = await createApp({ databasePath: path.join(folder, 'test.sqlite') });
  server = await new Promise((resolve, reject) => { const active = service.app.listen(0, '127.0.0.1', () => resolve(active)); active.once('error', reject); });
  base = `http://127.0.0.1:${server.address().port}`;
}
async function stop() { await new Promise((resolve) => server.close(resolve)); service.store.close(); }
before(async () => { folder = await mkdtemp(path.join(os.tmpdir(), 'wordland-test-')); await serve(); });
after(async () => { await stop(); await rm(folder, { recursive: true, force: true }); });
function client() {
  const cookies = new Map();
  return async (url, body, method = body === undefined ? 'GET' : 'POST', headers = {}) => {
    const result = await fetch(base + '/api' + url, { method, headers: { 'content-type': 'application/json', 'x-wordland-request': '1', cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join('; '), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    for (const cookie of result.headers.getSetCookie()) { const [name, value] = cookie.split(';')[0].split('='); if (value) cookies.set(name, value); else cookies.delete(name); }
    return { status: result.status, body: await result.json(), headers: result.headers };
  };
}
test('catalog exposes genuine first-grade sources and hides exercise answers', async () => {
  const request = client();
  const boot = await request('/bootstrap');
  assert.equal(boot.status, 200);
  assert.equal(boot.body.metadata.gradeCounts[1], 940);
  assert.equal(boot.body.metadata.relationCount, 2889);
  assert.equal(boot.body.lessons.filter((lesson)=>lesson.grade===1).length, 107);
  assert.equal(boot.body.lessons.filter((lesson)=>lesson.grade===1).reduce((total, lesson) => total + lesson.questionCount, 0), 376);
  for (const [semester, expectedLessons, expectedQuestions] of [['上册', 64, 232], ['下册', 43, 144]]) {
    const termLessons = boot.body.lessons.filter((lesson) => lesson.grade===1 && lesson.semester === semester);
    assert.equal(termLessons.length, expectedLessons, `${semester} published lessons`);
    assert.equal(termLessons.reduce((total, lesson) => total + lesson.questionCount, 0), expectedQuestions, `${semester} published activities`);
  }
  assert.equal(boot.body.lessons[0].questions, undefined);
  const knowledge = await request('/knowledge?q=' + encodeURIComponent('静夜思') + '&semester=' + encodeURIComponent('下册'));
  assert.ok(knowledge.body.total > 0);
  assert.ok(knowledge.body.items[0].textbooks.length);
  const all = await request('/knowledge?semester=' + encodeURIComponent('全部'));
  assert.equal(all.body.total, 940);
  const ids = new Set(JSON.parse(readFileSync(new URL('../data/grade1-knowledge.json', import.meta.url))).knowledge_points.map((k) => k.id));
  for (const lesson of lessons) for (const id of lesson.knowledgeIds) assert.ok(ids.has(id), `Missing source ${id}`);
  const started = await request('/attempts', { lessonId: 'sunrise' });
  assert.equal(started.body.question.answer, undefined);
  assert.equal(started.body.question.hint, undefined);
  assert.equal(started.body.question.explanation, undefined);
});

test('server grades, deduplicates and persists guest progress through registration and restart', async () => {
  const request = client();
  await request('/bootstrap');
  const started = await request('/attempts', { lessonId: 'sunrise' });
  const id = started.body.id;
  assert.equal((await request('/attempts', { lessonId: 'sunrise' })).body.id, id, 'resume the same open attempt');
  const hinted = await request(`/attempts/${id}/hint`, { questionId: 'sun-1' });
  assert.equal(hinted.status, 200);
  const input = { submissionId: randomUUID(), questionId: 'sun-1', answer: '日', activeMs: 1000 };
  const answer = await request(`/attempts/${id}/answer`, input);
  assert.equal(answer.body.correct, true);
  assert.equal(answer.body.attempt.step, 1);
  const repeat = await request(`/attempts/${id}/answer`, input);
  assert.equal(repeat.body.attempt.results.length, 1);
  assert.equal(repeat.body.attempt.active_ms, 1000);
  assert.equal((await request(`/attempts/${id}/answer`, { ...input, answer: '火' })).status, 409);
  assert.equal((await request(`/attempts/${id}/answer`, { submissionId: randomUUID(), questionId: 'sun-3', answer: '水' })).status, 409);
  const wrong = await request(`/attempts/${id}/answer`, { submissionId: randomUUID(), questionId: 'sun-2', answer: '火' });
  assert.equal(wrong.body.correct, false);
  assert.equal(wrong.body.attempt.step, 1);
  for (const [questionId, answer] of [['sun-2', '月'], ['sun-3', '水'], ['sun-4','火']]) await request(`/attempts/${id}/answer`, { submissionId: randomUUID(), questionId, answer });
  const progress = (await request('/bootstrap')).body.progress;
  assert.equal(progress.stars, 3);
  assert.equal(progress.independentAnswers, 2, 'hinted and retry answers are not counted as independent first answers');
  const registered = await request('/auth/register', { email: 'learner@example.com', password: 'a-long-password', nickname: '小栗子', importGuest: true });
  assert.equal(registered.status, 201);
  assert.equal(registered.body.user.password_hash, undefined);
  const cookies = registered.headers.getSetCookie().join(';');
  assert.match(cookies, /HttpOnly/i);
  assert.match(cookies, /SameSite=Lax/i);
  assert.equal((await request('/history')).body.items[0].status, 'completed');
  await stop(); await serve();
  const rebooted = await request('/bootstrap');
  assert.equal(rebooted.body.user.nickname, '小栗子');
  assert.deepEqual(rebooted.body.progress.completed, ['sunrise']);
  assert.equal((await request('/auth/logout', {})).status, 200);
  assert.equal((await request('/bootstrap')).body.user, null);
  assert.equal((await request('/history')).body.items.length, 0);
  assert.equal((await request('/auth/login', { email: 'learner@example.com', password: 'wrong' })).status, 401);
  assert.equal((await request('/auth/login', { email: 'learner@example.com', password: 'a-long-password' })).status, 200);
  assert.equal((await request('/bootstrap')).body.progress.stars, 3);
});

test('account records are isolated and profile persists independently', async () => {
  const first = client(), second = client();
  await first('/auth/login', { email: 'learner@example.com', password: 'a-long-password' });
  const history = await first('/history');
  const id = history.body.items[0].id;
  await second('/auth/register', { email: 'another@example.com', password: 'another-password', nickname: '另一位侦探' });
  assert.equal((await second(`/attempts/${id}`)).status, 404);
  assert.equal((await second(`/attempts/${id}/hint`, { questionId: 'sun-1' })).status, 404);
  assert.equal((await second('/bootstrap')).body.progress.stars, 0);
  const profile = await second('/profile', { nickname: '小叶子', grade: 2, semester: '下册' }, 'PUT');
  assert.equal(profile.body.user.grade, 2);
  assert.equal((await first('/bootstrap')).body.user.nickname, '小栗子');
  assert.equal((await second('/profile', { nickname: '错误', grade: 9, semester: '上册' }, 'PUT')).status, 400);
});

test('cross-site writes and invalid input cannot mutate state', async () => {
  const request = client();
  assert.equal((await request('/attempts', { lessonId: 'sunrise' }, 'POST', { origin: 'http://localhost:5178' })).status, 200);
  assert.equal((await request('/auth/login', {}, 'POST', { origin: 'https://other.example' })).status, 403);
  assert.equal((await request('/auth/login', {}, 'POST', { 'x-wordland-request': '' })).status, 403);
  assert.equal((await request('/auth/register', { email: 'bad', password: '123' })).status, 400);
  assert.equal((await request('/knowledge?page=-1')).status, 400);
  assert.equal((await request('/profile', { nickname: 'test', grade: 1, semester: '上册' }, 'PUT')).status, 401);
});

async function completeStory(request, lessonId) {
  const attempt = await request('/attempts', { lessonId });
  for (const question of lessons.find((lesson) => lesson.id === lessonId).questions) {
    const result = await request(`/attempts/${attempt.body.id}/answer`, { submissionId: randomUUID(), questionId: question.id, answer: question.answer });
    assert.equal(result.status, 200);
  }
  return attempt.body.id;
}

test('review uses new contexts, retains hinted evidence and resolves only an independent round', async () => {
  const request = client();
  await request('/auth/register', { email: 'review@example.com', password: 'review-password', nickname: '温故小侦探' });
  const attempt = await request('/attempts', { lessonId: 'sunrise' });
  await request(`/attempts/${attempt.body.id}/answer`, { submissionId: randomUUID(), questionId: 'sun-1', answer: '水' });
  await completeStory(request, 'sunrise');
  assert.equal((await request('/review')).body.pendingCount, 1);
  const first = await request('/review/start', { lessonId: 'sunrise' });
  assert.equal(first.body.lesson.questionCount, 2);
  assert.equal(first.body.questions_json, undefined);
  assert.equal(first.body.question.answer, undefined);
  assert.notEqual(first.body.question.prompt, lessons[0].questions[0].prompt);
  const firstId = first.body.id;
  await request(`/review/sessions/${firstId}/hint`, { questionId: first.body.question.id });
  assert.ok((await request(`/review/sessions/${firstId}`)).body.currentHint);
  for (const question of reviewBank.sunrise.slice(0,2)) await request(`/review/sessions/${firstId}/answer`, { submissionId: randomUUID(), questionId: question.id, answer: question.answer });
  assert.equal((await request('/review')).body.pendingCount, 1, 'a hinted round remains pending');
  const independent = await request('/review/start', { lessonId: 'sunrise' });
  assert.notEqual(independent.body.id, firstId);
  const inputs = reviewBank.sunrise.slice(2,4).map((question) => ({ submissionId: randomUUID(), questionId: question.id, answer: question.answer }));
  for (const input of inputs) await request(`/review/sessions/${independent.body.id}/answer`, input);
  const retry = await request(`/review/sessions/${independent.body.id}/answer`, inputs[1]);
  assert.equal(retry.body.attempt.results.length, 2, 'retries do not duplicate review responses');
  assert.equal((await request('/review')).body.pendingCount, 0);
  assert.equal((await request('/review')).body.items[0].consolidated, true);
  const progress = (await request('/bootstrap')).body.progress;
  assert.equal(progress.completedReviews, 2);
  assert.equal(progress.stars, 3, 'review cannot farm adventure rewards');
  assert.deepEqual(progress.review, []);
  assert.equal((await request('/history')).body.items.filter((item) => item.kind === 'review').length, 2);
  const other = client();
  await other('/bootstrap');
  assert.equal((await other(`/review/sessions/${independent.body.id}`)).status, 404);
  const again = await request('/attempts', { lessonId: 'sunrise', restart: true });
  await request(`/attempts/${again.body.id}/answer`, { submissionId: randomUUID(), questionId: 'sun-1', answer: '水' });
  assert.equal((await request('/review')).body.pendingCount, 1, 'new difficulties reopen practice without deleting history');
});

test('room placements migrate, sync, reject locked items and detect stale device revisions', async () => {
  const request = client();
  await request('/bootstrap');
  assert.equal((await request('/room', { placed: ['books'], revision: 0 }, 'PUT')).status, 403);
  await completeStory(request, 'sunrise');
  const placed = await request('/room', { placed: ['books'], revision: 0 }, 'PUT');
  assert.deepEqual(placed.body.placed, ['books']);
  assert.equal((await request('/room', { placed: [], revision: 0 }, 'PUT')).status, 409);
  assert.equal((await request('/room', { placed: ['plant'], revision: 1 }, 'PUT')).status, 403);
  await request('/auth/register', { email: 'room@example.com', password: 'room-password', nickname: '小书屋', importGuest: true });
  const moved = (await request('/room')).body;
  assert.deepEqual(moved.placed, ['books']);
  const secondDevice = client();
  await secondDevice('/auth/login', { email: 'room@example.com', password: 'room-password' });
  assert.deepEqual((await secondDevice('/room')).body, moved);
  const changed = await secondDevice('/room', { placed: [], revision: moved.revision }, 'PUT');
  assert.equal(changed.status, 200);
  assert.equal((await request('/room', { placed: ['books'], revision: moved.revision }, 'PUT')).status, 409);
  await stop(); await serve();
  assert.deepEqual((await secondDevice('/room')).body.placed, []);
  assert.equal((await secondDevice('/bootstrap')).body.progress.stars, 3);
});

test('review sessions resume and migrate from guest without leaking or accepting skipped questions', async () => {
  const request = client();
  await request('/bootstrap');
  assert.equal((await request('/review/start', {})).status, 409);
  await completeStory(request, 'directions');
  const started = await request('/review/start', { lessonId: 'directions' });
  assert.equal((await request('/review/start', { lessonId: 'directions' })).body.id, started.body.id);
  assert.equal((await request(`/review/sessions/${started.body.id}/answer`, { submissionId: randomUUID(), questionId: reviewBank.directions[1].id, answer: reviewBank.directions[1].answer })).status, 409);
  await request('/auth/register', { email: 'review-migration@example.com', password: 'migration-password', importGuest: true });
  const restored = await request(`/review/sessions/${started.body.id}`);
  assert.equal(restored.status, 200);
  assert.equal(restored.body.question.answer, undefined);
  assert.equal((await request('/review')).body.ongoing.id, started.body.id);
  assert.equal((await request('/review/start', { lessonId: 'moon-poem' })).status, 400);
  for (const question of reviewBank.directions.slice(0,2)) await request(`/review/sessions/${started.body.id}/answer`, { submissionId: randomUUID(), questionId: question.id, answer: question.answer });
  assert.equal((await request('/review')).body.items.find((item) => item.lessonId === 'directions').consolidated, true,
    'independent practice without earlier errors also appears in the practiced list');
});

test('a mixed review caps at four questions and updates each story independently', async () => {
  const request = client();
  await request('/bootstrap');
  for (const lessonId of ['sunrise', 'directions']) {
    const started = await request('/attempts', { lessonId });
    const question = lessons.find((lesson) => lesson.id === lessonId).questions[0];
    await request(`/attempts/${started.body.id}/hint`, { questionId: question.id });
    await completeStory(request, lessonId);
  }
  const session = await request('/review/start', {});
  assert.equal(session.body.lesson.questionCount, 4);
  let state = session.body;
  while (state.question) {
    const question = Object.values(reviewBank).flat().find((question) => question.id === state.question.id);
    if (question.lessonId === 'directions' && question.id.endsWith('-1')) await request(`/review/sessions/${state.id}/hint`, { questionId: question.id });
    const answer = await request(`/review/sessions/${state.id}/answer`, { submissionId: randomUUID(), questionId: question.id, answer: question.answer });
    assert.equal(answer.status, 200);
    state = answer.body.attempt;
  }
  const queue = (await request('/review')).body;
  assert.equal(queue.pendingCount, 1);
  assert.equal(queue.items.find((item) => item.lessonId === 'sunrise').consolidated, true);
  assert.equal(queue.items.find((item) => item.lessonId === 'directions').consolidated, false);
});

test('curriculum covers all pinyin sounds and four tones with short focused checkpoints', () => {
  const expected = 'b p m f d t n l g k h j q x zh ch sh r z c s y w a o e i u ü ai ei ui ao ou iu ie üe er an en in un ün ang eng ing ong zhi chi shi ri zi ci si yi wu yu ye yue yuan yin yun ying'.split(' ');
  const targets = new Set(lessons.flatMap((lesson)=>lesson.questions.filter((q)=>q.audioOnly).map((q)=>q.listen)));
  for(const token of expected) assert.ok(targets.has(token),`Listening target ${token}`);
  for(const token of [...'āáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜ']) assert.ok(targets.has(token),`Tone target ${token}`);
  assert.equal(new Set(lessons.filter((l)=>l.semester==='下册').map((l)=>l.unit)).size,8);
  for(const lesson of lessons) { assert.ok(lesson.unit,lesson.id);assert.ok(lesson.questions.length<=8,`${lesson.id} must be a short session`); }
  assert.equal(lessons.filter((l)=>l.alphabet).reduce((sum,l)=>sum+l.questions.length,0),26);
});

test('options stay shuffled across reloads and old content remains readable without claiming new completion', async () => {
  const request=client();
  const started=(await request('/attempts',{lessonId:'sunrise'})).body;
  const restored=(await request(`/attempts/${started.id}`)).body;
  assert.deepEqual(restored.question.options,started.question.options);
  assert.equal(restored.question.answer,undefined);
  assert.equal(restored.question.skillLabel,undefined);
  const old=getLesson('sunrise',1);
  assert.equal(old.questions.length,3);
  assert.equal(getLesson('sunrise').questions.length,4);
  service.store.transaction(()=>service.store.run('UPDATE attempts SET content_version=1,step=3,status=?,completed_at=? WHERE id=?',['completed',new Date().toISOString(),started.id]));
  const legacy=(await request(`/attempts/${started.id}`)).body;
  assert.equal(legacy.question,null);assert.equal(legacy.lesson.questionCount,3);
  const progress=(await request('/bootstrap')).body.progress;
  assert.deepEqual(progress.completed,['sunrise']);assert.deepEqual(progress.latestCompleted,[]);
  assert.notEqual((await request('/attempts',{lessonId:'sunrise'})).body.id,started.id);
});

test('manual writing and speaking records validate, persist, migrate and remain isolated', async () => {
  const request=client();await request('/bootstrap');
  const input={lessonId:'sunrise',activityId:'handwriting-日',strokes:[[[10,20],[100,110]]],checks:[0,1,2],checkedBy:'self',text:'想把日字写端正'};
  assert.equal((await request('/practice',{...input,checks:[0]})).status,400);
  assert.equal((await request('/practice',{...input,strokes:[]})).status,400);
  assert.equal((await request('/practice',{...input,strokes:[[[401,0]]]})).status,400);
  const saved=await request('/practice',input);assert.equal(saved.status,200);
  assert.deepEqual(saved.body.strokes,input.strokes);
  assert.equal((await request('/bootstrap')).body.progress.practiceCount,1);
  await request('/auth/register',{email:'practice@example.com',password:'practice-password',importGuest:true});
  assert.equal((await request('/practice')).body.items.length,1);
  await stop();await serve();
  const otherDevice=client();await otherDevice('/auth/login',{email:'practice@example.com',password:'practice-password'});
  assert.equal((await otherDevice('/practice')).body.items[0].text,input.text);
  const other=client();assert.equal((await other('/practice')).body.items.length,0);
  assert.equal((await request('/practice',{lessonId:'sentence-garden',activityId:'my-sentence',text:'',checks:[0,1,2],checkedBy:'parent'})).status,400);
  assert.equal((await request('/practice',{lessonId:'sentence-garden',activityId:'my-sentence',text:'小鸟在树上唱歌。',checks:[0,1,2],checkedBy:'parent'})).status,200);
});

test('question-level evidence distinguishes retries, independent answers and manual records', async()=>{
  const request=client();const started=(await request('/attempts',{lessonId:'green-frog'})).body;
  const lesson=lessons.find((l)=>l.id==='green-frog');
  await request(`/attempts/${started.id}/hint`,{questionId:lesson.questions[0].id});
  await completeStory(request,'green-frog');
  const targets=(await request('/bootstrap')).body.progress.targets.filter((target)=>target.lessonId==='green-frog');
  assert.equal(targets.find((t)=>t.id===lesson.questions[0].id).status,'practiced');
  assert.equal(targets.find((t)=>t.id===lesson.questions[1].id).status,'independent');
  const round=(await request('/review/start',{lessonId:'green-frog'})).body;
  let state=round;
  while(state.question){const q=reviewBank['green-frog'].find(q=>q.id===state.question.id);state=(await request(`/review/sessions/${state.id}/answer`,{submissionId:randomUUID(),questionId:q.id,answer:q.answer})).body.attempt;}
  assert.equal((await request('/bootstrap')).body.progress.targets.find((t)=>t.id===lesson.questions[1].id).status,'reviewed');
  const next=(await request('/review/start',{lessonId:'green-frog'})).body;
  assert.notEqual(next.question.id,round.question.id,'later rounds rotate retrieval cards');
  assert.equal((await request('/review/start',{lessonId:'green-frog'})).body.id,next.id,'unfinished round resumes unchanged');
});

test('spaced review follows one, three and seven day intervals',()=>{
  const completion={lesson_id:'sunrise',completed_at:'2026-10-01T00:00:00.000Z'};
  let result=scheduledReview([], [completion],[],()=>({id:'sunrise'}),Date.parse('2026-10-02T01:00:00Z'))[0];
  assert.equal(result.due,true);assert.equal(result.intervalDays,1);
  const sessions=[1,2,3].map((day)=>({status:'completed',completed_at:`2026-10-0${day}T00:00:00.000Z`,questions_json:JSON.stringify([{lessonId:'sunrise'}])}));
  result=scheduledReview([], [completion],sessions.slice(0,2),()=>({id:'sunrise'}),Date.parse('2026-10-04T00:00:00Z'))[0];
  assert.equal(result.intervalDays,3);assert.equal(result.due,false);
  result=scheduledReview([], [completion],sessions,()=>({id:'sunrise'}),Date.parse('2026-10-10T01:00:00Z'))[0];
  assert.equal(result.intervalDays,7);assert.equal(result.due,true);
});

test('textbook character tables expose 280/100 and 410/200 goals with distinct recognition and writing evidence',async()=>{
  const request=client(); const catalog=await request('/characters');
  assert.equal(catalog.status,200);
  for(const [semester,recognized,writing] of [['上册',280,100],['下册',410,200]]) {
    const cards=catalog.body.items.filter((lesson)=>lesson.semester===semester);
    assert.equal(cards.filter((lesson)=>lesson.characterCard.recognition).length,recognized);
    assert.equal(cards.filter((lesson)=>lesson.characterCard.writing).length,writing);
    assert.equal(new Set(cards.map((lesson)=>lesson.characterCard.character)).size,cards.length);
    for(const lesson of cards)assert.equal(lesson.questions,undefined);
  }
  const card=catalog.body.items.find((lesson)=>lesson.semester==='下册'&&lesson.characterCard.character==='春');
  const started=(await request('/attempts',{lessonId:card.id})).body;
  assert.equal(started.question.hideOptionPinyin,true);
  assert.equal(started.question.answer,undefined);
  for(const question of getLesson(card.id).questions) assert.equal((await request(`/attempts/${started.id}/answer`,{submissionId:randomUUID(),questionId:question.id,answer:question.answer})).status,200);
  const progress=(await request('/bootstrap')).body.progress;
  assert.equal(progress.stars,0,'single character drills do not change story rewards');
  assert.ok(progress.completed.includes(card.id));
  assert.equal(progress.targets.find((target)=>target.lessonId===card.id).status,'independent');
  assert.equal((await request('/practice',{lessonId:card.id,activityId:'handwriting-春',paper:true,checks:[0,1,2],checkedBy:'parent'})).status,200);
  const review=(await request('/review/start',{lessonId:card.id})).body;
  assert.equal(review.lesson.questionCount,1,'one-card pools never repeat the same question twice');
});
