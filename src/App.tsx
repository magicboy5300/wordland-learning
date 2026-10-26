import {adventureRoutePath,parseAdventureRoute,gradeLabel,readCourseSelection,saveCourseSelection} from './curriculum';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, BookOpen, BookMarked, Compass, History, Home, Settings, Star, Sparkles, ChevronDown, Check, CheckCircle2, Clock3, Flag, GraduationCap, HelpCircle, Leaf, LogOut, Search, ShieldCheck, UserRound, X, LoaderCircle, LockKeyhole, RefreshCw } from 'lucide-react';
import { api, ApiError } from './api';
import type { Attempt, Bootstrap, HistoryItem, Lesson, RoomState } from './types';
import { Fox, Landscape, SceneIcon } from './components/Art';
import { Modal } from './components/Modal';
import { AuthModal } from './components/AuthModal';
import { LessonView } from './components/LessonView';
import { KnowledgeView } from './components/KnowledgeView';
import { ReviewView } from './components/ReviewView';
import { LearningSettings } from './components/LearningSettings';
import { PageHeader } from './components/PageHeader';
import { CharacterLibrary } from './components/CharacterLibrary';
import { LearningEvidence } from './components/LearningEvidence';
import { AdventureCourses, AdventureRoute } from './components/AdventureCourses';
import { useAutoRead, useLearning } from './learning/LearningProvider';

