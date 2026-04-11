// src/domains/route/DayCourseBuilder.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DayCourseBuilder.css";
import { scheduleDetailApi } from "../../api/scheduleDetailApi";

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };
const POI_RADIUS_M = 700;

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
  return Promise.reject(new Error("Kakao SDK 로드 실패 (index.html에 libraries=services 포함 확인)"));
}

function pickAddress(p) {
  return p?.road_address_name || p?.address_name || p?.address || "";
}

function toLatLngFromKakao(p) {
  return { lat: Number(p?.y ?? p?.lat), lng: Number(p?.x ?? p?.lng) };
}

function uniqById(arr = []) {
  const s = new Set();
  const out = [];
  for (const x of arr) {
    if (!x) continue;
    const id = x?.id ?? x?.place_id ?? x?.placeId ?? x?.place_url ?? x?.placeUrl;
    if (!id) continue;
    const k = String(id);
    if (s.has(k)) continue;
    s.add(k);
    out.push(x);
  }
  return out;
}

function fmtKm(meters) {
  const m = Number(meters);
  if (!Number.isFinite(m)) return "-";
  return (m / 1000).toFixed(m >= 10000 ? 0 : 1);
}

function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function midpointAlongPath(points) {
  if (!Array.isArray(points) || points.length === 0) return null;
  if (points.length === 1) return points[0];

  const segLens = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const d = haversineMeters(points[i], points[i + 1]);
    segLens.push(d);
    total += d;
  }
  if (total <= 0) return points[0];

  const half = total / 2;
  let acc = 0;

  for (let i = 0; i < segLens.length; i++) {
    const d = segLens[i];
    if (acc + d >= half) {
      const t = (half - acc) / d;
      const a = points[i];
      const b = points[i + 1];
      return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
    }
    acc += d;
  }
  return points[points.length - 1];
}

function getPlanFromStorage(parsed, dayNumber) {
  if (!parsed) return null;
  const p1 = parsed?.days?.[dayNumber];
  if (p1) return p1;

  if (Array.isArray(parsed?.days)) {
    const p2 = parsed.days[dayNumber - 1];
    if (p2) return p2;
  }

  if (Array.isArray(parsed)) {
    const p3 = parsed[dayNumber - 1];
    if (p3) return p3;
  }

  return null;
}

function hasRoute(plan) {
  return !!(plan?.start && plan?.end);
}

function placeKey(p) {
  if (!p) return "";
  return String(
    p?.id ??
      p?.place_id ??
      p?.placeId ??
      p?.place_url ??
      p?.placeUrl ??
      ""
  );
}

function planSignature(plan) {
  if (!plan) return "";
  const start = placeKey(plan?.start);
  const end = placeKey(plan?.end);
  const wps = (Array.isArray(plan?.waypoints) ? plan.waypoints : []).map(placeKey).join("|");
  const pois = (Array.isArray(plan?.pickedPois) ? plan.pickedPois : []).map(placeKey).join("|");
  const memo = String(plan?.memo ?? "").trim();
  return `s:${start};e:${end};w:${wps};p:${pois};m:${memo}`;
}

function normalizeStopType(v) {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "START" || s === "WAYPOINT" || s === "END" || s === "POI") return s;
  return null;
}

function toUiPlaceFromRow(row) {
  if (!row) return null;

  const placeId = row?.placeId ?? row?.place_id ?? null;

  const name =
    row?.place_name ??
    row?.placeName ??
    row?.name ??
    "";

  const address =
    row?.road_address_name ??
    row?.address_name ??
    row?.address ??
    "";

  const id =
    placeId != null
      ? String(placeId)
      : (row?.id != null ? String(row.id) : `detail_${row?.detailId ?? Date.now()}`);

  return {
    id,
    placeId: placeId ?? null,
    place_name: name,
    name,

    address_name: address,
    road_address_name: address,

    phone: "",
    x: row?.lng ?? row?.x ?? undefined,
    y: row?.lat ?? row?.y ?? undefined,
    lng: row?.lng ?? undefined,
    lat: row?.lat ?? undefined,

    place_url: row?.place_url ?? row?.placeUrl ?? row?.url ?? "",
    category_name: row?.category ?? row?.category_name ?? "",
    category_group_name: row?.category ?? row?.category_name ?? "",
  };
}

