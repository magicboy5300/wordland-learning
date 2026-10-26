import { PageHeader } from './PageHeader';
import { gradeLabel } from '../curriculum';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Map, Volume2 } from 'lucide-react';
import type { Lesson, Progress } from '../types';
import { LessonCover } from './LessonCover';
import { PinyinText } from './PinyinText';

type CourseProps = { grade: number; lessons: Lesson[]; progress: Progress; semester: string };
function groupRoutes(lessons: Lesson[]) {
  return [...new Set(lessons.map((lesson) => lesson.unit || 'all'))].map((id) => {
    const items = lessons.filter((lesson) => (lesson.unit || 'all') === id);
    return { id, title: items[0].unitTitle || '故事小站', subtitle: items[0].unitSubtitle || '', items };
  });
}

export function AdventureCourses({ grade, focus, lessons, progress, semester, onOpenRoute }: CourseProps & { focus?: string; onOpenRoute: (unit: string) => void }) {
  const completedIds = progress.latestCompleted || progress.completed;
  const units = groupRoutes(lessons);
  return <section className="curriculum-section" aria-label={`${semester}主题课程`}>
    <div className="curriculum-heading"><div><span className="eyebrow">选一条路线，开启一段发现</span><h2><Map size={22}/>{gradeLabel(grade)}{semester}学习路线</h2><p>{focus || '识字、阅读与表达，按自己的节奏前进。'}</p></div><span className="curriculum-count">{units.length} 条路线 · {lessons.length} 个故事</span></div>
    <div className={`unit-map ${units.length > 6 ? 'many-units' : ''}`} aria-label="选择学习路线">{units.map((unit, index) => {
      const finished = unit.items.filter((lesson) => completedIds.includes(lesson.id)).length;
      const complete = finished === unit.items.length;
      return <button key={unit.id} className={`unit-stop ${complete ? 'route-completed' : ''}`} onClick={() => onOpenRoute(unit.id)}>
        <span className="unit-stop-number">{complete ? <CheckCircle2 size={19}/> : String(index + 1).padStart(2, '0')}</span>
        <strong><PinyinText text={unit.title}/></strong><small>{unit.subtitle}</small>
        <span className="unit-stop-progress" role="progressbar" aria-label={`${unit.title}完成进度`} aria-valuemin={0} aria-valuemax={unit.items.length} aria-valuenow={finished}><span style={{ width: `${finished / unit.items.length * 100}%` }}/></span>
        <span className="route-stop-footer"><span>{complete ? '路线已完成' : `已完成 ${finished} / ${unit.items.length} 个故事`}</span><span>进入路线<ArrowRight size={15}/></span></span>
      </button>;
    })}</div>
  </section>;
}

export function AdventureRoute({ grade, lessons, progress, semester, unitId, loadingLesson, onStart, onBack }: CourseProps & { unitId: string; loadingLesson: string; onStart: (lesson: Lesson) => void; onBack: () => void }) {
  const unit = groupRoutes(lessons).find((item) => item.id === unitId);
  const completedIds = progress.latestCompleted || progress.completed;
  if (!unit) return <section className="empty-state"><Map/><h2>还没有找到这条路线</h2><button className="button primary" onClick={onBack}><ArrowLeft size={17}/>返回冒险地图</button></section>;
  const finished = unit.items.filter((lesson) => completedIds.includes(lesson.id)).length;
  return <section className="adventure-route-page" aria-label="路线故事列表">
    <PageHeader eyebrow={<button className="text-button route-back" onClick={onBack}><ArrowLeft size={16}/>返回冒险地图 · {gradeLabel(grade)}{semester}</button>} title={<PinyinText text={unit.title}/>} description={<>{unit.subtitle}<span className="route-header-count" role="status">已完成 {finished} / {unit.items.length} 个故事</span></>}/>
    <div className="route-story-progress" role="progressbar" aria-label="路线完成进度" aria-valuemin={0} aria-valuemax={unit.items.length} aria-valuenow={finished}><span style={{width: `${finished / unit.items.length * 100}%`}}/></div>
    <p className="route-story-tip">{finished === unit.items.length ? '这条路线的故事都学完了，随时可以再回来发现新线索。' : '选择一个故事开始学习。完成后，这里会自动留下你的完成标记。'}</p>
    <div className="lesson-grid">{unit.items.map((lesson, index) => {
      const completed = completedIds.includes(lesson.id);
      const ongoing = progress.attempts.some((attempt) => attempt.lesson_id === lesson.id && attempt.status === 'in_progress' && attempt.content_version === lesson.version);
      const state = completed ? 'completed' : ongoing ? 'ongoing' : 'unstarted';
      return <button key={lesson.id} className={`lesson-card ${lesson.color} ${completed ? 'completed' : ''}`} onClick={() => onStart(lesson)} disabled={!!loadingLesson}>
        <div className="lesson-card-top"><span className="lesson-number">{String(index + 1).padStart(2, '0')}</span><span className="card-category">{lesson.category}</span><span className={`story-status ${state}`}>{completed ? <CheckCircle2 size={14}/> : ongoing ? <Clock3 size={14}/> : null}{completed ? '已完成' : ongoing ? '学习中' : '未开始'}</span></div>
        <LessonCover lesson={lesson} className="lesson-scene"/><h3><PinyinText text={lesson.title}/></h3><p><PinyinText text={lesson.subtitle}/></p>
        {!!lesson.activities?.length && <span className="has-pinyin-audio">含说写实践 · {lesson.activities.length} 项</span>}
        {lesson.practice && <span className="has-pinyin-audio"><Volume2 size={12}/>含拼音发音卡</span>}
        <div className="lesson-card-bottom"><span><Clock3 size={13}/>{lesson.minutes} 分钟</span><span className="lesson-card-action">{loadingLesson === lesson.id ? '正在打开' : completed ? '再学一次' : ongoing ? '继续学习' : '开始故事'}<ArrowRight size={16}/></span></div>
      </button>;
    })}</div>
  </section>;
}
