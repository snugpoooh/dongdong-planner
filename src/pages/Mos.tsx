import { useEffect, useRef, useState } from 'react';
import { Check, History, Plus, Route, Sparkles, Target } from 'lucide-react';
import { Card, Modal, ModalHead, PageHead, Seg } from '../components/ui';
import { emptyMos, useStore } from '../store/store';
import { useUi } from '../store/ui';
import { go } from '../lib/router';
import { uid } from '../lib/id';
import { useDraft } from '../lib/hooks';
import type { MosContent, OutlineItem } from '../store/types';

export function MosPage({ track }: { track?: string }) {
  const tracks = useStore((s) => s.settings.tracks);
  const active = tracks.find((t) => t.id === track)?.id ?? tracks[0]?.id ?? 'personal';
  const mos = useStore((s) => s.mos[active]);
  const update = useStore((s) => s.updateMosDraft);
  const draft = mos?.draft ?? emptyMos();
  const latest = mos?.versions[0];
  const same = !!latest && JSON.stringify(latest.content) === JSON.stringify(draft);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="page">
      <PageHead
        eyebrow="Mosaic Foundation"
        title="M/O/S"
        desc="사명을 서술하고, 목표와 전략을 아웃라인으로 연결합니다."
        side={
          <div className="navgroup">
            <button className="btn btn-outline" onClick={() => setHistoryOpen(true)}>
              <History /> 버전 이력{mos?.versions.length ? ` ${mos.versions.length}` : ''}
            </button>
            <button className="btn btn-primary" onClick={() => setConfirmOpen(true)}>
              <Check /> 버전 확정
            </button>
          </div>
        }
      />
      <div className="row" style={{ marginBottom: 14 }}>
        <Seg value={active} onChange={(v) => go(`mos/${v}`)} options={tracks.map((t) => ({ value: t.id, label: t.name }))} />
        <span className="spacer" />
        <span className="badge draft">{same ? `확정본 ${latest!.label}와 같음` : 'Draft · 자동 저장'}</span>
      </div>
      <div className="stack" key={active}>
        <Card icon={<Sparkles />} kicker="Mission" title="M · 사명">
          <div className="small" style={{ color: 'var(--ink-2)', margin: '-4px 0 8px' }}>
            나는 무엇을 위해 살아가나요? 내 삶이 지키고 싶은 가치는 무엇인가요?
          </div>
          <MissionField key={active} value={draft.mission} onSave={(v) => update(active, { mission: v })} />
        </Card>
        <OutlineCard
          icon={<Target />}
          kicker="Objectives"
          title="O · 목표"
          addLabel="목표 추가"
          prompt="삶의 영역들을 돌아보며 어떤 목표를 세우고 싶나요?"
          items={draft.objectives}
          onChange={(objectives) => update(active, { objectives })}
        />
        <OutlineCard
          icon={<Route />}
          kicker="Strategy"
          title="S · 전략"
          addLabel="전략 추가"
          prompt="이번 시즌 무엇에 집중하고, 어떤 좋은 것을 내려놓나요?"
          items={draft.strategies}
          onChange={(strategies) => update(active, { strategies })}
        />
      </div>
      {historyOpen && <HistoryModal track={active} onClose={() => setHistoryOpen(false)} />}
      {confirmOpen && <ConfirmModal track={active} onClose={() => setConfirmOpen(false)} />}
    </div>
  );
}

function MissionField({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [draft, update, flush] = useDraft(value, onSave, 300);
  return (
    <textarea
      className="lined"
      rows={Math.max(6, draft.split('\n').length + 2)}
      placeholder="문단으로 자유롭게 작성하세요."
      value={draft}
      onChange={(e) => update(e.target.value)}
      onBlur={flush}
      aria-label="사명"
    />
  );
}

function OutlineCard({
  icon,
  kicker,
  title,
  addLabel,
  prompt,
  items,
  onChange,
}: {
  icon: React.ReactNode;
  kicker: string;
  title: string;
  addLabel: string;
  prompt: string;
  items: OutlineItem[];
  onChange: (items: OutlineItem[]) => void;
}) {
  const refs = useRef<Record<string, HTMLInputElement | null>>({});
  const [focusId, setFocusId] = useState<string | null>(null);
  useEffect(() => {
    if (focusId) {
      refs.current[focusId]?.focus();
      setFocusId(null);
    }
  }, [focusId, items]);

  const insertAfter = (idx: number, level: number) => {
    const item = { id: uid(), text: '', level };
    const next = [...items.slice(0, idx + 1), item, ...items.slice(idx + 1)];
    onChange(next);
    setFocusId(item.id);
  };

  return (
    <Card
      icon={icon}
      kicker={kicker}
      title={title}
      actions={
        <button className="btn btn-soft" onClick={() => insertAfter(items.length - 1, 0)}>
          <Plus /> {addLabel}
        </button>
      }
    >
      <div className="small" style={{ color: 'var(--ink-2)', margin: '-4px 0 8px' }}>
        {prompt}
      </div>
      {items.length === 0 ? (
        <div className="empty">아웃라인에 첫 항목을 추가하세요.</div>
      ) : (
        <div>
          {items.map((it, i) => (
            <div key={it.id} className="outline-item" data-level={it.level} style={{ paddingLeft: it.level * 22 }}>
              <span className="bullet" />
              <input
                ref={(el) => (refs.current[it.id] = el)}
                value={it.text}
                placeholder={it.level === 0 ? '항목' : '하위 항목'}
                onChange={(e) => onChange(items.map((x) => (x.id === it.id ? { ...x, text: e.target.value } : x)))}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) return;
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    insertAfter(i, it.level);
                  } else if (e.key === 'Tab') {
                    e.preventDefault();
                    const level = e.shiftKey ? Math.max(0, it.level - 1) : Math.min(3, it.level + 1, (items[i - 1]?.level ?? -1) + 1);
                    onChange(items.map((x) => (x.id === it.id ? { ...x, level } : x)));
                  } else if (e.key === 'Backspace' && !it.text) {
                    e.preventDefault();
                    if (it.level > 0) onChange(items.map((x) => (x.id === it.id ? { ...x, level: x.level - 1 } : x)));
                    else {
                      onChange(items.filter((x) => x.id !== it.id));
                      if (items[i - 1]) setFocusId(items[i - 1].id);
                    }
                  } else if (e.key === 'ArrowUp' && items[i - 1]) {
                    refs.current[items[i - 1].id]?.focus();
                  } else if (e.key === 'ArrowDown' && items[i + 1]) {
                    refs.current[items[i + 1].id]?.focus();
                  }
                }}
              />
            </div>
          ))}
          <div className="tiny muted" style={{ marginTop: 8 }}>
            Enter 새 항목 · Tab 들여쓰기 · Shift+Tab 내어쓰기 · 빈 칸에서 Backspace 삭제
          </div>
        </div>
      )}
    </Card>
  );
}

