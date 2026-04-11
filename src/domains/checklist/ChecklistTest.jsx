import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getChecklistItems } from "./checklistApi";
import { DISTRICTS } from "./districtData";
import { ensureKakaoLoaded } from "../../utils/kakaoLoader";

import "./Checklist.css";

const STEPS = [
  "Location",
  "Cities",
  "Period",
  "Waypoint",
  "Mood",
  "People",
  "Activity",
  "Food",
  "Stay",
];

const REGIONS = Object.keys(DISTRICTS).sort((a, b) =>
  a.localeCompare(b, "ko")
);

// 30분 단위 선택지
const TIME_OPTIONS = (() => {
  const out = [];
  for (let h = 0; h < 24; h++) {
    out.push(`${String(h).padStart(2, "0")}:00`);
    out.push(`${String(h).padStart(2, "0")}:30`);
  }
  return out;
})();

export default function ChecklistTest() {
  const navigate = useNavigate();
  const { state } = useLocation();

  /* =========================
    출발 / 도착 지점
  ========================= */
  const [startPoint, setStartPoint] = useState("");
  const [endPoint, setEndPoint] = useState("");

  /* ========================= 
    지도 검색
  ========================= */
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const psRef = useRef(null);
  const markersRef = useRef([]);

  const [mapKeyword, setMapKeyword] = useState("");
  const [mapError, setMapError] = useState("");

  // 지도 선택 모드
  const [mapSelectMode, setMapSelectMode] = useState(null);
  // "start" | "end" | "waypoint" | null

  // 선택된 마커 관리
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  const waypointMarkersRef = useRef([]);


  /* =========================
     수정 모드 데이터
  ========================= */
  const prevGroup = state?.prevGroup || null;
  const editGroupId = prevGroup?.groupId || null;

  /* 복원 1회용 */
  const restoredRef = useRef(false);

  /* =========================
     상태
  ========================= */
  const [list, setList] = useState([]);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState({});
  const [error, setError] = useState("");

  /* =========================
     Location/Cities (신규 구조)
  ========================= */
  const [routeRegions, setRouteRegions] = useState([]); // ["서울","경기"]
  const [routeCities, setRouteCities] = useState([]); // ["성남","가평",...]
  const [openedRegions, setOpenedRegions] = useState({}); // 접기/펼치기

  /* =========================
     ✅ 경유지(사용자 희망)
     - Result/AI/Batch까지 전달할 값
  ========================= */
  const [waypointTexts, setWaypointTexts] = useState([]); // ["남이섬", "소양강댐"]
  const [waypointInput, setWaypointInput] = useState("");

  const addWaypoint = () => {
    const v = waypointInput.trim();
    if (!v) return;
    setWaypointTexts((prev) => [...prev, v]);
    setWaypointInput("");
  };

  const removeWaypoint = (idx) => {
    setWaypointTexts((prev) => prev.filter((_, i) => i !== idx));
  };

  /* =========================
     Period (기존 달력 유지 + 시간추가)
  ========================= */
  const [dateTab, setDateTab] = useState("start");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [period, setPeriod] = useState({
    startDate: "",
    endDate: "",
    days: 0,
    startTime: "",
    endTime: "",
  });

  /* =========================
     체크리스트 데이터 로드
  ========================= */
  useEffect(() => {
    getChecklistItems().then(setList);
  }, []);

  /* =========================
     ✏ 수정 모드 값 복원 (있는 값만 복원)
  ========================= */
  useEffect(() => {
    if (!prevGroup || restoredRef.current) return;
    restoredRef.current = true;

    // 1) 지역 복원
    if (Array.isArray(prevGroup.routeRegions) && prevGroup.routeRegions.length > 0) {
      setRouteRegions(prevGroup.routeRegions);
      const open = {};
      prevGroup.routeRegions.forEach((r) => (open[r] = true));
      setOpenedRegions(open);
    } else if (prevGroup.location?.region) {
      setRouteRegions([prevGroup.location.region]);
      setOpenedRegions({ [prevGroup.location.region]: true });
    }

    // 2) 도시 복원
    if (Array.isArray(prevGroup.routeCities) && prevGroup.routeCities.length > 0) {
      setRouteCities(prevGroup.routeCities);
    } else if (
      Array.isArray(prevGroup.location?.district) &&
      prevGroup.location.district.length > 0
    ) {
      setRouteCities(prevGroup.location.district);
    }

    // ✅ 2-1) 경유지 복원 (배치/그룹 구조에 따라 유연하게)
    const restoredWaypoints =
      (Array.isArray(prevGroup.routeWaypoints) && prevGroup.routeWaypoints) ||
      (Array.isArray(prevGroup.waypointTexts) && prevGroup.waypointTexts) ||
      [];
    if (restoredWaypoints.length) setWaypointTexts(restoredWaypoints);

    // 3) 기간 복원
    const loc = prevGroup.location;
    if (loc?.period) {
      setPeriod((cur) => ({
        ...cur,
        ...loc.period,
        startTime: loc.period.startTime || cur.startTime || "",
        endTime: loc.period.endTime || cur.endTime || "",
      }));

      if (loc.period?.startDate) {
        setCalendarMonth(new Date(loc.period.startDate));
      }
    }

    // 4) 체크 항목 복원
    const restored = {};
    (prevGroup.items || []).forEach((item) => {
      if (!restored[item.category]) restored[item.category] = [];
      restored[item.category].push(item.itemId);
    });
    setSelected(restored);
  }, [prevGroup]);

  const stepKey = STEPS[step];

  /* =========================
     📅 날짜 유틸
  ========================= */
  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getStartDay = (y, m) => new Date(y, m, 1).getDay();
  const formatDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const isSameDate = (a, b) => a && b && formatDate(a) === formatDate(b);
  const isToday = (d) => formatDate(d) === formatDate(new Date());
  const isWeekend = (d) => [0, 6].includes(d.getDay());

  const onDateClick = (date) => {
    if (dateTab === "start") {
      setPeriod((cur) => ({ ...cur, startDate: formatDate(date), endDate: "", days: 0 }));
      setDateTab("end");
    } else {
      if (!period.startDate) return;

      const start = new Date(period.startDate);
      const end = new Date(date);

      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      if (end < start) return;

      const days = Math.round((end - start) / 86400000) + 1;

      setPeriod((cur) => ({
        ...cur,
        endDate: formatDate(date),
        days,
      }));
    }
  };

  /* =========================
     Location: 지역 다중 선택 (바둑판)
  ========================= */
  const toggleRegion = (r) => {
    setRouteRegions((prev) => {
      const exists = prev.includes(r);
      const next = exists ? prev.filter((v) => v !== r) : [...prev, r];

      // 지역 제거 시 해당 지역 도시도 제거
      if (exists) {
        const allowed = new Set(next.flatMap((rg) => DISTRICTS[rg] || []));
        setRouteCities((citiesPrev) => citiesPrev.filter((c) => allowed.has(c)));
      }

      return next;
    });

    setOpenedRegions((o) => ({ ...o, [r]: true }));
  };

  /* =========================
     Cities: 지역별 접기/펼치기 + 도시 다중 선택
  ========================= */
  const toggleCity = (c) => {
    setRouteCities((prev) => (prev.includes(c) ? prev.filter((v) => v !== c) : [...prev, c]));
  };

  /* =========================
     이동 (기존 로직 유지 + STEP 추가 검증)
  ========================= */
  const goNext = () => {
    if (stepKey === "Location") {
      if (routeRegions.length === 0) return setError("지역을 하나 이상 선택해주세요");
    }

    if (stepKey === "Cities") {
      if (routeCities.length === 0) return setError("도시/지점을 하나 이상 선택해주세요");
    }

    if (stepKey === "Period") {
      if (!period.startDate || !period.endDate) return setError("여행 기간을 선택해주세요");
      if (!period.startTime || !period.endTime) return setError("출발/도착 시간을 선택해주세요");

      const startDT = new Date(`${period.startDate}T${period.startTime}`);
      const endDT = new Date(`${period.endDate}T${period.endTime}`);
      if (isNaN(startDT.getTime()) || isNaN(endDT.getTime()))
        return setError("시간 값이 올바르지 않습니다");
      if (endDT <= startDT) return setError("도착 시간은 출발 시간 이후여야 합니다");
    }

    // ✅ Waypoint는 "선택"이라 검증 없음 (그냥 다음으로 진행)

    if (
      ["Mood", "People", "Activity", "Food", "Stay"].includes(stepKey) &&
      !selected[stepKey]?.length
    ) {
      return setError("하나 이상 선택해주세요");
    }

    setError("");

    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      const selectedItems = list.filter((i) => Object.values(selected).flat().includes(i.itemId));

      navigate("/checklist/result", {
        state: {
          routeRegions,
          routeCities,
          period,
          startPoint,
          endPoint,
          waypointTexts,
          selectedItems,
          editGroupId,

          // 레거시 호환
          region: routeRegions[0] || "",
          district: routeCities,
        },
      });
    }
  };

  const goPrev = () => step > 0 && setStep(step - 1);

  const toggleChecklist = (id) => {
    const cur = selected[stepKey] || [];
    setSelected({
      ...selected,
      [stepKey]: cur.includes(id) ? cur.filter((v) => v !== id) : [...cur, id],
    });
  };

  useEffect(() => {
    if (stepKey !== "Waypoint") return;

    let canceled = false;

    (async () => {
      await ensureKakaoLoaded({ requireServices: true });
      if (canceled) return;

      if (mapRef.current) return;

      const center = new window.kakao.maps.LatLng(37.5665, 126.978);
      const map = new window.kakao.maps.Map(mapElRef.current, {
        center,
        level: 5,
      });

      mapRef.current = map;
      psRef.current = new window.kakao.maps.services.Places();

      requestAnimationFrame(() => map.relayout());
    })();

    return () => {
      canceled = true;
    };
  }, [stepKey]);

  /* =========================
    지도 클릭 → 출발/도착/경유지 선택
  ========================= */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const onClick = async (mouseEvent) => {
      if (!mapSelectMode) return;

      const latlng = mouseEvent.latLng;
      const geocoder = new window.kakao.maps.services.Geocoder();

      geocoder.coord2Address(
        latlng.getLng(),
        latlng.getLat(),
        (result, status) => {
          if (status !== window.kakao.maps.services.Status.OK) return;

          const addr =
            result[0]?.road_address?.address_name ||
            result[0]?.address?.address_name ||
            "";

          if (!addr) return;

          if (mapSelectMode === "start") {
            setStartPoint(addr);
            if (startMarkerRef.current)
              startMarkerRef.current.setMap(null);

            startMarkerRef.current = new window.kakao.maps.Marker({
              map,
              position: latlng,
            });
          }

          if (mapSelectMode === "end") {
            setEndPoint(addr);
            if (endMarkerRef.current)
              endMarkerRef.current.setMap(null);

            endMarkerRef.current = new window.kakao.maps.Marker({
              map,
              position: latlng,
            });
          }

          if (mapSelectMode === "waypoint") {
            setWaypointTexts((prev) =>
              prev.includes(addr) ? prev : [...prev, addr]
            );

            const m = new window.kakao.maps.Marker({
              map,
              position: latlng,
            });
            waypointMarkersRef.current.push(m);
          }

          // 모드 해제
          setMapSelectMode(null);
        }
      );
    };

    window.kakao.maps.event.addListener(map, "click", onClick);

    return () => {
      window.kakao.maps.event.removeListener(map, "click", onClick);
    };
  }, [mapSelectMode]);

  const searchWaypointOnMap = () => {
    const map = mapRef.current;
    const ps = psRef.current;
    if (!map || !ps) return;

    const kw = mapKeyword.trim();
    if (!kw) {
      setMapError("검색어를 입력해주세요");
      return;
    }

    setMapError("");
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    ps.keywordSearch(
      kw,
      (data, status) => {
        if (status !== window.kakao.maps.services.Status.OK) {
          setMapError("검색 결과가 없습니다");
          return;
        }

        const bounds = new window.kakao.maps.LatLngBounds();

        data.forEach((p) => {
          const pos = new window.kakao.maps.LatLng(p.y, p.x);
          bounds.extend(pos);

          const marker = new window.kakao.maps.Marker({
            map,
            position: pos,
          });

          window.kakao.maps.event.addListener(marker, "click", () => {
            setWaypointTexts((prev) =>
              prev.includes(p.place_name) ? prev : [...prev, p.place_name]
            );
          });

          markersRef.current.push(marker);
        });

        map.setBounds(bounds);
      },
      {
        location: map.getCenter(),
        radius: 12000,
        sort: window.kakao.maps.services.SortBy.DISTANCE,
      }
    );
  };

  /* =========================
     UI
  ========================= */
  return (
    <div className="toss-wrapper">
      <h1 className="toss-title">{editGroupId ? "✏ 여행 취향 수정" : "라이딩 여행 취향 테스트"}</h1>

      <div className="toss-nav">
        <button onClick={goPrev} disabled={step === 0}>
          ← 이전
        </button>
        <h2>▸ {stepKey}</h2>
        <button onClick={goNext}>{step === STEPS.length - 1 ? "결과 보기 →" : "다음 →"}</button>
      </div>

      {error && <p className="toss-error">{error}</p>}

      {/* ================= Location (지역만) ================= */}
      {stepKey === "Location" && (
        <>
          <p className="toss-sub">지역을 여러 개 선택할 수 있어요. (클릭 순서 유지)</p>

          <div className="toss-box-list">
            {REGIONS.map((r) => (
              <div
                key={r}
                className={`toss-box ${routeRegions.includes(r) ? "active" : ""}`}
                onClick={() => toggleRegion(r)}
              >
                {r}
              </div>
            ))}
          </div>

          <p className="toss-sub">선택됨: {routeRegions.length ? routeRegions.join(" → ") : "-"}</p>
        </>
      )}

      {/* ================= Cities (도시 선택 STEP) ================= */}
      {stepKey === "Cities" && (
        <>
          <p className="toss-sub">선택한 지역별로 도시를 선택하세요. (접기/펼치기 가능)</p>

          {routeRegions.length === 0 ? (
            <p className="toss-sub">먼저 지역을 선택해주세요.</p>
          ) : (
            routeRegions.map((rg) => (
              <div key={rg} style={{ marginBottom: 14 }}>
                <div
                  onClick={() => setOpenedRegions((o) => ({ ...o, [rg]: !o[rg] }))}
                  style={{
                    fontWeight: 700,
                    cursor: "pointer",
                    padding: "10px 6px",
                  }}
                >
                  {openedRegions[rg] ? "▼" : "▶"} {rg}
                </div>

                {openedRegions[rg] && (
                  <div className="toss-box-list">
                    {(DISTRICTS[rg] || [])
                      .slice()
                      .sort((a, b) => a.localeCompare(b, "ko"))
                      .map((c) => (
                        <div
                          key={c}
                          className={`toss-box ${routeCities.includes(c) ? "active" : ""}`}
                          onClick={() => toggleCity(c)}
                        >
                          {c}
                        </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}

          <div className="result-location">
            <p>📍 현재 선택: {routeCities.length ? routeCities.join(" → ") : "-"}</p>
          </div>
        </>
      )}

      {/* ================= Period (기존 달력 유지 + 시간) ================= */}
      {stepKey === "Period" &&
        (() => {
          const y = calendarMonth.getFullYear();
          const m = calendarMonth.getMonth();
          const days = getDaysInMonth(y, m);
          const startDay = getStartDay(y, m);

          const s = period.startDate ? new Date(period.startDate) : null;
          const e = period.endDate ? new Date(period.endDate) : null;

          return (
            <>
              <div className="naver-calendar-wrapper">
                <div className="calendar-header">
                  <button onClick={() => setCalendarMonth(new Date(y, m - 1, 1))}>‹</button>
                  <h3>
                    {y}.{String(m + 1).padStart(2, "0")}
                  </h3>
                  <button onClick={() => setCalendarMonth(new Date(y, m + 1, 1))}>›</button>
                </div>

                <div className="calendar-tabs">
                  <button
                    className={dateTab === "start" ? "active" : ""}
                    onClick={() => setDateTab("start")}
                  >
                    가는 날
                  </button>
                  <button
                    className={dateTab === "end" ? "active" : ""}
                    onClick={() => setDateTab("end")}
                  >
                    오는 날
                  </button>
                </div>

                <div className="calendar-grid">
                  {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                    <div key={d} className="calendar-day header">
                      {d}
                    </div>
                  ))}

                  {Array(startDay)
                    .fill(null)
                    .map((_, i) => (
                      <div key={i} />
                    ))}

                  {Array(days)
                    .fill(null)
                    .map((_, i) => {
                      const dayDate = new Date(y, m, i + 1);
                      const selectedDate = isSameDate(dayDate, s) || isSameDate(dayDate, e);

                      return (
                        <div
                          key={i}
                          className={[
                            "calendar-day",
                            isToday(dayDate) && "today",
                            isWeekend(dayDate) && "weekend",
                            selectedDate && "selected",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => onDateClick(dayDate)}
                        >
                          {i + 1}
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* ✅ 시간: 30분 단위 "선택지"로만 */}
              <div className="title-input-card">
                <div className="title-input-header">⏱ 출발 / 도착 시간 (30분 단위)</div>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 180px" }}>
                    <p className="toss-sub">출발 시간</p>
                    <select
                      className="toss-select"
                      value={period.startTime}
                      onChange={(e) => setPeriod((cur) => ({ ...cur, startTime: e.target.value }))}
                    >
                      <option value="">선택</option>
                      {TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ flex: "1 1 180px" }}>
                    <p className="toss-sub">도착 시간</p>
                    <select
                      className="toss-select"
                      value={period.endTime}
                      onChange={(e) => setPeriod((cur) => ({ ...cur, endTime: e.target.value }))}
                    >
                      <option value="">선택</option>
                      {TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <p className="toss-sub">
                  선택: {period.startDate || "-"} {period.startTime ? `(${period.startTime})` : ""} ~{" "}
                  {period.endDate || "-"} {period.endTime ? `(${period.endTime})` : ""}{" "}
                  {period.days ? `(${period.days}일)` : ""}
                </p>
              </div>
            </>
          );
        })()}

      {/* ================= Waypoint (경유지 전용 페이지) ================= */}
      {stepKey === "Waypoint" && (
        <>
          {/* 출발 / 도착 */}
          <div className="title-input-card">
            <div className="title-input-header">🚩 출발 / 도착 지점</div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <input
                className="title-input"
                placeholder="출발 지점 (예: 광화문)"
                value={startPoint}
                onChange={(e) => setStartPoint(e.target.value)}
              />
              <input
                className="title-input"
                placeholder="도착 지점 (예: 속초)"
                value={endPoint}
                onChange={(e) => setEndPoint(e.target.value)}
              />
            </div>
          </div>

          {/* 경유지 입력 */}
          <div className="title-input-card">
            <div className="title-input-header">📍 가고 싶은 경유지 (선택)</div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <input
                className="title-input"
                value={waypointInput}
                onChange={(e) => setWaypointInput(e.target.value)}
                placeholder="예) 남이섬 / 한강 자전거길"
                onKeyDown={(e) => e.key === "Enter" && addWaypoint()}
              />
              <button type="button" className="result-ai-btn" onClick={addWaypoint}>
                추가
              </button>
            </div>
            <div style={{ marginTop: 10 }}>
            <p className="toss-sub" style={{ marginBottom: 6 }}>현재 경유지</p>

            {waypointTexts.length === 0 ? (
              <p className="toss-sub">-</p>
            ) : (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {waypointTexts.map((w, i) => (
                  <div
                    key={`${w}-${i}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid #ddd",
                      background: "#f8fafc",
                      fontSize: 13,
                    }}
                  >
                    <span>📍 {w}</span>
                    <button
                      type="button"
                      onClick={() => removeWaypoint(i)}
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        fontWeight: 700,
                        color: "#666",
                      }}
                      aria-label="경유지 삭제"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button
              type="button"
              className="map-select-btn"
              data-active={mapSelectMode === "start"}
              onClick={() => setMapSelectMode("start")}
            >
              🚩 출발지 선택하기
            </button>

            <button
              type="button"
              className="map-select-btn"
              data-active={mapSelectMode === "end"}
              onClick={() => setMapSelectMode("end")}
            >
              🏁 종착지 선택하기
            </button>

            <button
              type="button"
              className="map-select-btn"
              data-active={mapSelectMode === "waypoint"}
              onClick={() => setMapSelectMode("waypoint")}
            >
              📍 경유지 선택하기
            </button>
          </div>


          {/* 지도 검색 */}
          <div className="title-input-card">
            <div className="title-input-header">🗺️ 지도에서 장소 검색</div>

            <div style={{ display: "flex", gap: "8px" }}>
              <input
                className="title-input"
                placeholder="예: 남이섬, 광화문, 한강공원"
                value={mapKeyword}
                onChange={(e) => setMapKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchWaypointOnMap()}
              />
              <button
                type="button"
                className="result-save-btn"
                onClick={searchWaypointOnMap}
              >
                검색
              </button>
            </div>

            {mapError && <p className="toss-error">{mapError}</p>}

            <div
              ref={mapElRef}
              style={{
                width: "100%",
                height: 360,
                marginTop: 12,
                borderRadius: 12,
              }}
            />

            <p className="toss-sub">📍 마커를 클릭하면 추가됩니다</p>
          </div>
        </>
      )}

      {/* ================= Checklist ================= */}
      {["Mood", "People", "Activity", "Food", "Stay"].includes(stepKey) && (
        <div className="toss-box-list">
          {list
            .filter((i) => i.category?.toLowerCase() === stepKey.toLowerCase())
            .map((item) => (
              <div
                key={item.itemId}
                className={`toss-box ${selected[stepKey]?.includes(item.itemId) ? "active" : ""}`}
                onClick={() => toggleChecklist(item.itemId)}
              >
                <div className="toss-box-texts">
                  <h3>{item.itemName}</h3>
                  <p>{item.description}</p>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
