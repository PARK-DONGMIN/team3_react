import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ScheduleList.css";

import { scheduleApi } from "../../api/schedule";
import { locationApi } from "../../api/location";

function parseDateOnly(yyyyMmDd) {
  if (!yyyyMmDd) return null;
  const d = new Date(yyyyMmDd);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ✅ D-1~D-3 = 빨간색(urgent)
const URGENT_THRESHOLD_DAYS = 3;

function ddayLabel(startDate) {
  const s = parseDateOnly(startDate);
  if (!s) return { text: "날짜 미정", type: "unknown", diff: null };

  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);
  s.setHours(0, 0, 0, 0);

  const ms = 1000 * 60 * 60 * 24;
  const diff = Math.ceil((s.getTime() - today0.getTime()) / ms);

  if (diff > 0) {
    if (diff <= URGENT_THRESHOLD_DAYS) return { text: `D-${diff}`, type: "urgent", diff };
    return { text: `D-${diff}`, type: "upcoming", diff };
  }
  if (diff === 0) return { text: "D-DAY", type: "today", diff };

  return { text: `D+${Math.abs(diff)}`, type: "past", diff };
}

const fmtWon = (n) => `${new Intl.NumberFormat("ko-KR").format(Number(n || 0))}원`;

/** ✅ 일정 ID 뽑기: 백엔드 필드명 다양해도 대응 */
function pickScheduleId(s) {
  return (
    s?.scheduleId ??
    s?.schedule_id ??
    s?.scheduleNo ??
    s?.schedule_no ??
    s?.schedule?.scheduleId ??
    s?.schedule?.schedule_no ??
    null
  );
}

/** ✅ 공유 코드/링크에서 code 추출 */
function extractShareCode(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";

  // 1) 그냥 코드만 들어온 경우
  // (너희 코드 형식이 정확히 정해져 있으면 여기 정규식 더 빡세게 바꿔도 됨)
  const looksLikeCode = /^[A-Za-z0-9_-]{4,}$/.test(raw);
  if (looksLikeCode && !raw.includes("/") && !raw.includes("?")) return raw;

  // 2) 링크 들어온 경우: URL 파싱 시도
  try {
    // http로 시작 안 하면 URL 생성이 실패할 수 있어서 보정
    const u = raw.startsWith("http://") || raw.startsWith("https://")
      ? new URL(raw)
      : new URL(raw, window.location.origin);

    // 케이스 A) /schedule/share/{code}
    const parts = u.pathname.split("/").filter(Boolean);
    const shareIdx = parts.findIndex((p) => p === "share" && parts[0] === "schedule");
    if (shareIdx >= 0 && parts[shareIdx + 1]) return parts[shareIdx + 1];

    // 케이스 B) /schedule/{id}?shareCode=XXXX (너 ScheduleDetail이 이 방식도 지원하니까)
    const q = u.searchParams.get("shareCode");
    if (q) return q;

    // 케이스 C) 그냥 경로 끝이 코드인 형태면 마지막 토큰을 code로 간주(보수적)
    if (parts.length >= 3 && parts[0] === "schedule" && parts[1] === "share" && parts[2]) return parts[2];
  } catch (err) {
    console.log(err)
    // URL 파싱 실패하면 아래로
  }

  // 3) 마지막 fallback: 문자열 중에서 /schedule/share/ 뒤 토큰 찾기
  const m = raw.match(/\/schedule\/share\/([A-Za-z0-9_-]+)/);
  if (m?.[1]) return m[1];

  // 4) query fallback: shareCode= 추출
  const m2 = raw.match(/[?&]shareCode=([A-Za-z0-9_-]+)/);
  if (m2?.[1]) return m2[1];

  return "";
}

