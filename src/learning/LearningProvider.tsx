import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ReadingPlayer, readingSegments } from './pinyinSpeech';

type Preferences = { voice: boolean; autoRead: boolean; effects: boolean; pinyin: boolean; voiceURI: string; rate: number };
type Sound = 'tap' | 'correct' | 'retry' | 'complete';
type Learning = {
  preferences: Preferences; update: (values: Partial<Preferences>) => void;
  voices: SpeechSynthesisVoice[]; supported: boolean; needsActivation: boolean; notice: string; readingLabel: string;
  read: (text: string, automatic?: boolean) => void; stop: () => void;
  scheduleRead: (text: string) => void;
  activate: () => void; sound: (kind: Sound) => void;
};
const LearningContext = createContext<Learning | null>(null);
const defaults: Preferences = { voice: true, autoRead: true, effects: true, pinyin: true, voiceURI: '', rate: 0.85 };
function storedPreferences(): Preferences {
  try {
    const saved = JSON.parse(localStorage.getItem('wordland-learning') || '{}');
    const result = { ...defaults };
    for (const key of ['voice', 'autoRead', 'effects', 'pinyin'] as const) if (typeof saved[key] === 'boolean') result[key] = saved[key];
    if (typeof saved.voiceURI === 'string') result.voiceURI = saved.voiceURI;
    if (typeof saved.rate === 'number' && saved.rate >= 0.65 && saved.rate <= 1.15) result.rate = saved.rate;
    if (!localStorage.getItem('wordland-learning') && localStorage.getItem('wordland-voice') === 'off') result.voice = false;
    return result;
  } catch { return defaults; }
}

