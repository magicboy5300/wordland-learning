import { Settings, Square, Volume2, VolumeX } from 'lucide-react';
import { useLearning } from '../learning/LearningProvider';

export function SoundBar({ compact = false }: { compact?: boolean }) {
  const { preferences, update, needsActivation, activate, notice, readingLabel, stop } = useLearning();
  return <div className={`sound-bar ${compact ? 'sound-bar-compact' : ''}`} aria-label="声音控制">
    <div className="sound-bar-main">{needsActivation && (preferences.voice || preferences.effects) ? <button className="text-button voice-control" aria-label="开启声音，跟小书狐听故事" title="开启声音，跟小书狐听故事" onClick={activate}><Volume2 size={17}/><span>{compact ? '开启声音' : '开启声音，跟小书狐听故事'}</span></button> : <button className="text-button voice-control" aria-label={preferences.voice ? '关闭自动朗读' : '开启自动朗读'} title={preferences.voice ? '关闭自动朗读' : '开启自动朗读'} aria-pressed={preferences.voice} onClick={() => update({ voice: !preferences.voice })}>{preferences.voice ? <Volume2 size={17}/> : <VolumeX size={17}/>}<span>朗读{preferences.voice ? '已开启' : '已关闭'}</span></button>}
      <div className="sound-bar-actions"><button className="text-button" aria-label="停止当前朗读" onClick={stop}><Square size={13}/><span>停止</span></button><a className="text-button" href="#settings" aria-label="设置音色、音效与拼音"><Settings size={16}/><span>声音设置</span></a></div></div>
    {readingLabel && <p className="reading-label" aria-live="off">{readingLabel}</p>}
    {notice && <p className="audio-notice" role="status">{notice}</p>}
  </div>;
}
