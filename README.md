# 동동 · Digital Planner (dongdong-planner)

> 종이의 온기, 디지털의 명료함 — 삶의 방향에서 오늘의 할 일까지.

공개된 planBAE 소개 글의 기능 구성을 참고해 새로 만든 1D2P 디지털 플래너 웹앱(PWA)입니다. 트랙·역할은 설정에서 바꿀 수 있습니다.

배포 주소: https://snugpoooh.github.io/dongdong-planner/

## 실행

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/ 에 정적 파일 생성 (어느 웹 서버에 올려도 동작, base './')
npm run preview    # 빌드 결과 확인 (http://localhost:4173)
```

앱처럼 쓰기: Mac Safari → 공유 → **Dock에 추가** / iPhone·iPad Safari → 공유 → **홈 화면에 추가** / Chrome → 주소창 설치 아이콘.

## 기능 (원작 기능과의 대응)

| 영역 | 기능 |
| --- | --- |
| **Daily (1D2P)** | 왼쪽 오늘 할 일 · 오른쪽 24시간 시간표 · 아래 자유 노트. Enter로 추가, 여러 줄 붙여넣기 → 여러 업무. 분류 전 업무는 점선 상자 ‘아직 정리하지 않은 일’에 모이고 **정리하기**로 Q1–Q3 · A/B/C 분류. A 반드시 / B 하면 좋은 / C 여유가 생기면 그룹, ▲▼ 순서 변경 |
| **프랭클린 상태** | 체크칸 → ✓완료 · →연기 · ✕취소 · ⊘위임 · ●진행 중 · ☐미시작. 연기하면 그날엔 →로 남고 새 날짜에 같은 업무가 놓임. 위임은 담당자·확인일 기록 |
| **시간표** | 00:00–24:00, 빈 시간 클릭으로 일정 추가, 빨간 현재 시각선(분 단위 갱신), 겹치는 일정 나란히 배치, ◇ 종료 시간 미정, 24시간 ↔ 목록 전환, 반복 일정(매일/매주/매월/매년), 종일·여러 날 일정 |
| **Weekly** | 월–주일 7열 24시간 시간표, 오늘 열 강조, 토/주일 색, 빈 칸 클릭 → 일정, 날짜 클릭 → Daily |
| **Monthly** | 달력/목록 전환, 칸에 일정과 업무 수, 날짜 숫자 → Daily, 칸·+ → 그날 계획 확인과 추가. 이달의 방향, 중요한 목표(결과 기록), 주요업무, 연결된 일정 |
| **Yearly** | 한눈에 보는 한 해(지나온 날/오늘/남은 날/공휴일, 모바일은 점 그리드), 올해의 방향, 연간 목표(진행 단계 · 변화 기록), 주요업무, 연결된 일정 |
| **이어가기** | 끝내지 못한 목표는 자동으로 넘어가지 않음. ‘지난달/지난해 목표 이어가기’에서 직접 골라 이어감 |
| **연동** | 업무 하나가 일/주/월/연 화면과 프로젝트·목표에 함께 보임 — 옮겨 적기 없음 |
| **Weekly Compass** | 자기계발(신체·사회/감정·정신·영적) + 역할별 Big Rock, 지난주 복사, 이번 주 Daily 열기, 주간 업무, 일간 배정 업무, 연결된 일정 |
| **M/O/S** | 트랙별 사명(줄 노트) · 목표/전략 아웃라인(Tab 들여쓰기), Draft 자동 저장, **버전 확정**과 버전 이력·되돌리기 |
| **프로젝트** | 하위 업무 Enter 추가, 마감일·D-day, 진행률, 선행 업무(잠금 표시), 상세 화면 |
| **위임한 일** | 담당자별 묶음, 확인일, 상태 변경 기록, 처리 이력. Daily에 확인일이 된 위임 표시 |
| **Review** | 주간·월간·연간 같은 형식: 지난 계획 돌아보기, 세 가지 질문, 실행 기록, 다음 기간 계획 열기. 주말·월말·연말엔 Daily 위에 Review 알림(푸시·배지 없음) |
| **Inbox** | 우하단 버튼 → 빠르게 수집(구분·트랙) → 업무/일정/프로젝트로 보내기, 보류, 처리 완료 |
| **검색** | ⌘K 전체 검색, 노트 검색(자유 노트·메모·Review·목표 기록) |
| **PDF** | 일간/주간/월간/연간을 기간 지정해 A4로 출력(미리보기 → 인쇄 → PDF로 저장) |
| **테마** | 시간대에 따라 자동(기본 7–19시 라이트) · 라이트 · 다크 |
| **기타** | 휴지통(되살리기/완전 삭제), 2026–2027 한국 공휴일, 반응형(Mac·iPad 2열 / iPhone 1열·햄버거 메뉴), 오프라인 동작 |

## 데이터

- 모든 기록은 브라우저 `localStorage`(`dongdong-planner-v1`)에 자동 저장됩니다.
- **설정 → 백업 내보내기/가져오기**(JSON)로 보관하거나 다른 기기로 옮깁니다. 설정에서 예시 기록을 넣어 둘러볼 수 있습니다.
- Safari는 오래 열지 않은 웹사이트 저장소를 지울 수 있으니, Dock/홈 화면에 추가해 쓰고 가끔 백업하세요.

## 아직 없는 것

- 여러 기기 자동 동기화(원작은 iPad·iPhone 동기화) — 서버/계정이 필요해 v1에서는 백업 파일로 대신합니다.
- Google 캘린더 연동.

## 구조

```
src/
  store/      types.ts(데이터 모델) · store.ts(zustand + localStorage) · selectors.ts(일/주/월/연 투영) · ui.ts
  pages/      Daily · Weekly · Monthly · Yearly · Compass · Mos · Projects · Delegation · Review · Notes · Trash · Settings
  components/ Shell · TaskModal · StatusModal · EventModal · Timeline · PlanCards · GoalModal · DayModal · InboxModal · SearchModal · TriageModal · Print
  lib/        date · holidays · router · hooks · reminders · sample
public/       manifest.webmanifest · sw.js · icons/
```
