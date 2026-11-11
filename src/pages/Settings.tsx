import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Download, Plus, Upload, X } from 'lucide-react';
import { Card, PageHead, Seg } from '../components/ui';
import { exportData, initialData, useStore } from '../store/store';
import { useUi } from '../store/ui';
import { uid } from '../lib/id';
import { sampleData } from '../lib/sample';
import { todayKey } from '../lib/date';
import type { PlannerData, Role } from '../store/types';

function ListEditor({ items, onChange, addLabel, min = 0 }: { items: Role[]; onChange: (v: Role[]) => void; addLabel: string; min?: number }) {
  const [name, setName] = useState('');
  const add = () => {
    if (!name.trim()) return;
    onChange([...items, { id: uid(), name: name.trim() }]);
    setName('');
  };
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div>
      {items.map((it, i) => (
        <div className="tag-input" key={it.id}>
          <input className="input" value={it.name} onChange={(e) => onChange(items.map((x) => (x.id === it.id ? { ...x, name: e.target.value } : x)))} />
          <button className="icon-btn plain sm" aria-label="위로" onClick={() => move(i, -1)}>
            <ArrowUp />
          </button>
          <button className="icon-btn plain sm" aria-label="아래로" onClick={() => move(i, 1)}>
            <ArrowDown />
          </button>
          <button className="icon-btn plain sm" aria-label="삭제" disabled={items.length <= min} onClick={() => onChange(items.filter((x) => x.id !== it.id))}>
            <X />
          </button>
        </div>
      ))}
      <div className="tag-input">
        <input className="input" placeholder={addLabel} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && add()} />
        <button className="btn btn-soft" onClick={add}>
          <Plus /> 추가
        </button>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const replaceAll = useStore((s) => s.replaceAll);
  const notify = useUi((s) => s.notify);
  const fileRef = useRef<HTMLInputElement>(null);

  const download = () => {
    const blob = new Blob([JSON.stringify({ app: 'dongdong-planner', version: 1, exportedAt: new Date().toISOString(), data: exportData() }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `dongdong-backup-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importFile = async (f: File) => {
    try {
      const json = JSON.parse(await f.text());
      const data: PlannerData = json.data ?? json;
      if (!Array.isArray(data.tasks)) throw new Error('형식이 맞지 않습니다');
      if (!window.confirm('가져온 백업으로 지금의 모든 기록을 바꿀까요?')) return;
      replaceAll(data);
      notify('백업을 불러왔습니다.');
    } catch (e) {
      notify(`가져오지 못했습니다: ${(e as Error).message}`);
    }
  };

  return (
    <div className="page narrow">
      <PageHead eyebrow="Settings" title="설정" desc="트랙과 역할, 달력 표시, 백업을 관리합니다." />
      <div className="grid-2 even">
        <div className="stack">
          <Card kicker="Tracks" title="트랙" hint="업무·일정·목표를 나누는 큰 영역입니다. (예: 개인과 일)">
            <ListEditor items={settings.tracks} onChange={(tracks) => update({ tracks })} addLabel="새 트랙 이름" min={1} />
          </Card>
          <Card kicker="Roles" title="Weekly Compass 역할" hint="내가 맡은 역할마다 이번 주의 Big Rock을 고릅니다.">
            <ListEditor items={settings.roles} onChange={(roles) => update({ roles })} addLabel="새 역할 (예: 엄마, 팀장, 친구)" />
          </Card>
          <Card kicker="Sharpen the saw" title="자기계발 영역">
            <ListEditor items={settings.sawAreas} onChange={(sawAreas) => update({ sawAreas })} addLabel="새 영역" />
          </Card>
        </div>
        <div className="stack">
          <Card kicker="Calendar" title="달력과 표시">
            <div className="settings-row">
              <span className="small" style={{ fontWeight: 700 }}>
                월간 달력 시작
              </span>
              <span className="spacer" />
              <Seg
                value={String(settings.monthStartsOn)}
                onChange={(v) => update({ monthStartsOn: v === '1' ? 1 : 0 })}
                options={[
                  { value: '0', label: '일요일' },
                  { value: '1', label: '월요일' },
                ]}
              />
            </div>
            <div className="settings-row">
              <span className="small" style={{ fontWeight: 700 }}>
                일요일 표기
              </span>
              <span className="spacer" />
              <Seg
                value={settings.sundayLabel}
                onChange={(v) => update({ sundayLabel: v })}
                options={[
                  { value: '주일', label: '주일' },
                  { value: '일요일', label: '일요일' },
                ]}
              />
            </div>
            <div className="settings-row">
              <span className="small" style={{ fontWeight: 700 }}>
                자동 테마 · 라이트 시간
              </span>
              <span className="spacer" />
              <select className="select" style={{ width: 90 }} value={settings.autoLightFrom} onChange={(e) => update({ autoLightFrom: Number(e.target.value) })}>
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {h}시
                  </option>
                ))}
              </select>
              <span className="small">~</span>
              <select className="select" style={{ width: 90 }} value={settings.autoLightTo} onChange={(e) => update({ autoLightTo: Number(e.target.value) })}>
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h + 1}>
                    {h + 1}시
                  </option>
                ))}
              </select>
            </div>
            <label className="settings-row small" style={{ fontWeight: 700, cursor: 'pointer' }}>
              Review 알림 (주말·월말·연말에 Daily 위에 표시)
              <span className="spacer" />
              <input type="checkbox" className="check" checked={settings.reviewReminders} onChange={(e) => update({ reviewReminders: e.target.checked, dismissedReminders: [] })} />
            </label>
          </Card>
          <Card kicker="Data" title="저장과 백업">
            <div className="small" style={{ color: 'var(--ink-2)', marginBottom: 12 }}>
              모든 기록은 이 기기의 브라우저에 자동 저장됩니다. 다른 기기로 옮기거나 보관하려면 백업 파일을 내보내고 가져오세요.
            </div>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={download}>
                <Download /> 백업 내보내기
              </button>
              <button className="btn btn-outline" onClick={() => fileRef.current?.click()}>
                <Upload /> 백업 가져오기
              </button>
              <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
            </div>
            <div className="divider" />
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <button
                className="btn btn-soft"
                onClick={() => {
                  if (window.confirm('예시 기록으로 지금의 기록을 바꿀까요?')) {
                    replaceAll(sampleData());
                    notify('예시 기록을 넣었습니다.');
                  }
                }}
              >
                예시 기록 넣기
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  if (window.confirm('모든 기록을 지울까요? 되돌릴 수 없습니다.')) {
                    replaceAll({ ...initialData(), settings });
                    notify('모든 기록을 지웠습니다.');
                  }
                }}
              >
                모든 기록 지우기
              </button>
            </div>
          </Card>
          <Card kicker="Install" title="앱처럼 쓰기">
            <div className="small" style={{ color: 'var(--ink-2)', lineHeight: 1.7 }}>
              Mac Safari: 공유 버튼 → <b>Dock에 추가</b>
              <br />
              iPhone·iPad Safari: 공유 버튼 → <b>홈 화면에 추가</b>
              <br />
              Chrome: 주소창의 설치 아이콘 → <b>설치</b>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
