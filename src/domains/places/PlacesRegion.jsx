// src/domains/places/PlacesRegion.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "./PlacesRegion.css";
import { getHotelImageFromBing } from "../../api/bingImageAPI";
import { CURATED_TOP6, MANUAL_PLACE_META } from "./curationData";
import { ensureKakaoLoaded } from "../../utils/kakaoLoader";

const RADIUS_M = 12000;
const DEFAULT_LEVEL = 7;

const REGION_META = {
  jeju: { key: "jeju", name: "제주", sub: "대한민국", lat: 33.4996, lng: 126.5312, heroImg: "/images/domestic/jeju.jpg" },
  busan: { key: "busan", name: "부산", sub: "대한민국", lat: 35.1796, lng: 129.0756, heroImg: "/images/domestic/busan.jpg" },
  gangneung: { key: "gangneung", name: "강릉", sub: "대한민국", lat: 37.7519, lng: 128.8761, heroImg: "/images/domestic/gangneung.jpg" },
  gyeongju: { key: "gyeongju", name: "경주", sub: "대한민국", lat: 35.8562, lng: 129.2247, heroImg: "/images/domestic/gyeongju.jpg" },
  seoul: { key: "seoul", name: "서울", sub: "대한민국", lat: 37.5665, lng: 126.978, heroImg: "/images/domestic/seoul.jpg" },
};

const QUICK = [
  { key: "tour", label: "관광명소", kw: "관광명소", emoji: "🧭" },
  { key: "food", label: "맛집", kw: "맛집", emoji: "🍜" },
  { key: "cafe", label: "카페", kw: "카페", emoji: "☕" },
  { key: "photo", label: "포토존", kw: "포토존", emoji: "📸" },
  { key: "view", label: "전망대", kw: "전망대", emoji: "🗻" },
  { key: "park", label: "공원", kw: "공원", emoji: "🌿" },
  { key: "stay", label: "숙소", kw: "숙소", emoji: "🏡" },
  { key: "ride", label: "자전거길", kw: "자전거길", emoji: "🚴" },
];

