import { useMemo, useState } from 'react';
import { NotebookText, Search } from 'lucide-react';
import { Card, Highlight, PageHead } from '../components/ui';
import { useSearch } from '../components/SearchModal';
import { useStore } from '../store/store';
import { mdDow } from '../lib/date';
import { go } from '../lib/router';

export function NotesPage() {
  const [q, setQ] = useState('');
  const hits = useSearch(q, 'notes');
  const notes = useStore((s) => s.notes);
  const recent = useMemo(
    () =>
      Object.entries(notes)
        .filter(([, v]) => v.trim())
        .sort((a, b) => (a[0] < b[0] ? 1 : -1))
        .slice(0, 30),
    [notes],
  );
  return (
    <div className="page narrow">
      <PageHead eyebrow="Notes" title="노트 검색" desc="자유 노트, 업무 메모, Review, 목표 기록에서 지난 생각을 찾습니다." />
      <div className="card" style={{ padding: 0, marginBottom: 16 }}>
        <div className="search-box" style={{ borderBottom: q ? '1px solid var(--line)' : 0 }}>
          <Search />
          <input autoFocus placeholder="찾고 싶은 단어를 입력하세요" value={q} onChange={(e) => setQ(e.target.value)} aria-label="노트 검색" />
        </div>
        {q && (
          <div>
            {hits.length === 0 && <div className="empty" style={{ padding: 18 }}>찾는 내용이 없습니다.</div>}
            {hits.map((h, i) => (
              <button key={i} className="result" onClick={h.open}>
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
        )}
      </div>
      {!q && (
        <Card icon={<NotebookText />} kicker="Recent" title="최근 자유 노트">
          {recent.length === 0 && <div className="empty">Daily의 자유 노트에 남긴 기록이 여기에 모입니다.</div>}
          {recent.map(([d, text]) => (
            <button key={d} className="result" style={{ padding: '10px 0' }} onClick={() => go(`daily/${d}`)}>
              <div className="t">{mdDow(d)}</div>
              <div className="s" style={{ whiteSpace: 'pre-wrap', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {text}
              </div>
            </button>
          ))}
        </Card>
      )}
    </div>
  );
}
