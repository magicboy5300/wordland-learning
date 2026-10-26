import knowledge from '../data/primary-knowledge.json' with {type:'json'};
import {grade2} from './curriculum/grade2.js';
import {grade3} from './curriculum/grade3.js';
import {grade4} from './curriculum/grade4.js';
import {grade5} from './curriculum/grade5.js';
import {grade6} from './curriculum/grade6.js';
const names=['','一','二','三','四','五','六'];
const sourceUrl='https://www.moe.gov.cn/srcsite/A26/s8001/202204/t20220420_619921.html';
const authoring=[{grade:2,terms:grade2},{grade:3,terms:grade3},{grade:4,terms:grade4},{grade:5,terms:grade5},{grade:6,terms:grade6}];
const lengths={2:[15,'30～80字'],3:[60,'120～200字'],4:[100,'200～350字'],5:[150,'350～500字'],6:[180,'450～650字']};
export const gradeCatalog=[
 {grade:1,label:'一年级',stage:'识字与启蒙',focus:'听清拼音，认识汉字，读懂短句，说写一句话'},
 {grade:2,label:'二年级',stage:'识字与表达',focus:'在语境中识字，读懂故事，按顺序写话'},
 {grade:3,label:'三年级',stage:'阅读与习作起步',focus:'联系上下文理解词语，抓主要信息，写具体片段'},
 {grade:4,label:'四年级',stage:'观察与探究',focus:'从不同角度提问，比较阅读，按顺序写清经历'},
 {grade:5,label:'五年级',stage:'策略与表达',focus:'带目的选择阅读方法，体会写法，完成有重点的习作'},
 {grade:6,label:'六年级',stage:'综合与思辨',focus:'整合多份材料，用证据解释观点，独立修改和分享作品'},
];
export const primaryUnits=authoring.flatMap(({grade,terms})=>Object.entries(terms).flatMap(([semester,units])=>units.map((unit,index)=>({...unit,grade,semester,index}))));
function align(grade,semester,pattern,fallback){
 const candidates=knowledge.knowledge_points.filter((point)=>!point.warnings.length&&point.textbooks.some((book)=>book.grade===`${names[grade]}年级`&&book.volume===semester));
 const focused=candidates.filter((point)=>new RegExp(pattern).test(point.name));
 const selected=(focused.length?focused:candidates.filter((point)=>new RegExp(fallback).test(point.name))).slice(0,2);
 return {ids:selected.map((point)=>point.id),names:selected.map((point)=>point.name),mode:focused.length?'goal-pattern':'general-skill'};
}
export const primaryLessons=primaryUnits.flatMap((unit)=>{
 const prefix=`g${unit.grade}-${unit.semester==='上册'?'upper':'lower'}-${unit.id}`;
 const plan=unit.activity.outline.split('—');
 const expressionOrder={type:'order',prompt:`把「${unit.activity.title}」的提纲按内容先后排好。`,options:[...plan].reverse(),answer:plan,hint:unit.activity.outline,explanation:`先后安排可以是：${unit.activity.outline}。表达时再检查内容是否连贯。`};
 const parts=[
  {key:'words',title:`词语线索 · ${unit.title}`,subtitle:'联系语境理解字词与表达',category:'词句花园',questions:unit.words,pattern:unit.patterns[0],fallback:'词语|语义|字义|语言|积累',minutes:5,activity:{id:'word-notes',kind:'write',title:'我的词语发现卡',prompt:`从「${unit.title}」选一个值得积累的词语，写出原句、在句中的意思和理解依据，再试着换个情境使用。`,checklist:['词语解释符合语境','写出了理解依据','新句子用词合适'],minChars:5,recommendedLength:unit.grade<=2?'一两句':'一个简短的词语札记',maxChars:1000}},
  {key:'reading',title:`阅读探案 · ${unit.title}`,subtitle:unit.theme,category:unit.text.startsWith('《')?'诗意星空':'阅读森林',questions:unit.reading,pattern:unit.patterns[1],fallback:'阅读|理解|策略|描写|诗意',minutes:8,activity:{id:'reading-share',kind:'speak',title:'我的阅读分享',prompt:`用自己的话说出「${unit.title}」的主要发现，指出一处支持你理解的词句，再听听同伴的不同看法。`,checklist:['说清主要内容或观点','指出具体文字依据','倾听并回应同伴'],maxChars:1500}},
  {key:'expression',title:`表达工坊 · ${unit.activity.title}`,subtitle:unit.grade<=2?'把观察和想法写成完整的话':'从提纲到草稿，再修改和分享',category:'表达工坊',questions:[...unit.expression,expressionOrder],pattern:unit.patterns[2],fallback:'习作|写话|表达|口语|交流',minutes:unit.grade<=2?12:unit.grade<=4?20:30,activity:{id:'my-work',...unit.activity,minChars:unit.activity.kind==='write'?lengths[unit.grade][0]:0,recommendedLength:lengths[unit.grade][1],maxChars:3000}},
 ];
 return parts.map((part,partIndex)=>{
  const id=`${prefix}-${part.key}`;const mapping=align(unit.grade,unit.semester,part.pattern,part.fallback);
  return {id,title:part.title,subtitle:part.subtitle,grade:unit.grade,semester:unit.semester,unit:prefix,unitTitle:unit.title,unitSubtitle:unit.theme,category:part.category,scene:part.key==='words'?'letters':part.category==='诗意星空'?'moon':part.key==='expression'?'mail':'flower',color:part.key==='words'?'yellow':part.key==='expression'?'peach':'green',minutes:part.minutes,order:unit.grade*10000+(unit.semester==='下册'?1000:0)+unit.index*10+partIndex,version:1,reward:3,knowledgeIds:mapping.ids,learningGoals:[unit.theme,part.subtitle],sourceAlignment:{mode:mapping.mode,targets:mapping.names,note:'按能力目标关联来源条目，题材与题目为自编；原始抽取目标仍待逐条教学核对。'},curriculumReferences:[{title:'义务教育语文课程标准（2022年版）',url:sourceUrl,note:'按年级能力主题编排的自编练习，适用于配合学校课程学习；不是某一版教材的逐课复制。'}],story:`小书狐邀请你完成「${unit.title}」的${part.key==='words'?'字词线索':part.key==='reading'?'阅读探案':'表达任务'}。先读材料，回到文字寻找依据，再留下自己的发现。`,intro:unit.text+(part.key==='expression'?`\n\n表达任务：${unit.activity.prompt}\n建议提纲：${unit.activity.outline}`:''),activities:[part.activity],questions:part.questions.map((question,index)=>({...question,id:`${id}-q${index+1}`,skillId:`${id}-goal${index+1}`,skillLabel:question.prompt}))};
 });
});