const navItems = [
  { id: 'adventure', label: '冒险地图', en: 'MY ADVENTURE', icon: Compass },
  { id: 'review', label: '复习花园', en: 'REVISIT', icon: Leaf },
  { id: 'knowledge', label: '知识图鉴', en: 'DISCOVER', icon: BookOpen },
  { id: 'notebook', label: '侦探手册', en: 'MY COLLECTION', icon: BookMarked },
  { id: 'room', label: '我的书屋', en: 'LITTLE HOME', icon: Home },
  { id: 'history', label: '学习足迹', en: 'LEARNING JOURNEY', icon: History },
];
const gradeNames = ['一', '二', '三', '四', '五', '六'];
function navigate(page: string) { window.location.hash = page; }
function useRoute() {
  const [route, setRoute] = useState(window.location.hash.slice(1) || 'adventure');
  useEffect(() => { const change = () => { setRoute(window.location.hash.slice(1) || 'adventure'); window.scrollTo(0, 0); }; window.addEventListener('hashchange', change); return () => window.removeEventListener('hashchange', change); }, []);
  return route;
}
function dateText(value: string) { return new Date(value).toLocaleString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function localDate(value: string) { return new Date(value).toLocaleDateString('zh-CN'); }

export default function App() {
  const route = useRoute();
  const adventureRoute = parseAdventureRoute(route);
  const { stop } = useLearning();
  const [data, setData] = useState<Bootstrap | null>(null);
  const [error, setError] = useState('');
  const [auth, setAuth] = useState(false);
  const [help, setHelp] = useState(false);
  const [grade, setGrade] = useState(readCourseSelection().grade || 1);
  const [semester, setSemester] = useState(readCourseSelection().semester || '上册');
  const [toast, setToast] = useState('');
  const [loadingLesson, setLoadingLesson] = useState('');
  const pageGuides: Record<string, string> = { adventure: '欢迎来到文字王国。跟着小书狐，选一个故事开始冒险吧。', review: '欢迎来到复习花园。让我们在新故事里，再找一找学过的小线索。', knowledge: '这里是知识图鉴。可以搜索感兴趣的知识，看看它的来处。', notebook: '这是你的侦探手册。每一个完成的故事，都会留下小小的发现。', room: '欢迎回到我的书屋。完成冒险点亮星星，就能解锁装饰。', history: '这是学习足迹。可以看看走过的故事，接着完成没有结束的冒险。', settings: '这里可以选择声音、调整语速，也可以打开或关闭拼音。', parent: '欢迎来到家长空间。一起看看孩子的尝试和进步。' };
  useAutoRead(data && !auth && !help ? pageGuides[route] || '' : '');
  useEffect(() => { if (auth || help) stop(); }, [auth, help, stop]);
  async function refresh() {
    const result = await api<Bootstrap>('/bootstrap'); setData(result); setError(''); return result;
  }
  useEffect(() => { refresh().then((result) => { setGrade(readCourseSelection().grade || result.user?.grade || 1); setSemester(readCourseSelection().semester || result.user?.semester || '上册'); }).catch((e) => setError(e.message)); }, []);
  useEffect(() => {
    const selection = parseAdventureRoute(route);
    if (selection && data) { setGrade(selection.grade); setSemester(selection.semester); }
  }, [route, !!data]);
  useEffect(()=>{if(data)saveCourseSelection(grade,semester);},[grade,semester,!!data]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 5000); return () => clearTimeout(timer); }, [toast]);
  async function startLesson(lesson: Lesson) {
    if (loadingLesson) return;
    setLoadingLesson(lesson.id);
    try { const attempt = await api<Attempt>('/attempts', { lessonId: lesson.id }); navigate(`play/${attempt.id}`); }
    catch (e) { setToast((e as Error).message); } finally { setLoadingLesson(''); }
  }
  if (!data) return <div className="boot-screen"><Fox/><h1>语文小侦探</h1><p>{error || '正在铺好通往文字王国的小路…'}</p>{error ? <button className="button primary" onClick={() => { setError(''); void refresh().catch((e) => setError(e.message)); }}>重新连接<RefreshCw size={17}/></button> : <LoaderCircle className="spin"/>}</div>;
  const active = route.startsWith('review-play/') ? 'review' : route.startsWith('play/') || route.startsWith('adventure/') ? 'adventure' : route;
  const currentLessons = data.lessons.filter((lesson) => lesson.grade === (adventureRoute?.grade || grade) && lesson.semester === (adventureRoute?.semester || semester));
  const progress = data.progress;
  const selectedGrade = data.grades?.find((item)=>item.grade===grade);
  const currentReview = progress.review.filter((id)=>currentLessons.some((lesson)=>lesson.id===id));
  const todays = progress.attempts.filter((attempt) => attempt.status === 'completed' && currentLessons.some((lesson)=>lesson.id===attempt.lesson_id) && localDate(attempt.completed_at!) === localDate(new Date().toISOString()));
  const nextLesson = currentLessons.find((lesson) => progress.attempts.some((attempt) => attempt.lesson_id === lesson.id && attempt.status === 'in_progress' && attempt.content_version === lesson.version)) || currentLessons.find((lesson) => !(progress.latestCompleted || progress.completed).includes(lesson.id)) || currentLessons[0];
  const onRefresh = async () => { try { await refresh(); } catch (e) { setToast((e as Error).message); } };
  if (route.startsWith('play/') || route.startsWith('review-play/')) {
    const review = route.startsWith('review-play/');
    return <div className="focus-learning">
      <main className="focus-learning-content" id="main-content" aria-label="全屏学习">
        <LessonView key={route} mode={review ? 'review' : 'adventure'} id={route.split('/')[1]} onBack={async (lesson) => {
          if(lesson && lesson.grade>=1 && lesson.grade<=6){setGrade(lesson.grade);if(['上册','下册'].includes(lesson.semester))setSemester(lesson.semester);}
          stop();
          const story = lesson && data.lessons.find((item) => item.id === lesson.id);
          await onRefresh();
          navigate(review ? 'review' : story?.unit ? adventureRoutePath(story.grade, story.semester, story.unit) : 'adventure');
        }} onRefresh={onRefresh}/>
      </main>
    </div>;
  }
  return <div className="app-shell">
    <aside className="sidebar"><a href="#adventure" className="brand"><img src="/favicon.svg" alt=""/><div><strong>语文小侦探</strong><span>文字王国历险</span></div></a><div className="sidebar-divider"/><p className="nav-caption">发现语文的小美好</p><nav className="main-nav" aria-label="主要导航">{navItems.map(({ id, label, en, icon: Icon }) => <a key={id} href={`#${id}`} className={active === id ? 'active' : ''} aria-current={active === id ? 'page' : undefined}><Icon size={21}/><span>{label}<small>{en}</small></span>{active === id && <span className="nav-dot"/>}</a>)}</nav>
      <div className="sidebar-bottom"><div className="fox-note"><Fox happy/><p>每一次小小的发现，<br/>都值得被收藏。</p><span>—— 你的小书狐</span></div><a href="#parent" className={`parent-nav ${active === 'parent' ? 'active' : ''}`}><ShieldCheck size={19}/>家长空间<ArrowRight size={15}/></a><a href="#settings" className="settings-nav"><Settings size={18}/>学习设置</a><p className="version-note">用好奇心，点亮每一天 · 0.5</p></div>
    </aside>
    <div className="main-wrap"><header className="topbar"><div className="mobile-brand"><img src="/favicon.svg" alt=""/><strong>语文小侦探</strong></div><div className="course-selector"><GraduationCap size={19}/><select aria-label="选择年级" value={grade} onChange={(e) => { setGrade(Number(e.target.value)); if (adventureRoute) navigate('adventure'); }}>{gradeNames.map((name, index) => <option key={name} value={index + 1}>{name}年级</option>)}</select><span className="selector-divider"/><select aria-label="选择学期" value={semester} onChange={(e) => { setSemester(e.target.value); if (adventureRoute) navigate('adventure'); }}><option>上册</option><option>下册</option></select><ChevronDown size={14}/></div><div className="topbar-actions"><button className="icon-button hide-small" aria-label="搜索知识点" onClick={() => navigate('knowledge')}><Search size={20}/></button><button className="icon-button" aria-label="查看使用帮助" onClick={() => setHelp(true)}><HelpCircle size={20}/></button><span className="star-wallet"><Star size={18} fill="currentColor"/>{progress.stars}</span><button className="profile-button" onClick={() => data.user ? navigate('settings') : setAuth(true)}><span className="avatar"><UserRound size={19}/></span><span>{data.user?.nickname || '登录 / 注册'}</span></button></div></header>
      <main className="main-content" id="main-content">
        {adventureRoute ? <AdventureRoute key={route} grade={adventureRoute.grade} semester={adventureRoute.semester} unitId={adventureRoute.unit} lessons={currentLessons} progress={progress} loadingLesson={loadingLesson} onStart={startLesson} onBack={() => navigate('adventure')}/> : route === 'review' ? <ReviewView key={`review-${grade}-${semester}`} grade={grade} semester={semester} data={data} onStart={(id) => navigate(`review-play/${id}`)} onAdventure={() => navigate('adventure')}/> : route === 'knowledge' ? <KnowledgeView key={`knowledge-${grade}-${semester}`} data={data} grade={grade} semester={semester}/> : route === 'history' ? <HistoryView data={data} onContinue={(id, kind) => navigate(`${kind === 'review' ? 'review-play' : 'play'}/${id}`)} onAuth={() => setAuth(true)}/> : route === 'notebook' ? <Notebook data={{...data,lessons:currentLessons}} onStart={startLesson}/> : route === 'room' ? <Room data={data} notify={setToast}/> : route === 'settings' ? <SettingsView data={data} onAuth={() => setAuth(true)} onSaved={async () => { const result = await refresh(); setGrade(result.user?.grade || 1); setSemester(result.user?.semester || '上册'); }} onLogout={async () => { await api('/auth/logout', {}); await refresh(); setToast('已安全退出账号'); navigate('adventure'); }}/>: route === 'parent' ? <ParentView key={`parent-${grade}-${semester}`} data={{...data,lessons:currentLessons}} onAuth={() => setAuth(true)}/> :
          <><PageHeader title={<>你好，{data.user?.nickname || '小侦探'}<span className="greeting-spark">✧</span></>} description="选条路线，开始今天的故事。"/>
          <div className="hero-grid"><section className="hero-card"><div className="hero-copy"><span className="hero-badge"><Leaf size={13}/>{gradeLabel(grade)}{semester} · {selectedGrade?.stage || '主题冒险'}</span><h2>每一个文字，<br/>都藏着一个<span>小世界。</span></h2><p>跟着小书狐找线索、读故事，<br/>把新的发现装进口袋。</p><button className="button primary hero-cta" onClick={() => startLesson(nextLesson)} disabled={!!loadingLesson}>{loadingLesson ? '故事正在打开…' : progress.attempts.length ? '继续我的冒险' : '开启第一次冒险'}<ArrowRight size={17}/></button><span className="hero-footnote">短关随时学，作品慢慢写</span></div><Landscape className="hero-art"/><span className="hero-float">好奇心，是最好的指南针</span></section>
          <aside className="daily-card"><div className="section-top"><span className="eyebrow">TODAY’S LITTLE GOAL</span><Flag size={19}/></div><h3>今天，也进步一点点</h3><div className={`daily-circle ${todays.length ? 'done' : ''}`}><div>{todays.length ? <Check size={30}/> : <SceneIcon scene="flower"/>}<strong>{todays.length ? '已完成' : '0 / 1'}</strong></div></div><p>{todays.length ? '你的发现已记入学习足迹' : '完成一段小冒险'}</p><span className="muted small">慢慢来，成长有自己的节奏</span><div className="daily-bottom"><Star size={15}/><span>新案件完成可点亮 3 颗星</span></div></aside></div>
          <AdventureCourses key={`courses-${grade}-${semester}`} grade={grade} focus={selectedGrade?.focus} lessons={currentLessons} progress={progress} semester={semester} onOpenRoute={(unit) => navigate(adventureRoutePath(grade, semester, unit))}/>
          {!data.user && <div className="guest-banner"><div><ShieldCheck size={18}/><p>你正在体验文字王国<span>登录后，可在手机、平板和电脑上接着学。</span></p></div><button className="text-button" onClick={() => setAuth(true)}>收藏我的进步<ArrowRight size={15}/></button></div>}
          <div className="home-review-banner"><div><Leaf size={21}/><p><strong>{currentReview.length ? `${currentReview.length} 个故事的小线索，可以再练一练` : '让学过的发现，在新故事里生根'}</strong><span>到复习花园，做一轮同目标的回顾卡片和新情境题。</span></p></div><button className="button" onClick={() => navigate('review')}>去复习花园<ArrowRight size={16}/></button></div>
          {grade===1 && <CharacterLibrary key={`characters-${semester}`} semester={semester} progress={progress} loadingLesson={loadingLesson} onStart={startLesson}/>}
          <section className="knowledge-promo"><div className="promo-icon"><BookOpen size={29}/></div><div><span className="eyebrow">把知识的来处，也告诉你</span><h3>一份会陪你长大的语文图鉴</h3><p>已接入 {data.metadata.gradeCounts?.[String(grade)] || data.metadata.pointCount} 条{gradeLabel(grade)}来源知识点 · {data.metadata.pointCount} 条小学语文来源总记录</p></div><button className="button" onClick={() => navigate('knowledge')}>翻开图鉴<ArrowRight size={17}/></button></section>
          <footer className="page-footer"><Leaf size={13}/><span>一字一句，慢慢长大。</span><button onClick={() => setHelp(true)}>关于这段冒险</button></footer></>}
      </main>
    </div>
    <nav className="mobile-nav" aria-label="移动端主要导航">{navItems.filter((item) => item.id !== 'room').map(({ id, label, icon: Icon }) => <a href={`#${id}`} key={id} className={active === id ? 'active' : ''} aria-current={active === id ? 'page' : undefined}><Icon size={21}/><span>{label}</span></a>)}</nav>
    {auth && <AuthModal onClose={() => setAuth(false)} onSuccess={async () => { const result = await refresh(); setGrade(result.user?.grade || 1); setSemester(result.user?.semester || '上册'); setToast('进步已收藏到你的账号'); }}/ >}
    {help && <Modal title="欢迎来到文字王国" onClose={() => setHelp(false)}><div className="help-fox"><Fox happy/></div><p>在冒险地图选一个故事，跟着小书狐寻找线索。不会时可以点“给我一点提示”，慢慢想也没关系。</p><p>目前开放小学一至六年级上、下册，共 {data.lessons.length} 个主题关卡，包含 {data.lessons.reduce((sum, lesson) => sum + lesson.questionCount, 0)} 道自编练习题。复习花园另提供同目标的回顾卡片和新情境题。知识图鉴另收录 {data.metadata.pointCount} 条小学语文原始知识点，部分来源条目仍待核对。</p><p>注册或登录后，学习记录保存在账号下。游客体验记录与当前浏览器绑定，登录时可选择迁移。</p><p className="muted small">中文说明使用设备语音，拼音采用独立音频示范。当前版本暂不支持邮箱验证、邮件找回、完整离线学习及自动书写/口语评分。</p><a className="text-link" href="https://github.com/mmlong818/k12-knowledge-points" target="_blank" rel="noreferrer">知识来源：猫叔 / K12 数据集 ↗</a><p className="muted small">Copyright © 2026 猫叔 · 原始数据按 PolyForm Noncommercial 1.0.0 用于非商业原型。</p></Modal>}
    {toast && <div className="toast" role="status"><Sparkles size={18}/><span>{toast}</span><button aria-label="关闭提示" onClick={() => setToast('')}><X size={16}/></button></div>}
  </div>;
}

