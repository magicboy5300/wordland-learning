import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lessons, characterLessons, characterTerms } from '../server/lessons.js';
import { primaryUnits } from '../server/primary-courses.js';
import { reviewBank } from '../server/review-bank.js';

// Inventory and diagnostic checks, not a certification of curriculum coverage.
// No course, answer, progress record or imported source is changed by this script.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataset = JSON.parse(fs.readFileSync(path.join(root, 'data/primary-knowledge.json'), 'utf8'));
const points = dataset.knowledge_points;
const pointById = new Map(points.map((point) => [point.id, point]));
const allLessons = [...lessons, ...characterLessons];
const names = ['', '一', '二', '三', '四', '五', '六'];
const count = (values) => values.reduce((result, value) => ({ ...result, [value]: (result[value] || 0) + 1 }), {});
const duplicates = (values) => Object.entries(count(values)).filter(([, n]) => n > 1).map(([value, n]) => ({ value, occurrences: n }));
const signature = (q) => JSON.stringify([q.type, q.prompt, q.options, q.answer]);
const questions = lessons.flatMap((lesson) => lesson.questions);
const errors = [];
for (const issue of duplicates(allLessons.map((lesson) => lesson.id))) errors.push({ type: 'duplicate-lesson-id', ...issue });
for (const issue of duplicates(allLessons.flatMap((lesson) => lesson.questions.map((q) => q.id)))) errors.push({ type: 'duplicate-question-id', ...issue });
for (const issue of duplicates(points.map((point) => point.id))) errors.push({ type: 'duplicate-source-id', ...issue });
for (const relation of dataset.relations) {
  if (!pointById.has(relation.from_kp_id) || !pointById.has(relation.to_kp_id)) errors.push({ type: 'broken-source-relation', relationId: relation.id });
}
for (const lesson of allLessons) {
  if (!reviewBank[lesson.id]?.length) errors.push({ type: 'missing-review-pool', lessonId: lesson.id });
  for (const id of lesson.knowledgeIds) {
    const point = pointById.get(id);
    if (!point) errors.push({ type: 'missing-source', lessonId: lesson.id, sourceId: id });
    else if (!point.textbooks.some((book) => book.grade === `${names[lesson.grade]}年级` && book.volume === lesson.semester)) errors.push({ type: 'source-grade-term-mismatch', lessonId: lesson.id, sourceId: id });
  }
  for (const question of [...lesson.questions, ...(reviewBank[lesson.id] || [])]) {
    const location = { lessonId: lesson.id, questionId: question.id, prompt: question.prompt };
    if (!['choice', 'order'].includes(question.type)) errors.push({ type: 'unsupported-question-type', ...location });
    if (new Set(question.options).size !== question.options.length) errors.push({ type: 'duplicate-options', ...location });
    if (question.type === 'choice' && !question.options.includes(question.answer)) errors.push({ type: 'answer-not-in-options', ...location });
    if (question.type === 'order' && question.options.length < 2) errors.push({ type: 'single-item-order', ...location, answer: question.answer });
    if (question.type === 'order' && JSON.stringify([...question.options].sort()) !== JSON.stringify([...question.answer].sort())) errors.push({ type: 'invalid-order-answer', ...location });
  }
}

const textFields = (lesson) => [lesson.title, lesson.subtitle, lesson.intro,
  ...lesson.questions.flatMap((q) => [q.prompt, q.explanation, ...(Array.isArray(q.answer) ? q.answer : [q.answer])]),
  ...(lesson.activities || []).flatMap((a) => [a.title, a.prompt, ...a.checklist])].join('\n');
