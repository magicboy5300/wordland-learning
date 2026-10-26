import { customPinyin, pinyin } from 'pinyin-pro';

// Phrase overrides keep the adverb particle 地 distinct from 地点 / 土地.
customPinyin({
  '快乐地': 'kuài lè de', '清楚地': 'qīng chu de', '轻轻地': 'qīng qīng de',
  '慢慢地': 'màn màn de', '高高地': 'gāo gāo de', '真诚地': 'zhēn chéng de',
  '认真地': 'rèn zhēn de', '悄悄地': 'qiāo qiāo de', '开心地': 'kāi xīn de',
  '长大': 'zhǎng dà', '长得': 'zhǎng de', '长长': 'cháng cháng', '音乐': 'yīn yuè',
  '数一数': 'shǔ yi shǔ',
});

export function phonetics(text: string, context?: string) {
  return pinyin(text, { type: 'all', toneSandhi: true }).map(({ origin, pinyin: reading, isZh }) => ({
    origin, isZh: isZh && !['丨', '丶'].includes(origin),
    // In this measure-word activity an isolated 只 means zhī, not zhǐ.
    reading: ['mail-2', 'review-size-amount-2'].includes(context || '') && origin === '只' ? 'zhī' : reading,
  }));
}