function HistoryView({ data, onContinue, onAuth }: { data: Bootstrap; onContinue: (id: string, kind?: 'adventure' | 'review') => void; onAuth: () => void }) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [status, setStatus] = useState('全部');
  const [kind, setKind] = useState('全部');
  const [semester, setSemester] = useState('全部');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Attempt | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => { let alive = true; setLoading(true); api<{ items: HistoryItem[] }>('/history').then((result) => alive && setItems(result.items)).catch((e) => alive && setError(e.message)).finally(() => alive && setLoading(false)); return () => { alive = false; }; }, [retry]);
  async function show(id: string, kind?: 'adventure' | 'review') { try { setDetail(await api<Attempt>(`${kind === 'review' ? '/review/sessions' : '/attempts'}/${id}`)); } catch (e) { setError((e as Error).message); } }
  const visible = items.filter((item) => (status === '全部' || item.status === status) && (semester === '全部' || item.lesson.semester.includes(semester)) && (kind === '全部' || (item.kind || 'adventure') === kind));
  return <section><PageHeader eyebrow="每一步，都算数" title="我的学习足迹" description="看看走过的故事，也看看自己的小小成长。"/><Stats data={data}/>{!data.user && <div className="guest-banner"><div><ShieldCheck size={18}/><p>当前为游客体验记录<span>登录后可在其他设备查看。</span></p></div><button className="text-button" onClick={onAuth}>登录收藏<ArrowRight size={15}/></button></div>}
    <div className="history-filters"><label className="select-control"><select aria-label="筛选学习类型" value={kind} onChange={(e) => setKind(e.target.value)}><option value="全部">全部类型</option><option value="adventure">冒险故事</option><option value="review">温故复习</option></select></label><label className="select-control"><select aria-label="筛选完成状态" value={status} onChange={(e) => setStatus(e.target.value)}><option value="全部">全部状态</option><option value="completed">已完成</option><option value="in_progress">进行中</option></select></label><label className="select-control"><select aria-label="筛选学习历史册次" value={semester} onChange={(e) => setSemester(e.target.value)}><option value="全部">全部学期</option><option>上册</option><option>下册</option></select></label><span className="muted small">共 {visible.length} 条记录</span></div>
    {loading ? <div className="empty-state"><LoaderCircle className="spin"/><p>正在翻找你的足迹…</p></div> : error ? <div className="empty-state"><p role="alert">{error}</p><button className="button" onClick={() => { setError(''); setRetry((r) => r + 1); }}>重新加载</button></div> : visible.length ? <div className="history-list">{visible.map((item) => <article className="history-item" key={item.id}><div className={`history-art ${item.lesson.color}`}><SceneIcon scene={item.lesson.scene}/></div><div className="history-info"><span className="muted small">{dateText(item.updated_at)} · {item.kind === 'review' ? `${gradeLabel(item.lesson.grade)} · 温故复习` : gradeLabel(item.lesson.grade)}{item.lesson.semester}</span><h3>{item.lesson.title}</h3><p>{item.status === 'completed' ? '已完成' : `已找到 ${item.step} / ${item.lesson.questionCount} 条线索`} · {item.answers} 次作答</p></div><div className="history-actions"><button className="button" onClick={() => show(item.id, item.kind)}>查看记录</button>{item.status !== 'completed' && <button className="button primary" onClick={() => onContinue(item.id, item.kind)}>继续<ArrowRight size={15}/></button>}</div></article>)}</div> : <div className="empty-state paper"><Fox/><h3>{items.length ? '这个筛选下还没有足迹' : '第一段冒险，等你来开启'}</h3><p>每一次尝试都会在这里留下小小的记录。</p><button className="button primary" onClick={() => navigate('adventure')}>去冒险地图<ArrowRight size={17}/></button></div>}
    {detail && <Modal title={detail.lesson.title} onClose={() => setDetail(null)} wide><p className="muted small">{dateText(detail.started_at)} · 内容版本 {detail.content_version} · {detail.status === 'completed' ? '已完成' : '进行中'}</p>{detail.results.length ? detail.results.map((response, index) => <div className="response-record" key={response.id}><span className={`tag ${response.correct ? 'success' : 'warm'}`}>{response.correct ? response.hinted ? '提示后完成' : '本次答对' : '一次尝试'}</span><h3>{index + 1}. {response.prompt}</h3><p>我的回答：{Array.isArray(response.answer) ? response.answer.join(' → ') : response.answer}</p><p className="muted">{response.explanation}</p></div>) : <p>刚刚开始，还没有提交答案。</p>}<p className="muted small">每次尝试分别保存，复习和冒险均会记录。一次答对不代表已经掌握，之后还可以换个故事练一练。</p></Modal>}
  </section>;
}