function ConfirmModal({ track, onClose }: { track: string; onClose: () => void }) {
  const mos = useStore((s) => s.mos[track]);
  const confirmMos = useStore((s) => s.confirmMos);
  const notify = useUi((s) => s.notify);
  const n = (mos?.versions.length ?? 0) + 1;
  const [label, setLabel] = useState(`${new Date().getFullYear()} v${n}`);
  return (
    <Modal onClose={onClose} size="md" label="버전 확정">
      <ModalHead kicker="M/O/S" title="지금의 사명·목표·전략을 확정할까요?" onClose={onClose} />
      <div className="modal-body" style={{ paddingTop: 8 }}>
        <div className="small" style={{ color: 'var(--ink-2)', marginBottom: 12 }}>
          확정한 버전은 이력에 남습니다. 이후에도 Draft는 계속 고칠 수 있어요.
        </div>
        <label className="field-label">버전 이름</label>
        <input className="input" data-autofocus value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>
      <div className="modal-foot">
        <span className="spacer" />
        <button className="btn btn-ghost" onClick={onClose}>
          취소
        </button>
        <button
          className="btn btn-primary"
          onClick={() => {
            confirmMos(track, label.trim());
            notify('버전을 확정했습니다.');
            onClose();
          }}
        >
          <Check /> 확정
        </button>
      </div>
    </Modal>
  );
}

function HistoryModal({ track, onClose }: { track: string; onClose: () => void }) {
  const mos = useStore((s) => s.mos[track]);
  const restore = useStore((s) => s.restoreMos);
  const notify = useUi((s) => s.notify);
  const [sel, setSel] = useState<string | null>(mos?.versions[0]?.id ?? null);
  const v = mos?.versions.find((x) => x.id === sel);
  return (
    <Modal onClose={onClose} size="lg" label="버전 이력">
      <ModalHead kicker="M/O/S" title="버전 이력" onClose={onClose} />
      <div className="modal-body" style={{ paddingTop: 8 }}>
        {!mos?.versions.length ? (
          <div className="empty">아직 확정한 버전이 없습니다. 내용을 정리한 뒤 ‘버전 확정’을 눌러 남겨두세요.</div>
        ) : (
          <div className="grid-2 even" style={{ gridTemplateColumns: '200px 1fr' }}>
            <div>
              {mos.versions.map((x) => (
                <button key={x.id} className={`nav-item ${sel === x.id ? 'active' : ''}`} style={{ height: 'auto', padding: '8px 10px', display: 'block' }} onClick={() => setSel(x.id)}>
                  <div style={{ fontWeight: 700 }}>{x.label}</div>
                  <div className="tiny muted">{new Date(x.confirmedAt).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                </button>
              ))}
            </div>
            {v && <VersionView content={v.content} />}
          </div>
        )}
      </div>
      {v && (
        <div className="modal-foot">
          <span className="tiny muted">되돌리면 지금의 Draft가 이 버전 내용으로 바뀝니다.</span>
          <span className="spacer" />
          <button
            className="btn btn-outline"
            onClick={() => {
              restore(track, v.id);
              notify(`${v.label}로 되돌렸습니다.`);
              onClose();
            }}
          >
            이 버전으로 되돌리기
          </button>
        </div>
      )}
    </Modal>
  );
}

function VersionView({ content }: { content: MosContent }) {
  const list = (items: OutlineItem[]) =>
    items.length ? (
      items.map((it) => (
        <div key={it.id} style={{ paddingLeft: it.level * 18, fontSize: 13, padding: '2px 0 2px ' + it.level * 18 + 'px' }}>
          • {it.text}
        </div>
      ))
    ) : (
      <div className="empty">—</div>
    );
  return (
    <div>
      <div className="field-label accent">M · 사명</div>
      <div className="small" style={{ whiteSpace: 'pre-wrap', marginBottom: 14 }}>
        {content.mission || '—'}
      </div>
      <div className="field-label accent">O · 목표</div>
      <div style={{ marginBottom: 14 }}>{list(content.objectives)}</div>
      <div className="field-label accent">S · 전략</div>
      {list(content.strategies)}
    </div>
  );
}
