import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, Mail, ShieldCheck } from 'lucide-react';
import { api } from '../api';
import { Modal } from './Modal';
import { Fox } from './Art';

export function AuthModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => Promise<void> }) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [importGuest, setImportGuest] = useState(true);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setBusy(true);
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    try { await api(`/auth/${mode}`, { ...fields, importGuest }); await onSuccess(); onClose(); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  return <Modal title="把每一次发现，悄悄收藏" onClose={onClose}>
    <div className="auth-welcome"><Fox happy/><div><strong>和小书狐一起长大</strong><p>登录后，在不同设备上继续你的冒险。</p></div></div>
    <div className="segmented"><button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(''); setImportGuest(true); }}>创建账号</button><button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); setImportGuest(false); }}>已有账号</button></div>
    <form onSubmit={submit} className="auth-form">
      {mode === 'register' && <label>小侦探的昵称<input name="nickname" placeholder="例如：小栗子" maxLength={16} required autoComplete="nickname"/></label>}
      <label>家长邮箱<div className="input-icon"><Mail size={17}/><input name="email" type="email" placeholder="your@email.com" required autoComplete="email"/></div></label>
      <label>密码<input name="password" type="password" placeholder={mode === 'register' ? '至少 8 位，请妥善保存' : '输入你的密码'} minLength={mode === 'register' ? 8 : 1} maxLength={128} required autoComplete={mode === 'register' ? 'new-password' : 'current-password'}/></label>
      <label className="checkbox-label"><input type="checkbox" checked={importGuest} onChange={(e) => setImportGuest(e.target.checked)}/>把当前浏览器的体验记录带到这个账号</label>
      {error && <p className="error-message" role="alert">{error}</p>}
      <button className="button primary full" disabled={busy}>{busy ? '正在连接你的书屋…' : mode === 'register' ? '创建账号，开始冒险' : '登录，继续冒险'}<ArrowRight size={18}/></button>
    </form>
    <p className="muted small auth-note"><ShieldCheck size={15}/>账号由家长管理，孩子可使用昵称。当前暂不支持邮件找回，请记住密码。</p>
  </Modal>;
}
