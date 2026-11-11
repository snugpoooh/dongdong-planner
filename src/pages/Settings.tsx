import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Download, LogOut, Plus, Upload, X } from 'lucide-react';
import { Card, PageHead, Seg } from '../components/ui';
import { exportData, initialData, useStore } from '../store/store';
import { useUi } from '../store/ui';
import { uid } from '../lib/id';
import { sampleData } from '../lib/sample';
import { todayKey } from '../lib/date';
import type { PlannerData, Role } from '../store/types';
import { flushSync, signOutAndClear, useAuth } from '../lib/sync';
import { authMessage, supabase } from '../lib/supabase';

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

function AccountCard() {
  const email = useAuth((s) => s.session?.user.email);
  const lastSyncedAt = useAuth((s) => s.lastSyncedAt);
  const notify = useUi((s) => s.notify);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);

  const changePassword = async () => {
    if (pw.length < 8) return notify('비밀번호는 8자 이상이어야 합니다.');
    if (pw !== pw2) return notify('비밀번호가 서로 다릅니다.');
    setBusy(true);
    const { error } = await supabase!.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return notify(authMessage(error));
    setPw('');
    setPw2('');
    notify('비밀번호를 바꿨습니다.');
  };

  const logout = async () => {
    const saved = await flushSync();
    if (!saved && !window.confirm('아직 계정에 저장되지 않은 변경이 있습니다. 지금 로그아웃하면 이 변경은 사라집니다. 계속할까요?')) return;
    await signOutAndClear();
  };

  const deleteAccount = async () => {
    if (!window.confirm('계정을 삭제할까요? 계정과 모든 플래너 기록이 지워지며 되돌릴 수 없습니다.')) return;
    const typed = window.prompt('확인을 위해 이메일 주소를 입력하세요.');
    if (typed?.trim().toLowerCase() !== email?.toLowerCase()) return notify('이메일이 일치하지 않아 취소했습니다.');
    const { error } = await supabase!.rpc('delete_my_account');
    if (error) return notify(authMessage(error));
    await signOutAndClear();
  };

  return (
    <Card kicker="Account" title="계정">
      <div className="settings-row">
        <span className="small" style={{ fontWeight: 700 }}>
          로그인 계정
        </span>
        <span className="spacer" />
        <span className="small">{email}</span>
      </div>
      {lastSyncedAt && (
        <div className="tiny muted" style={{ marginBottom: 8 }}>
          마지막 동기화 {new Date(lastSyncedAt).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })}
        </div>
      )}
      <div className="divider" />
      <label className="field-label">비밀번호 변경</label>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <input className="input" style={{ flex: '1 1 140px' }} type="password" autoComplete="new-password" placeholder="새 비밀번호 (8자 이상)" value={pw} onChange={(e) => setPw(e.target.value)} />
        <input className="input" style={{ flex: '1 1 140px' }} type="password" autoComplete="new-password" placeholder="새 비밀번호 확인" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        <button className="btn btn-soft" disabled={busy || !pw} onClick={changePassword}>
          변경
        </button>
      </div>
      <div className="divider" />
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button className="btn btn-outline" onClick={logout}>
          <LogOut /> 로그아웃
        </button>
        <span className="spacer" />
        <button className="btn btn-danger" onClick={deleteAccount}>
          계정 삭제
        </button>
      </div>
    </Card>
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
          <AccountCard />
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
              기록은 계정에 자동 저장되어 로그인한 모든 기기에서 같은 플래너가 보입니다. 따로 보관하고 싶으면 백업 파일을 내보내 두세요.
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
                  if (window.confirm('모든 기록을 지울까요? 계정에 저장된 기록도 함께 지워지며 되돌릴 수 없습니다.')) {
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
