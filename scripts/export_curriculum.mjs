import fs from 'node:fs';
import {lessons} from '../server/lessons.js';
import {primaryLessons,primaryUnits} from '../server/primary-courses.js';
const rows=[];
for(let grade=1;grade<=6;grade++)for(const semester of ['上册','下册']){
 const items=lessons.filter(l=>l.grade===grade&&l.semester===semester);
 rows.push({grade,semester,units:new Set(items.map(l=>l.unit)).size,lessons:items.length,questions:items.reduce((n,l)=>n+l.questions.length,0),practice:items.reduce((n,l)=>n+l.activities.length,0)});
}
fs.mkdirSync(new URL('../docs/curriculum/',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('../docs/curriculum/catalog.json',import.meta.url),JSON.stringify({scope:'按年级能力主题自编的首版课程；来源关联不等于教材全覆盖或已经掌握。',grades:rows,courses:primaryLessons.map(l=>({id:l.id,grade:l.grade,semester:l.semester,unit:l.unitTitle,title:l.title,goals:l.learningGoals,knowledgeIds:l.knowledgeIds,sourceAlignment:l.sourceAlignment,questionIds:l.questions.map(q=>q.id),activities:l.activities.map(a=>({id:a.id,title:a.title,kind:a.kind,recommendedLength:a.recommendedLength}))}))},null,2));
const names=['','一','二','三','四','五','六'];
const lines=['# 二至六年级课程清单','', '更新：2026-10-23。每册 8 个能力主题，每主题 3 关：字词线索、阅读探案、表达工坊。共 240 个新关卡、480 道主线题、240 项说写实践。','', '| 年级 | 上册 | 下册 | 两册重点 |','|---|---:|---:|---|','| 二年级 | 24 关 | 24 关 | 识字写话、顺序、具体特点与故事道理 |','| 三年级 | 24 关 | 24 关 | 语境理解、预测、观察、关键句与习作起步 |','| 四年级 | 24 关 | 24 关 | 多角度提问、比较、游览顺序、人物与童话 |','| 五年级 | 24 关 | 24 关 | 阅读策略、说明方法、人物细节、文言与习作 |','| 六年级 | 24 关 | 24 关 | 多材料阅读、观点证据、中心意思、整本书与综合实践 |',''];
for(let grade=2;grade<=6;grade++)for(const term of ['上册','下册']){
 lines.push(`## ${names[grade]}年级${term}`,'','| 主题 | 阅读目标 | 表达作品 |','|---|---|---|');
 for(const unit of primaryUnits.filter(u=>u.grade===grade&&u.semester===term))lines.push(`| ${unit.title} | ${unit.theme} | ${unit.activity.title} |`);
 lines.push('');
}
lines.push('## 使用范围与内容来源','','- 课程按年级能力目标组织，采用原创短文、原创题目和公版古诗文；不复制现代教材课文全文。','- 参考《义务教育语文课程标准（2022年版）》的学段进阶，保留对应年级、册次来源知识目标。来源抽取含新旧教材，尚未逐条教学审定。','- 复习采用已学材料再提取与间隔回顾；不声称每次都提供全新题材。','- 二至六年级字词按主题练习，尚未提供各册完整识字表、写字表及所有教材课文的逐课同步。','- 写作字数是练习建议；完整检查记录与草稿分开。人工检查不是自动作文、口语或书写评分。','- 一年级保留原有 107 个主题关卡及独立字表练习场，旧版本学习记录继续可查。','','## 实现位置','','- `server/curriculum/grade2.js` 至 `grade6.js`：80 个主题的原创材料、显式答案与作品要求。','- `server/primary-courses.js`：年级目标、课程组装、来源关联和分级写作建议。','- `data/primary-knowledge.json`：4,851 条小学语文来源记录、2,889 条关系，保留多教材出处。','- `docs/curriculum/catalog.json`：每关目标、题目标识和来源关联的机器可读清单。','- `npm run curriculum:export`：重新生成本文及清单。');
fs.writeFileSync(new URL('../docs/curriculum/二至六年级课程清单.md',import.meta.url),lines.join('\n')+'\n');
console.log(JSON.stringify({newLessons:primaryLessons.length,mainQuestions:primaryLessons.reduce((sum,l)=>sum+l.questions.length,0),practice:primaryLessons.reduce((sum,l)=>sum+l.activities.length,0),sourceLinked:primaryLessons.filter(l=>l.knowledgeIds.length).length,rows}));
