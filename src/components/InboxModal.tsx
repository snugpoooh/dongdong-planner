import { useMemo, useState } from 'react';
import { Briefcase, CalendarPlus, Check, ListPlus, Pause, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Modal, ModalHead, Seg } from './ui';
import { useTrackName } from './tasks';
import { useStore } from '../store/store';
import { openEvent, openTask, useUi } from '../store/ui';
import { mdDot, todayKey, toKey } from '../lib/date';
import type { InboxItem, InboxKind, InboxState } from '../store/types';

const KINDS: { value: InboxKind; label: string }[] = [
  { value: 'idea', label: '아이디어' },
  { value: 'request', label: '받은 요청' },
  { value: 'task', label: '할 일' },
  { value: 'event', label: '일정' },
  { value: 'memo', label: '메모' },
];

export function InboxModal() {
  const open = useUi((s) => s.inboxOpen);
  if (!open) return null;
  return <Inner />;
}

function Inner() {
  const set = useUi((s) => s.set);
  const notify = useUi((s) => s.notify);
  const tracks = useStore((s) => s.settings.tracks);
  const inbox = useStore((s) => s.inbox);
  const { addInbox, updateInbox, resolveInbox, deleteInbox, addProject } = useStore.getState();
  const trackName = useTrackName();
  const [text, setText] = useState('');
  const [kind, setKind] = useState<InboxKind>('idea');
  const [track, setTrack] = useState<string>(tracks[0]?.id ?? '');
  const [tab, setTab] = useState<InboxState>('inbox');
  const close = () => set({ inboxOpen: false });

  const items = useMemo(() => inbox.filter((i) => !i.deletedAt && i.state === tab), [inbox, tab]);
  const counts = useMemo(() => {
    const c = { inbox: 0, held: 0, done: 0 } as Record<InboxState, number>;
    inbox.forEach((i) => !i.deletedAt && c[i.state]++);
    return c;
  }, [inbox]);

  const capture = () => {
    const v = text.trim();
    if (!v) return;
    addInbox({ text: v, kind, track: track || null });
    setText('');
    notify('Inbox에 담았습니다.');
  };

  const toTask = (i: InboxItem) => {
    resolveInbox(i.id, '업무');
    close();
    openTask({ title: i.text.split('\n')[0], memo: i.text.includes('\n') ? i.text : '', track: i.track, date: todayKey() });
  };
  const toEvent = (i: InboxItem) => {
    resolveInbox(i.id, '일정');
    close();
    openEvent({ title: i.text.split('\n')[0], memo: i.text.includes('\n') ? i.text : '', track: i.track, startDate: todayKey() });
  };
  const toProject = (i: InboxItem) => {
    addProject({ title: i.text.split('\n')[0], memo: i.text, track: i.track });
    resolveInbox(i.id, '프로젝트');
    notify('프로젝트로 보냈습니다.');
  };

  return (
    <Modal onClose={close} label="Inbox">
      <ModalHead title="Inbox" onClose={close} />
      <div className="modal-body" style={{ paddingTop: 8 }}>
        <label className="field-label" htmlFor="inbox-text">
          빠르게 수집
        </label>
        <textarea
          id="inbox-text"
          className="textarea"
          rows={3}
          data-autofocus
          placeholder="떠오른 아이디어나 받은 요청을 적으세요."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) capture();
          }}
        />
        <div className="two-col" style={{ marginTop: 12, gap: 12 }}>
          <div>
            <label className="field-label">구분</label>
            <select className="select" value={kind} onChange={(e) => setKind(e.target.value as InboxKind)}>
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">트랙</label>
            <select className="select" value={track} onChange={(e) => setTrack(e.target.value)}>
              <option value="">나중에 지정</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <span className="tiny" style={{ color: 'var(--ink-2)' }}>
            수집한 뒤 업무, 일정, 프로젝트로 보낼 수 있습니다. <span className="kbd">⌘</span>+<span className="kbd">Enter</span>
          </span>
          <span className="spacer" />
          <button className="btn btn-primary" onClick={capture} disabled={!text.trim()}>
            <Plus /> 담기
          </button>
        </div>

        <div style={{ marginTop: 18 }}>
          <Seg
            value={tab}
            onChange={setTab}
            options={[
              { value: 'inbox', label: `받은 항목${counts.inbox ? ` ${counts.inbox}` : ''}` },
              { value: 'held', label: `보류${counts.held ? ` ${counts.held}` : ''}` },
              { value: 'done', label: '처리 완료' },
            ]}
          />
        </div>
        <div style={{ marginTop: 8 }}>
          {items.length === 0 && <div className="empty" style={{ padding: '12px 0' }}>이 분류에 기록이 없습니다.</div>}
          {items.map((i) => (
            <div className="inbox-item" key={i.id}>
              <div className="txt">{i.text}</div>
              <div className="meta">
                <span>{KINDS.find((k) => k.value === i.kind)?.label}</span>
                {i.track && <span>· {trackName(i.track)}</span>}
                <span>· {mdDot(toKey(new Date(i.createdAt)))}</span>
                {i.resolvedAs && <span>· {i.resolvedAs}(으)로 보냄</span>}
              </div>
              <div className="inbox-actions">
                {i.state !== 'done' ? (
                  <>
                    <button className="btn btn-soft btn-sm" onClick={() => toTask(i)}>
                      <ListPlus /> 업무로
                    </button>
                    <button className="btn btn-soft btn-sm" onClick={() => toEvent(i)}>
                      <CalendarPlus /> 일정으로
                    </button>
                    <button className="btn btn-soft btn-sm" onClick={() => toProject(i)}>
                      <Briefcase /> 프로젝트로
                    </button>
                    {i.state === 'inbox' ? (
                      <button className="btn btn-ghost btn-sm" onClick={() => updateInbox(i.id, { state: 'held' })}>
                        <Pause /> 보류
                      </button>
                    ) : (
                      <button className="btn btn-ghost btn-sm" onClick={() => updateInbox(i.id, { state: 'inbox' })}>
                        <RotateCcw /> 받은 항목으로
                      </button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => resolveInbox(i.id, '처리')}>
                      <Check /> 처리 완료
                    </button>
                  </>
                ) : (
                  <button className="btn btn-ghost btn-sm" onClick={() => updateInbox(i.id, { state: 'inbox', resolvedAs: null, resolvedAt: null })}>
                    <RotateCcw /> 되돌리기
                  </button>
                )}
                <button className="btn btn-danger btn-sm" onClick={() => deleteInbox(i.id)} aria-label="삭제">
                  <Trash2 />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