function Stats({ data }: { data: Bootstrap }) {
  const values = [
    { label: '累计完成关卡与字卡', value: data.progress.completed.length, unit: '项', icon: Flag },
    { label: '独立首次答对', value: data.progress.independentAnswers, unit: '题', icon: CheckCircle2 },
    { label: '点亮的小星星', value: data.progress.stars, unit: '颗', icon: Star },
    { label: '有效学习时间', value: data.progress.activeMs > 0 && data.progress.activeMs < 60000 ? '<1' : Math.floor(data.progress.activeMs / 60000), unit: '分钟', icon: Clock3 },
  ];
  return <div className="stats-grid">{values.map(({ label, value, unit, icon: Icon }) => <div className="stat-card" key={label}><Icon size={21}/><span>{label}</span><strong>{value}<small>{unit}</small></strong></div>)}</div>;
}

function Notebook({ data, onStart }: { data: Bootstrap; onStart: (lesson: Lesson) => void }) {
  const completed = data.lessons.filter((lesson) => data.progress.completed.includes(lesson.id));
  return <section><PageHeader eyebrow="把发现放进口袋" title="我的侦探手册" description="每完成一个故事，就收藏一张属于你的知识卡。"><div className="button-row"><button className="text-button" onClick={() => navigate('review')}>去复习小花园<Leaf size={16}/></button><button className="text-button" onClick={() => navigate('room')}>装饰我的书屋<Home size={16}/></button></div></PageHeader>{completed.length ? <div className="notebook-grid">{completed.map((lesson) => <article className={`notebook-card ${lesson.color}`} key={lesson.id}><SceneIcon scene={lesson.scene}/><span className="tag">{lesson.category} · 已收藏</span><h2>{lesson.title}</h2><p className="notebook-intro">{lesson.intro}</p><button className="text-button" onClick={() => onStart(lesson)}>换一次尝试，巩固发现<ArrowRight size={16}/></button></article>)}</div> : <div className="empty-state paper"><BookMarked size={44}/><h3>手册的第一页，留给第一次发现</h3><p>完成一个案件，你的知识卡就会出现在这里。</p><button className="button primary" onClick={() => navigate('adventure')}>去寻找第一条线索<ArrowRight size={17}/></button></div>}</section>;
}

