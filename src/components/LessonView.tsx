import {gradeLabel} from '../curriculum';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Lightbulb, LoaderCircle, RotateCcw, Volume2, VolumeX, BookOpen, Star, WifiOff } from 'lucide-react';
import { api } from '../api';
import type { Attempt, Question } from '../types';
import { Fox, SceneIcon } from './Art';
import { LessonCover } from './LessonCover';
import { Modal } from './Modal';
import { PinyinText } from './PinyinText';
import { PracticePanel } from './PracticePanel';
import { PinyinPractice } from './PinyinPractice';
import { useAutoRead, useLearning } from '../learning/LearningProvider';

function spokenQuestion(question: Question) {
  if(question.readingMode==='visual')return '请观察屏幕上的字母字形，找到对应卡片。本题不播放字母名称音。';
  if(question.audioOnly)return `${question.prompt}。示范音，${question.listen}。`;
  const symbols: Record<string, string> = { '。': '句号', '？': '问号', '，': '逗号', '！': '感叹号', '、': '顿号' };
  const optionReading = (option: string) => option === '只' && ['mail-2', 'review-size-amount-2'].includes(question.id) ? 'zhī' : symbols[option] || option;
  return `${question.prompt}。${question.listen ? `示范音，${question.listen}。` : ''}${question.options.map((option, index) => `选项${index + 1}，${optionReading(option)}`).join('。')}`;
}

