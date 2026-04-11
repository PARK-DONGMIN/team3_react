import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import "./RouteBuilder.css";

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.9780 };

const POI_QUICK = [
  { key: "cafe", label: "카페", kw: "카페", emoji: "☕" },
  { key: "food", label: "맛집", kw: "맛집", emoji: "🍜" },
  { key: "store", label: "편의점", kw: "편의점", emoji: "🛒" },
  { key: "stay", label: "숙소", kw: "숙소", emoji: "🏡" },
  { key: "repair", label: "수리점", kw: "자전거 수리", emoji: "🛠️" },
  { key: "view", label: "뷰/포토", kw: "전망대", emoji: "📸" },
];

function ensureKakaoLoaded() {
  if (window.kakao && window.kakao.maps && window.kakao.maps.load) return Promise.resolve();
  return Promise.reject(new Error("Kakao SDK 로드 실패 (index.html / key / domain / libraries=services 확인)"));
}
function uid() {
  return Math.random().toString(16).slice(2);
}
function lsKey(scheduleId) {
  return `schedule_routes_${scheduleId}`;
}
function loadRoutes(scheduleId) {
  try {
    return JSON.parse(localStorage.getItem(lsKey(scheduleId)) || "{}");
  } catch {
    return {};
  }
}
function saveRoutes(scheduleId, obj) {
  localStorage.setItem(lsKey(scheduleId), JSON.stringify(obj));
}

