import { useEffect, useState } from 'react';
import { CalendarDays, MapPin, Plus, RefreshCw, Trash2, TriangleAlert } from 'lucide-react';
import { Card, Modal, ModalHead } from './ui';
import { useStore } from '../store/store';
import { useUi } from '../store/ui';
import { CAL_COLORS, refreshCalendars, useGcal } from '../lib/gcal';
import { dowLong, mdDot, mdKorean, toKey } from '../lib/date';
import { uid } from '../lib/id';
import type { GCalendar } from '../store/types';

const ago = (ms: number | null | undefined) => {
  if (!ms) return '아직 안 불러옴';
  const m = Math.round((Date.now() - ms) / 60000);
  return m < 1 ? '방금' : m < 60 ? `${m}분 전` : `${Math.round(m / 60)}시간 전`;
};

/** Keeps Google calendars fresh while the planner is open. */
export function useGcalAutoRefresh() {
  const calendars = useStore((s) => s.settings.calendars);
  useEffect(() => {
    if (calendars?.length) void refreshCalendars();
  }, [calendars]);
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshCalendars();
    };
    const t = window.setInterval(onVisible, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
    };
  }, []);
}

/** Small "구글 ↻" control shown next to the timetables when calendars are connected. */
export function GcalRefresh() {
  const calendars = useStore((s) => s.settings.calendars);
  const loading = useGcal((s) => s.loading);
  const status = useGcal((s) => s.status);
  const active = (calendars ?? []).filter((c) => c.enabled);
  if (!active.length) return null;
  const errors = active.filter((c) => status[c.id]?.error);
  const last = Math.min(...active.map((c) => status[c.id]?.fetchedAt ?? 0));
  return (
    <button
      className={`btn btn-ghost btn-sm gcal-refresh ${errors.length ? 'err' : ''}`}
      onClick={() => void refreshCalendars({ force: true })}
      title={errors.length ? `불러오지 못한 캘린더: ${errors.map((c) => c.name).join(', ')}` : `구글 캘린더 · ${ago(last)} 불러옴 · 눌러서 새로고침`}
      aria-label="구글 캘린더 새로고침"
    >
      {errors.length ? <TriangleAlert /> : <RefreshCw className={loading ? 'spin' : ''} />} 구글
    </button>
  );
}