function Room({ data, notify }: { data: Bootstrap; notify: (text: string) => void }) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [legacy, setLegacy] = useState<string[]>([]);
  useEffect(() => {
    let alive = true; setRoom(null); setError('');
    api<RoomState>('/room').then((result) => { if (alive) setRoom(result); }).catch((e) => alive && setError(e.message));
    try { const stored = JSON.parse(localStorage.getItem(`wordland-room-${data.user?.id || 'guest'}`) || '[]'); setLegacy(Array.isArray(stored) ? [...new Set(stored.filter((item): item is string => typeof item === 'string'))] : []); } catch { setLegacy([]); }
    return () => { alive = false; };
  }, [data.user?.id, retry]);
  const placed = room?.placed || [];
  const decorations = [{ id: 'books', name: '彩色故事书', needed: 3, scene: 'mail' }, { id: 'plant', name: '窗边小花', needed: 6, scene: 'flower' }, { id: 'moon', name: '月亮小夜灯', needed: 12, scene: 'moon' }];
  async function save(value: string[]) {
    if (!room || busy) return;
    setBusy(true); setError('');
    try { setRoom(await api<RoomState>('/room', { placed: value, revision: room.revision }, 'PUT')); notify('书屋摆放已保存'); }
    catch (e) { setError((e as Error).message); if (e instanceof ApiError && e.status === 409) { try { setRoom(await api<RoomState>('/room')); } catch { /* Keep the previous scene until explicit retry. */ } } }
    finally { setBusy(false); }
  }
  function toggle(id: string) { void save(placed.includes(id) ? placed.filter((item) => item !== id) : [...placed, id]); }
  return <section><PageHeader eyebrow="给成长，留一个温暖的角落" title="我的小书屋" description="完成故事，解锁小物件。小书狐正在这里等你。"/><div className="room-scene"><div className="room-window"><div/><div/><div/><div/></div><div className="room-shelf">{placed.includes('books') && data.progress.stars >= 3 && <div className="shelf-books"><i/><i/><i/><i/><i/></div>}{placed.includes('plant') && data.progress.stars >= 6 && <SceneIcon scene="flower" className="room-plant"/>}</div><div className="room-rug"/><Fox happy/>{placed.includes('moon') && data.progress.stars >= 12 && <SceneIcon scene="moon" className="room-moon"/>}<span className="room-label">小书狐的阅读时间</span></div><p className="muted small">{data.user ? '书屋摆放已随账号保存，换设备登录后可恢复。' : '书屋与当前游客记录绑定，注册或登录时可选择一起迁移。'}</p>{error && <div className="error-message" role="alert">{error}<button className="text-button" onClick={() => setRetry((value) => value + 1)}>重新读取书屋</button></div>}{!room && !error && <p className="muted small" role="status">正在读取书屋摆放…</p>}{room?.revision === 0 && legacy.length > 0 && <button className="text-button" disabled={busy} onClick={() => save(legacy.filter((id) => decorations.some((item) => item.id === id && data.progress.stars >= item.needed)))}>导入本机旧版装饰</button>}<div className="decoration-grid">{decorations.map((item) => <article className="decoration-card" key={item.id}><SceneIcon scene={item.scene}/><h3>{item.name}</h3><p><Star size={14}/>累计点亮 {item.needed} 颗星解锁</p><button className={`button ${placed.includes(item.id) ? '' : 'primary'}`} disabled={!room || busy || data.progress.stars < item.needed} onClick={() => toggle(item.id)}>{data.progress.stars < item.needed ? <><LockKeyhole size={15}/>还差 {item.needed - data.progress.stars} 颗星</> : placed.includes(item.id) ? '收起装饰' : '摆进书屋'}</button></article>)}</div></section>;
}