export default function RouteDayEditor() {
  const nav = useNavigate();
  const { scheduleId } = useParams();
  const [sp] = useSearchParams();
  const day = Number(sp.get("day") || 1);

  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const psRef = useRef(null);

  const markersRef = useRef([]);
  const overlaysRef = useRef([]);
  const lineRef = useRef(null);

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const [routes, setRoutes] = useState({});
  const dayStr = String(day);
  const current = routes?.[dayStr] || { stops: [], poiItems: [], poiKey: "cafe" };

  const clearMapObjects = () => {
    markersRef.current.forEach((m) => m.setMap(null));
    overlaysRef.current.forEach((o) => o.setMap(null));
    markersRef.current = [];
    overlaysRef.current = [];
    if (lineRef.current) {
      lineRef.current.setMap(null);
      lineRef.current = null;
    }
  };

  const drawStops = (map, list) => {
    clearMapObjects();

    (list || []).forEach((s, idx) => {
      const pos = new window.kakao.maps.LatLng(s.lat, s.lng);
      const marker = new window.kakao.maps.Marker({ map, position: pos });
      markersRef.current.push(marker);

      const label = s.type === "START" ? "출발" : s.type === "END" ? "도착" : `경유${idx}`;
      const overlay = new window.kakao.maps.CustomOverlay({
        position: pos,
        yAnchor: 1.4,
        content: `
          <div style="
            padding:6px 10px;border-radius:999px;
            background:rgba(17,24,39,0.82);color:#fff;
            font-weight:900;font-size:12px;
            border:1px solid rgba(255,255,255,0.25);
            backdrop-filter: blur(8px);
          ">
            ${label}
          </div>
        `,
      });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    });

    if ((list || []).length >= 2) {
      const path = list.map((s) => new window.kakao.maps.LatLng(s.lat, s.lng));
      const line = new window.kakao.maps.Polyline({
        path,
        strokeWeight: 6,
        strokeOpacity: 0.75,
      });
      line.setMap(map);
      lineRef.current = line;

      const bounds = new window.kakao.maps.LatLngBounds();
      path.forEach((p) => bounds.extend(p));
      map.setBounds(bounds);
    }
  };

  const updateDay = (patch) => {
    setRoutes((prev) => {
      const next = {
        ...prev,
        [dayStr]: { ...(prev[dayStr] || { stops: [], poiItems: [], poiKey: "cafe" }), ...patch },
      };
      saveRoutes(scheduleId, next);
      return next;
    });
  };

  const addStopFromLatLng = (lat, lng) => {
    setRoutes((prev) => {
      const cur = prev[dayStr] || { stops: [], poiItems: [], poiKey: "cafe" };
      const prevStops = cur.stops || [];
      const hasS = prevStops.some((x) => x.type === "START");
      const hasE = prevStops.some((x) => x.type === "END");
      const nextType = !hasS ? "START" : !hasE ? "END" : "WAYPOINT";

      const nextStops = [...prevStops, { id: uid(), type: nextType, lat, lng }];
      const start = nextStops.filter((x) => x.type === "START");
      const mid = nextStops.filter((x) => x.type === "WAYPOINT");
      const end = nextStops.filter((x) => x.type === "END");

      const next = { ...prev, [dayStr]: { ...cur, stops: [...start, ...mid, ...end] } };
      saveRoutes(scheduleId, next);
      return next;
    });
  };

  const removeStop = (id) => {
    updateDay({ stops: (current.stops || []).filter((x) => x.id !== id) });
  };

  const resetDay = () => {
    updateDay({ stops: [], poiItems: [] });
  };

  const searchPoiNearRoute = async (kw) => {
    const map = mapRef.current;
    const ps = psRef.current;
    if (!map || !ps) return;

    if ((current.stops || []).length < 2) {
      setErr("출발/도착을 먼저 찍어줘!");
      return;
    }

    setLoading(true);
    setErr("");

    const SAMPLE = 8;
    const radius = 600;

    const list = current.stops;
    const samples = [];
    for (let i = 0; i < SAMPLE; i++) {
      const t = i / (SAMPLE - 1);
      const a = list[Math.floor((list.length - 1) * t)];
      samples.push(a);
    }

    const seen = new Set();
    const merged = [];

    const doSearch = (point) =>
      new Promise((resolve) => {
        const opt = {
          location: new window.kakao.maps.LatLng(point.lat, point.lng),
          radius,
          sort: window.kakao.maps.services.SortBy.DISTANCE,
        };
        ps.keywordSearch(
          kw,
          (data, status) => {
            if (status === window.kakao.maps.services.Status.OK) {
              data.forEach((p) => {
                if (!seen.has(p.id)) {
                  seen.add(p.id);
                  merged.push(p);
                }
              });
            }
            resolve();
          },
          opt
        );
      });

    for (const s of samples) {
      // eslint-disable-next-line no-await-in-loop
      await doSearch(s);
    }

    updateDay({ poiItems: merged.slice(0, 60) });
    setLoading(false);
  };

  useEffect(() => {
    // load
    const obj = loadRoutes(scheduleId);
    setRoutes(obj || {});
  }, [scheduleId]);

  useEffect(() => {
    (async () => {
      try {
        await ensureKakaoLoaded();
        window.kakao.maps.load(() => {
          const map = new window.kakao.maps.Map(mapElRef.current, {
            center: new window.kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
            level: 7,
          });
          mapRef.current = map;
          psRef.current = new window.kakao.maps.services.Places();

          window.kakao.maps.event.addListener(map, "click", (mouseEvent) => {
            const latlng = mouseEvent.latLng;
            addStopFromLatLng(latlng.getLat(), latlng.getLng());
          });

          drawStops(map, (loadRoutes(scheduleId)?.[dayStr]?.stops) || []);
        });
      } catch (e) {
        setErr(e.message || "지도 로드 실패");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    drawStops(map, current.stops || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.stops, day]);

  const hasStart = (current.stops || []).some((x) => x.type === "START");
  const hasEnd = (current.stops || []).some((x) => x.type === "END");

  return (
    <div className="rb-wrap">
      <div className="rb-head">
        <div>
          <h1 className="rb-title">코스 편집 · {day}일차</h1>
          <p className="rb-desc">지도 클릭으로 출발/도착/경유지를 찍고, 코스 주변 추천을 받아봐요.</p>
        </div>

        <div className="rb-head-actions">
          <button className="rb-btn" type="button" onClick={() => nav(`/schedule/${scheduleId}`)}>
            ← 일정 상세
          </button>
          <button className="rb-btn ghost" type="button" onClick={resetDay}>
            초기화
          </button>
        </div>
      </div>

      {err && <div className="rb-error">{err}</div>}

      <div className="rb-body">
        <div className="rb-left">
          <div className="rb-card">
            <div className="rb-card-head">
              <div className="rb-card-title">코스 포인트</div>
              <div className="rb-card-sub">{(current.stops || []).length}개</div>
            </div>

            <div className="rb-stoplist">
              {(current.stops || []).length === 0 ? (
                <div className="rb-empty">
                  <div className="rb-empty-title">지도 클릭해서 시작해봐!</div>
                  <div className="rb-empty-sub">첫 클릭=출발, 두번째=도착, 그 이후는 경유지로 추가돼.</div>
                </div>
              ) : (
                (current.stops || []).map((s, idx) => (
                  <div key={s.id} className="rb-stop">
                    <div className={`rb-pill ${s.type.toLowerCase()}`}>
                      {s.type === "START" ? "출발" : s.type === "END" ? "도착" : `경유`}
                    </div>
                    <div className="rb-stop-meta">
                      <div className="rb-stop-title">
                        {s.type === "WAYPOINT" ? `경유지 ${idx}` : s.type === "START" ? "출발지" : "도착지"}
                      </div>
                      <div className="rb-stop-sub">
                        {s.lat.toFixed(5)}, {s.lng.toFixed(5)}
                      </div>
                    </div>
                    <button className="rb-x" type="button" onClick={() => removeStop(s.id)}>
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="rb-actions">
              <button className="rb-btn primary" type="button" onClick={() => nav(`/schedule/${scheduleId}`)} disabled={!hasStart || !hasEnd}>
                {hasStart && hasEnd ? "저장됨(상세로)" : "출발/도착 먼저 찍기"}
              </button>
            </div>
          </div>

          <div className="rb-card">
            <div className="rb-card-head">
              <div className="rb-card-title">코스 주변 추천</div>
              <div className="rb-card-sub">코스 근처(반경 600m)</div>
            </div>

            <div className="rb-poi-quick">
              {POI_QUICK.map((q) => (
                <button
                  key={q.key}
                  type="button"
                  className={`rb-poi-btn ${(current.poiKey || "cafe") === q.key ? "on" : ""}`}
                  onClick={() => {
                    updateDay({ poiKey: q.key });
                    searchPoiNearRoute(q.kw);
                  }}
                  disabled={loading || (current.stops || []).length < 2}
                >
                  <span className="rb-poi-emoji">{q.emoji}</span>
                  <span className="rb-poi-text">{q.label}</span>
                </button>
              ))}
            </div>

            <div className="rb-poi-list">
              {(current.poiItems || []).length === 0 ? (
                <div className="rb-empty small">
                  <div className="rb-empty-title">{(current.stops || []).length < 2 ? "출발/도착 찍고 추천 받아봐!" : "추천 결과가 여기에 떠!"}</div>
                  <div className="rb-empty-sub">카테고리를 누르면 코스 근처에서 장소를 모아 보여줘.</div>
                </div>
              ) : (
                (current.poiItems || []).map((p) => (
                  <a key={p.id} className="rb-poi-item" href={p.place_url} target="_blank" rel="noreferrer">
                    <div className="rb-poi-name">{p.place_name}</div>
                    <div className="rb-poi-sub">{p.road_address_name || p.address_name || ""}</div>
                    <div className="rb-poi-meta">
                      <span>{p.category_group_name || p.category_name}</span>
                      {p.phone ? <span className="dot">•</span> : null}
                      {p.phone ? <span>☎ {p.phone}</span> : null}
                    </div>
                  </a>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rb-mapbox">
          <div ref={mapElRef} className="rb-map" />
          <div className="rb-map-help">
            <span>🖱 지도 클릭으로 포인트 추가</span>
            <span className="dot">•</span>
            <span>출발 → 도착 → 경유지</span>
          </div>
        </div>
      </div>
    </div>
  );
}
