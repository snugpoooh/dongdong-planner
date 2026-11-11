import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Highlight, Modal, snippet } from './ui';
import { useStore } from '../store/store';
import { openEvent, openTask, useUi } from '../store/ui';
import { mdDow, monthLabel } from '../lib/date';
import { go } from '../lib/router';

export interface SearchHit {
  kind: string;
  title: string;
  sub: string;
  open: () => void;
  sort: string;
}

export function useSearch(q: string, scope: 'all' | 'notes' = 'all'): SearchHit[] {
  const s = useStore();
  return useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const has = (v: string | null | undefined) => !!v && v.toLowerCase().includes(term);
    const hits: SearchHit[] = [];
    for (const [date, text] of Object.entries(s.notes)) {
      if (has(text)) hits.push({ kind: '자유 노트', title: mdDow(date), sub: snippet(text, term), open: () => go(`daily/${date}`), sort: date });
    }
    for (const [key, r] of Object.entries(s.reviews)) {
      const txt = r.answers.join('\n');
      if (has(txt)) {
        const [type, period] = key.split(':');
        const label = type === 'week' ? `주간 Review · ${mdDow(period)} 주` : type === 'month' ? `월간 Review · ${monthLabel(period)}` : `연간 Review · ${period}년`;
        hits.push({ kind: 'Review', title: label, sub: snippet(txt, term), open: () => go(`review/${type}/${period}`), sort: period });
      }
    }
    for (const [key, text] of Object.entries(s.directions)) {
      if (has(text)) {
        const [type, period] = key.split(':');
        hits.push({
          kind: type === 'month' ? '이달의 방향' : '올해의 방향',
          title: type === 'month' ? monthLabel(period) : `${period}년`,
          sub: snippet(text, term),
          open: () => go(type === 'month' ? `monthly/${period}` : `yearly/${period}`),
          sort: period,
        });
      }
    }
    for (const t of s.tasks) {
      if (t.deletedAt) continue;
      if (has(t.memo) || (scope === 'all' && has(t.title))) {
        hits.push({
          kind: has(t.memo) && !has(t.title) ? '업무 메모' : '업무',
          title: t.title,
          sub: (t.date ? mdDow(t.date) + ' · ' : '') + (has(t.memo) ? snippet(t.memo, term) : ''),
          open: () => openTask(undefined, t.id),
          sort: t.date ?? t.createdAt,
        });
      }
    }
    for (const e of s.events) {
      if (e.deletedAt) continue;
      if (has(e.memo) || (scope === 'all' && has(e.title))) {
        hits.push({ kind: '일정', title: e.title, sub: mdDow(e.startDate) + (e.memo ? ' · ' + snippet(e.memo, term) : ''), open: () => openEvent(undefined, e.id), sort: e.startDate });
      }
    }
    for (const g of s.goals) {
      if (g.deletedAt) continue;
      const txt = [g.title, g.result, ...g.changes.map((c) => c.text), ...g.milestones.map((m) => m.text)].join('\n');
      if (has(txt)) {
        hits.push({
          kind: g.scope === 'month' ? '월간 목표' : '연간 목표',
          title: g.title,
          sub: g.scope === 'month' ? monthLabel(g.period) : `${g.period}년`,
          open: () => useUi.getState().set({ goalModal: g.id }),
          sort: g.period,
        });
      }
    }
    if (scope === 'all') {
      for (const p of s.projects) {
        if (!p.deletedAt && (has(p.title) || has(p.memo))) hits.push({ kind: '프로젝트', title: p.title, sub: snippet(p.memo, term), open: () => go(`projects/${p.id}`), sort: p.createdAt });
      }
      for (const [track, m] of Object.entries(s.mos)) {
        const txt = [m.draft.mission, ...m.draft.objectives.map((o) => o.text), ...m.draft.strategies.map((o) => o.text)].join('\n');
        if (has(txt)) hits.push({ kind: 'M/O/S', title: s.settings.tracks.find((t) => t.id === track)?.name ?? track, sub: snippet(txt, term), open: () => go(`mos/${track}`), sort: '' });
      }
    }
    for (const i of s.inbox) {
      if (!i.deletedAt && has(i.text)) hits.push({ kind: 'Inbox', title: i.text.split('\n')[0], sub: snippet(i.text, term), open: () => useUi.getState().set({ inboxOpen: true }), sort: i.createdAt });
    }
    return hits.sort((a, b) => (a.sort < b.sort ? 1 : -1)).slice(0, 80);
  }, [q, s, scope]);
}

export function SearchModal() {
  const open = useUi((s) => s.searchOpen);
  if (!open) return null;
  return <Inner />;
}

function Inner() {
  const set = useUi((s) => s.set);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const hits = useSearch(q);
  const close = () => set({ searchOpen: false });
  const pick = (h: SearchHit) => {
    close();
    h.open();
  };
  return (
    <Modal onClose={close} size="lg" label="검색">
      <div className="search-box">
        <Search />
        <input
          data-autofocus
          placeholder="업무, 일정, 노트, 목표, 프로젝트 검색"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSel(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSel((v) => Math.min(v + 1, hits.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSel((v) => Math.max(v - 1, 0));
            } else if (e.key === 'Enter' && hits[sel] && !e.nativeEvent.isComposing) {
              pick(hits[sel]);
            }
          }}
        />
        <span className="kbd">esc</span>
      </div>
      <div style={{ overflowY: 'auto', maxHeight: '60vh' }}>
        {q && hits.length === 0 && <div className="empty" style={{ padding: 18 }}>찾는 내용이 없습니다.</div>}
        {!q && <div className="empty" style={{ padding: 18 }}>검색어를 입력하세요.</div>}
        {hits.map((h, i) => (
          <button key={i} className={`result ${i === sel ? 'sel' : ''}`} onClick={() => pick(h)} onMouseEnter={() => setSel(i)}>
            <div className="k">{h.kind}</div>
            <div className="t">
              <Highlight text={h.title} q={q} />
            </div>
            {h.sub && (
              <div className="s">
                <Highlight text={h.sub} q={q} />
              </div>
            )}
          </button>
        ))}
      </div>
    </Modal>
  );
}