function ParentView({ data, onAuth }: { data: Bootstrap; onAuth: () => void }) {
  const review = data.lessons.filter((lesson) => data.progress.review.includes(lesson.id));
  return <section><PageHeader eyebrow="看见过程，陪伴成长" title="家长空间" description="从一次次尝试里看见成长。累计概览与当前课程目标分别记录。"/>{!data.user && <div className="source-note"><ShieldCheck size={20}/><p>目前展示当前浏览器的体验记录。<button className="text-button inline" onClick={onAuth}>登录后保存到账号</button></p></div>}<Stats data={data}/><div className="parent-grid"><article className="paper parent-card"><h2>可以再陪孩子练一练</h2>{review.length ? review.map((lesson) => <div className="review-row" key={lesson.id}><SceneIcon scene={lesson.scene}/><div><strong>{lesson.subtitle}</strong><p className="muted small">曾用过提示或尝试后完成，可以换个情境再练习。</p></div></div>) : <div className="parent-empty"><Fox/><p>{data.progress.attempts.length ? '继续积累不同情境下的学习记录。' : '完成几段冒险后，这里会出现具体的陪伴建议。'}</p></div>}<div className="button-row"><button className="text-button" onClick={() => navigate('review')}>去复习花园<Leaf size={16}/></button><button className="text-button" onClick={() => navigate('history')}>查看每一次作答<ArrowRight size={16}/></button></div></article><article className="paper parent-card"><h2>一起学习的小建议</h2><ol className="parent-tips"><li><strong>给孩子一点等待时间</strong><p>先让孩子自己想，再一起看提示。</p></li><li><strong>请孩子说说“为什么”</strong><p>阅读后，可以问：“你从哪里发现的？”</p></li><li><strong>把语文带回生活</strong><p>一起读路牌、写便条、观察一株小植物。</p></li></ol><p className="muted small">独立首次答对统计冒险与复习中未使用提示、该轮首次作答正确的题目。时间为前台交互估算，不能代表注意力或掌握程度。</p></article></div><LearningEvidence data={data}/></section>;
}

