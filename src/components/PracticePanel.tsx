import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Pencil, Save, Undo2 } from 'lucide-react';
import { api } from '../api';
import type { Activity, Lesson, PracticeRecord } from '../types';
import { PinyinText } from './PinyinText';

type Stroke = [number, number][];
function PracticeEditor({ lessonId, activity, saved, onSaved }: { lessonId: string; activity: Activity; saved?: PracticeRecord; onSaved: (record: PracticeRecord) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const active = useRef<Stroke | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>(saved?.strokes || []);
  const [text, setText] = useState(saved?.text || '');
  const [paper, setPaper] = useState(saved?.paper || false);
  const [checks, setChecks] = useState<number[]>([]);
  const [checkedBy, setCheckedBy] = useState<'self' | 'parent'>('self');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const drawing = activity.kind === 'draw' || activity.kind === 'pinyinwrite';
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0,0,400,400); ctx.strokeStyle = '#49392e'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const stroke of strokes) { ctx.beginPath(); stroke.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); if(stroke.length===1) ctx.lineTo(stroke[0][0]+.1,stroke[0][1]+.1); ctx.stroke(); }
  }, [strokes]);
  async function save(status:'draft'|'completed'='completed') {
    setBusy(true); setMessage('');
    try { const record = await api<PracticeRecord>('/practice',{lessonId,activityId:activity.id,text,strokes,paper,checks,checkedBy,status}); onSaved(record); setMessage(status==='draft'?'草稿已保存，下次可以接着写':'作品和检查记录已保存'); }
    catch(error){ setMessage((error as Error).message); } finally { setBusy(false); }
  }
  const point = (event: React.PointerEvent<HTMLCanvasElement>): [number,number] => {
    const rect = event.currentTarget.getBoundingClientRect();
    return [Math.max(0,Math.min(400,Math.round((event.clientX-rect.left)/rect.width*400))),Math.max(0,Math.min(400,Math.round((event.clientY-rect.top)/rect.height*400)))];
  };
  return <div className="practice-editor">
    <h3><PinyinText text={activity.title}/></h3><p><PinyinText text={activity.prompt}/></p>
    {drawing && <><div className={`writing-board ${activity.kind==='pinyinwrite'?'four-lines':''}`}><span className="writing-model" aria-hidden="true">{activity.characters?.join('')}</span><canvas ref={canvas} width={400} height={400} aria-label="用鼠标、手指或触控笔写字" onPointerDown={(event)=>{ if(strokes.length>=60){setMessage('这张纸已写满，可以撤销几笔或清空再写。');return;} event.currentTarget.setPointerCapture(event.pointerId);active.current=[point(event)]; }} onPointerMove={(event)=>{
      if(!active.current)return; const next=point(event);const previous=active.current.at(-1)!;active.current.push(next);const ctx=canvas.current?.getContext('2d');if(ctx){ctx.beginPath();ctx.moveTo(...previous);ctx.lineTo(...next);ctx.stroke();}
    }} onPointerUp={()=>{const stroke=active.current;active.current=null;if(!stroke)return;const sampled=stroke.length<=24?stroke:Array.from({length:24},(_,i)=>stroke[Math.round(i*(stroke.length-1)/23)]);setStrokes((current)=>[...current,sampled]);setMessage('');}} onPointerCancel={()=>{ active.current=null; setStrokes((current)=>[...current]); }}/></div>
      <div className="button-row"><button className="text-button" onClick={()=>setStrokes(strokes.slice(0,-1))} disabled={!strokes.length}><Undo2 size={16}/>撤销一笔</button><button className="text-button" onClick={()=>setStrokes([])} disabled={!strokes.length}>重新写</button></div><label className="practice-check"><input type="checkbox" checked={paper} onChange={(event)=>setPaper(event.target.checked)}/>我已经在纸上练过，也可以保存纸上练习记录</label></>}
    <label className="practice-text-label">{activity.kind==='write'?'我的小作品':'我想留下的发现（可不填）'}<textarea maxLength={activity.maxChars || 400} value={text} onChange={(event)=>setText(event.target.value)} rows={activity.kind==='write'&&activity.maxChars===3000?12:3} placeholder={activity.kind==='write'?'把你想说的话写在这里……':'说了什么、读了什么，或者哪里还想再练……'}/></label>
    {activity.kind==='write'&&<p className="muted small">已写 {[...text.trim()].length} 个字符{activity.recommendedLength?` · 建议 ${activity.recommendedLength}`:''}。可以先存草稿，再慢慢修改。</p>}
    <fieldset className="practice-checklist"><legend>完成后，一项一项检查</legend>{activity.checklist.map((item,index)=><label className="practice-check" key={item}><input type="checkbox" checked={checks.includes(index)} onChange={(event)=>setChecks(event.target.checked?[...checks,index]:checks.filter((value)=>value!==index))}/><PinyinText text={item}/></label>)}</fieldset>
    <label className="practice-text-label">本次由谁填写检查记录<select value={checkedBy} onChange={(event)=>setCheckedBy(event.target.value as 'self'|'parent')}><option value="self">我自己检查</option><option value="parent">家长填写检查结果</option></select></label>
    <p className="muted small">这是练习与人工检查记录。写字笔顺请对照课本；系统没有自动判定书写、发音或背诵是否正确。</p>
    {activity.kind==='write'&&<button className="button" disabled={busy||!text.trim()} onClick={()=>save('draft')}><Save size={16}/>先保存草稿</button>}
    <button className="button primary" disabled={busy || checks.length!==activity.checklist.length || (activity.kind==='write'&&!text.trim()) || (drawing&&!strokes.length&&!paper)} onClick={()=>save('completed')}><Save size={16}/>{busy?'正在保存…':'保存这次练习'}</button>
    {saved && <p className="muted small">上次保存：{new Date(saved.updatedAt).toLocaleString('zh-CN')} · {saved.status==='draft'?'草稿未提交':saved.checkedBy==='parent'?'家长填写':'自我检查'}</p>}
    {message && <p role="status" className="practice-message">{message}</p>}
  </div>;
}

