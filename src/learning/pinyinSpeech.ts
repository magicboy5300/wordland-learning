import recordings from './syllable-audio.json';

export type ReadingSegment = { type: 'text'; text: string } | { type: 'pinyin'; text: string; url: string } | { type: 'missing'; text: string };
const files: Record<string, string> = recordings;
const initials: Record<string, string> = { b: 'bo', p: 'po', m: 'mo', f: 'fo', d: 'de', t: 'te', n: 'ne', l: 'le', g: 'ge', k: 'ke', h: 'he', j: 'ji', q: 'qi', x: 'xi', zh: 'zhi', ch: 'chi', sh: 'shi', r: 'ri', z: 'zi', c: 'ci', s: 'si', y: 'yi', w: 'wu' };
const finals: Record<string, string> = { i: 'yi', u: 'wu', ü: 'yu', ui: 'wei', iu: 'you', ie: 'ye', üe: 'yue', in: 'yin', ing: 'ying', un: 'wen', ün: 'yun', uan: 'wan', üan: 'yuan', ia: 'ya', iao: 'yao', ian: 'yan', iang: 'yang', iong: 'yong', ua: 'wa', uai: 'wai', uang: 'wang', ueng: 'weng', uo: 'wo' };
const toneMarks: Record<string, number> = { '\u0304': 1, '\u0301': 2, '\u030c': 3, '\u0300': 4 };

export function pinyinRecording(value: string): string | null {
  let base = ''; let tone = 1;
  for (const character of value.toLowerCase().replaceAll('ɑ', 'a').replaceAll('v', 'ü').replaceAll('u:', 'ü').normalize('NFD')) {
    if (toneMarks[character]) tone = toneMarks[character];
    else if (character === '\u0308') base = base.replace(/u$/, 'ü');
    else if (/^[1-5]$/.test(character)) tone = Number(character);
    else base += character;
  }
  if (tone === 5) return null; // Missing neutral tones are never replaced by a wrong full tone.
  if (/^(j|q|x|y)ü/.test(base)) base = base.replace('ü', 'u');
  if (['o', 'eng', 'ong'].includes(base)) return `/audio/pinyin/finals/${base}${tone}.mp3`;
  const syllable = initials[base] || finals[base] || base;
  return files[`${syllable}${tone}`] || null;
}

function pinyinSegments(token: string): ReadingSegment[] {
  const direct = pinyinRecording(token);
  if (direct) return [{ type: 'pinyin', text: token, url: direct }];
  // A word can contain more than one marked syllable (e.g. nǐhǎo).
  const memo = new Map<number, ReadingSegment[] | null>();
  function divide(start: number): ReadingSegment[] | null {
    if (start === token.length) return [];
    if (memo.has(start)) return memo.get(start)!;
    for (let end = Math.min(token.length, start + 7); end > start; end--) {
      const part = token.slice(start, end); const url = pinyinRecording(part);
      if (!url) continue;
      const rest = divide(end);
      if (rest) { const result: ReadingSegment[] = [{ type: 'pinyin', text: part, url }, ...rest]; memo.set(start, result); return result; }
    }
    memo.set(start, null); return null;
  }
  return divide(0) || [{ type: 'missing', text: token }];
}

export function readingSegments(text: string): ReadingSegment[] {
  const segments: ReadingSegment[] = []; let previous = 0;
  const pattern = /[a-zA-ZɑüÜāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜê]+(?:[1-5]|:)?/gu;
  for (const match of text.matchAll(pattern)) {
    if (match.index! > previous) segments.push({ type: 'text', text: text.slice(previous, match.index) });
    segments.push(...pinyinSegments(match[0])); previous = match.index! + match[0].length;
  }
  if (previous < text.length) segments.push({ type: 'text', text: text.slice(previous) });
  return segments;
}

type PlaybackOptions = { voice?: SpeechSynthesisVoice; rate: number; onLabel: (label: string) => void };
export class ReadingPlayer {
  private generation = 0;
  private media: HTMLAudioElement | null = null;
  private utterance: SpeechSynthesisUtterance | null = null;
  private release: (() => void) | null = null;
  stop() {
    this.generation++;
    this.release?.(); this.release = null;
    if (this.media) { this.media.pause(); this.media.removeAttribute('src'); this.media.load(); this.media = null; }
    if (this.utterance && 'speechSynthesis' in window) { this.utterance = null; window.speechSynthesis.cancel(); }
  }
  async play(text: string, options: PlaybackOptions) {
    this.stop(); const generation = this.generation;
    try {
      for (const segment of readingSegments(text.replaceAll('丨', '竖笔画').replaceAll('丶', '点笔画'))) {
        if (generation !== this.generation) return;
        if (segment.type === 'missing') throw new Error(`拼音 ${segment.text} 暂缺示范音，请换用已有示范卡。`);
        if (segment.type === 'text' && !/[\p{Script=Han}\d]/u.test(segment.text)) continue;
        options.onLabel(segment.type === 'pinyin' ? `拼音示范：${segment.text}` : '正在朗读中文');
        await new Promise<void>((resolve, reject) => {
          let timer: ReturnType<typeof setTimeout>;
          let settled = false;
          const clear = () => {
            if (settled) return false;
            settled = true; clearTimeout(timer);
            if (this.release === done) this.release = null;
            return true;
          };
          const done = () => { if (clear()) resolve(); };
          const fail = (error: Error) => { if (clear()) reject(error); };
          this.release = done;
          timer = setTimeout(() => fail(new Error('朗读等待超时，请点击小喇叭重试。')), segment.type === 'pinyin' ? 15000 : 90000);
          if (segment.type === 'pinyin') {
            const media = new Audio(segment.url); this.media = media;
            media.playbackRate = 1; // Keep recorded pitch and phonetic timing unchanged.
            media.onended = done;
            media.onerror = () => fail(new Error('拼音示范音没有加载成功，请重试。'));
            void media.play().catch(fail);
          } else if (!options.voice || !('speechSynthesis' in window)) {
            fail(new Error('设备暂无中文音色；拼音示范卡仍可单独播放。'));
          } else {
            const speech = new SpeechSynthesisUtterance(segment.text); this.utterance = speech;
            speech.voice = options.voice; speech.lang = options.voice.lang; speech.rate = options.rate;
            speech.onend = done;
            speech.onerror = (event) => {
              if (generation !== this.generation) done();
              else if (event.error === 'not-allowed') fail(Object.assign(new Error('需要点击开启声音。'), { name: 'NotAllowedError' }));
              else fail(new Error('中文朗读暂时不可用，可以换一个音色。'));
            };
            window.speechSynthesis.speak(speech);
          }
        });
      }
    } catch (error) {
      if (generation === this.generation) { this.stop(); options.onLabel(''); }
      throw error;
    } finally { if (generation === this.generation) { this.media = null; this.utterance = null; options.onLabel(''); } }
  }
}