function submissionId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // getRandomValues also works in LAN HTTP previews, where randomUUID may be absent.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function LessonView({ id, mode = 'adventure', onBack, onRefresh }: { id: string; mode?: 'adventure' | 'review'; onBack: (lesson?: Attempt['lesson']) => void; onRefresh: () => Promise<void> }) {
  const { read: onSpeak, sound, preferences, update, activate, notice } = useLearning();
  const basePath = mode === 'review' ? '/review/sessions' : '/attempts';
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [intro, setIntro] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [hint, setHint] = useState('');
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sources, setSources] = useState(false);
  const [reload, setReload] = useState(0);
  const pending = useRef<{ submissionId: string; questionId: string; answer: string | string[]; activeMs: number } | null>(null);
  const actionDock = useRef<HTMLDivElement>(null);
  const clock = useRef({ accumulated: 0, since: Date.now(), visible: !document.hidden });
  useEffect(() => {
    const dock = actionDock.current;
    const page = dock?.closest<HTMLElement>('.lesson-page');
    if (!dock || !page || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => page.style.setProperty('--lesson-dock-height', `${dock.getBoundingClientRect().height}px`));
    observer.observe(dock);
    return () => observer.disconnect();
  }, [!!attempt]);
  useEffect(() => {
    let alive = true;
    setError(''); setAttempt(null); setSelected([]); setFeedback(null); pending.current = null;
    api<Attempt>(`${basePath}/${id}`).then((data) => { if (alive) { setAttempt(data); setQuestion(data.question); setHint(data.currentHint || ''); setIntro(data.step === 0 && data.results.length === 0); } }).catch((e) => alive && setError(e.message));
    return () => { alive = false; if ('speechSynthesis' in window) window.speechSynthesis.cancel(); };
  }, [id, reload, basePath]);
  useEffect(() => {
    const visibility = () => {
      const current = clock.current;
      if (current.visible) current.accumulated += Date.now() - current.since;
      current.visible = !document.hidden; current.since = Date.now();
    };
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, []);
  function resetClock() { clock.current = { accumulated: 0, since: Date.now(), visible: !document.hidden }; }
  async function submit() {
    if (!attempt || !question) return;
    if (!pending.current) {
      const time = clock.current.accumulated + (clock.current.visible ? Date.now() - clock.current.since : 0);
      pending.current = { submissionId: submissionId(), questionId: question.id, answer: question.type === 'order' ? selected : selected[0], activeMs: Math.min(120000, Math.max(0, time)) };
    }
    setBusy(true); setError('');
    try {
      const result = await api<{ correct: boolean; explanation: string; attempt: Attempt }>(`${basePath}/${id}/answer`, pending.current);
      pending.current = null; resetClock(); setAttempt(result.attempt); setFeedback({ correct: result.correct, text: result.explanation });
      sound(result.correct ? 'correct' : 'retry');
      if (result.attempt.status === 'completed') void onRefresh();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function getHint() {
    if (!question) return;
    setBusy(true); setError('');
    try { const result = await api<{ hint: string }>(`${basePath}/${id}/hint`, { questionId: question.id }); setHint(result.hint); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  function next() {
    if (attempt?.status === 'completed' && feedback?.correct) sound('complete');
    setFeedback(null); setSelected([]); setHint(''); setMaterialOpen(false); resetClock();
    if (feedback?.correct) setQuestion(attempt?.question || null);
  }
  const firstResults = attempt?.results.filter((row, index, rows) => rows.findIndex((item) => item.question_id === row.question_id) === index) || [];
  const independent = firstResults.filter((row) => row.correct && !row.hinted).length;
  const complete = attempt?.status === 'completed' && !feedback;
  const backLabel = mode === 'review' ? '返回复习花园' : attempt?.lesson.unit && !attempt.lesson.characterCard ? '返回路线故事' : '返回冒险地图';
  const narration = !attempt || sources || materialOpen ? '' : complete ? `冒险完成啦！这次我们一起探索了，${attempt.lesson.subtitle}。每一次尝试，都有新的发现。` : intro ? `${attempt.lesson.title}。${attempt.lesson.characterCard?.examples?.join('。') || ''}。${attempt.lesson.story}。${attempt.lesson.intro}` : feedback ? `${feedback.correct ? '找到啦！' : '再想一想。'}${feedback.text}` : hint ? `小提示。${hint}` : question ? spokenQuestion(question) : '';
  useAutoRead(narration);
  if (!attempt) return <section className="empty-state"><LoaderCircle className="spin"/>{error ? <><p role="alert">{error}</p><button className="button" onClick={() => setReload((value) => value + 1)}>重新加载</button></> : <p>正在打开故事书…</p>}<button className="text-button" onClick={()=>onBack()}><ArrowLeft size={19}/>{mode === 'review' ? '返回复习花园' : '返回冒险地图'}</button></section>;
  return <section className={`lesson-page ${complete ? 'lesson-complete' : intro ? 'lesson-introduction' : 'lesson-question'}`}>
    <div className="lesson-toolbar">
      <button className="text-button" onClick={()=>onBack(attempt?.lesson)}><ArrowLeft size={19}/>{backLabel}</button>
      <div className="lesson-toolbar-actions">
        <button className="text-button" aria-pressed={preferences.pinyin} onClick={() => update({ pinyin: !preferences.pinyin })}>{preferences.pinyin ? '拼音已开启' : '显示拼音'}</button>
        <button className="text-button" aria-pressed={preferences.voice} onClick={() => {
          const voice = !preferences.voice;
          update({ voice });
          if (voice) activate();
        }}>{preferences.voice ? <Volume2 size={18}/> : <VolumeX size={18}/>}<span>{preferences.voice ? '朗读已开启' : '朗读已关闭'}</span></button>
      </div>
    </div>
    {notice && <p className="audio-notice" role="status">{notice}</p>}
    <div className="lesson-heading"><span className="eyebrow">{gradeLabel(attempt.lesson.grade)} · {attempt.lesson.semester} · {attempt.lesson.category}</span><h1><PinyinText text={attempt.lesson.title}/></h1></div>
    {attempt.lesson.alphabet && <details className="reading-material"><summary>对照大小写字母表</summary><div className="alphabet-table">{[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((letter)=><span key={letter}>{letter} {letter.toLowerCase()}</span>)}</div><p className="muted small">这里只对照字形和顺序；名称音和声母呼读音是不同的学习内容。</p></details>}
    {intro && attempt.lesson.characterCard && <div className="character-study-card"><ruby>{attempt.lesson.characterCard.character}<rt>{attempt.lesson.characterCard.readings.join(' / ')}</rt></ruby><button className="text-button" onClick={()=>onSpeak(attempt.lesson.characterCard?.examples?.join('，') || '')}><Volume2 size={17}/>听汉字示范</button><span>{attempt.lesson.characterCard.writing?'会认，也练写':'先学会认读'}</span></div>}
    {attempt.lesson.practice && !complete && <PinyinPractice tokens={attempt.lesson.practice}/>}
    <div className="lesson-progress"><div style={{ width: `${attempt.step / attempt.lesson.questionCount * 100}%` }}/></div>
    {complete ? <div className="completion-card"><div className="confetti-stars"><Star/><Star/><Star/></div><Fox happy/><span className="eyebrow">{mode === 'review' ? '复习完成 · 让发现生根' : '案件完成 · 又有新发现'}</span><h2>{mode === 'review' ? '又一次尝试，已好好收藏。' : '你的冒险，点亮了这里！'}</h2><p>这次我们一起探索了：<PinyinText text={attempt.lesson.subtitle}/>。</p><p className="muted">{mode === 'review' ? '这次复习已保存到学习足迹，可以回花园查看待练内容的变化。' : attempt.lesson.reward ? '完成的案件已记入手册。每个新案件可点亮 3 颗星。' : '这张字卡的认读已记录，会写字还可以在下方继续练习。'}</p><div className="completion-evidence"><div><strong>{independent}</strong><span>首次独立答对</span></div><div><strong>{firstResults.length - independent}</strong><span>提示或重试后完成</span></div></div></div> : intro ?
      <div className="story-card"><div className={`story-illustration ${attempt.lesson.color}`}><LessonCover lesson={attempt.lesson}/><Fox/></div><div className="story-body"><h2>小书狐的委托</h2><p><PinyinText text={attempt.lesson.story}/></p><div className="lesson-intro"><PinyinText text={attempt.lesson.intro}/></div></div></div> : question &&
      <div className="question-card"><div className="question-top"><span className="eyebrow">线索 {Math.min(attempt.step + (feedback?.correct ? 0 : 1), attempt.lesson.questionCount)} / {attempt.lesson.questionCount}</span><button className="icon-button" aria-label="朗读题目" onClick={() => onSpeak(spokenQuestion(question))}><Volume2 size={21}/></button></div>
        {(question.focus || question.illustration) && <div className={`question-art ${attempt.lesson.color}`}>{question.focus ? <span><PinyinText text={question.focus} context={question.id}/></span> : <SceneIcon scene={question.illustration!}/>}</div>}
        <div className="question-tools">
          {question.listen && <button className="button listen-target" onClick={() => onSpeak(question.listen!)}><Volume2 size={20}/>再听示范音</button>}
          {(question.material || attempt.lesson.intro) && <details className={`reading-material ${question.material ? 'question-reading' : 'story-reminder'}`} open={materialOpen} onToggle={(event)=>setMaterialOpen(event.currentTarget.open)}><summary>{question.material ? '阅读材料' : '再读故事'}</summary><div className="material-text"><PinyinText text={question.material || attempt.lesson.intro}/></div><button className="text-button" onClick={()=>onSpeak(question.material || attempt.lesson.intro)}><Volume2 size={16}/>朗读材料</button></details>}
        </div>
        <h2><PinyinText text={question.prompt} context={question.id}/></h2>
        {question.type === 'order' && <><p className="muted small">依次点选卡片，把它们放到正确的位置。</p><div className="order-slots">{question.options.map((_, i) => <div className={selected[i] ? 'filled' : ''} key={i}>{selected[i] ? <PinyinText text={selected[i]}/> : <span>{i + 1}</span>}</div>)}</div></>}
        <div className={`answer-options ${question.options.every((option) => option.length < 6) ? `short ${question.options.every((option) => [...option].length <= 2) ? 'tiny' : ''}` : ''}`}>{question.options.map((option, index) => <button className={`answer-option ${selected.includes(option) ? 'selected' : ''}`} key={option} aria-pressed={selected.includes(option)} disabled={!!feedback || busy || !!pending.current || (question.type === 'order' && selected.includes(option))} onClick={() => { setSelected(question.type === 'order' ? [...selected, option] : [option]); setError(''); }}><span className="option-index">{question.type === 'order' ? selected.includes(option) ? <Check size={16}/> : index + 1 : String.fromCharCode(65 + index)}</span><span>{question.hideOptionPinyin ? option : <PinyinText text={option} context={question.id}/>}</span></button>)}</div>
        {question.type === 'order' && !feedback && <button className="text-button" disabled={busy || !!pending.current} onClick={() => setSelected([])}><RotateCcw size={15}/>重新排列</button>}
        {hint && <div className="hint-box" role="status"><Lightbulb size={20}/><p><PinyinText text={hint} context={question.id}/></p></div>}
        {feedback && <div className={`feedback ${feedback.correct ? 'correct' : 'try-again'}`} role="status"><strong>{feedback.correct ? '找到啦，真是个细心的侦探！' : '再发现一点点，就更接近答案啦。'}</strong><p><PinyinText text={feedback.text} context={question.id}/></p></div>}

      </div>}
    {(complete || intro) && mode==='adventure' && <PracticePanel lesson={attempt.lesson} onRefresh={onRefresh}/>}
    <div className="lesson-foot"><Fox/><p>慢慢想也没关系，每一次尝试都有新的发现。</p><button className="text-button" onClick={() => setSources(true)}><BookOpen size={15}/>知识来源</button></div>
    <div className="lesson-action-dock" ref={actionDock} role="group" aria-label="学习操作">
      <div className="lesson-action-inner">
        {error && <p className="error-message" role="alert"><WifiOff size={16}/>{error}<button className="text-button" onClick={() => setReload((value) => value + 1)}>读取已保存进度<RotateCcw size={15}/></button></p>}
        <div className="lesson-action-buttons">
          {complete ? <><button className="button" onClick={() => setSources(true)}><BookOpen size={17}/>查看知识来源</button><button className="button primary" onClick={() => onBack(attempt.lesson)}>{mode === 'review' ? '返回复习花园' : attempt.lesson.characterCard ? '返回冒险地图' : '返回路线故事'}<ArrowRight size={17}/></button></> : intro ? <><button className="button" onClick={() => onSpeak(`${attempt.lesson.story}。${attempt.lesson.intro}`)}><Volume2 size={19}/>朗读故事</button><button className="button primary" onClick={() => { setIntro(false); resetClock(); }}>我准备好了<ArrowRight size={17}/></button></> : question ? feedback ? <button className="button primary" onClick={next}>{feedback.correct ? attempt.status === 'completed' ? '查看冒险成果' : '寻找下一条线索' : '我明白了，再试一次'}<ArrowRight size={18}/></button> : <><button className="button" onClick={getHint} disabled={busy || !!pending.current}><Lightbulb size={18}/>给我一点提示</button><button className="button primary" onClick={submit} disabled={busy || (question.type === 'order' ? selected.length !== question.options.length : !selected.length)}>{busy && <LoaderCircle size={18} className="spin"/>}{pending.current && error ? '重新提交' : '确认我的发现'}<ArrowRight size={18}/></button></> : null}
        </div>
      </div>
    </div>
    {sources && <Modal title="这一关从哪里来" onClose={() => setSources(false)}><p className="muted">题目与故事为本项目自编。下列原始条目用于知识目标映射，保留原始教材版本。</p>{attempt.lesson.curriculumReferences?.map((reference)=><div className="source-item" key={reference.url}><h3>{reference.title}</h3><p>{reference.note}</p><a className="text-link" href={reference.url} target="_blank" rel="noreferrer">查看教材来源 ↗</a></div>)}{attempt.sources.map((source) => <div className="source-item" key={source.id}><h3>{source.name}</h3>{source.textbooks.map((book, i) => <p key={i}>{book.textbook_title}<br/>{book.chapter_path.join(' → ')}</p>)}</div>)}<a className="text-link" target="_blank" rel="noreferrer" href="https://github.com/mmlong818/k12-knowledge-points">查看原始数据仓库 ↗</a></Modal>}
  </section>;
}
