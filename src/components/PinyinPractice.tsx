import { useState } from 'react';
import { ChevronDown, Volume2 } from 'lucide-react';
import { useLearning } from '../learning/LearningProvider';

export function PinyinPractice({ tokens }: { tokens: string[] }) {
  const { read, readingLabel } = useLearning();
  const [open, setOpen] = useState(false);
  return <section className="pinyin-practice" aria-label="拼音发音练习">
    <div className="practice-top"><div><Volume2 size={19}/><strong>拼音跟读</strong></div><button className="text-button" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? '收起' : `${tokens.length} 张发音卡`}<ChevronDown size={16}/></button></div>
    {open && <><p className="muted small">点卡片听发音；拼读时声母轻短，韵母连贯。中文音色设置不改变这些示范音。</p><div className="pinyin-sound-cards">{tokens.map((token) => <button key={token} className={readingLabel === `拼音示范：${token}` ? 'playing' : ''} aria-label={`听拼音 ${token}`} onClick={() => read(token)}><span lang="zh-Latn">{token}</span><Volume2 size={14}/></button>)}</div><button className="text-button" onClick={() => read(tokens.join('，'))}><Volume2 size={16}/>按顺序听一遍</button><p className="muted small">声母卡使用呼读音示范；部分韵母为音节录音的韵母段剪辑。<a href="/audio/pinyin/ATTRIBUTION.md" target="_blank" rel="noreferrer">音频来源与说明 ↗</a></p></>}
  </section>;
}