export default function ScheduleList() {
  const nav = useNavigate();
  const userNo = Number(localStorage.getItem("userNo") || 0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [schedules, setSchedules] = useState([]);
  const [regionMap, setRegionMap] = useState({});
  const [cityMap, setCityMap] = useState({});

  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all"); // all | upcoming | today | past
  const [sort, setSort] = useState("soonest");

  // ✅ 링크/코드로 추가 모달 상태
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinValue, setJoinValue] = useState("");
  const [joinErr, setJoinErr] = useState("");

  const goCreate = () => nav("/schedule/new");
  const goAiTest = () => nav("/checklist/test");

  const openJoin = () => {
    setJoinErr("");
    setJoinValue("");
    setJoinOpen(true);
  };

  const closeJoin = () => {
    setJoinOpen(false);
    setJoinErr("");
  };

  const submitJoin = () => {
    const code = extractShareCode(joinValue);
    if (!code) {
      setJoinErr("공유 코드/링크를 확인해줘! 예) ABCD1234 또는 /schedule/share/ABCD1234");
      return;
    }
    closeJoin();
    // ✅ 공유 페이지로 이동 (ScheduleShared 라우트)
    nav(`/schedule/share/${code}`);
  };

  const goDetail = (scheduleIdLike) => {
    const sid = Number(scheduleIdLike);
    if (!Number.isFinite(sid) || sid <= 0) {
      console.warn("Invalid scheduleId:", scheduleIdLike);
      alert("일정 번호가 올바르지 않아서 상세로 이동할 수 없어요 🥺");
      return;
    }
    nav(`/schedule/${sid}`);
  };

  // ✅ API 로드
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");

        if (!userNo) {
          setSchedules([]);
          setError("로그인이 필요합니다.");
          return;
        }

        const res = await scheduleApi.listMine(userNo);

        // ✅ listMine이 배열/객체 둘 다 올 수 있는 경우 방어
        const arr = Array.isArray(res) ? res : res?.data ?? res?.list ?? [];
        setSchedules(Array.isArray(arr) ? arr : []);
      } catch (e) {
        console.error(e);
        setError(e?.response?.data?.message || e?.message || "일정 목록을 불러오지 못했습니다.");
        setSchedules([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [userNo]);

  // ✅ 지역 맵
  useEffect(() => {
    (async () => {
      try {
        const regions = await locationApi.regions();
        const rm = {};
        (Array.isArray(regions) ? regions : []).forEach((r) => {
          const id = r?.regionId ?? r?.id;
          const name = r?.regionName ?? r?.name;
          if (id != null) rm[id] = name || `지역#${id}`;
        });
        setRegionMap(rm);
      } catch (e) {
        console.warn("regions map fail", e);
      }
    })();
  }, []);

  // ✅ 도시 맵 (일정에 쓰인 region만)
  useEffect(() => {
    (async () => {
      try {
        const regionIds = Array.from(
          new Set(
            schedules
              .map((s) => s?.regionId ?? s?.region?.regionId ?? s?.region?.id)
              .filter((v) => v != null)
          )
        );

        if (regionIds.length === 0) return;

        const cm = {};
        for (const rid of regionIds) {
          try {
            const cities = await locationApi.citiesByRegion(rid);
            (Array.isArray(cities) ? cities : []).forEach((c) => {
              const id = c?.cityId ?? c?.id;
              const name = c?.cityName ?? c?.name;
              if (id != null) cm[id] = name || `도시#${id}`;
            });
          } catch (err) {
            console.error(err);
          }
        }
        setCityMap((prev) => ({ ...prev, ...cm }));
      } catch (e) {
        console.warn("cities map fail", e);
      }
    })();
  }, [schedules]);

  const view = useMemo(() => {
    const normalized = (Array.isArray(schedules) ? schedules : []).map((s, idx) => {
      const scheduleIdRaw = pickScheduleId(s);
      const scheduleId = Number(scheduleIdRaw ?? 0);
      const validId = Number.isFinite(scheduleId) && scheduleId > 0;

      const title = s?.scheduleTitle ?? s?.schedule_title ?? s?.title ?? "제목 없음";

      const startDate = s?.startDate ?? s?.start_date ?? null;
      const endDate = s?.endDate ?? s?.end_date ?? null;

      const regionId = s?.regionId ?? s?.region?.regionId ?? s?.region?.id ?? null;
      const cityId = s?.cityId ?? s?.city?.cityId ?? s?.city?.id ?? null;

      const regionName = s?.regionName ?? s?.region?.regionName ?? regionMap[regionId] ?? "-";
      const cityName = s?.cityName ?? s?.city?.cityName ?? cityMap[cityId] ?? "-";

      const diff = ddayLabel(startDate);

      return {
        raw: s,
        _key: validId ? `sid_${scheduleId}` : `invalid_${idx}`,
        validId,
        scheduleId,
        title,
        startDate,
        endDate,
        regionName,
        cityName,
        peopleCount: s?.peopleCount ?? s?.people_count ?? 1,
        budget: s?.budget ?? 0,
        isPublic: s?.isPublic ?? s?.is_public ?? "Y",
        requestDifficulty: s?.requestDifficulty ?? s?.REQUEST_DIFFICULTY ?? s?.courseType ?? "초급",
        createdAt: s?.createdAt ?? s?.createDate ?? s?.regDate ?? null,
        dday: diff,
      };
    });

    // 검색
    const kw = q.trim().toLowerCase();
    let filtered = kw
      ? normalized.filter((x) => `${x.title} ${x.regionName} ${x.cityName}`.toLowerCase().includes(kw))
      : normalized;

    // 탭 필터
    filtered = filtered.filter((x) => {
      if (tab === "all") return true;
      if (tab === "today") return x.dday.type === "today";
      if (tab === "upcoming") return x.dday.type === "upcoming" || x.dday.type === "urgent";
      if (tab === "past") return x.dday.type === "past";
      return true;
    });

    // 정렬
    filtered.sort((a, b) => {
      const aS = a.startDate ? new Date(a.startDate).getTime() : null;
      const bS = b.startDate ? new Date(b.startDate).getTime() : null;

      if (sort === "soonest") {
        const rank = (x) => {
          if (x.dday.type === "today") return 0;
          if (x.dday.type === "urgent") return 1;
          if (x.dday.type === "upcoming") return 2;
          if (x.dday.type === "unknown") return 3;
          return 4;
        };

        const ra = rank(a);
        const rb = rank(b);
        if (ra !== rb) return ra - rb;

        if (aS != null && bS != null) {
          if (a.dday.type === "past") return bS - aS;
          return aS - bS;
        }

        if (aS == null && bS != null) return 1;
        if (aS != null && bS == null) return -1;

        const aC = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bC = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (aC !== bC) return bC - aC;

        return String(a.title).localeCompare(String(b.title));
      }

      if (sort === "startAsc") return (aS ?? 0) - (bS ?? 0);
      if (sort === "startDesc") return (bS ?? 0) - (aS ?? 0);

      const aC = a.createdAt ? new Date(a.createdAt).getTime() : (aS ?? 0);
      const bC = b.createdAt ? new Date(b.createdAt).getTime() : (bS ?? 0);
      return bC - aC;
    });

    return filtered;
  }, [schedules, regionMap, cityMap, q, tab, sort]);

  return (
    <div className="sl-wrap">
      <div className="sl-head">
        <div>
          <h1 className="sl-title">내 라이딩 계획</h1>
          <p className="sl-desc">일정 추가가 고민되면 AI 테스트로 스타일을 먼저 찾아봐요.</p>
        </div>

        <div className="sl-head-actions">
          <button type="button" className="sl-btn ghost" onClick={() => window.location.reload()}>
            새로고침
          </button>

          <button type="button" className="sl-btn ai" onClick={goAiTest}>
            🤖 AI 라이딩 스타일 테스트
          </button>

          {/* ✅ 여기! “링크/코드로 추가” 버튼 */}
          <button type="button" className="sl-btn ghost" onClick={openJoin}>
            🔗 링크/코드로 추가
          </button>

          <button type="button" className="sl-btn primary" onClick={goCreate}>
            + 일정 만들기
          </button>
        </div>
      </div>

      <div className="sl-toolbar">
        <div className="sl-tabs">
          <button type="button" className={`sl-chip ${tab === "all" ? "on" : ""}`} onClick={() => setTab("all")}>
            전체
          </button>
          <button
            type="button"
            className={`sl-chip ${tab === "upcoming" ? "on" : ""}`}
            onClick={() => setTab("upcoming")}
          >
            예정
          </button>
          <button type="button" className={`sl-chip ${tab === "today" ? "on" : ""}`} onClick={() => setTab("today")}>
            오늘
          </button>
          <button type="button" className={`sl-chip ${tab === "past" ? "on" : ""}`} onClick={() => setTab("past")}>
            지난
          </button>
        </div>

        <div className="sl-right">
          <div className="sl-search">
            <span className="sl-search-ic">⌕</span>
            <input
              className="sl-search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="제목/지역/도시 검색"
            />
            {q && (
              <button type="button" className="sl-search-clear" onClick={() => setQ("")} aria-label="검색어 지우기">
                ×
              </button>
            )}
          </div>

          <select className="sl-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="soonest">다가오는 일정(가까운 순)</option>
            <option value="startAsc">시작일 오름차순</option>
            <option value="startDesc">시작일 내림차순</option>
            <option value="createdDesc">최근 생성순</option>
          </select>
        </div>
      </div>

      {error && <div className="sl-error">{error}</div>}

      {loading ? (
        <div className="sl-skeleton">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="sl-skel-card" key={i}>
              <div className="sl-skel-top" />
              <div className="sl-skel-mid" />
              <div className="sl-skel-bot" />
            </div>
          ))}
        </div>
      ) : view.length === 0 ? (
        <div className="sl-empty">
          <div className="sl-empty-title">아직 일정이 없어요 🥲</div>
          <div className="sl-empty-sub">AI 테스트로 스타일을 찾고, 첫 일정을 만들어볼까요?</div>

          <div className="sl-empty-actions">
            <button type="button" className="sl-btn ai" onClick={goAiTest}>
              🤖 AI 테스트 하러가기
            </button>

            {/* ✅ 빈 상태에서도 링크/코드 추가 버튼 */}
            <button type="button" className="sl-btn ghost" onClick={openJoin}>
              🔗 링크/코드로 추가
            </button>

            <button type="button" className="sl-btn primary" onClick={goCreate}>
              + 일정 만들기
            </button>
          </div>
        </div>
      ) : (
        <div className="sl-list">
          {view.map((x) => (
            <button
              type="button"
              key={x._key}
              className="sl-card"
              onClick={() => x.validId && goDetail(x.scheduleId)}
              disabled={!x.validId}
              title={!x.validId ? "일정 ID가 올바르지 않습니다(백엔드 응답 확인 필요)" : ""}
              style={!x.validId ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
            >
              <div className="sl-card-left">
                <div className={`sl-dday ${x.dday.type}`}>{x.dday.text}</div>

                <div className="sl-loc">
                  <span className="sl-loc-ic">📍</span>
                  <span className="sl-loc-txt">
                    {x.regionName} · {x.cityName}
                  </span>
                </div>
              </div>

              <div className="sl-card-main">
                <div className="sl-card-title">{x.title}</div>

                <div className="sl-card-sub">
                  {x.startDate && x.endDate ? (
                    <span className="sl-date">
                      {x.startDate} ~ {x.endDate}
                    </span>
                  ) : (
                    <span className="sl-date muted">날짜 미정</span>
                  )}
                  <span className="sl-dot">•</span>
                  <span>{x.peopleCount}명</span>
                  <span className="sl-dot">•</span>
                  <span>{fmtWon(x.budget)}</span>
                </div>

                <div className="sl-badges">
                  <span
                    className={`sl-badge lv-${
                      x.requestDifficulty === "초급" ? "low" : x.requestDifficulty === "중급" ? "mid" : "high"
                    }`}
                  >
                    {x.requestDifficulty}
                  </span>
                  <span className={`sl-badge ${x.isPublic === "Y" ? "pub" : "priv"}`}>
                    {x.isPublic === "Y" ? "공개" : "비공개"}
                  </span>
                </div>
              </div>

              <div className="sl-card-right" aria-hidden="true">
                <span className="sl-arrow">›</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ✅ 링크/코드 추가 모달 */}
      {joinOpen ? (
        <div className="sl-modal-backdrop" onClick={closeJoin} role="presentation">
          <div className="sl-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="sl-modal-head">
              <div className="sl-modal-title">🔗 링크/공유 코드로 일정 추가</div>
              <button type="button" className="sl-modal-x" onClick={closeJoin} aria-label="close">
                ×
              </button>
            </div>

            <div className="sl-modal-body">
              <div className="sl-modal-desc">
                공유 받은 <b>링크</b> 또는 <b>공유 코드</b>를 붙여넣어줘!
                <div className="sl-modal-ex">
                  예) <code>ABCD1234</code> 또는 <code>/schedule/share/ABCD1234</code>
                </div>
              </div>

              <input
                className="sl-modal-input"
                value={joinValue}
                onChange={(e) => {
                  setJoinValue(e.target.value);
                  setJoinErr("");
                }}
                placeholder="공유 링크 또는 공유 코드를 입력"
                onKeyDown={(e) => e.key === "Enter" && submitJoin()}
                autoFocus
              />

              {joinErr ? <div className="sl-modal-err">{joinErr}</div> : null}
            </div>

            <div className="sl-modal-actions">
              <button type="button" className="sl-btn ghost" onClick={closeJoin}>
                취소
              </button>
              <button type="button" className="sl-btn primary" onClick={submitJoin}>
                추가(이동)
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
