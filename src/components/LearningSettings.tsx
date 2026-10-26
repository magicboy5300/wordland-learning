import { Square, Volume2 } from 'lucide-react';
import { useLearning } from '../learning/LearningProvider';

export function LearningSettings() {
  const { preferences: prefs, update, voices, read, stop, sound, supported, notice } = useLearning();
  return <article className="paper settings-card learning-settings"><h2><Volume2 size={22}/>声音与拼音</h2>
    <label className="toggle-label"><span>语音朗读<small>故事、题目和反馈可以听一听</small></span><input type="checkbox" checked={prefs.voice} onChange={(e) => update({ voice: e.target.checked })}/></label>
    <label className="toggle-label"><span>进入页面自动读<small>自动读页面引导和当前学习内容</small></span><input type="checkbox" checked={prefs.autoRead} disabled={!prefs.voice} onChange={(e) => update({ autoRead: e.target.checked })}/></label>
    <label className="voice-field">中文音色<select value={voices.some((voice) => voice.voiceURI === prefs.voiceURI) ? prefs.voiceURI : ''} disabled={!supported || !prefs.voice || !voices.length} onChange={(e) => { stop(); update({ voiceURI: e.target.value }); }}><option value="">自动选择普通话音色</option>{voices.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} · {voice.lang} · {voice.localService ? '设备' : '在线'}</option>)}</select></label>
    <p className="muted small">{!supported ? '当前浏览器不支持中文语音朗读，拼音发音卡仍可播放。' : voices.length ? `当前设备提供 ${voices.length} 个中文音色，用于中文说明和故事。拼音使用独立发音音频。` : '暂未发现中文音色，可在系统语音设置中添加；拼音示范卡仍可单独播放。'}</p>
    <label className="voice-field">朗读速度 <span>{prefs.rate.toFixed(2)} 倍</span><input type="range" min="0.65" max="1.15" step="0.05" value={prefs.rate} disabled={!prefs.voice} onChange={(e) => { stop(); update({ rate: Number(e.target.value) }); }}/></label>
    <div className="button-row"><button className="button" disabled={!prefs.voice || !voices.length} onClick={() => read('你好，我是小书狐。让我们一起读故事，发现文字里的小世界。')}><Volume2 size={16}/>试听音色</button><button className="text-button" onClick={stop}><Square size={14}/>停止朗读</button></div>
    <label className="toggle-label"><span>操作音效<small>轻点、找到线索和完成冒险时的声音</small></span><input type="checkbox" checked={prefs.effects} onChange={(e) => { update({ effects: e.target.checked }); if (e.target.checked) sound('correct'); }}/></label>
    <label className="toggle-label"><span>显示拼音<small>在题目、选项和关键学习文字上方显示</small></span><input type="checkbox" checked={prefs.pinyin} onChange={(e) => update({ pinyin: e.target.checked })}/></label>
    {notice && <p className="muted small" role="status">{notice}</p>}
    <p className="muted small">偏好保存在当前浏览器。语速只调整中文说明，拼音示范保持原音高和语速。设备标为“在线”的音色可能需要联网。</p>
  </article>;
}
