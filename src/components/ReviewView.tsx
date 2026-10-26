import { PageHeader } from './PageHeader';
import {gradeLabel} from '../curriculum';
import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Clock3, Leaf, LoaderCircle, RefreshCw } from 'lucide-react';
import type { Attempt, Bootstrap, ReviewQueue } from '../types';
import { api } from '../api';
import { Fox, SceneIcon } from './Art';

export function ReviewView({ grade, semester, onStart, onAdventure }: { data: Bootstrap; grade:number; semester:string; onStart: (id: string) => void; onAdventure: () => void }) {
  const [queue, setQueue] = useState<ReviewQueue | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let alive = true;
    setError('');
    api<ReviewQueue>(`/review?grade=${grade}&semester=${encodeURIComponent(semester)}`).then((result) => alive && setQueue(result)).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [reload,grade,semester]);
  async function start(lessonId?: string) {
    setBusy(true); setError('');
    try { const attempt = await api<Attempt>('/review/start', {grade,semester,...(lessonId?{lessonId}:{})}); onStart(attempt.id); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  if (!queue) return <div className="empty-state"><LoaderCircle className="spin"/><p>{error || '小书狐正在整理复习卡片…'}</p>{error && <button className="button" onClick={() => setReload((value) => value + 1)}>重新打开</button>}</div>;
  const pending = queue.items.filter((item) => (!item.consolidated || item.due));
  const practiced = queue.items.filter((item) => item.consolidated && !item.due);
  return <section className="review-page">
    <PageHeader eyebrow="让发现，慢慢生根" title="复习小花园" meta={<span className="tag">{gradeLabel(grade)}{semester}</span>} description="把学过的知识放进新故事，给记忆一点生长的时间。"/>
    <div className="review-hero"><div><span className="hero-badge"><Leaf size={14}/>小书狐的温故邀请</span><h2>{pending.length ? '再发现一次，理解多一点。' : queue.availableLessons.length ? '换个情境，看看还记不记得。' : '先带回一个故事，再种下新发现。'}</h2><p>{pending.length ? `有 ${pending.length} 个故事里的知识可以再练一练，每个故事每轮最多抽取两张卡片，交替复习已学的方法。` : queue.availableLessons.length ? '今天没有待处理的线索，也可以选择已学过的故事做一次巩固。' : '完成冒险地图里的一个故事，小花园会准备对应的回顾卡片。'}</p><div className="button-row">{queue.availableLessons.length ? <button className="button primary" disabled={busy} onClick={() => start()}>{busy ? '正在准备卡片…' : pending.length ? '开始一轮小复习' : '做一次巩固练习'}<ArrowRight size={17}/></button> : <button className="button primary" onClick={onAdventure}>去冒险地图<ArrowRight size={17}/></button>}{queue.ongoing && <button className="button" onClick={() => onStart(queue.ongoing!.id)} disabled={busy}><Clock3 size={16}/>继续上次复习</button>}</div></div><div className="review-hero-art"><SceneIcon scene="flower"/><Fox happy/></div></div>
    <div className="review-summary"><div><Leaf size={19}/><strong>{pending.length}</strong><span>个目标可再练习</span></div><div><CheckCircle2 size={19}/><strong>{queue.completedCount}</strong><span>轮复习已完成</span></div><div><BookOpen size={19}/><strong>{queue.availableLessons.length}</strong><span>个故事可温故</span></div></div>
    {error && <div className="error-message" role="alert">{error}<button className="text-button" onClick={() => setReload((value) => value + 1)}>刷新状态<RefreshCw size={14}/></button></div>}
    <div className="section-top review-section-title"><h2>再看看这些小发现</h2><span className="muted small">来自作答记录与间隔复习计划</span></div>
    {pending.length ? <div className="review-target-grid">{pending.map((item) => <article className="review-target" key={item.lessonId}><div className={`review-target-art ${item.lesson.color}`}><SceneIcon scene={item.lesson.scene}/></div><div><span className="tag">{gradeLabel(item.lesson.grade)} · {item.lesson.category} · {item.lesson.semester}</span><h3>{item.lesson.subtitle}</h3><p>{item.due ? `到了间隔复习时间，上次完成后已安排 ${item.intervalDays} 天复习。` : `在「${item.lesson.title}」里，曾用过提示或重试。现在再找找线索。`}</p><button className="text-button" disabled={busy} onClick={() => start(item.lessonId)}>练这一个目标 · 最多 2 题<ArrowRight size={16}/></button></div></article>)}</div> : <div className="review-clear paper"><CheckCircle2 size={30}/><div><h3>{queue.availableLessons.length ? '这次的小线索，都已好好收藏' : '小花园正在等你的第一份发现'}</h3><p>{queue.availableLessons.length ? '继续探索新故事，也可以在下面选择学过的内容。' : '完成故事或留下作答记录后，这里会出现对应的练习。'}</p></div></div>}
    {practiced.length > 0 && <><div className="section-top review-section-title"><h2>已经独立复习过</h2></div><div className="practiced-list">{practiced.map((item) => <div key={item.lessonId}><CheckCircle2 size={19}/><span>{item.lesson.subtitle}<small>已独立复习 · {item.nextReviewAt ? `下次建议 ${new Date(item.nextReviewAt).toLocaleDateString('zh-CN')}` : '可以随时再练'}</small></span><button className="text-button" disabled={busy} onClick={() => start(item.lessonId)}>再练一轮<ArrowRight size={15}/></button></div>)}</div></>}
    {queue.availableLessons.length > 0 && <><div className="section-top review-section-title"><h2>挑一个故事，温故一下</h2></div><div className="review-story-chips">{queue.availableLessons.map((lesson) => <button key={lesson.id} disabled={busy} onClick={() => start(lesson.id)}>{lesson.title}<ArrowRight size={14}/></button>)}</div></>}
    <div className="source-note review-note"><Leaf size={18}/><p>一次复习最多包含两个故事、四道题。每个故事本轮的全部卡片都在首次、未用提示时答对，会记为完成一次独立复习；如果之后出现新的困难，会再次加入待练内容。记录描述本轮表现，不代表已经掌握全部知识。系统按 1、3、7、14、30 天递增安排回顾；每轮交替抽取卡片，也可以提前主动练习。</p></div>
  </section>;
}
