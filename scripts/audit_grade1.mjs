import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { grade1Lessons as lessons, characterLessons, characterTerms } from '../server/lessons.js';
import { reviewBank as allReviewBank } from '../server/review-bank.js';
const reviewBank = Object.fromEntries([...lessons,...characterLessons].map((lesson)=>[lesson.id,allReviewBank[lesson.id]]));

// This checks inventory and source links. It does not certify teaching quality
// or treat an imported source record as an assessed curriculum objective.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataset = JSON.parse(fs.readFileSync(path.join(root, 'data/grade1-knowledge.json'), 'utf8'));
const points = dataset.knowledge_points;
const byId = new Map(points.map((point) => [point.id, point]));
const mapped = new Set(lessons.flatMap((lesson) => lesson.knowledgeIds));
const allLessons = [...lessons,...characterLessons];
const mainQuestions = lessons.flatMap((lesson) => lesson.questions);
const reviewQuestions = lessons.flatMap((lesson)=>reviewBank[lesson.id] || []);
const allQuestions = allLessons.flatMap((lesson)=>[...lesson.questions,...(reviewBank[lesson.id] || [])]);
const errors = [];
const count = (values) => values.reduce((result, value) => {
  result[value] = (result[value] || 0) + 1;
  return result;
}, {});
const unique = (values) => [...new Set(values)];
const duplicated = (values) => Object.entries(count(values)).filter(([, n]) => n > 1).map(([value, occurrences]) => ({ value, occurrences }));

for (const item of duplicated(points.map((point) => point.id))) errors.push({ type: 'duplicate-source-id', ...item });
for (const item of duplicated(lessons.map((lesson) => lesson.id))) errors.push({ type: 'duplicate-lesson-id', ...item });
for (const item of duplicated(allQuestions.map((question) => question.id))) errors.push({ type: 'duplicate-question-id', ...item });
for (const relation of dataset.relations) {
  if (!byId.has(relation.from_kp_id) || !byId.has(relation.to_kp_id)) errors.push({ type: 'broken-relation', id: relation.id });
}
for (const lesson of allLessons) {
  if (!reviewBank[lesson.id]?.length) errors.push({ type: 'missing-review', lessonId: lesson.id });
  for (const id of lesson.knowledgeIds) {
    const point = byId.get(id);
    if (!point) errors.push({ type: 'missing-source', lessonId: lesson.id, id });
    else if (!point.semesters.includes(lesson.semester)) errors.push({ type: 'source-semester-mismatch', lessonId: lesson.id, id });
  }
}
for (const lessonId of Object.keys(reviewBank)) {
  if (!allLessons.some((lesson) => lesson.id === lessonId)) errors.push({ type: 'orphan-review', lessonId });
}
for (const question of allQuestions) {
  if (!['choice', 'order'].includes(question.type)) errors.push({ type: 'unsupported-question', id: question.id });
  if (unique(question.options).length !== question.options.length) errors.push({ type: 'duplicate-options', id: question.id });
  if (question.type === 'choice' && !question.options.includes(question.answer)) errors.push({ type: 'answer-not-in-options', id: question.id });
  if (question.type === 'order' && JSON.stringify([...question.options].sort()) !== JSON.stringify([...question.answer].sort())) errors.push({ type: 'invalid-order-answer', id: question.id });
}