function SettingsView({ data, onAuth, onSaved, onLogout }: { data: Bootstrap; onAuth: () => void; onSaved: () => Promise<void>; onLogout: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setMessage(''); const fields = Object.fromEntries(new FormData(event.currentTarget)); try { await api('/profile', { ...fields, grade: Number(fields.grade) }, 'PUT'); await onSaved(); setMessage('学习档案已保存'); } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); } }
  async function logout() { setBusy(true); try { await onLogout(); } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); } }
  return <section><PageHeader eyebrow="找到舒服的学习节奏" title="学习与账号设置" description="让文字王国，更适合你。"/><div className="settings-grid"><article className="paper settings-card"><h2><UserRound size={22}/>我的学习档案</h2>{data.user ? <form className="auth-form" onSubmit={save}><label>昵称<input name="nickname" defaultValue={data.user.nickname} required maxLength={16}/></label><label>年级<select name="grade" defaultValue={data.user.grade}>{gradeNames.map((name, i) => <option key={name} value={i + 1}>{name}年级</option>)}</select></label><label>学期<select name="semester" defaultValue={data.user.semester}><option>上册</option><option>下册</option></select></label><p className="muted small">账号：{data.user.email}<br/>切换年级不会清除历史；目前已开放一至六年级上下册能力主题课程。</p><button className="button primary" disabled={busy}>{busy ? '保存中…' : '保存学习档案'}<Check size={17}/></button>{message && <p role="status" className="form-message">{message}</p>}</form> : <><p>注册后保存学习档案，并在不同设备上继续冒险。</p><button className="button primary" onClick={onAuth}>注册 / 登录<ArrowRight size={17}/></button></>}</article><div><LearningSettings/>{data.user && <article className="paper settings-card"><h2><ShieldCheck size={22}/>账号管理</h2><p className="muted">退出后，已保存的学习记录仍在账号中。</p><button className="button" disabled={busy} onClick={logout}><LogOut size={17}/>退出当前设备</button></article>}</div></div></section>;
}
