import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, Pencil, Search } from 'lucide-react';
import type { Lesson, Progress, PracticeRecord } from '../types';
import { api } from '../api';

type Term = {semester:string;recognized:number;writing:number;edition:string;sourceNote:string};
export function CharacterLibrary({ semester, progress, loadingLesson, onStart }: {semester:string;progress:Progress;loadingLesson:string;onStart:(lesson:Lesson)=>void}) {
  const [open,setOpen]=useState(false);
  const [data,setData]=useState<{terms:Term[];items:Lesson[]}|null>(null);
  const [records,setRecords]=useState<PracticeRecord[]>([]);
  const [mode,setMode]=useState<'recognition'|'writing'>('recognition');
  const [query,setQuery]=useState('');
  const [page,setPage]=useState(1);
  const [error,setError]=useState('');
  const [reload,setReload]=useState(0);
  useEffect(()=>{ if(!open)return; let alive=true;Promise.all([api<{terms:Term[];items:Lesson[]}>('/characters'),api<{items:PracticeRecord[]}>('/practice')]).then(([result,practice])=>{if(alive){setData(result);setRecords(practice.items);}}).catch((error)=>alive&&setError(error.message));return()=>{alive=false;};},[open,reload,progress.practiceCount]);
  useEffect(()=>setPage(1),[semester,mode,query]);
  const term=data?.terms.find((term)=>term.semester===semester);
  const available=data?.items.filter((lesson)=>lesson.semester===semester&&lesson.characterCard?.[mode]) || [];
  const items=available.filter((lesson)=>!query||lesson.characterCard!.character.includes(query)||lesson.characterCard!.readings.some((reading)=>reading.includes(query.trim())));
  const finished=(lesson:Lesson)=>mode==='writing'?records.some((record)=>record.lessonId===lesson.id&&record.status!=='draft'):progress.completed.includes(lesson.id);
  return <section className="character-library paper"><div className="section-top"><div><span className="eyebrow">一字一卡，慢慢积累</span><h2><BookOpen size={22}/>课本字表练习场</h2><p>一年级{semester} · {semester==='上册'?'280 个认读字，100 个会写字':'410 个认读字，200 个会写字'}</p></div><button className="button" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'收起字表':'打开字表'}<Pencil size={16}/></button></div>
    {open&&<>{error&&<p role="alert">{error}<button className="text-button" onClick={()=>{setError('');setReload(reload+1);}}>重新读取</button></p>}{!data?<p>正在整理汉字卡……</p>:<><div className="character-controls"><div className="practice-tabs"><button className={`button ${mode==='recognition'?'primary':''}`} aria-pressed={mode==='recognition'} onClick={()=>setMode('recognition')}>我会认 · {term?.recognized}</button><button className={`button ${mode==='writing'?'primary':''}`} aria-pressed={mode==='writing'} onClick={()=>setMode('writing')}>我会写 · {term?.writing}</button></div><label className="character-search"><Search size={17}/><input aria-label="搜索字表中的汉字或拼音" value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="找一个字或拼音"/></label></div>
      <p className="muted small">{mode==='writing'?'已保存写字检查':'已完成认读练习'} {available.filter(finished).length} / {available.length} · 点一个字，先观察、听读，再练习。{mode==='writing'?'写字的笔顺和质量由自己或家长对照课本检查。':'听音选择时不显示选项拼音，避免直接照着注音找答案。'}</p>
      <div className="character-grid">{items.slice((page-1)*60,page*60).map((lesson)=><button key={lesson.id} disabled={!!loadingLesson} onClick={()=>onStart(lesson)} aria-label={`学习汉字 ${lesson.characterCard!.character}`}><span className="character-glyph">{lesson.characterCard!.character}</span><small>{lesson.characterCard!.readings.join(' / ')}</small>{finished(lesson)&&<CheckCircle2 size={15}/>}</button>)}</div>
      {!items.length&&<p>没有找到这个字，可以换个汉字或拼音试试。</p>}
      <div className="character-pagination"><button className="button" disabled={page<=1} onClick={()=>setPage(page-1)}>上一页</button><span>第 {page} / {Math.max(1,Math.ceil(items.length/60))} 页</span><button className="button" disabled={page>=Math.ceil(items.length/60)} onClick={()=>setPage(page+1)}>下一页</button></div><p className="muted small">{term?.edition}。字表来源与字卡内的“知识来源”可以查看。多音字沿用字表语境读音；教材版次有差异时，以学校使用的课本为准。</p></> }</>}
  </section>;
}
