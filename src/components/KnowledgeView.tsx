import { PageHeader } from './PageHeader';
import {gradeLabel} from '../curriculum';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Search, SlidersHorizontal, AlertCircle, ExternalLink } from 'lucide-react';
import { api } from '../api';
import type { Bootstrap, Point } from '../types';
import { Modal } from './Modal';

const categories = ['全部', '汉字小镇', '拼音乐园', '词句花园', '阅读森林', '诗意星空', '表达工坊'];
export function KnowledgeView({ data, grade, semester }: { data: Bootstrap; grade:number; semester: string }) {
  const [query, setQuery] = useState('');
  const [term, setTerm] = useState(semester);
  const [category, setCategory] = useState('全部');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Point[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<Point | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    const timeout = setTimeout(() => {
      const params = new URLSearchParams({ grade:String(grade), q: query, category, semester: term, page: String(page) });
      api<{ items: Point[]; total: number }>(`/knowledge?${params}`).then((result) => { if (alive) { setItems(result.items); setTotal(result.total); } }).catch((error) => { if (alive) setError(error.message); }).finally(() => { if (alive) setLoading(false); });
    }, 250);
    return () => { alive = false; clearTimeout(timeout); };
  }, [grade, query, category, term, page, retry]);
  return <section className="knowledge-page">
    <PageHeader eyebrow="每个发现，都有来处" title={<>{gradeLabel(grade)}知识图鉴<span className="title-count">{data.metadata.gradeCounts?.[String(grade)] || data.metadata.pointCount}</span></>} description="从字词到故事，一起翻开语文的小世界。"/>
    <div className="knowledge-tools"><label className="search-field"><Search size={20}/><input aria-label="搜索知识点" placeholder="搜索知识点、关键词或教材章节…" value={query} maxLength={100} onChange={(e) => { setQuery(e.target.value); setPage(1); }}/></label><label className="select-control"><SlidersHorizontal size={17}/><select aria-label="筛选册次" value={term} onChange={(e) => { setTerm(e.target.value); setPage(1); }}><option>全部</option><option>上册</option><option>下册</option></select></label></div>
    <div className="filter-chips" aria-label="知识分类">{categories.map((value) => <button className={category === value ? 'active' : ''} key={value} onClick={() => { setCategory(value); setPage(1); }}>{value}</button>)}</div>
    <div className="source-note"><BookOpen size={18}/><p>已接入 {data.metadata.gradeCounts?.[String(grade)] || data.metadata.pointCount} 条来源条目，含新旧教材和相近内容。原始抽取仍待逐条核对，可用于查看来源；目前有 {data.lessons.filter((lesson)=>lesson.grade===grade).length} 个自编关卡可在冒险地图体验。</p></div>
    <div className="section-top"><p className="muted small">{loading ? '正在寻找…' : `找到 ${total} 条知识记录`}</p><a className="text-link small" href={data.metadata.source} target="_blank" rel="noreferrer">原始数据仓库<ExternalLink size={13}/></a></div>
    {error ? <div className="empty-state"><AlertCircle/><p role="alert">{error}</p><button className="button" onClick={() => setRetry((v) => v + 1)}>重新加载</button></div> : loading ? <div className="knowledge-grid">{[1, 2, 3, 4].map((n) => <div className="skeleton-card" key={n}/>)}</div> : items.length ? <div className="knowledge-grid">{items.map((point) => <button className="knowledge-card" key={point.id} onClick={() => setDetail(point)}><div className="section-top"><span className="tag">{point.category}</span><span className="muted small">{point.semesters.join(' / ')}</span></div><h3>{point.name}</h3><p>{point.objectives[0] || '查看教材章节和原始知识目标'}</p><div className="knowledge-card-foot"><span>{point.warnings.length ? '含待核对提示' : '来源条目 · 待核对'}</span><ArrowRight size={17}/></div></button>)}</div> : <div className="empty-state"><Search/><h3>这里还没找到线索</h3><p>换个关键词，或者试试其他分类。</p><button className="button" onClick={() => { setQuery(''); setCategory('全部'); setTerm('全部'); setPage(1); }}>清除筛选</button></div>}
    {!loading && !error && total > 20 && <div className="pagination"><button className="button" disabled={page === 1} onClick={() => setPage(page - 1)}><ArrowLeft size={17}/>上一页</button><span>{page} / {Math.ceil(total / 20)}</span><button className="button" disabled={page * 20 >= total} onClick={() => setPage(page + 1)}>下一页<ArrowRight size={17}/></button></div>}
    {detail && <Modal title="知识点的来处" onClose={() => setDetail(null)} wide><span className="tag">{detail.category} · {gradeLabel(grade)}{detail.semesters.join(' / ')}</span><h3 className="detail-title">{detail.name}</h3><p className="muted small">原始抽取条目尚待教学审核。抽取置信度{detail.confidence === null ? '未提供' : ` ${detail.confidence.toFixed(2)}`}，不代表正确率。</p>{detail.warnings.map((warning) => <div className="warning-box" key={warning}><AlertCircle size={18}/>{warning}</div>)}<h4>原始学习目标</h4><ul className="objective-list">{detail.objectives.map((objective) => <li key={objective}>{objective}</li>)}</ul><h4>来源教材与章节</h4>{detail.textbooks.map((book, index) => <div className="source-item" key={index}><strong>{book.textbook_title}</strong><p>{book.chapter_path.join(' → ')}</p></div>)}<p className="muted small">条目标识：{detail.id}</p></Modal>}
  </section>;
}