export default function DayCourseBuilder({
  scheduleId,
  dayNumber,
  dayCount,
  center,
  onSaved,
  storageKey,
  onChangeDay,
  prefillPlan = null,
  doneDays = [],
}) {
  const nav = useNavigate();

  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const psRef = useRef(null);

  const markersRef = useRef([]);
  const overlaysRef = useRef([]);
  const lineRef = useRef(null);

  const distOverlayRef = useRef(null);
  const distBadgeElsRef = useRef({ root: null, value: null, sub: null });

  const inputRef = useRef(null);

  const [err, setErr] = useState("");

  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [waypoints, setWaypoints] = useState([]);
  const [memo, setMemo] = useState("");

  const [distLoading, setDistLoading] = useState(false);
  const [distanceM, setDistanceM] = useState(null);

  const [activePick, setActivePick] = useState("start");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);

  const [poiLoading, setPoiLoading] = useState(false);
  const [poiResults, setPoiResults] = useState([]);
  const [pickedPois, setPickedPois] = useState([]);

  const [status, setStatus] = useState("incomplete");
  const [dayStatusMap, setDayStatusMap] = useState({});

  const savedSigRef = useRef("");
  const hasSavedRef = useRef(false);

  const [kakaoReady, setKakaoReady] = useState(false);

  const realStorageKey = useMemo(() => {
    if (storageKey) return storageKey;
    return `coursePlans_${scheduleId}`;
  }, [storageKey, scheduleId]);

  const draftKey = useMemo(() => {
    return `${realStorageKey}::draft::day${dayNumber}`;
  }, [realStorageKey, dayNumber]);

  const readDraft = () => {
    try {
      const raw = sessionStorage.getItem(draftKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const writeDraft = (patch = {}) => {
    try {
      const draft = {
        start,
        end,
        waypoints,
        pickedPois,
        memo,
        distanceM,
        updatedAt: new Date().toISOString(),
        ...patch,
      };
      sessionStorage.setItem(draftKey, JSON.stringify(draft));
    } catch (e) {
      console.warn("draft write fail", e);
    }
  };

  const clearDraft = () => {
    try {
      sessionStorage.removeItem(draftKey);
    } catch (e) {
      console.log(e);
    }
  };

  const baseCenter = useMemo(() => {
    if (center?.lat && center?.lng) return center;
    return DEFAULT_CENTER;
  }, [center]);

  const routePlaces = useMemo(() => {
    const list = [];
    if (start) list.push(start);
    waypoints.forEach((w) => list.push(w));
    if (end) list.push(end);
    return list;
  }, [start, waypoints, end]);

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

  const resetMapViewToBase = () => {
    const map = mapRef.current;
    if (!map || !window.kakao?.maps) return;
    map.setCenter(new window.kakao.maps.LatLng(baseCenter.lat, baseCenter.lng));
    map.setLevel(6);
  };

  const drawRoute = (listPlaces) => {
    const map = mapRef.current;
    if (!map) return;

    clearMapObjects();

    const pts = listPlaces
      .filter(Boolean)
      .map((p) => {
        const { lat, lng } = toLatLngFromKakao(p);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return new window.kakao.maps.LatLng(lat, lng);
      })
      .filter(Boolean);

    if (pts.length === 0) return;

    listPlaces
      .filter(Boolean)
      .forEach((p, idx) => {
        const { lat, lng } = toLatLngFromKakao(p);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        const pos = new window.kakao.maps.LatLng(lat, lng);
        const marker = new window.kakao.maps.Marker({ map, position: pos });
        markersRef.current.push(marker);

        const label = idx === 0 ? "출발" : idx === pts.length - 1 ? "도착" : `경유${idx}`;

        const overlay = new window.kakao.maps.CustomOverlay({
          position: pos,
          yAnchor: 1.35,
          content: `
          <div style="
            padding:6px 10px;border-radius:999px;
            background:rgba(17,24,39,.82);color:#fff;
            font-weight:900;font-size:12px;
            border:1px solid rgba(255,255,255,.25);
            backdrop-filter: blur(8px);
            white-space:nowrap;
          ">${label}</div>
        `,
        });
        overlay.setMap(map);
        overlaysRef.current.push(overlay);
      });

    if (pts.length >= 2) {
      const line = new window.kakao.maps.Polyline({
        path: pts,
        strokeWeight: 6,
        strokeOpacity: 0.75,
      });
      line.setMap(map);
      lineRef.current = line;

      const bounds = new window.kakao.maps.LatLngBounds();
      pts.forEach((p) => bounds.extend(p));
      map.setBounds(bounds);
      return;
    }

    map.setCenter(pts[0]);
    map.setLevel(5);
  };

  const drawPoiMarkers = (places = []) => {
    const map = mapRef.current;
    if (!map) return;

    places.forEach((p) => {
      const { lat, lng } = toLatLngFromKakao(p);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const pos = new window.kakao.maps.LatLng(lat, lng);
      const m = new window.kakao.maps.Marker({ map, position: pos });
      markersRef.current.push(m);
    });
  };

  const currentSig = useMemo(() => {
    return planSignature({ start, end, waypoints, pickedPois, memo });
  }, [start, end, waypoints, pickedPois, memo]);

  const computeCurrentStatus = () => {
    if (!start || !end) return "incomplete";
    if (hasSavedRef.current && savedSigRef.current && currentSig === savedSigRef.current) return "saved";
    return "draft";
  };

  const refreshDayStatusMap = () => {
    const map = {};
    try {
      const raw = localStorage.getItem(realStorageKey);
      const parsed = raw ? JSON.parse(raw) : null;

      for (let n = 1; n <= dayCount; n++) {
        const plan = getPlanFromStorage(parsed, n);
        map[n] = plan?.start && plan?.end ? "saved" : "incomplete";
      }

      map[dayNumber] = computeCurrentStatus();

      doneDays.forEach((n) => {
        if (map[n] !== "saved") map[n] = "draft";
      });
    } catch {
      for (let n = 1; n <= dayCount; n++) map[n] = "incomplete";
      map[dayNumber] = computeCurrentStatus();
    }

    setDayStatusMap(map);
    setStatus(map[dayNumber] || computeCurrentStatus());
  };

  useEffect(() => {
    setActivePick("start");
    setQuery("");
    setResults([]);
    setPoiResults([]);
    setErr("");

    setStart(null);
    setEnd(null);
    setWaypoints([]);
    setPickedPois([]);
    setMemo("");
    setDistanceM(null);

    savedSigRef.current = "";
    hasSavedRef.current = false;
    setStatus("incomplete");

    clearMapObjects();
    resetMapViewToBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayNumber]);

  useEffect(() => {
    setQuery("");
    setResults([]);
    setErr("");

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [activePick]);

  const prefillAppliedRef = useRef({});
  useEffect(() => {
    let cancelled = false;
    const key = `${realStorageKey}::${dayNumber}`;

    const applyPlan = (plan, asSaved) => {
      setStart(plan?.start ?? null);
      setEnd(plan?.end ?? null);
      setWaypoints(Array.isArray(plan?.waypoints) ? plan.waypoints : []);
      setPickedPois(Array.isArray(plan?.pickedPois) ? plan.pickedPois : []);
      setMemo(typeof plan?.memo === "string" ? plan.memo : "");
      setDistanceM(typeof plan?.distanceM === "number" ? plan.distanceM : null);

      savedSigRef.current = asSaved ? planSignature(plan) : "";
      hasSavedRef.current = !!asSaved;

      requestAnimationFrame(refreshDayStatusMap);
    };

    (async () => {
      try {
        setErr("");

        // ✅ 1) scheduleId가 있으면 DB 우선 로드
        if (scheduleId) {
          try {
            const rows = await scheduleDetailApi.getDay(scheduleId, dayNumber);

            if (!cancelled && Array.isArray(rows) && rows.length > 0) {
              const byStop = (t) => rows.find((r) => normalizeStopType(r.stopType) === t) || null;

              const startRow = byStop("START");
              const endRow = byStop("END");

              const wpRows = rows
                .filter((r) => normalizeStopType(r.stopType) === "WAYPOINT")
                .sort((a, b) => Number(a.orderInDay || 0) - Number(b.orderInDay || 0));

              const poiRows = rows
                .filter((r) => normalizeStopType(r.stopType) === "POI")
                .sort((a, b) => Number(a.orderInDay || 0) - Number(b.orderInDay || 0));

              const plan = {
                start: startRow ? toUiPlaceFromRow(startRow) : null,
                end: endRow ? toUiPlaceFromRow(endRow) : null,
                waypoints: wpRows.map(toUiPlaceFromRow),
                pickedPois: poiRows.map(toUiPlaceFromRow),
                memo: String(rows?.[0]?.memo ?? ""),
                distanceM: (() => {
                  const km = Number(rows?.[0]?.distanceKM);
                  if (!Number.isFinite(km)) return null;
                  return km * 1000;
                })(),
                updatedAt: new Date().toISOString(),
              };

              applyPlan(plan, true);

              // ✅ localStorage 동기화
              try {
                const raw = localStorage.getItem(realStorageKey);
                const prev = raw ? JSON.parse(raw) : {};
                const days = prev?.days ?? {};
                days[dayNumber] = plan;
                localStorage.setItem(
                  realStorageKey,
                  JSON.stringify({
                    ...prev,
                    scheduleId: scheduleId ?? prev?.scheduleId ?? null,
                    days,
                    updatedAt: new Date().toISOString(),
                  })
                );
              } catch (e) {
                console.warn("sync localStorage fail", e);
              }

              return;
            }
          } catch (e) {
            console.warn("DB day load fail", e);
          }
        }

        if (cancelled) return;

        // ✅ 2) localStorage(새일정 draft 저장)
        try {
          const raw = localStorage.getItem(realStorageKey);
          const parsed = raw ? JSON.parse(raw) : null;
          const stored = getPlanFromStorage(parsed, dayNumber);
          if (stored) {
            applyPlan(stored, true);
            return;
          }
        } catch (e) {
          console.warn("local storage load fail", e);
        }

        if (cancelled) return;

        // ✅ 3) session draft
        const draft = readDraft();
        if (draft) {
          applyPlan(draft, false);
          return;
        }

        if (cancelled) return;

        // ✅ 4) prefill
        if (!prefillAppliedRef.current[key] && hasRoute(prefillPlan)) {
          prefillAppliedRef.current[key] = true;
          applyPlan(prefillPlan, false);
          return;
        }

        requestAnimationFrame(refreshDayStatusMap);
      } catch (e) {
        console.warn("course plan load fail", e);
        requestAnimationFrame(refreshDayStatusMap);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realStorageKey, dayNumber, prefillPlan, scheduleId]);

  useEffect(() => {
    writeDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSig, dayNumber, realStorageKey]);

  // ✅ 지도/Places 초기화
  useEffect(() => {
    let destroyed = false;

    (async () => {
      try {
        setErr("");
        setKakaoReady(false);
        await ensureKakaoLoaded();

        window.kakao.maps.load(() => {
          if (destroyed) return;

          const map = new window.kakao.maps.Map(mapElRef.current, {
            center: new window.kakao.maps.LatLng(baseCenter.lat, baseCenter.lng),
            level: 6,
          });

          mapRef.current = map;
          psRef.current = new window.kakao.maps.services.Places();

          setKakaoReady(true);

          if (distOverlayRef.current) {
            distOverlayRef.current.setMap(null);
            distOverlayRef.current = null;
          }

          const root = document.createElement("div");
          root.style.cssText = `transform: translateY(-16px); user-select:none;`;

          const card = document.createElement("div");
          card.style.cssText = `
            display:flex; gap:10px; align-items:center;
            padding:12px 14px;
            border-radius:16px;
            background: rgba(17,24,39,.90);
            border: 1px solid rgba(255,255,255,.18);
            box-shadow: 0 16px 40px rgba(0,0,0,.28);
            backdrop-filter: blur(10px);
            color:#fff;
            min-width: 190px;
          `;

          const icon = document.createElement("div");
          icon.style.cssText = `
            width:36px; height:36px; border-radius:12px;
            display:flex; align-items:center; justify-content:center;
            background: linear-gradient(135deg, rgba(34,197,94,.95), rgba(59,130,246,.95));
            box-shadow: 0 8px 18px rgba(0,0,0,.25);
            font-size:18px; font-weight:900;
          `;
          icon.textContent = "🚴";

          const textBox = document.createElement("div");
          textBox.style.cssText = `display:flex; flex-direction:column; line-height:1.1;`;

          const title = document.createElement("div");
          title.style.cssText = `font-size:12px; opacity:.85; letter-spacing:.2px; font-weight:800;`;
          title.textContent = `${dayNumber}일차 총 거리`;

          const value = document.createElement("div");
          value.style.cssText = `margin-top:4px; font-size:18px; font-weight:1000; letter-spacing:.2px;`;
          value.textContent = "- km";

          const sub = document.createElement("div");
          sub.style.cssText = `margin-top:6px; font-size:11px; opacity:.78; font-weight:700;`;
          sub.textContent = "출발/도착 선택하면 계산돼요";

          textBox.appendChild(title);
          textBox.appendChild(value);
          textBox.appendChild(sub);

          card.appendChild(icon);
          card.appendChild(textBox);
          root.appendChild(card);

          distBadgeElsRef.current = { root, value, sub };

          const overlay = new window.kakao.maps.CustomOverlay({
            position: map.getCenter(),
            content: root,
            xAnchor: 0.5,
            yAnchor: 1.2,
            zIndex: 9999,
          });

          overlay.setMap(map);
          distOverlayRef.current = overlay;
        });
      } catch (e) {
        setErr(e.message || "지도 로드 실패");
        setKakaoReady(false);
      }
    })();

    return () => {
      destroyed = true;
      setKakaoReady(false);
      const overlay = distOverlayRef.current;
      if (overlay) overlay.setMap(null);
      distOverlayRef.current = null;
      distBadgeElsRef.current = { root: null, value: null, sub: null };
    };
  }, [baseCenter.lat, baseCenter.lng, dayNumber]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    clearMapObjects();

    if (routePlaces.length > 0) {
      drawRoute(routePlaces);
      drawPoiMarkers(pickedPois);
    } else {
      resetMapViewToBase();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end, waypoints, pickedPois]);

  useEffect(() => {
    const map = mapRef.current;
    const overlay = distOverlayRef.current;
    const { value, sub } = distBadgeElsRef.current || {};
    if (!map || !overlay || !value || !sub) return;

    if (!start || !end) {
      value.textContent = "- km";
      sub.textContent = "출발/도착 선택하면 계산돼요";
    } else if (distLoading) {
      value.textContent = "계산중…";
      sub.textContent = "자전거 경로 거리 계산 중";
    } else if (distanceM != null) {
      value.textContent = `${fmtKm(distanceM)} km`;
      sub.textContent = "자전거 경로 기준";
    } else {
      value.textContent = "- km";
      sub.textContent = "거리 계산 실패(ORS 확인)";
    }

    const pts = routePlaces
      .map(toLatLngFromKakao)
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

    const mid = midpointAlongPath(pts);
    if (mid) overlay.setPosition(new window.kakao.maps.LatLng(mid.lat, mid.lng));
    else overlay.setPosition(map.getCenter());
  }, [start, end, waypoints, routePlaces, distanceM, distLoading]);

  useEffect(() => {
    refreshDayStatusMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSig, dayNumber, dayCount, realStorageKey]);

  const doSearch = async (kw) => {
    const ps = psRef.current;

    if (!ps || !kakaoReady) {
      setErr("지도 로딩중이에요! 잠깐만 기다렸다가 다시 눌러줘 🥺");
      return;
    }

    const real = (kw ?? "").trim();
    if (!real) return;

    setSearching(true);
    setErr("");
    setResults([]);

    ps.keywordSearch(real, (data, s) => {
      setSearching(false);

      if (s === window.kakao.maps.services.Status.OK) {
        setResults(Array.isArray(data) ? data : []);
      } else if (s === window.kakao.maps.services.Status.ZERO_RESULT) {
        setResults([]);
        setErr("검색 결과가 없어요 🥲 (키워드를 바꿔봐!)");
      } else {
        setResults([]);
        setErr("장소 검색 오류 (키/도메인/SDK libraries=services 확인)");
      }
    });
  };

  const confirmIfRisky = (msg) => window.confirm(msg);

  const canSelect = (p) => {
    const k = placeKey(p);
    return !!k || (Number.isFinite(Number(p?.x)) && Number.isFinite(Number(p?.y)));
  };

  const normalizePlace = (p) => {
    if (!p) return p;
    if (p?.id) return p;
    const fallbackId = placeKey(p) || `p_${String(p?.x ?? "")}_${String(p?.y ?? "")}_${Date.now()}`;
    return { ...p, id: fallbackId };
  };

  const selectPlace = (p) => {
    if (!canSelect(p)) return;

    const picked = normalizePlace(p);

    if (activePick === "start") {
      setStart(picked);
      setActivePick("end");
    } else if (activePick === "end") {
      setEnd(picked);
    } else {
      setWaypoints((prev) => uniqById([...prev, picked]));
    }

    setQuery("");
    setResults([]);

    const map = mapRef.current;
    if (map) {
      const { lat, lng } = toLatLngFromKakao(picked);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        map.panTo(new window.kakao.maps.LatLng(lat, lng));
        map.setLevel(5);
      }
    }
  };

  const requestChangeDay = (n) => {
    if (typeof onChangeDay !== "function") return;
    if (n === dayNumber) return;
    onChangeDay(n);
  };

  const resetDay = () => {
    const ok = confirmIfRisky(`${dayNumber}일차 코스를 초기화할까요?\n(임시 저장도 삭제돼요)`);
    if (!ok) return;

    // ✅ localStorage에서 day 삭제
    try {
      const raw = localStorage.getItem(realStorageKey);
      const prev = raw ? JSON.parse(raw) : {};
      const days = prev?.days ?? {};
      if (days && typeof days === "object") {
        delete days[dayNumber];
        localStorage.setItem(
          realStorageKey,
          JSON.stringify({ ...prev, days, updatedAt: new Date().toISOString() })
        );
      }
    } catch (e) {
      console.warn("resetDay storage remove fail", e);
    }

    clearDraft();

    setStart(null);
    setEnd(null);
    setWaypoints([]);
    setPickedPois([]);
    setPoiResults([]);
    setResults([]);
    setQuery("");
    setMemo("");
    setErr("");
    setDistanceM(null);
    setActivePick("start");

    savedSigRef.current = "";
    hasSavedRef.current = false;

    refreshDayStatusMap();
  };

  /**
   * ✅ 저장:
   * - scheduleId 있으면 DB 저장까지
   * - scheduleId 없으면 로컬(새일정 draft) 저장만
   */
  const saveDay = async () => {
    if (!start || !end) {
      setErr("출발지/도착지를 먼저 선택해줘!");
      return;
    }

    const ok = confirmIfRisky(`${dayNumber}일차 코스를 저장할까요?`);
    if (!ok) return;

    try {
      setErr("");

      const plan = {
        start,
        end,
        waypoints,
        pickedPois,
        memo,
        distanceM,
        updatedAt: new Date().toISOString(),
      };

      // ✅ 1) scheduleId가 있으면 DB 저장(덮어쓰기)
      if (scheduleId) {
        const rows = [];
        let ord = 1;

        // START
        rows.push({
          scheduleId: Number(scheduleId),
          dayNumber: Number(dayNumber),
          orderInDay: ord++,
          stopType: "START",
          placeId: Number(placeKey(start)) || null,
          placeName: start.place_name || start.name || "(장소)",
          category: start.category_group_name || start.category_name || start.category || null,
          address: pickAddress(start) || null,
          lat: Number(start.lat ?? start.y) || null,
          lng: Number(start.lng ?? start.x) || null,
          startTime: null,
          endTime: null,
          cost: null,
          memo: memo ?? null,
          distanceKM: distanceM != null ? distanceM / 1000 : null,
        });

        // WAYPOINT
        (Array.isArray(waypoints) ? waypoints : []).forEach((w) => {
          rows.push({
            scheduleId: Number(scheduleId),
            dayNumber: Number(dayNumber),
            orderInDay: ord++,
            stopType: "WAYPOINT",
            placeId: Number(placeKey(w)) || null,
            placeName: w.place_name || w.name || "(장소)",
            category: w.category_group_name || w.category_name || w.category || null,
            address: pickAddress(w) || null,
            lat: Number(w.lat ?? w.y) || null,
            lng: Number(w.lng ?? w.x) || null,
            startTime: null,
            endTime: null,
            cost: null,
            memo: memo ?? null,
            distanceKM: null,
          });
        });

        // END
        rows.push({
          scheduleId: Number(scheduleId),
          dayNumber: Number(dayNumber),
          orderInDay: ord++,
          stopType: "END",
          placeId: Number(placeKey(end)) || null,
          placeName: end.place_name || end.name || "(장소)",
          category: end.category_group_name || end.category_name || end.category || null,
          address: pickAddress(end) || null,
          lat: Number(end.lat ?? end.y) || null,
          lng: Number(end.lng ?? end.x) || null,
          startTime: null,
          endTime: null,
          cost: null,
          memo: memo ?? null,
          distanceKM: null,
        });

        // POI
        (Array.isArray(pickedPois) ? pickedPois : []).forEach((p) => {
          rows.push({
            scheduleId: Number(scheduleId),
            dayNumber: Number(dayNumber),
            orderInDay: ord++,
            stopType: "POI",
            placeId: Number(placeKey(p)) || null,
            placeName: p.place_name || p.name || "(장소)",
            category: p.category_group_name || p.category_name || p.category || null,
            address: pickAddress(p) || null,
            lat: Number(p.lat ?? p.y) || null,
            lng: Number(p.lng ?? p.x) || null,
            startTime: null,
            endTime: null,
            cost: null,
            memo: memo ?? null,
            distanceKM: null,
          });
        });

        await scheduleDetailApi.saveDay(Number(scheduleId), Number(dayNumber), rows);
      }

      // ✅ 2) 로컬 저장본 업데이트(새일정 draft 포함)
      try {
        const raw = localStorage.getItem(realStorageKey);
        const prev = raw ? JSON.parse(raw) : {};
        const days = prev?.days ?? {};
        days[dayNumber] = plan;

        localStorage.setItem(
          realStorageKey,
          JSON.stringify({
            ...prev,
            scheduleId: scheduleId ?? prev?.scheduleId ?? null,
            days,
            updatedAt: new Date().toISOString(),
          })
        );
      } catch (e) {
        console.warn("localStorage save fail", e);
      }

      savedSigRef.current = planSignature(plan);
      hasSavedRef.current = true;

      clearDraft();
      refreshDayStatusMap();

      const isLast = dayNumber >= dayCount;
      const nextDay = isLast ? dayNumber : dayNumber + 1;

      onSaved?.({ savedDay: dayNumber, nextDay, done: isLast, plan });
    } catch (e) {
      console.error("❌ [DayCourseBuilder.saveDay] error =", e);
      setErr("저장 실패(DB/권한/places 생성/콘솔 확인)");
    }
  };

  const moveToMyLocation = () => {
    const map = mapRef.current;
    if (!map) return;

    if (!navigator.geolocation) {
      setErr("이 브라우저는 위치 기능을 지원하지 않아요.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setErr("");
        const { latitude, longitude } = pos.coords;
        map.setCenter(new window.kakao.maps.LatLng(latitude, longitude));
        map.setLevel(5);
      },
      () => setErr("위치 권한이 거부되었어요. (주소창 왼쪽 아이콘 → 위치 허용으로 바꿔줘!)")
    );
  };

  useEffect(() => {
    if (!start || !end) {
      setDistanceM(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setDistLoading(true);

        const points = routePlaces
          .map((p) => toLatLngFromKakao(p))
          .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

        if (points.length < 2) {
          setDistanceM(null);
          return;
        }

        const res = await fetch("/api/route/bike-distance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ style: "REGULAR", points }),
        });

        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setDistanceM(Number(data?.distanceM));
      } catch (e) {
        console.warn(e);
        setDistanceM(null);
        setErr("거리 계산 실패(ORS/백엔드 확인)");
      } finally {
        setDistLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end, waypoints]);

  const searchPoiNearRoute = async (kw) => {
    const ps = psRef.current;

    if (!ps || !kakaoReady) {
      setErr("지도 로딩중이에요! 잠깐만 기다렸다가 다시 눌러줘 🥺");
      return;
    }

    if (!start || !end) {
      setErr("출발/도착을 먼저 선택해줘!");
      return;
    }

    setPoiLoading(true);
    setErr("");
    setPoiResults([]);

    const points = routePlaces.length ? routePlaces : [start, end];

    const SAMPLE = Math.min(8, Math.max(2, points.length));
    const samples = [];
    for (let i = 0; i < SAMPLE; i++) {
      const t = i / (SAMPLE - 1);
      const idx = Math.floor((points.length - 1) * t);
      samples.push(points[idx]);
    }

    const seen = new Set();
    const merged = [];

    const doOne = (pl) =>
      new Promise((resolve) => {
        const { lat, lng } = toLatLngFromKakao(pl);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return resolve();

        const opt = {
          location: new window.kakao.maps.LatLng(lat, lng),
          radius: POI_RADIUS_M,
          sort: window.kakao.maps.services.SortBy.DISTANCE,
        };

        ps.keywordSearch(
          kw,
          (data, s) => {
            if (s === window.kakao.maps.services.Status.OK) {
              (Array.isArray(data) ? data : []).forEach((p) => {
                const id = String(p.id);
                if (!seen.has(id)) {
                  seen.add(id);
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
      await doOne(s);
    }

    setPoiResults(merged.slice(0, 60));
    setPoiLoading(false);
  };

  const addPoi = (p) => setPickedPois((prev) => uniqById([...prev, p]));
  const removePoi = (k) => setPickedPois((prev) => prev.filter((x) => placeKey(x) !== k));
  const removeWp = (k) => setWaypoints((prev) => prev.filter((x) => placeKey(x) !== k));

  const statusLabel = status === "saved" ? "저장완료" : status === "draft" ? "임시(저장전)" : "미완료";

  return (
    <div className="dcb-wrap">
      {err && <div className="dcb-error">{err}</div>}

      <div className="dcb-grid">
        <div className="dcb-left">
          <div className="dcb-card">
            <div className="dcb-card-head">
              <div>
                <div className="dcb-title">
                  {dayNumber}일차 코스 편집 <span className="dcb-sub">({dayNumber}/{dayCount})</span>
                </div>

                <div className="dcb-state">
                  <span className={`dcb-light ${status}`} />
                  <b className="dcb-state-text">{statusLabel}</b>
                </div>

                <div className="dcb-legend">
                  <span><i className="dcb-light saved" /> 저장완료</span>
                  <span><i className="dcb-light draft" /> 임시(저장전)</span>
                  <span><i className="dcb-light incomplete" /> 미완료</span>
                </div>

                <div className="dcb-hint">✅ 변경사항을 반드시 "저장" 하셔야 변경됩니다.</div>
              </div>

              <div className="dcb-head-actions">
                {scheduleId ? (
                  <button
                    className="dcb-btn ghost"
                    type="button"
                    onClick={() => nav(`/schedule/${scheduleId}`)}
                    title="일정 상세로"
                  >
                    일정상세
                  </button>
                ) : null}

                <button className="dcb-btn ghost" type="button" onClick={moveToMyLocation}>
                  내 위치
                </button>
                <button className="dcb-btn ghost" type="button" onClick={resetDay}>
                  초기화
                </button>
              </div>
            </div>

            {dayCount > 1 && typeof onChangeDay === "function" ? (
              <div className="dcb-daytabs">
                {Array.from({ length: dayCount }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`dcb-daytab ${n === dayNumber ? "on" : ""}`}
                    onClick={() => requestChangeDay(n)}
                    title={
                      dayStatusMap?.[n] === "saved"
                        ? "저장완료"
                        : dayStatusMap?.[n] === "draft"
                        ? "임시"
                        : "미완료"
                    }
                  >
                    <span className={`dcb-dot ${dayStatusMap?.[n] || "incomplete"}`} />
                    {n}일차
                  </button>
                ))}
              </div>
            ) : null}

            <div className="dcb-pick-tabs">
              <button
                type="button"
                className={`dcb-chip ${activePick === "start" ? "on" : ""}`}
                onClick={() => setActivePick("start")}
              >
                출발지
              </button>
              <button
                type="button"
                className={`dcb-chip ${activePick === "end" ? "on" : ""}`}
                onClick={() => setActivePick("end")}
              >
                목적지
              </button>
              <button
                type="button"
                className={`dcb-chip ${activePick === "wp" ? "on" : ""}`}
                onClick={() => setActivePick("wp")}
              >
                + 경유지
              </button>
            </div>

            <form
              className="dcb-search"
              onSubmit={(e) => {
                e.preventDefault();
                doSearch(query);
              }}
            >
              <div className="dcb-searchbox">
                <span className="ic">⌕</span>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    activePick === "start"
                      ? "출발지 검색(예: 홍대입구역, 집, 공원...)"
                      : activePick === "end"
                      ? "목적지 검색(예: 경복궁, 한강공원...)"
                      : "경유지 검색(예: 카페, 맛집, 포토스팟...)"
                  }
                />
                {query && (
                  <button type="button" className="x" onClick={() => setQuery("")} aria-label="clear">
                    ×
                  </button>
                )}
              </div>

              <button className="dcb-btn primary" type="submit" disabled={searching || !kakaoReady}>
                {searching ? "검색중..." : kakaoReady ? "검색" : "지도 로딩중..."}
              </button>
            </form>

            <div className="dcb-selected">
              <div className="row">
                <span className="pill a" title="출발">🚴</span>
                {start ? (
                  <div className="sel">
                    <div className="sel-top">
                      <b className="sel-name">{start.place_name || start.name || "(장소)"}</b>
                      <button
                        className="mini inline"
                        type="button"
                        onClick={() => {
                          const ok = confirmIfRisky("출발지를 삭제할까요?");
                          if (!ok) return;
                          setStart(null);
                          setActivePick("start");
                        }}
                      >
                        삭제
                      </button>
                    </div>
                    <div className="muted">{pickAddress(start)}</div>
                  </div>
                ) : (
                  <div className="muted">출발지를 검색해서 선택해줘</div>
                )}
              </div>

              <div className="row">
                <span className="pill b" title="도착">🏁</span>
                {end ? (
                  <div className="sel">
                    <div className="sel-top">
                      <b className="sel-name">{end.place_name || end.name || "(장소)"}</b>
                      <button
                        className="mini inline"
                        type="button"
                        onClick={() => {
                          const ok = confirmIfRisky("목적지를 삭제할까요?");
                          if (!ok) return;
                          setEnd(null);
                        }}
                      >
                        삭제
                      </button>
                    </div>
                    <div className="muted">{pickAddress(end)}</div>
                  </div>
                ) : (
                  <div className="muted">목적지를 검색해서 선택해줘</div>
                )}
              </div>

              <div className="row">
                <span className="pill w" title="경유">➕</span>
                {waypoints.length ? (
                  <div className="wp-list">
                    {waypoints.map((w) => (
                      <div key={placeKey(w)} className="wp">
                        <div>
                          <b>{w.place_name || w.name || "(장소)"}</b>
                          <div className="muted">{pickAddress(w)}</div>
                        </div>
                        <button className="mini inline" type="button" onClick={() => removeWp(placeKey(w))}>
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="muted">경유지는 선택 사항이에요</div>
                )}
              </div>
            </div>

            <div className="dcb-results">
              {results.length === 0 ? (
                <div className="empty">
                  <div className="empty-title">검색 결과가 여기에 떠요</div>
                  <div className="empty-sub">지도 위치 상관없이 검색돼요.</div>
                </div>
              ) : (
                results.map((p) => (
                  <button key={p.id} type="button" className="result" onClick={() => selectPlace(p)}>
                    <div className="r-top">
                      <div className="r-name">{p.place_name}</div>
                      <div className="r-cat">{p.category_group_name || p.category_name}</div>
                    </div>
                    <div className="r-addr">{pickAddress(p) || "주소 정보 없음"}</div>
                    <div className="r-meta">
                      {p.phone ? <span>☎ {p.phone}</span> : <span className="muted">전화 없음</span>}
                      {p.distance ? <span className="muted"> · {p.distance}m</span> : null}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="dcb-card">
            <div className="dcb-card-head">
              <div>
                <div className="dcb-title">코스 주변 추천</div>
                <div className="dcb-hint">결과에서 “+ 추가” 누르면 저장 목록에 쌓여요</div>
              </div>
            </div>

            <div className="dcb-poi-quick">
              {POI_QUICK.map((q) => (
                <button
                  key={q.key}
                  type="button"
                  className="poi-btn"
                  onClick={() => searchPoiNearRoute(q.kw)}
                  disabled={poiLoading || !start || !end || !kakaoReady}
                  title={!kakaoReady ? "지도 로딩중..." : undefined}
                >
                  <span className="emo">{q.emoji}</span>
                  <span>{q.label}</span>
                </button>
              ))}
            </div>

            <div className="dcb-poi-list">
              {poiLoading ? (
                <div className="empty">
                  <div className="empty-title">추천 불러오는 중...</div>
                </div>
              ) : poiResults.length === 0 ? (
                <div className="empty">
                  <div className="empty-title">
                    {!kakaoReady
                      ? "지도 로딩중이에요..."
                      : !start || !end
                      ? "출발/도착 먼저 선택해줘!"
                      : "카테고리를 누르면 추천이 떠요"}
                  </div>
                  <div className="empty-sub">여러 번 눌러서 마음에 드는 곳들을 추가해도 돼.</div>
                </div>
              ) : (
                poiResults.map((p) => {
                  const added = pickedPois.some((x) => placeKey(x) === placeKey(p));
                  return (
                    <div key={p.id} className="poi-item">
                      <div className="poi-main">
                        <div className="poi-name">{p.place_name}</div>
                        <div className="poi-sub">{pickAddress(p)}</div>
                      </div>
                      <div className="poi-actions">
                        <button
                          className={`mini inline ${added ? "on" : ""}`}
                          type="button"
                          onClick={() => addPoi(p)}
                          disabled={added}
                        >
                          {added ? "추가됨" : "+ 추가"}
                        </button>
                        {p.place_url && (
                          <a className="mini inline ghost" href={p.place_url} target="_blank" rel="noreferrer">
                            링크
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="dcb-picked">
              <div className="picked-title">내가 추가한 장소</div>
              {pickedPois.length === 0 ? (
                <div className="muted">아직 추가한 곳이 없어요.</div>
              ) : (
                <div className="picked-list">
                  {pickedPois.map((p) => (
                    <div key={placeKey(p)} className="picked">
                      <div>
                        <b>{p.place_name || p.name || "(장소)"}</b>
                        <div className="muted">{pickAddress(p)}</div>
                      </div>
                      <button className="mini inline" type="button" onClick={() => removePoi(placeKey(p))}>
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <label className="dcb-memo-label">메모(선택)</label>
            <textarea
              className="dcb-memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="예) 2일차는 카페 2곳 + 야경 포토스팟"
            />

            <div className="dcb-savebar">
              <button
                className="dcb-btn primary"
                type="button"
                onClick={saveDay}
                disabled={!start || !end || distLoading}
              >
                {distLoading ? "거리 계산중..." : `${dayNumber}일차 저장`}
              </button>
            </div>
          </div>
        </div>

        <div className="dcb-mapbox">
          <div ref={mapElRef} className="dcb-map" />
        </div>
      </div>
    </div>
  );
}
