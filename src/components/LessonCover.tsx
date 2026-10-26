import type { Lesson } from '../types';
import { SceneIcon } from './Art';

type Cover = { label: string; letters: string[]; kind: 'letters' | 'tones' | 'listening' | 'magic'; palette: number };

const groups: Record<string, { label: string; count: number }> = {
  vowels: { label: '单韵母', count: 6 },
  'vowels-iuu': { label: '单韵母与声母', count: 5 },
  'initials-bpmf': { label: '声母', count: 4 },
  'initials-dtnl': { label: '声母', count: 4 },
  'initials-gkh': { label: '声母', count: 3 },
  'initials-jqx': { label: '声母', count: 3 },
  'initials-zcs': { label: '平舌音', count: 3 },
  'initials-retroflex': { label: '翘舌音', count: 4 },
  'finals-aieiui': { label: '复韵母', count: 3 },
  'finals-aoouiu': { label: '复韵母', count: 3 },
  'finals-ieueer': { label: '复韵母与特殊韵母', count: 3 },
  'finals-front-nasal': { label: '前鼻韵母', count: 5 },
  'whole-syllables': { label: '整体认读 · 16 个音节', count: 6 },
};

const palettes = [
  { ink: '#73558f', soft: '#e9dff2', accent: '#b8a0ce' },
  { ink: '#52784d', soft: '#e1ecd7', accent: '#9cb887' },
  { ink: '#a06b38', soft: '#f6e7c9', accent: '#d4b174' },
  { ink: '#4a7c8c', soft: '#dcecf0', accent: '#91bbc4' },
];

function pinyinCover(lesson: Lesson): Cover | null {
  if (lesson.grade !== 1 || lesson.unit !== 'pinyin') return null;
  if (lesson.id.startsWith('listening-')) {
    return { label: `听音探险 · ${lesson.id.split('-')[2]}`, letters: lesson.practice || [], kind: 'listening', palette: 3 };
  }
  if (lesson.id === 'four-tones' || lesson.id.startsWith('tones-')) {
    return { label: lesson.id === 'four-tones' ? '认识四声' : '四声滑梯', letters: (lesson.practice || []).slice(0, 4), kind: 'tones', palette: 2 };
  }
  if (lesson.id === 'tone-changes') return { label: '变调魔法', letters: ['一', '不'], kind: 'magic', palette: 0 };
  if (lesson.id === 'neutral-tone') return { label: '轻声 · 轻轻读', letters: ['mā', 'ma'], kind: 'letters', palette: 2 };
  if (lesson.id === 'finals-back-nasal') return { label: '后鼻韵母', letters: ['ang', 'eng', 'ing', 'ong'], kind: 'letters', palette: 1 };
  const group = groups[lesson.id];
  return { label: group?.label || '拼音朋友', letters: (lesson.practice || []).slice(0, group?.count || 6), kind: 'letters', palette: lesson.id.startsWith('initials-') ? 0 : 1 };
}

/** Cover content stays with the lesson's practice cards; question artwork is separate. */
export function LessonCover({ lesson, className = '' }: { lesson: Lesson; className?: string }) {
  const cover = pinyinCover(lesson);
  if (!cover) return <SceneIcon scene={lesson.scene} className={className}/>;
  const colors = palettes[cover.palette];
  const rows = cover.letters.length > 4 ? 2 : 1;
  const columns = Math.ceil(cover.letters.length / rows);
  const tileWidth = Math.min(62, 204 / columns);
  const tileHeight = rows === 2 ? 38 : 58;
  const fontSize = rows === 2 ? 25 : 37;
  return <svg className={`pinyin-cover ${className}`} viewBox="0 0 240 138" fill="none" role="img" aria-label={`${cover.label}：${cover.letters.join('、')}`}>
    <ellipse cx="120" cy="119" rx="103" ry="10" fill={colors.soft}/>
    <path d="M29 113V94m0 7c-12 0-15-7-14-12 11 0 14 5 14 12Zm1-3c0-9 6-15 14-14 0 9-6 14-14 14Z" fill={colors.accent}/>
    <path d="m211 41 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill={colors.accent}/>
    <circle cx="30" cy="43" r="3" fill={colors.accent}/>
    {cover.letters.map((letter, index) => {
      const row = Math.floor(index / columns);
      const countInRow = Math.min(columns, cover.letters.length - row * columns);
      const x = 120 - countInRow * tileWidth / 2 + index % columns * tileWidth;
      const y = rows === 2 ? 27 + row * 43 : 37;
      const long = letter.length > 2;
      return <g key={`${letter}-${index}`}>
        <rect x={x + 3} y={y + 3} width={tileWidth - 6} height={tileHeight} rx="11" fill={colors.accent} opacity=".35"/>
        <rect x={x + 3} y={y} width={tileWidth - 6} height={tileHeight} rx="11" fill={index % 2 ? colors.soft : '#fffdf6'} stroke={colors.accent} strokeWidth="1.2"/>
        <text x={x + tileWidth / 2} y={y + tileHeight * .7} textAnchor="middle" fill={colors.ink} fontFamily="'Comic Sans MS', 'Chalkboard SE', 'Chalkboard', sans-serif" fontWeight="500" fontSize={long ? fontSize * (letter.length > 3 ? .68 : .8) : fontSize}>{letter.replace(/a/g, 'ɑ')}</text>
        {cover.kind === 'tones' && <path d={['M-9 0H9', 'M-9 5 9-5', 'M-9-4 0 5 9-5', 'M-9-5 9 5'][index]} transform={`translate(${x + tileWidth / 2} 27)`} stroke={colors.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>}
      </g>;
    })}
    {cover.kind === 'listening' && <g stroke={colors.ink} strokeWidth="2.5" strokeLinecap="round"><path d="M19 25v-5a10 10 0 0 1 20 0v5"/><rect x="17" y="21" width="5" height="10" rx="2" fill={colors.soft}/><rect x="36" y="21" width="5" height="10" rx="2" fill={colors.soft}/></g>}
    {cover.kind === 'magic' && <path d="m189 19 8 8m-2-17v8m-11 10h8m-4-5-6 6" stroke={colors.ink} strokeWidth="3" strokeLinecap="round"/>}
    <text x="120" y="135" textAnchor="middle" fill={colors.ink} fontFamily="inherit" fontSize="11" fontWeight="600" letterSpacing="1">{cover.label}</text>
  </svg>;
}
