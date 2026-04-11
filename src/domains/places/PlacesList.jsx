import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./PlacesList.css";

/**
 * ✅ 카카오 장소검색은 "감성야경/인생샷" 같은 해시태그성 키워드보다
 *    일반 키워드(카페/맛집/관광명소/전망대/공원/숙소/포토존/자전거길)가 훨씬 잘 나옵니다.
 */
const QUICK = [
  { key: "cafe", label: "카페", kw: "카페", emoji: "☕" },
  { key: "food", label: "맛집", kw: "맛집", emoji: "🍜" },
  { key: "tour", label: "관광명소", kw: "관광명소", emoji: "🧭" },
  { key: "view", label: "전망대", kw: "전망대", emoji: "🗻" },
  { key: "park", label: "공원", kw: "공원", emoji: "🌿" },
  { key: "stay", label: "숙소", kw: "숙소", emoji: "🏡" },
  { key: "photo", label: "포토존", kw: "포토존", emoji: "📸" },
  { key: "ride", label: "자전거길", kw: "자전거길", emoji: "🚴" },
];

const DEFAULT_QUICK = "cafe";
const RADIUS_M = 8000; // 근처 기준(8km)
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.9780 }; // 서울

// ✅ 상단 "핫 여행지"(이미지: public/images/hot/...)
const HOT_DEST = [
  { key: "jeju", name: "제주", sub: "대한민국", lat: 33.4996, lng: 126.5312, img: "/images/hot/jeju.jpg" },
  { key: "busan", name: "부산", sub: "대한민국", lat: 35.1796, lng: 129.0756, img: "/images/hot/busan.jpg" },
  { key: "gangneung", name: "강릉", sub: "대한민국", lat: 37.7519, lng: 128.8761, img: "/images/hot/gangneung.jpg" },
  { key: "gyeongju", name: "경주", sub: "대한민국", lat: 35.8562, lng: 129.2247, img: "/images/hot/gyeongju.jpg" },
];

// ✅ 인기 일정표(목업) - 나중에 API로 교체
const POPULAR_PLANS = [
  { id: 101, title: "경주 2박 3일", tags: ["가족", "2박 3일"], img: "/images/plan/gyeongju.jpg" },
  { id: 102, title: "제주 3박 4일", tags: ["연인", "3박 4일"], img: "/images/plan/jeju.jpg" },
  { id: 103, title: "강릉 당일치기", tags: ["친구", "당일"], img: "/images/plan/gangneung.jpg" },
];

function ensureKakaoLoaded() {
  if (window.kakao && window.kakao.maps && window.kakao.maps.load) return Promise.resolve();
  return Promise.reject(new Error("Kakao SDK가 로드되지 않았습니다. (index.html / 도메인 등록 / 키 확인)"));
}