const questionFields = (lesson) => lesson.questions.flatMap((q) => [q.prompt, q.explanation, ...(Array.isArray(q.answer) ? q.answer : [q.answer])]).join('\n');
const topics = [
  ['dictionary-radical', '部首检字', '部首查字|部首检字|部首查找'],
  ['dictionary-order', '音序检字', '音序查字|音序检字'],
  ['context-pronunciation', '多音字辨读', '多音字|多音'],
  ['confusable-characters', '同音、形近字', '同音|形近|易混字'],
  ['punctuation', '标点用法', '标点|冒号|引号|分号|顿号|省略号|破折号'],
  ['editing', '词句修改', '病句|修改.*词句|修改.*句子|修改.*语句'],
  ['silent-reading', '默读与略读', '默读|略读'],
  ['retelling', '转述信息', '转述'],
  ['recitation', '背诵与默写', '背诵|试背|默写'],
  ['summary-writing', '缩写', '缩写'],
  ['reading-response', '读后感', '读后感'],
  ['speech', '发言与演讲', '演讲|发言稿'],
  ['wholebook', '整本书阅读', '整本书|整本.*阅读|一本书|读完整'],
  ['exposition', '说明方法', '说明方法|列数字|作比较|举例子|打比方'],
].map(([id, label, pattern]) => ({
  id, label, pattern,
  method: '关键词筛查，仅用于找线索；未命中不等于未教学，命中也不等于已覆盖，须结合人工审核。',
  grades: [1, 2, 3, 4, 5, 6].map((grade) => {
    const matches = (value) => new RegExp(pattern).test(value);
    const gradeLessons = lessons.filter((lesson) => lesson.grade === grade);
    return { grade,
      sourceRecords: points.filter((point) => point.textbooks.some((book) => book.grade === `${names[grade]}年级`) && matches([point.name, ...point.objectives].join('\n'))).length,
      questionLessonIds: gradeLessons.filter((lesson) => matches(questionFields(lesson))).map((lesson) => lesson.id),
      anyFieldLessonIds: gradeLessons.filter((lesson) => matches(textFields(lesson))).map((lesson) => lesson.id),
    };
  }),
}));

const grades = [1, 2, 3, 4, 5, 6].map((grade) => {
  const gradeLessons = lessons.filter((lesson) => lesson.grade === grade);
  const qs = gradeLessons.flatMap((lesson) => lesson.questions);
  const choices = qs.filter((q) => q.type === 'choice');
  const review = gradeLessons.flatMap((lesson) => reviewBank[lesson.id] || []);
  const originals = new Set(qs.map(signature));
  const units = primaryUnits.filter((unit) => unit.grade === grade);
  const sourceUse = count(gradeLessons.flatMap((lesson) => lesson.knowledgeIds));
  return { grade,
    sourceRecords: points.filter((point) => point.textbooks.some((book) => book.grade === `${names[grade]}年级`)).length,
    linkedSourceRecords: Object.keys(sourceUse).length,
    terms: ['上册', '下册'].map((semester) => {
      const ls = gradeLessons.filter((lesson) => lesson.semester === semester);
      return { semester, lessons: ls.length, mainQuestions: ls.flatMap((lesson) => lesson.questions).length, activities: ls.flatMap((lesson) => lesson.activities || []).length };
    }),
    lessons: gradeLessons.length, mainQuestions: qs.length, questionTypes: count(qs.map((q) => q.type)),
    reviewQuestions: review.length, reviewExactMainCopies: review.filter((q) => originals.has(signature(q))).length,
    choiceQuestions: choices.length,
    choiceAnswerStrictLongest: choices.filter((q) => q.options.every((option) => option === q.answer || q.answer.length > option.length)).length,
    readingMaterials: units.length,
    materialLengthRange: units.length ? [Math.min(...units.map((u) => [...u.text].length)), Math.max(...units.map((u) => [...u.text].length))] : null,
    materialLengthUnit: 'Unicode字符数，含标点与换行；不是规范的汉字字数或难度分数。',
    mostReusedSources: Object.entries(sourceUse).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, occurrences]) => ({ id, name: pointById.get(id)?.name, lessonOccurrences: occurrences })),
  };
});

