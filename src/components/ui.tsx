import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';

export function PageHead({
  eyebrow,
  title,
  sub,
  desc,
  side,
}: {
  eyebrow: string;
  title: ReactNode;
  sub?: ReactNode;
  desc?: ReactNode;
  side?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div className="page-head-main">
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="page-title">
          <span>{title}</span>
          {sub ? <small>{sub}</small> : null}
        </h1>
        {desc ? <div className="page-desc">{desc}</div> : null}
      </div>
      {side ? <div className="page-head-side">{side}</div> : null}
    </header>
  );
}

export function Card({
  icon,
  kicker,
  title,
  actions,
  children,
  className = '',
  hint,
}: {
  icon?: ReactNode;
  kicker?: string;
  title?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  hint?: ReactNode;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || icon) && (
        <div className="card-head">
          {icon ? <div className="card-icon">{icon}</div> : null}
          <div>
            {kicker ? <div className="card-kicker">{kicker}</div> : null}
            {title ? <h2 className="card-title">{title}</h2> : null}
          </div>
          {actions ? <div className="card-head-actions">{actions}</div> : null}
        </div>
      )}
      {hint ? <div className="card-hint">{hint}</div> : null}
      {children}
    </section>
  );
}

export function Modal({
  onClose,
  children,
  size = '',
  label,
}: {
  onClose: () => void;
  children: ReactNode;
  size?: '' | 'sm' | 'md' | 'lg';
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // With stacked modals (e.g. a task opened from the day sheet), only the topmost closes.
        const all = document.querySelectorAll('.modal');
        if (all[all.length - 1] === ref.current) closeRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    const prev = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      const el = ref.current?.querySelector<HTMLElement>('[data-autofocus]') ?? ref.current;
      el?.focus();
    }, 20);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
      prev?.focus?.();
    };
  }, []);
  return createPortal(
    <div
      className="scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`modal ${size}`} role="dialog" aria-modal="true" aria-label={label} ref={ref} tabIndex={-1}>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ModalHead({ kicker, title, onClose }: { kicker?: string; title: ReactNode; onClose: () => void }) {
  return (
    <div className="modal-head">
      <div>
        {kicker ? <div className="k">{kicker}</div> : null}
        <h3>{title}</h3>
      </div>
      <button className="icon-btn" onClick={onClose} aria-label="닫기">
        <X />
      </button>
    </div>
  );
}

export function PrevNext({
  onPrev,
  onNext,
  children,
}: {
  onPrev: () => void;
  onNext: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="navgroup">
      <button className="icon-btn" onClick={onPrev} aria-label="이전">
        <ChevronLeft />
      </button>
      {children}
      <button className="icon-btn" onClick={onNext} aria-label="다음">
        <ChevronRight />
      </button>
    </div>
  );
}

/** A button that opens the native date picker. */
export function DatePickButton({
  value,
  onChange,
  label = '날짜 선택',
  type = 'date',
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  type?: 'date' | 'month';
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <span className="rel">
      <button
        className="btn btn-outline"
        onClick={() => {
          const el = ref.current;
          if (!el) return;
          try {
            el.showPicker();
          } catch {
            el.focus();
            el.click();
          }
        }}
      >
        <CalendarDays /> {label}
      </button>
      <input
        ref={ref}
        className="date-hidden"
        type={type}
        value={value}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => e.target.value && onChange(e.target.value)}
      />
    </span>
  );
}

export function Seg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

export function snippet(text: string, q: string, len = 80) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text.slice(0, len);
  const start = Math.max(0, i - 24);
  return (start > 0 ? '…' : '') + text.slice(start, start + len).replace(/\n/g, ' ');
}