export function LearningProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(storedPreferences);
  const prefs = useRef(preferences);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const voiceList = useRef<SpeechSynthesisVoice[]>([]);
  const supported = 'speechSynthesis' in window;
  const active = useRef(navigator.userActivation?.hasBeenActive || false);
  const [needsActivation, setNeedsActivation] = useState(!active.current);
  const [notice, setNotice] = useState('');
  const [readingLabel, setReadingLabel] = useState('');
  const player = useRef(new ReadingPlayer());
  const request = useRef(0);
  const pending = useRef<{ text: string; automatic: boolean } | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const autoTimer = useRef<number | null>(null);
  const stop = useCallback(() => {
    if (autoTimer.current !== null) { window.clearTimeout(autoTimer.current); autoTimer.current = null; }
    pending.current = null;
    request.current++; player.current.stop(); setReadingLabel('');
  }, []);
  const read = useCallback((text: string, automatic = false) => {
    if (autoTimer.current !== null) { window.clearTimeout(autoTimer.current); autoTimer.current = null; }
    if (!text || !prefs.current.voice || (automatic && !prefs.current.autoRead) || document.hidden) return;
    pending.current = { text, automatic };
    if (!active.current) { setNeedsActivation(true); return; }
    const list = voiceList.current;
    const selected = list.find((item) => item.voiceURI === prefs.current.voiceURI) || list.find((item) => /^zh[-_]CN$/i.test(item.lang)) || list[0];
    const needsChineseVoice = readingSegments(text).some((segment) => segment.type === 'text' && /[\p{Script=Han}\d]/u.test(segment.text));
    if (!selected && needsChineseVoice) { setNotice('正在等待设备中文音色；拼音示范卡仍可单独播放。'); return; }
    const current = ++request.current;
    pending.current = null; setNotice('');
    void player.current.play(text, { voice: selected, rate: prefs.current.rate, onLabel: (label) => { if (current === request.current) setReadingLabel(label); } }).catch((error: Error) => {
      if (current !== request.current) return;
      if (error.name === 'NotAllowedError') {
        active.current = false; setNeedsActivation(true); pending.current = { text, automatic };
        setNotice('浏览器需要一次点击，请点“开启声音”后继续。');
      } else setNotice(error.message || '朗读暂时不可用，请重试。');
    });
  }, []);
  const scheduleRead = useCallback((text: string) => {
    stop();
    autoTimer.current = window.setTimeout(() => read(text, true), 180);
  }, [read, stop]);
  const sound = useCallback((kind: Sound) => {
    if (!prefs.current.effects || !active.current || document.hidden) return;
    try {
      const ctx = audio.current || (audio.current = new AudioContext());
      void ctx.resume().catch(() => {});
      if (ctx.state !== 'running') return;
      const notes = kind === 'complete' ? [523.25, 659.25, 783.99, 1046.5] : kind === 'correct' ? [659.25, 880] : kind === 'retry' ? [392, 349.23] : [620];
      notes.forEach((frequency, index) => {
        const at = ctx.currentTime + index * 0.105;
        const oscillator = ctx.createOscillator(); const gain = ctx.createGain();
        oscillator.type = 'sine'; oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(kind === 'tap' ? 0.025 : 0.045, at + 0.012); gain.gain.exponentialRampToValueAtTime(0.001, at + 0.14);
        oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(at); oscillator.stop(at + 0.16);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      });
    } catch { /* Text interactions remain usable if Web Audio is unavailable. */ }
  }, []);
  const activate = useCallback(() => {
    active.current = true; setNeedsActivation(false);
    if (prefs.current.effects) {
      try { audio.current ||= new AudioContext(); void audio.current.resume().catch(() => {}); } catch { /* Optional audio. */ }
    }
    if (pending.current) read(pending.current.text, pending.current.automatic);
  }, [read]);
  const update = useCallback((values: Partial<Preferences>) => {
    const next = { ...prefs.current, ...values }; prefs.current = next; setPreferences(next);
    try { localStorage.setItem('wordland-learning', JSON.stringify(next)); } catch { /* In-memory settings work when storage is blocked. */ }
    if (values.voice === false || values.autoRead === false) stop();
    if (values.voice === true && !active.current) setNeedsActivation(true);
  }, [stop]);
  useEffect(() => {
    if (!supported) return;
    const load = () => {
      const list = window.speechSynthesis.getVoices().filter((item) => /^(zh|cmn|yue)(-|_|$)/i.test(item.lang));
      voiceList.current = list; setVoices(list);
      if (list.length && pending.current && active.current) read(pending.current.text, pending.current.automatic);
    };
    load(); window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, [supported, read]);
  useEffect(() => {
    const interact = (event: Event) => { if (event.isTrusted && !active.current) activate(); };
    const click = (event: MouseEvent) => {
      if ((event.target as Element)?.closest('button:not(:disabled), a, input[type="checkbox"], select')) sound('tap');
    };
    const visibility = () => { if (document.hidden) stop(); };
    document.addEventListener('pointerdown', interact, true); document.addEventListener('keydown', interact, true);
    document.addEventListener('click', click, true); document.addEventListener('visibilitychange', visibility);
    return () => {
      document.removeEventListener('pointerdown', interact, true); document.removeEventListener('keydown', interact, true);
      document.removeEventListener('click', click, true); document.removeEventListener('visibilitychange', visibility); stop();
    };
  }, [activate, sound, stop]);
  return <LearningContext.Provider value={{ preferences, update, voices, supported, needsActivation, notice, readingLabel, read, scheduleRead, stop, activate, sound }}>{children}</LearningContext.Provider>;
}

export function useLearning() {
  const context = useContext(LearningContext);
  if (!context) throw new Error('LearningProvider is required');
  return context;
}

export function useAutoRead(text: string) {
  const { scheduleRead, stop, preferences: { voice, autoRead } } = useLearning();
  useEffect(() => {
    if (!text || !voice || !autoRead) return;
    // A short delay avoids duplicate narration during StrictMode and fast navigation.
    scheduleRead(text);
    return stop;
  }, [text, voice, autoRead, scheduleRead, stop]);
}