export default function PlacesList() {
  const navigate = useNavigate();
  const location = useLocation();
  const initedRef = useRef(false);

  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const psRef = useRef(null);
  const infowindowRef = useRef(null);
  const markersRef = useRef([]);

  // ✅ 내 위치 표시
  const myMarkerRef = useRef(null);
  const myCircleRef = useRef(null);
  const myPosRef = useRef(null); // {lat, lng}

  const [keyword, setKeyword] = useState(QUICK.find((q) => q.key === DEFAULT_QUICK)?.kw ?? "카페");
  const [quickKey, setQuickKey] = useState(DEFAULT_QUICK);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  // ✅ 지도 움직였을 때 “이 위치에서 재검색”
  const [dirtyCenter, setDirtyCenter] = useState(false);

  const activeEmoji = useMemo(() => QUICK.find((x) => x.key === quickKey)?.emoji ?? "📍", [quickKey]);

  const clearMarkers = () => {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
  };

  const setMyLocationMarker = (latlng) => {
    const map = mapRef.current;
    if (!map) return;

    // 마커
    if (!myMarkerRef.current) {
      myMarkerRef.current = new window.kakao.maps.Marker({
        map,
        position: latlng,
        zIndex: 60,
      });
    } else {
      myMarkerRef.current.setPosition(latlng);
      myMarkerRef.current.setMap(map);
    }

    // 원(내 위치 반경)
    if (!myCircleRef.current) {
      myCircleRef.current = new window.kakao.maps.Circle({
        center: latlng,
        radius: 140,
        strokeWeight: 2,
        strokeOpacity: 0.6,
        fillOpacity: 0.14,
      });
      myCircleRef.current.setMap(map);
    } else {
      myCircleRef.current.setCenter(latlng);
      myCircleRef.current.setMap(map);
    }
  };

  const openInfo = (place) => {
    const map = mapRef.current;
    if (!map) return;

    const lat = parseFloat(place?.y);
    const lng = parseFloat(place?.x);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const pos = new window.kakao.maps.LatLng(lat, lng);
    map.panTo(pos);

    const iw = infowindowRef.current;
    if (!iw) return;

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
            const lat = parseFloat(p.y);
            const lng = parseFloat(p.x);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

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
          setErr("근처 검색 결과가 없어요 🥲 (지도를 다른 곳으로 옮기고 다시 눌러봐!)");
        } else {
          setItems([]);
          clearMarkers();
          setErr("장소 검색 중 오류가 발생했어요. (키/도메인/SDK 확인)");
        }
      },
      opt
    );
  };

  const moveMapTo = (lat, lng, level = 7) => {
    const map = mapRef.current;
    if (!map) return;
    const pos = new window.kakao.maps.LatLng(lat, lng);
    map.setCenter(pos);
    map.setLevel(level);
    setDirtyCenter(true);
  };

  // ✅ 내 위치로 이동(이동만)
  const goToMyLocation = () => {
    const map = mapRef.current;
    if (!map) return;

    if (!navigator.geolocation) {
      setErr("이 브라우저는 위치 기능을 지원하지 않아요.");
      return;
    }

    setErr("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        myPosRef.current = { lat: latitude, lng: longitude };

        const latlng = new window.kakao.maps.LatLng(latitude, longitude);
        setMyLocationMarker(latlng);

        map.setCenter(latlng);
        map.setLevel(5);
        setDirtyCenter(true);
      },
      () => setErr("위치 권한이 거부되었어요. (브라우저/OS 설정에서 위치 허용 필요)")
    );
  };

  // ✅ 현 위치에서 검색(이동 + 검색)
  // const searchAtMyLocation = () => {
  //   const map = mapRef.current;
  //   if (!map) return;

  //   if (!navigator.geolocation) {
  //     setErr("이 브라우저는 위치 기능을 지원하지 않아요.");
  //     return;
  //   }

  //   setErr("");

  //   navigator.geolocation.getCurrentPosition(
  //     (pos) => {
  //       const { latitude, longitude } = pos.coords;
  //       myPosRef.current = { lat: latitude, lng: longitude };

  //       const latlng = new window.kakao.maps.LatLng(latitude, longitude);
  //       setMyLocationMarker(latlng);

  //       map.setCenter(latlng);
  //       map.setLevel(5);

  //       const q = (keyword ?? "").trim() || (QUICK.find((x) => x.key === quickKey)?.kw ?? "관광명소");
  //       setKeyword(q);
  //       searchPlaces(q);
  //     },
  //     () => setErr("위치 권한이 거부되었어요. (브라우저/OS 설정에서 위치 허용 필요)"),
  //     { enableHighAccuracy: true, timeout: 10000 }
  //   );
  // };

  // ✅ 지도 초기화
  useEffect(() => {
    (async () => {
      try {
        if (initedRef.current) return;
        initedRef.current = true;

        setErr("");
        await ensureKakaoLoaded();

        window.kakao.maps.load(() => {
          const center = new window.kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
          const map = new window.kakao.maps.Map(mapElRef.current, { center, level: 6 });

          mapRef.current = map;
          psRef.current = new window.kakao.maps.services.Places();
          infowindowRef.current = new window.kakao.maps.InfoWindow({ zIndex: 10 });

          window.kakao.maps.event.addListener(map, "dragend", () => setDirtyCenter(true));
          window.kakao.maps.event.addListener(map, "zoom_changed", () => setDirtyCenter(true));

          // ✅ 기본 검색
          const first = QUICK.find((x) => x.key === DEFAULT_QUICK)?.kw ?? "카페";
          setKeyword(first);
          searchPlaces(first);

          // ✅ DomesticExplore에서 넘어온 state 처리(중요!)
          const st = location?.state;
          if (st?.center?.lat && st?.center?.lng) {
            const autoKw = st?.autoKeyword || "관광명소";
            const autoQuick = st?.quickKey || "tour";

            setQuickKey(autoQuick);
            setKeyword(autoKw);

            moveMapTo(st.center.lat, st.center.lng, st.level ?? 7);
            searchPlaces(autoKw);
          }
        });
      } catch (e) {
        console.error(e);
        setErr(e.message || "카카오 SDK 로드 실패");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const onHotClick = (d) => {
  navigate(`/places/region/${d.key}`, { state: { region: d } });

};

  return (
    <div className="pl-wrap">
      <div className="pl-head">
        <div>
          <h1 className="pl-title">여행지 찾기</h1>
          <p className="pl-desc">국내 인기 지역을 둘러보고, 지도에서 주변 장소를 검색해요.</p>
        </div>
      </div>

      {/* ✅ 핫 여행지 */}
      <section className="pl-sec">
        <div className="pl-sec-head">
          <h2 className="pl-sec-title">지금 가장 핫한 여행지는?</h2>
          <button type="button" className="pl-sec-link" onClick={() => navigate("/places/domestic")}>
            전체보기 →
          </button>
        </div>

        <div className="pl-hot-grid">
          {HOT_DEST.map((d) => (
            <button key={d.key} type="button" className="pl-hot-card" onClick={() => onHotClick(d)}>
              <div className="pl-hot-bg" style={{ backgroundImage: `url(${d.img})` }} />
              <div className="pl-hot-dim" />
              <div className="pl-hot-txt">
                <div className="pl-hot-name">{d.name}</div>
                <div className="pl-hot-sub">{d.sub}</div>
              </div>
              <div className="pl-hot-badge">관광명소</div>
            </button>
          ))}
        </div>
      </section>

      {/* ✅ 인기 일정표 */}
      <section className="pl-sec">
        <div className="pl-sec-head">
          <h2 className="pl-sec-title">인기 있는 국내 여행 일정표</h2>
        </div>

        <div className="pl-plan-grid">
  {POPULAR_PLANS.map((p) => (
    <Link
      key={p.id}
      to={`/schedule/popular/${p.id}`}
      className="pl-plan-card"
      onClick={(e) => e.stopPropagation()} // ✅ 혹시 모를 부모 클릭 방지
    >
      <div className="pl-plan-img" style={{ backgroundImage: `url(${p.img})` }} />
      <div className="pl-plan-body">
        <div className="pl-plan-title">{p.title}</div>
        <div className="pl-plan-tags">
          {p.tags.map((t) => (
            <span key={t} className="pl-tag">
              {t}
            </span>
          ))}
        </div>
      </div>
    </Link>
  ))}
</div>

        <button type="button" className="pl-create" onClick={() => navigate("/schedule/new")}>
          새 일정표 만들기
        </button>

        {/* ✅ 요청: 분리 구분선 + 근처 여행지 장소 타이틀 */}
        <div className="pl-divider" aria-hidden="true" />

        <div className="pl-nearby-head">
          <h2 className="pl-nearby-title">근처 여행지 장소</h2>
          <p className="pl-nearby-desc">카테고리를 눌러 주변 장소를 빠르게 찾아봐요.</p>
        </div>
      </section>

      {/* ✅ 퀵 카테고리 */}
      <div className="pl-quick">
        {QUICK.map((x) => (
          <button
            key={x.key}
            type="button"
            className={`pl-quick-btn ${quickKey === x.key ? "on" : ""}`}
            onClick={() => onQuickClick(x.key)}
          >
            <span className="pl-quick-emoji">{x.emoji}</span>
            <span className="pl-quick-text">{x.label}</span>
          </button>
        ))}
      </div>

      {/* ✅ 키워드 직접 검색 */}
      <form className="pl-searchbar" onSubmit={onSubmit}>
        <div className="pl-searchbox">
          <span className="pl-ic">⌕</span>
          <input
            className="pl-input"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="예) 카페, 맛집, 관광명소, 전망대, 공원, 숙소, 포토존..."
          />
          {keyword && (
            <button type="button" className="pl-clear" onClick={() => setKeyword("")} aria-label="지우기">
              ×
            </button>
          )}
        </div>
        <button className="pl-btn primary" type="submit" disabled={loading}>
          {loading ? "검색중..." : "검색"}
        </button>
      </form>

      {err && <div className="pl-error">{err}</div>}

      <div className="pl-body">
        {/* 왼쪽: 리스트 */}
        <div className="pl-panel">
          <div className="pl-panel-head">
            <div className="pl-panel-title">검색 결과</div>
            <div className="pl-panel-sub">{items.length}개</div>
          </div>

          {items.length === 0 ? (
            <div className="pl-empty">
              <div className="pl-empty-title">결과가 없어요 🥲</div>
              <div className="pl-empty-sub">지도를 옮긴 뒤 “이 위치에서 재검색”을 눌러봐!</div>
            </div>
          ) : (
            <div className="pl-list">
              {items.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`pl-item ${selectedId === p.id ? "on" : ""}`}
                  onClick={() => {
                    setSelectedId(p.id);
                    const stateData = {
                      placeId: p.id,
                      name: p.place_name,
                      address: p.road_address_name || p.address_name,
                      phone: p.phone,
                      x: p.x,
                      y: p.y,
                    };

                    // ✅ 숙소 → 호텔 상세
                    if (quickKey === "stay") {
                      navigate(`/hotel/${p.id}`, { state: stateData });
                      return;
                    }

                    // ✅ 그 외 → 공용 장소 상세
                    navigate(`/places/${p.id}`, { state: stateData });
                    // ✅ 기존 동작 유지 (지도 이동 + 인포윈도우)
                    openInfo(p);
                  }}
                >
                  <div className={`pl-thumb t-${quickKey || "free"}`}>
                    <span className="pl-thumb-emoji">{activeEmoji}</span>
                  </div>

                  <div className="pl-item-body">
                    <div className="pl-item-top">
                      <div className="pl-item-name">{p.place_name}</div>
                      <div className="pl-item-cat">{p.category_group_name || p.category_name}</div>
                    </div>

                    <div className="pl-item-addr">{p.road_address_name || p.address_name || "주소 정보 없음"}</div>

                    <div className="pl-item-meta">
                      {p.phone ? <span>☎ {p.phone}</span> : <span className="muted">전화 없음</span>}
                      <span className="dot">•</span>
                      <span className="muted">{p.distance ? `${p.distance}m` : ""}</span>
                    </div>

                    {p.place_url && (
                      <div className="pl-item-link">
                        <a href={p.place_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                          카카오에서 보기 →
                        </a>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 오른쪽: 지도 */}
        <div className="pl-mapbox">
          <div ref={mapElRef} className="pl-map" />

          {/* ✅ 요청: 내 위치 버튼이 “이 위치에서 재검색” 위쪽 + 현 위치에서 검색 버튼 */}
          <div className="pl-map-actions">
            <button type="button" className="pl-mapbtn" onClick={goToMyLocation}>
              📍 내 위치
            </button>
            
          </div>

          {dirtyCenter && (
            <button type="button" className="pl-research" onClick={onReSearchHere} disabled={loading}>
              {loading ? "검색중..." : "이 위치에서 재검색"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