const HERO_QUICK_KEYS = ["tour", "food", "cafe", "photo"];

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function distanceLabel(meterStr) {
  const m = parseInt(meterStr, 10);
  if (!Number.isFinite(m)) return "";
  if (m < 1000) return `${m}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

export default function PlacesRegion() {
  const navigate = useNavigate();
  const { regionKey } = useParams();
  const location = useLocation();

  const region = REGION_META?.[regionKey] ?? REGION_META.seoul;

  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const psRef = useRef(null);
  const infowindowRef = useRef(null);
  const markersRef = useRef([]);
  const initedRef = useRef(false);

  // 요청 ID 분리(Top6 resolve vs Top6 images)
  const topResolveReqRef = useRef(0);
  const topImageReqRef = useRef(0);

  const [quickKey, setQuickKey] = useState("tour");
  const [keyword, setKeyword] = useState("관광명소");
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [dirtyCenter, setDirtyCenter] = useState(false);

  const [topLoading, setTopLoading] = useState(false);
  const [topImages, setTopImages] = useState({});
  const [topItems, setTopItems] = useState([]);

  const activeEmoji = useMemo(() => QUICK.find((x) => x.key === quickKey)?.emoji ?? "📍", [quickKey]);

  const curatedList = useMemo(() => {
    if (!quickKey) return [];
    const list = CURATED_TOP6?.[region.key]?.[quickKey];
    return Array.isArray(list) ? list.slice(0, 6) : [];
  }, [region.key, quickKey]);

  const isCurated = curatedList.length > 0;

  const heroQuick = useMemo(() => QUICK.filter((q) => HERO_QUICK_KEYS.includes(q.key)), []);

  const clearMarkers = () => {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
  };

  const openInfo = (place) => {
    const map = mapRef.current;
    const iw = infowindowRef.current;
    if (!map || !iw) return;

    const lat = toNum(place?.y);
    const lng = toNum(place?.x);
    if (lat == null || lng == null) return;

    const pos = new window.kakao.maps.LatLng(lat, lng);
    map.panTo(pos);

    iw.setContent(`
      <div style="padding:10px 12px; min-width:240px;">
        <div style="font-weight:900; margin-bottom:6px;">${place.place_name}</div>
        <div style="font-size:12px; color:#6b7280;">${place.road_address_name || place.address_name || ""}</div>
        ${place.phone ? `<div style="margin-top:6px; font-size:12px;">☎ ${place.phone}</div>` : ""}
      </div>
    `);
    iw.open(map, place.__marker);
  };

  const searchPlaces = (kw) => {
    const map = mapRef.current;
    const ps = psRef.current;
    if (!map || !ps) return;

    const realKw = (kw ?? "").trim();
    if (!realKw) {
      setErr("검색어를 입력해주세요!");
      return;
    }

    setLoading(true);
    setErr("");
    setSelectedId(null);
    setDirtyCenter(false);

    const center = map.getCenter();
    const opt = {
      location: center,
      radius: RADIUS_M,
      sort: window.kakao.maps.services.SortBy.DISTANCE,
    };

    ps.keywordSearch(
      realKw,
      (data, status) => {
        setLoading(false);

        if (status === window.kakao.maps.services.Status.OK) {
          setItems(data);

          clearMarkers();
          const bounds = new window.kakao.maps.LatLngBounds();

          data.forEach((p) => {
            const lat = toNum(p.y);
            const lng = toNum(p.x);
            if (lat == null || lng == null) return;

            const pos = new window.kakao.maps.LatLng(lat, lng);
            bounds.extend(pos);

            const marker = new window.kakao.maps.Marker({ map, position: pos });
            p.__marker = marker;

            window.kakao.maps.event.addListener(marker, "click", () => {
              setSelectedId(p.id);
              openInfo(p);
            });

            markersRef.current.push(marker);
          });

          if (data.length > 0) map.setBounds(bounds);
        } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
          setItems([]);
          clearMarkers();
          setErr("검색 결과가 없어요 🥲 (키워드/위치를 바꿔봐!)");
        } else {
          setItems([]);
          clearMarkers();
          setErr("장소 검색 중 오류가 발생했어요. (키/도메인/SDK 확인)");
        }
      },
      opt
    );
  };

  const moveMapTo = (lat, lng, level = DEFAULT_LEVEL) => {
    const map = mapRef.current;
    if (!map) return;
    const pos = new window.kakao.maps.LatLng(lat, lng);
    map.setCenter(pos);
    map.setLevel(level);
    setDirtyCenter(true);
  };

  const onQuickClick = (key) => {
    const q = QUICK.find((x) => x.key === key)?.kw ?? "";
    setQuickKey(key);
    setKeyword(q);
    searchPlaces(q);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setQuickKey("");
    searchPlaces(keyword);
  };

  const onReSearchHere = () => {
    const q = (keyword ?? "").trim();
    if (!q) return;
    searchPlaces(q);
  };

  const goDetail = (p) => {
    const stateData = {
      placeId: p.id,
      name: p.place_name,
      address: p.road_address_name || p.address_name || p.address || MANUAL_PLACE_META?.[String(p.id)]?.address || "",
      phone: p.phone || "",
      x: p.x || "",
      y: p.y || "",
    };

    if (quickKey === "stay") {
      navigate(`/hotel/${p.id}`, { state: stateData });
      return;
    }
    navigate(`/places/${p.id}`, { state: stateData });
  };

  // ✅ 지도 초기화 + 자동검색
  useEffect(() => {
    (async () => {
      try {
        if (initedRef.current) return;
        initedRef.current = true;

        setErr("");
        await ensureKakaoLoaded({ requireServices: true });

        const defaultCenter = new window.kakao.maps.LatLng(region.lat, region.lng);
        const st = location?.state;
        const stLat = st?.center?.lat;
        const stLng = st?.center?.lng;

        const center = stLat && stLng ? new window.kakao.maps.LatLng(stLat, stLng) : defaultCenter;

        const container = mapElRef.current;
        if (!container) return;

        const map = new window.kakao.maps.Map(container, {
          center,
          level: st?.level ?? DEFAULT_LEVEL,
        });

        mapRef.current = map;
        psRef.current = new window.kakao.maps.services.Places();
        infowindowRef.current = new window.kakao.maps.InfoWindow({ zIndex: 10 });

        window.kakao.maps.event.addListener(map, "dragend", () => setDirtyCenter(true));
        window.kakao.maps.event.addListener(map, "zoom_changed", () => setDirtyCenter(true));

        // ✅ 첫 렌더 relayout 보정
        requestAnimationFrame(() => map.relayout());

        const autoQuick = st?.quickKey || "tour";
        const autoKw = st?.autoKeyword || QUICK.find((x) => x.key === autoQuick)?.kw || "관광명소";

        setQuickKey(autoQuick);
        setKeyword(autoKw);

        if (stLat && stLng) moveMapTo(stLat, stLng, st?.level ?? DEFAULT_LEVEL);
        else moveMapTo(region.lat, region.lng, st?.level ?? DEFAULT_LEVEL);

        searchPlaces(autoKw);
      } catch (e) {
        console.error(e);
        setErr(e.message || "카카오 SDK 로드 실패");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Top6 구성(큐레이션 있으면 id 매칭, 없으면 items 상위 6개)
  useEffect(() => {
    (async () => {
      const ps = psRef.current;
      const map = mapRef.current;

      if (!ps || !map) {
        setTopItems(items.slice(0, 6));
        return;
      }

      if (!isCurated) {
        setTopItems(items.slice(0, 6));
        return;
      }

      const now = ++topResolveReqRef.current;
      setTopLoading(true);

      const center = new window.kakao.maps.LatLng(region.lat, region.lng);
      const opt = {
        location: center,
        radius: RADIUS_M,
        sort: window.kakao.maps.services.SortBy.DISTANCE,
      };

      const keywordSearchAsync = (kw) =>
        new Promise((resolve) => {
          ps.keywordSearch(
            kw,
            (data, status) => {
              if (status === window.kakao.maps.services.Status.OK) resolve(data || []);
              else resolve([]);
            },
            opt
          );
        });

      try {
        const resolved = await Promise.all(
          curatedList.map(async (c) => {
            const data = await keywordSearchAsync(c.name);
            const found = data.find((x) => String(x.id) === String(c.placeId));

            if (!found) {
              return {
                id: c.placeId,
                place_name: c.name,
                address_name: "",
                road_address_name: "",
                phone: "",
                x: "",
                y: "",
                place_url: "",
                category_name: "",
                category_group_name: "",
                __curated: true,
                __unresolved: true,
              };
            }

            return { ...found, __curated: true, __unresolved: false };
          })
        );

        if (topResolveReqRef.current !== now) return;
        setTopItems(resolved);
      } catch (e) {
        console.warn("Top6 resolve failed:", e);
        setTopItems(items.slice(0, 6));
      } finally {
        if (topResolveReqRef.current === now) setTopLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCurated, curatedList, items, region.lat, region.lng]);

  // ✅ Top6 이미지 로딩
  useEffect(() => {
    (async () => {
      const now = ++topImageReqRef.current;

      if (!topItems.length) {
        setTopImages({});
        return;
      }

      const need = topItems.filter((p) => !topImages[p.id]);
      if (need.length === 0) return;

      try {
        const pairs = await Promise.all(
          need.map(async (p) => {
            const manual = MANUAL_PLACE_META?.[String(p.id)];
            if (manual?.imageUrl) return [p.id, manual.imageUrl];

            const area = region.name;
            const r = await getHotelImageFromBing(p.place_name, area);
            const imageUrl = r?.imageUrl || r?.url || r?.data?.imageUrl || null;
            return [p.id, imageUrl];
          })
        );

        if (topImageReqRef.current !== now) return;

        setTopImages((prev) => {
          const next = { ...prev };
          pairs.forEach(([id, url]) => {
            if (url) next[id] = url;
          });
          return next;
        });
      } catch (e) {
        console.error("Top6 이미지 로딩 실패", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topItems, region.name]);

  const topTitle = useMemo(() => {
    const label = QUICK.find((x) => x.key === (quickKey || "tour"))?.label ?? "추천";
    return isCurated ? `${region.name} 인기 ${label} TOP 6` : `${region.name} 근처 ${label} TOP 6`;
  }, [isCurated, region.name, quickKey]);

  const topNote = useMemo(() => {
    return isCurated ? "팀이 선정한 고정 Top6예요. (설명은 상세페이지에서 확인)" : "현재 지도 중심 기준, 가까운 순으로 6개를 보여줘요.";
  }, [isCurated]);

  return (
    <div className="pr-wrap">
      <div className="pr-intro">
        <button className="pr-intro-back" type="button" onClick={() => navigate(-1)} aria-label="뒤로가기">
          ←
        </button>

        <div className="pr-intro-txt">
          <div className="pr-intro-kicker">국내 여행지</div>
          <div className="pr-intro-title">
            {region.name} <span className="pr-intro-dot">·</span> <span className="pr-intro-sub">{region.sub}</span>
          </div>
          <div className="pr-intro-note">
            상단 Top6는 <b>{isCurated ? "인기 큐레이션(고정)" : "지도 중심 근처(거리순)"}</b>으로 보여줘요. 아래 검색 결과는{" "}
            <b>지도 중심</b> 기준 탐색이에요.
          </div>
        </div>

        <div className="pr-intro-right">
          <div className="pr-pill">검색 반경 {Math.round(RADIUS_M / 1000)}km</div>
          <div className="pr-pill">검색 정렬: 거리순</div>
          <div className="pr-pill">결과: {items.length}개</div>
        </div>
      </div>

      <div className="pr-hero">
        <div className="pr-hero-bg" style={{ backgroundImage: `url(${region.heroImg})` }} />
        <div className="pr-hero-dim" />
        <div className="pr-hero-content">
          <div className="pr-hero-top">
            <div className="pr-hero-h">"{region.name}에서 뭐 할까?"</div>

            <div className="pr-hero-chips">
              {heroQuick.map((x) => (
                <button
                  key={x.key}
                  type="button"
                  className={`pr-chip ${quickKey === x.key ? "on" : ""}`}
                  onClick={() => onQuickClick(x.key)}
                >
                  <span className="pr-chip-emoji">{x.emoji}</span>
                  {x.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pr-hero-meta">
            <span className="pr-meta-pill">Top6: {isCurated ? "인기 큐레이션" : "근처 추천"}</span>
            <span className="pr-meta-pill">검색: 지도 중심</span>
            <span className="pr-meta-pill">결과: {items.length}개</span>
          </div>
        </div>
      </div>

      <section className="pr-top6">
        <div className="pr-sec-head">
          <h2 className="pr-sec-title">{topTitle}</h2>
          <div className="pr-sec-sub">{topNote}</div>
        </div>

        {topLoading && topItems.length === 0 ? (
          <div className="pr-top6-skel">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="pr-skel-card" />
            ))}
          </div>
        ) : topItems.length === 0 ? (
          <div className="pr-top6-empty">추천할 장소가 아직 없어요 🥲</div>
        ) : (
          <div className="pr-top6-grid">
            {topItems.slice(0, 6).map((p, idx) => {
              const img = topImages[p.id];
              const unresolvedLabel = p.__unresolved ? "정보 준비중" : "";

              return (
                <button key={p.id} type="button" className="pr-top6-card" onClick={() => goDetail(p)}>
                  <div
                    className="pr-top6-bg"
                    style={{
                      backgroundImage: img
                        ? `url(${img})`
                        : `linear-gradient(135deg, rgba(17,24,39,0.65), rgba(37,99,235,0.35))`,
                    }}
                  />
                  <div className="pr-top6-dim" />
                  <div className="pr-top6-rank">TOP {idx + 1}</div>

                  <div className="pr-top6-txt">
                    <div className="pr-top6-name">{p.place_name}</div>
                    {unresolvedLabel && <div className="pr-top6-sub">{unresolvedLabel}</div>}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="pr-attrib">Photos provided by Bing (fallback)</div>
      </section>

      <div className="pr-quick">
        {QUICK.map((x) => (
          <button
            key={x.key}
            type="button"
            className={`pr-quick-btn ${quickKey === x.key ? "on" : ""}`}
            onClick={() => onQuickClick(x.key)}
          >
            <span className="pr-emoji">{x.emoji}</span>
            <span className="pr-text">{x.label}</span>
          </button>
        ))}
      </div>

      <form className="pr-searchbar" onSubmit={onSubmit}>
        <div className="pr-searchbox">
          <span className="pr-ic">⌕</span>
          <input
            className="pr-input"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="예) 카페, 맛집, 관광명소, 포토존..."
          />
          {keyword && (
            <button type="button" className="pr-clear" onClick={() => setKeyword("")} aria-label="지우기">
              ×
            </button>
          )}
        </div>
        <button className="pr-btn" type="submit" disabled={loading}>
          {loading ? "검색중..." : "검색"}
        </button>
      </form>

      {err && <div className="pr-error">{err}</div>}

      <div className="pr-body">
        <div className="pr-panel">
          <div className="pr-panel-head">
            <div className="pr-panel-title">검색 결과 (지도 중심 기준)</div>
            <div className="pr-panel-sub">{items.length}개</div>
          </div>

          {items.length === 0 ? (
            <div className="pr-empty">
              <div className="pr-empty-title">결과가 없어요 🥲</div>
              <div className="pr-empty-sub">지도를 옮긴 뒤 “이 위치에서 재검색”을 눌러봐!</div>
            </div>
          ) : (
            <div className="pr-list">
              {items.map((p) => (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  className={`pr-item ${selectedId === p.id ? "on" : ""}`}
                  onClick={() => {
                    setSelectedId(p.id);
                    openInfo(p);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(p.id);
                      openInfo(p);
                    }
                  }}
                >
                  <div className={`pr-thumb t-${quickKey || "tour"}`}>
                    <span className="pr-thumb-emoji">{activeEmoji}</span>
                  </div>

                  <div className="pr-item-body">
                    <div className="pr-item-top">
                      <div className="pr-item-name">{p.place_name}</div>
                      <div className="pr-item-cat">{p.category_group_name || p.category_name}</div>
                    </div>

                    <div className="pr-item-addr">{p.road_address_name || p.address_name || "주소 정보 없음"}</div>

                    <div className="pr-item-meta">
                      {p.phone ? <span>☎ {p.phone}</span> : <span className="muted">전화 없음</span>}
                      <span className="dot">•</span>
                      <span className="muted">{p.distance ? distanceLabel(p.distance) : ""}</span>
                    </div>

                    <div className="pr-item-actions">
                      <button
                        type="button"
                        className="pr-mini"
                        onClick={(e) => {
                          e.stopPropagation();
                          goDetail(p);
                        }}
                      >
                        상세보기 →
                      </button>

                      {p.place_url && (
                        <a
                          className="pr-mini-link"
                          href={p.place_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          카카오에서 보기
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pr-mapbox">
          <div ref={mapElRef} className="pr-map" />
          {dirtyCenter && (
            <button type="button" className="pr-research" onClick={onReSearchHere} disabled={loading}>
              {loading ? "검색중..." : "이 위치에서 재검색"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
