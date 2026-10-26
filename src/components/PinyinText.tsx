import { useMemo } from 'react';
import { phonetics } from '../learning/phonetics';
import { useLearning } from '../learning/LearningProvider';

export function PinyinText({ text, context }: { text: string; context?: string }) {
  const { preferences } = useLearning();
  const parts = useMemo(() => {
    const grouped: ReturnType<typeof phonetics> = [];
    for (const part of phonetics(text, context)) {
      const last = grouped.at(-1);
      if (!part.isZh && last && !last.isZh) last.origin += part.origin;
      else grouped.push({ ...part });
    }
    return grouped;
  }, [text, context]);
  if (!preferences.pinyin) return <>{text}</>;
  return <span className="pinyin-text">{parts.map((part, index) => part.isZh
    ? <ruby key={index}>{part.origin}<rt aria-hidden="true">{part.reading}</rt></ruby>
    : <span className="pinyin-literal" key={index}>{part.origin}</span>)}</span>;
}
