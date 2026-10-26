import type { ReactNode } from 'react';
import { SoundBar } from './SoundBar';

export function PageHeader({ title, eyebrow, description, meta, children }: { title: ReactNode; eyebrow?: ReactNode; description?: ReactNode; meta?: ReactNode; children?: ReactNode }) {
  return <header className="page-intro page-header">
    <div className="page-header-copy">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <div className="page-header-title"><h1>{title}</h1>{meta}</div>
      {description && <p>{description}</p>}
      {children}
    </div>
    <SoundBar compact/>
  </header>;
}