// Run the shipped parser on actual lesson strings and check its local assets.
// This cannot establish that a recording has the right sound, accent or tone.
const speechSource = fs.readFileSync(path.join(root, 'src/learning/pinyinSpeech.ts'), 'utf8');
const javascript = ts.transpileModule(speechSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
  .replace(/^import recordings from [^;]+;\s*/m, '').replace(/^export /gm, '');
const recordings = JSON.parse(fs.readFileSync(path.join(root, 'src/learning/syllable-audio.json'), 'utf8'));
const { readingSegments } = new Function('recordings', `${javascript}\nreturn { readingSegments };`)(recordings);
const audioFields = [];
for (const lesson of allLessons) {
  for (const field of ['title', 'subtitle', 'story', 'intro']) audioFields.push({ lessonId: lesson.id, field, text: lesson[field] });
  for (const token of lesson.practice || []) audioFields.push({ lessonId: lesson.id, field: 'practice', text: token });
  for (const question of [...lesson.questions, ...(reviewBank[lesson.id] || [])]) {
    for (const field of ['prompt', 'hint', 'explanation', 'listen']) if (question[field]) audioFields.push({ lessonId: lesson.id, questionId: question.id, field, text: question[field] });
    for (const option of question.options) audioFields.push({ lessonId: lesson.id, questionId: question.id, field: 'option', text: option });
  }
}
const audioIssues = [];
const usedAudioUrls = new Set();
for (const field of audioFields) {
  for (const segment of readingSegments(field.text)) {
    if (segment.type === 'missing') audioIssues.push({ ...field, token: segment.text, issue: 'no-parser-recording' });
    if (segment.type === 'pinyin') {
      usedAudioUrls.add(segment.url);
      if (!fs.existsSync(path.join(root, 'public', segment.url))) audioIssues.push({ ...field, token: segment.text, url: segment.url, issue: 'missing-audio-file' });
    }
  }
}

const normalized = (text) => text.toLowerCase().replaceAll('ɑ', 'a').normalize('NFD').replace(/[\u0300\u0301\u0304\u030c]/g, '').normalize('NFC');
const practice = new Set(lessons.flatMap((lesson) => lesson.practice || []).map(normalized));
const directAnswers = new Set(mainQuestions.filter((q) => q.type === 'choice').map((q) => normalized(q.answer)));
const listeningTargets = new Set(mainQuestions.filter((q) => q.listen).map((q) => normalized(q.listen)));
const expectedPinyin = {
  initials: 'b p m f d t n l g k h j q x zh ch sh r z c s y w'.split(' '),
  finals: 'a o e i u ü ai ei ui ao ou iu ie üe er an en in un ün ang eng ing ong'.split(' '),
  wholeSyllables: 'zhi chi shi ri zi ci si yi wu yu ye yue yuan yin yun ying'.split(' '),
};
const pinyin = Object.fromEntries(Object.entries(expectedPinyin).map(([key, expected]) => [key, {
  expected,
  presentInPractice: expected.filter((token) => practice.has(token)),
  missingFromPractice: expected.filter((token) => !practice.has(token)),
  standaloneMainAnswer: expected.filter((token) => directAnswers.has(token)),
  standaloneMainListeningTarget: expected.filter((token) => listeningTargets.has(token)),
}]));

const positionCounts = (questions) => count(questions.filter((q) => q.type === 'choice').map((q) => ['A', 'B', 'C', 'D'][q.options.indexOf(q.answer)]));
const terms = ['上册', '下册'].map((semester) => {
  const termLessons = lessons.filter((lesson) => lesson.semester === semester);
  const qs = termLessons.flatMap((lesson) => lesson.questions);
  const rs = termLessons.flatMap((lesson) => reviewBank[lesson.id] || []);
  return {
    semester, sourceRecords: points.filter((point) => point.semesters.includes(semester)).length,
    lessons: termLessons.length, mainQuestions: qs.length, reviewQuestions: rs.length,
    directlyLinkedSources: new Set(termLessons.flatMap((lesson) => lesson.knowledgeIds)).size,
    questionTypes: count(qs.map((question) => question.type)), listeningQuestions: qs.filter((question) => question.listen).length,
    reviewListeningQuestions: rs.filter((question) => question.listen).length,
  };
});
const categories = unique(points.map((point) => point.category)).map((category) => ({
  category, sourceRecords: points.filter((point) => point.category === category).length,
  directlyLinkedSources: points.filter((point) => point.category === category && mapped.has(point.id)).length,
  lessons: lessons.filter((lesson) => lesson.category === category).length,
}));
const textbooks = unique(points.flatMap((point) => point.textbooks.map((book) => book.textbook_title))).map((title) => {
  const sourcePoints = points.filter((point) => point.textbooks.some((book) => book.textbook_title === title));
  return { title, sourceRecords: sourcePoints.length, directlyLinkedSources: sourcePoints.filter((point) => mapped.has(point.id)).length };
});
const sourceRows = points.map((point) => ({
  id: point.id, name: point.name, category: point.category, semesters: point.semesters,
  lessons: lessons.filter((lesson) => lesson.knowledgeIds.includes(point.id)).map((lesson) => ({ id: lesson.id, title: lesson.title })),
  textbooks: point.textbooks.map((book) => ({ title: book.textbook_title, chapter: book.chapter_path.join(' → ') })),
  warnings: point.warnings,
}));
const chapterIndex = new Map();
for (const row of sourceRows) {
  for (const book of row.textbooks) {
    const key = JSON.stringify([book.title, book.chapter]);
    const chapter = chapterIndex.get(key) || { textbook: book.title, chapter: book.chapter, sourceIds: new Set(), linkedSourceIds: new Set(), lessonIds: new Set() };
    chapter.sourceIds.add(row.id);
    if (row.lessons.length) chapter.linkedSourceIds.add(row.id);
    for (const lesson of row.lessons) chapter.lessonIds.add(lesson.id);
    chapterIndex.set(key, chapter);
  }
}
const chapters = [...chapterIndex.values()].map((chapter) => ({
  textbook: chapter.textbook, chapter: chapter.chapter, sourceRecords: chapter.sourceIds.size,
  directlyLinkedSources: chapter.linkedSourceIds.size, lessonIds: [...chapter.lessonIds],
})).sort((a, b) => `${a.textbook}/${a.chapter}`.localeCompare(`${b.textbook}/${b.chapter}`, 'zh-CN'));
const summary = {
  scope: '一年级全量本地课程、主线与复习题、原始知识记录、关系、拼音素材。来源关联不等于完整教学或掌握。',
  baselineSha256: dataset.metadata.sourceSha256,
  characterTables: { terms: characterTerms, cards: characterLessons.length, questions: characterLessons.flatMap((lesson)=>lesson.questions).length, writingActivities: characterLessons.filter((lesson)=>lesson.activities.length).length },
  totals: { sourceRecords: points.length, relations: dataset.relations.length, lessons: lessons.length, mainQuestions: mainQuestions.length, reviewQuestions: reviewQuestions.length, directlyLinkedSources: mapped.size, unlinkedSources: points.filter((point) => !mapped.has(point.id)).length },
  terms, categories, textbooks, chapters,
  answerPositions: { main: positionCounts(mainQuestions), review: positionCounts(reviewQuestions) },
  pinyin,
  audio: { checkedFields: audioFields.length, distinctRecordingUrls: usedAudioUrls.size, issues: audioIssues, limitation: '仅检查解析与文件存在性，未进行语音听审、音调准确性或声学质量认证。' },
  sourceWarnings: sourceRows.filter((row) => row.warnings.length),
  duplicateSourceNames: duplicated(points.map((point) => point.name)),
  lessons: lessons.map((lesson) => ({ id: lesson.id, title: lesson.title, semester: lesson.semester, category: lesson.category, objectives: lesson.subtitle, practice: lesson.practice || [], sources: lesson.knowledgeIds.map((id) => ({ id, name: byId.get(id)?.name, objectives: byId.get(id)?.objectives })), mainQuestions: lesson.questions.map((question) => ({ id: question.id, prompt: question.prompt, type: question.type, listen: question.listen || null })), reviewQuestions: (reviewBank[lesson.id] || []).map((question) => ({ id: question.id, prompt: question.prompt, type: question.type, listen: question.listen || null })) })),
  structuralErrors: errors,
};
const output = path.join(root, 'docs/audit');
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'grade1-coverage.json'), `${JSON.stringify(summary, null, 2)}\n`);
const cell = (value) => `"${String(value).replaceAll('"', '""')}"`;
const rows = [['原始ID', '名称', '来源分类', '册次', '关卡直接关联状态', '关联关卡', '教材章节', '已知原始警告'], ...sourceRows.map((row) => [row.id, row.name, row.category, row.semesters.join(' / '), row.lessons.length ? '有关联（待逐目标审核）' : '未直接关联', row.lessons.map((lesson) => `${lesson.id} ${lesson.title}`).join(' | '), row.textbooks.map((book) => `${book.title} / ${book.chapter}`).join(' | '), row.warnings.join(' | ')])];
fs.writeFileSync(path.join(output, 'grade1-source-coverage.csv'), `\uFEFF${rows.map((row) => row.map(cell).join(',')).join('\n')}\n`);
const chapterRows = [['来源教材', '原始章节路径', '原始知识记录', '直接关联记录', '关联关卡（不等于整章已学完）'], ...chapters.map((chapter) => [chapter.textbook, chapter.chapter, chapter.sourceRecords, chapter.directlyLinkedSources, chapter.lessonIds.join(' | ')])];
fs.writeFileSync(path.join(output, 'grade1-chapter-coverage.csv'), `\uFEFF${chapterRows.map((row) => row.map(cell).join(',')).join('\n')}\n`);
console.log(JSON.stringify({ totals: summary.totals, terms, answerPositions: summary.answerPositions, pinyin, audio: { checkedFields: audioFields.length, distinctRecordingUrls: usedAudioUrls.size, issues: audioIssues }, structuralErrors: errors }, null, 2));
if (errors.length || audioIssues.length) process.exitCode = 1;