/** Read-only details for a Google Calendar event. */
export function GcalModal() {
  const o = useUi((s) => s.gcalEvent);
  const set = useUi((s) => s.set);
  if (!o?.ext) return null;
  const close = () => set({ gcalEvent: null });
  const it = o.ext.item;
  let when: string;
  if (it.allDay) {
    when = it.sd && it.ed && it.sd !== it.ed ? `${mdDot(it.sd)} – ${mdDot(it.ed)} · 종일` : `${mdKorean(o.date)} ${dowLong(o.date)} · 종일`;
  } else {
    const s = new Date(it.s);
    const e = new Date(it.e);
    const hm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const sameDay = toKey(s) === toKey(new Date(Math.max(it.e - 1, it.s)));
    when = sameDay ? `${mdKorean(toKey(s))} ${dowLong(toKey(s))} · ${hm(s)}–${hm(e)}` : `${mdDot(toKey(s))} ${hm(s)} – ${mdDot(toKey(e))} ${hm(e)}`;
  }
  return (
    <Modal onClose={close} size="md" label="구글 캘린더 일정">
      <ModalHead
        kicker={
          <span className="row" style={{ gap: 6 }}>
            <i className="cal-dot" style={{ background: o.ext.color }} /> {o.ext.calName}
          </span>
        }
        title={o.event.title}
        onClose={close}
      />
      <div className="modal-body" style={{ paddingTop: 6 }}>
        <div className="row small" style={{ gap: 8, marginBottom: 8 }}>
          <CalendarDays size={15} /> {when}
        </div>
        {o.ext.location && (
          <div className="row small" style={{ gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
            <MapPin size={15} style={{ flex: 'none', marginTop: 2 }} /> <span>{o.ext.location}</span>
          </div>
        )}
        {o.ext.description && (
          <div className="small" style={{ whiteSpace: 'pre-wrap', color: 'var(--ink-2)', background: 'var(--field)', borderRadius: 8, padding: '10px 12px', marginTop: 6 }}>
            {o.ext.description}
          </div>
        )}
        <div className="tiny muted" style={{ marginTop: 14 }}>
          구글 캘린더에서 불러온 일정입니다. 수정과 삭제는 구글 캘린더에서 하세요.
        </div>
      </div>
    </Modal>
  );
}

const ICAL_RE = /^(https:\/\/(calendar|www)\.google\.com|webcal:\/\/(calendar|www)\.google\.com)\/calendar\/ical\/.+\.ics(\?.*)?$/i;

/** Settings: connect Google calendars by their iCal address. */
export function GoogleCalendarCard() {
  const calendars = useStore((s) => s.settings.calendars) ?? [];
  const update = useStore((s) => s.updateSettings);
  const status = useGcal((s) => s.status);
  const loading = useGcal((s) => s.loading);
  const notify = useUi((s) => s.notify);
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = (next: GCalendar[]) => update({ calendars: next });

  const connect = async () => {
    const u = url.trim();
    setError(null);
    if (!ICAL_RE.test(u)) {
      setError('구글 캘린더의 iCal 주소를 붙여 넣어 주세요. https://calendar.google.com/calendar/ical/… 로 시작하고 .ics로 끝납니다.');
      return;
    }
    if (calendars.some((c) => c.url === u)) {
      setError('이미 연결한 캘린더입니다.');
      return;
    }
    const cal: GCalendar = { id: uid(), name: name.trim() || '구글 캘린더', url: u, color: CAL_COLORS[calendars.length % CAL_COLORS.length], enabled: true };
    setBusy(true);
    save([...calendars, cal]);
    await refreshCalendars({ force: true, only: cal.id });
    setBusy(false);
    const st = useGcal.getState().status[cal.id];
    if (st?.error) {
      setError(st.error);
      save(useStore.getState().settings.calendars.filter((c) => c.id !== cal.id));
      return;
    }
    if (!name.trim() && st?.feedName) {
      save(useStore.getState().settings.calendars.map((c) => (c.id === cal.id ? { ...c, name: st.feedName! } : c)));
    }
    setUrl('');
    setName('');
    notify(`구글 캘린더를 연결했습니다. 일정 ${st?.count ?? 0}개를 불러왔습니다.`);
  };

  const patch = (id: string, p: Partial<GCalendar>) => save(calendars.map((c) => (c.id === id ? { ...c, ...p } : c)));

  return (
    <Card
      kicker="Google Calendar"
      title="구글 캘린더 불러오기"
      actions={
        calendars.length > 0 ? (
          <button className="btn btn-ghost btn-sm" onClick={() => void refreshCalendars({ force: true })} disabled={loading}>
            <RefreshCw className={loading ? 'spin' : ''} /> 새로고침
          </button>
        ) : null
      }
    >
      <div className="small" style={{ color: 'var(--ink-2)', marginBottom: 10 }}>
        연결한 캘린더의 일정이 Daily와 Weekly 시간표에 함께 보입니다. 읽기 전용입니다.
      </div>
      {calendars.map((c) => {
        const st = status[c.id];
        return (
          <div className="gcal-row" key={c.id}>
            <div className="gcal-colors" role="radiogroup" aria-label={`${c.name} 색`}>
              {CAL_COLORS.map((col) => (
                <button
                  key={col}
                  role="radio"
                  aria-checked={c.color === col}
                  aria-label={col}
                  className={c.color === col ? 'on' : ''}
                  style={{ background: col }}
                  onClick={() => patch(c.id, { color: col })}
                />
              ))}
            </div>
            <input className="input" value={c.name} onChange={(e) => patch(c.id, { name: e.target.value })} aria-label="캘린더 이름" />
            <label className="row small" style={{ gap: 6, whiteSpace: 'nowrap' }}>
              <input type="checkbox" className="check" checked={c.enabled} onChange={(e) => patch(c.id, { enabled: e.target.checked })} /> 보이기
            </label>
            <button className="icon-btn plain sm" aria-label={`${c.name} 연결 끊기`} title="연결 끊기" onClick={() => save(calendars.filter((x) => x.id !== c.id))}>
              <Trash2 />
            </button>
            <div className={`gcal-status ${st?.error ? 'err' : ''}`}>{st?.error ? `⚠ ${st.error}` : st?.fetchedAt ? `일정 ${st.count}개 · ${ago(st.fetchedAt)} 불러옴` : '불러오는 중…'}</div>
          </div>
        );
      })}
      <div className={calendars.length ? 'divider' : ''} />
      <ol className="gcal-steps">
        <li>컴퓨터에서 구글 캘린더(calendar.google.com)를 엽니다.</li>
        <li>왼쪽 ‘내 캘린더’에서 캘린더 이름 옆 ⋮ 를 누르고 ‘설정 및 공유’를 고릅니다.</li>
        <li>‘캘린더 통합’의 ‘iCal 형식의 비공개 주소’를 복사합니다.</li>
        <li>아래 칸에 붙여 넣고 ‘연결’을 누릅니다.</li>
      </ol>
      <div className="row" style={{ flexWrap: 'wrap', marginTop: 8 }}>
        <input className="input" style={{ flex: '2 1 260px' }} placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="iCal 비공개 주소" />
        <input className="input" style={{ flex: '1 1 120px' }} placeholder="이름 (선택)" value={name} onChange={(e) => setName(e.target.value)} aria-label="캘린더 이름" />
        <button className="btn btn-primary" onClick={() => void connect()} disabled={busy || !url.trim()}>
          <Plus /> {busy ? '확인 중…' : '연결'}
        </button>
      </div>
      {error && (
        <div className="auth-error" role="alert" style={{ marginTop: 10 }}>
          {error}
        </div>
      )}
      <div className="tiny muted" style={{ marginTop: 10 }}>
        비공개 주소는 비밀번호처럼 다루세요. 이 주소를 아는 사람은 일정을 볼 수 있습니다. 동동에서는 내 계정에만 저장됩니다.
      </div>
    </Card>
  );
}