const knownIncorrectSource = points.find((point) => point.id === 'f832e60c-e8fe-415f-b265-ad64c2b62b0a');
const manualFindings = [
  { id: 'mapping-01', priority: 'P1', lessonId: 'g2-upper-bridge-words', issue: '纸桥材料练习“顺利、架”，却关联“五光十色”以及其他动词的逐词识字目标。' },
  { id: 'mapping-02', priority: 'P1', lessonId: 'g5-upper-object-words', issue: '茶杯生活短文关联“鸟的天堂”课题双重含义及《山居秋暝》古义目标，材料和题目均未提供对应课文语境。' },
  { id: 'mapping-03', priority: 'P1', lessonId: 'g3-lower-information-words', issue: '说明牌中的“自带、回收”练习关联叠词构式目标，其中一个来源自身含错误。' },
].map((finding) => {
  const lesson = lessons.find((item) => item.id === finding.lessonId);
  return { ...finding, lessonTitle: lesson.title, sourceNames: lesson.knowledgeIds.map((id) => ({ id, name: pointById.get(id)?.name })) };
});
manualFindings.push({ id: 'source-01', priority: 'P1', sourceId: knownIncorrectSource.id, issue: '来源目标把“源源不断、津津有味”归为AABB，实际字序为AABC；现有warnings未标出。', name: knownIncorrectSource.name, objectives: knownIncorrectSource.objectives,
  linkedLessonIds: lessons.filter((lesson) => lesson.knowledgeIds.includes(knownIncorrectSource.id)).map((lesson) => lesson.id), currentWarnings: knownIncorrectSource.warnings });

const report = {
  date: '2026-10-23', scope: '一至六年级上下册本地主线课程、独立字卡、复习池、来源记录与关系；另对课标学段要求作人工对照。',
  limitations: [
    '导入记录、同名记录和来源关联数均不是课程覆盖率或学习掌握率。来源含新旧教材，不直接代表学校现用教材。',
    '本报告没有逐条审定4851条来源事实，没有逐一听审所有录音，也未对学生学习效果作实测。',
    '关键词命中仅用于定位候选缺口；重复原题可用于再提取，但不能当作新情境迁移证据。',
    '本次只新增检查脚本和报告，课程内容与线上版本未因本次检查而修改。',
  ],
  source: { ...dataset.metadata, exactDuplicateNames: duplicates(points.map((point) => point.name)), warningRecords: points.filter((point) => point.warnings.length).map((point) => ({ id: point.id, name: point.name, warnings: point.warnings })) },
  totals: { mainLessons: lessons.length, mainQuestions: questions.length, sourceRecords: points.length, sourceRelations: dataset.relations.length,
    characterCards: characterLessons.length, characterCardQuestions: characterLessons.flatMap((lesson) => lesson.questions).length,
    characterWritingActivities: characterLessons.flatMap((lesson) => lesson.activities).length,
    singleItemOrderMain: errors.filter((error) => error.type === 'single-item-order' && !error.questionId.startsWith('recall-')).length,
    singleItemOrderReview: errors.filter((error) => error.type === 'single-item-order' && error.questionId.startsWith('recall-')).length },
  grades, characterTerms, structuralIssues: errors, manualFindings, topicScreening: topics,
};
const output = path.join(root, 'docs/audit');
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'primary-coverage.json'), `${JSON.stringify(report, null, 2)}\n`);
const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
const sourceRows = [['来源ID', '知识点名称', '年级', '册次', '直接关联关卡（不等于完成教学）', '原有警告'], ...points.map((point) => [
  point.id, point.name, point.grades.join('/'), point.semesters.join('/'), lessons.filter((lesson) => lesson.knowledgeIds.includes(point.id)).map((lesson) => lesson.id).join(' | '), point.warnings.join(' | '),
])];
fs.writeFileSync(path.join(output, 'primary-source-links.csv'), `\uFEFF${sourceRows.map((row) => row.map(quote).join(',')).join('\n')}\n`);
console.log(JSON.stringify({ date: report.date, totals: report.totals, structuralIssues: errors, manualFindingCount: manualFindings.length, output: path.relative(root, output) }, null, 2));
// Findings are an expected audit result. Keep the complete report even when issues exist.