export function PracticePanel({ lesson, onRefresh }: { lesson: Lesson; onRefresh: () => Promise<void> }) {
  const activities = lesson.activities || [];
  const [records,setRecords] = useState<PracticeRecord[]>([]);
  const [active,setActive] = useState('');
  const [error,setError] = useState('');
  const [ready,setReady] = useState(false);
  useEffect(()=>{ let alive=true; api<{items:PracticeRecord[]}>('/practice').then((result)=>{if(alive){setRecords(result.items);setReady(true);}}).catch((error)=>alive&&setError(error.message));return()=>{alive=false;}; },[lesson.id]);
  if(!activities.length)return null;
  const selected=activities.find((activity)=>activity.id===active);
  const finished=activities.filter((activity)=>records.some((row)=>row.lessonId===lesson.id&&row.activityId===activity.id&&row.status!=='draft')).length;
  return <section className="hands-on-panel" aria-label="说写实践"><div className="practice-top"><div><Pencil size={19}/><strong>我的说写小作品</strong><span>{finished} / {activities.length} 项已留记录</span></div></div><p className="muted small">答题之后，再亲手写、开口说，把学到的方法用起来。</p>
    {error&&<p role="alert">{error}<button className="text-button" onClick={()=>{setError('');api<{items:PracticeRecord[]}>('/practice').then((result)=>{setRecords(result.items);setReady(true);}).catch((error)=>setError(error.message));}}>重新读取</button></p>}
    <div className="practice-tabs">{activities.map((activity)=><button key={activity.id} className={`button ${active===activity.id?'primary':''}`} aria-pressed={active===activity.id} disabled={!ready} onClick={()=>setActive(active===activity.id?'':activity.id)}>{records.some((row)=>row.lessonId===lesson.id&&row.activityId===activity.id&&row.status!=='draft')&&<CheckCircle2 size={15}/>}<PinyinText text={activity.characters?.length===1?`写 ${activity.characters[0]}`:activity.title}/></button>)}</div>
    {selected&&<PracticeEditor key={selected.id} lessonId={lesson.id} activity={selected} saved={records.find((row)=>row.lessonId===lesson.id&&row.activityId===selected.id)} onSaved={(record)=>{setRecords((items)=>[...items.filter((row)=>row.lessonId!==record.lessonId||row.activityId!==record.activityId),record]);void onRefresh();}}/>}
  </section>;
}
