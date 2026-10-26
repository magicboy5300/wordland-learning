import {gradeLabel} from '../curriculum';
import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Bootstrap, PracticeRecord, Target } from '../types';

const labels: Record<Target['status'],string> = { draft:'草稿已保存', unseen:'还没练到', practiced:'提示或重试中', independent:'本轮首次独立答对', reviewed:'复习中独立答对', 'self-recorded':'已保存自评', 'parent-checked':'家长已填写检查' };
export function LearningEvidence({ data }: { data: Bootstrap }) {
  const [selected,setSelected] = useState(data.progress.attempts.find((attempt)=>data.lessons.some((lesson)=>lesson.id===attempt.lesson_id))?.lesson_id || data.lessons[0].id);
  const targets=data.progress.targets?.filter((target)=>target.lessonId===selected) || [];
  const [records,setRecords] = useState<PracticeRecord[]>([]);
  const [error,setError] = useState('');
  const [reload,setReload]=useState(0);
  useEffect(()=>{let alive=true;api<{items:PracticeRecord[]}>('/practice').then((result)=>alive&&setRecords(result.items)).catch((error)=>alive&&setError(error.message));return()=>{alive=false;};},[data.progress.practiceCount,reload]);
  const extraIds = [...new Set([...(data.progress.targets || []).filter((target)=>target.status!=='unseen').map((target)=>target.lessonId),...records.map((record)=>record.lessonId)])].filter((id)=>id.startsWith('character-')&&!data.lessons.some((lesson)=>lesson.id===id));
  return <section className="evidence-section paper"><h2>把进步看到每一个目标</h2><p className="muted">答题、复习和说写实践分别留下记录，方便决定下一次练什么。</p><label className="practice-text-label">选择故事<select value={selected} onChange={(event)=>setSelected(event.target.value)}>{data.lessons.map((lesson)=><option value={lesson.id} key={lesson.id}>{gradeLabel(lesson.grade)}{lesson.semester} · {lesson.title}</option>)}{extraIds.map((id)=><option key={id} value={id}>字表练习 · {data.progress.targets.find((target)=>target.lessonId===id)?.label || records.find((record)=>record.lessonId===id)?.activityTitle}</option>)}</select></label>
    <div className="target-evidence-list">{targets.map((target,index)=><div key={`${target.id}-${index}`}><span>{target.label}</span><strong className={`target-state ${target.status}`}>{labels[target.status]}</strong></div>)}</div><p className="muted small">状态描述已经发生的练习表现。一次答对或一次人工检查，不代表已掌握全部知识。旧版本足迹继续保留，新增加的题目需要重新练习。</p>
    <h3>我的说写作品</h3>{error&&<p role="alert">{error}<button className="text-button" onClick={()=>{setError('');setReload(reload+1);}}>重新读取</button></p>}
    {records.filter((record)=>record.lessonId===selected).length ? <div className="work-collection">{records.filter((record)=>record.lessonId===selected).map((record)=><article key={record.activityId}><h4>{record.activityTitle} {record.status==='draft'&&<span className="tag">草稿</span>}</h4>{record.strokes.length>0&&<svg className="work-preview" viewBox="0 0 400 400" aria-label="已保存的写字作品">{record.strokes.map((stroke,index)=><polyline key={index} points={stroke.map((point)=>point.join(',')).join(' ')} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>)}</svg>}{record.text&&<p>{record.text}</p>}{record.paper&&<p>已记录纸上练习</p>}<p className="muted small">{record.status==='draft'?'草稿':record.checkedBy==='parent'?'家长填写检查':'自我检查'} · {new Date(record.updatedAt).toLocaleString('zh-CN')}</p></article>)}</div> : <p className="muted">这个故事还没有保存的说写作品，可以进入故事里的“我的说写小作品”开始练习。</p>}
  </section>;
}
