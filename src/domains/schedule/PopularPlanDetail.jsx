// src/domains/schedule/PopularPlanDetail.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./PopularPlanDetail.css";

/** ✅ 템플릿 */
const TEMPLATES = [
  /* ================= 경주 ================= */
  {
    id: 101,
    title: "경주 2박 3일",
    tags: ["가족", "2박 3일"],
    heroImg: "/images/plan/gyeongju.jpg",
    regionName: "경상북도",
    cityName: "경주",
    center: { lat: 35.8562, lng: 129.2247 },
    days: [
      {
        title: "시내 산책 + 야경 코스",
        items: [
          { type: "START", name: "경주역", addr: "경북 경주시", lat: 35.8486, lng: 129.2146, time: "10:30" },
          { type: "WAYPOINT", name: "황리단길", addr: "경북 경주시 황남동", lat: 35.8389, lng: 129.2129, time: "12:30" },
          { type: "END", name: "동궁과 월지(야경)", addr: "경북 경주시 인왕동", lat: 35.8346, lng: 129.2266, time: "19:30" },
        ],
      },
      {
        title: "사찰 + 유적 코스",
        items: [
          { type: "START", name: "불국사", addr: "경북 경주시 불국로", lat: 35.79, lng: 129.3315 },
          { type: "WAYPOINT", name: "석굴암", addr: "경북 경주시", lat: 35.7944, lng: 129.3502 },
          { type: "END", name: "첨성대", addr: "경북 경주시 인왕동", lat: 35.834, lng: 129.2189 },
        ],
      },
      {
        title: "마무리 산책 + 박물관",
        items: [
          { type: "START", name: "대릉원", addr: "경북 경주시", lat: 35.8376, lng: 129.2126 },
          { type: "END", name: "경주국립박물관", addr: "경북 경주시", lat: 35.8365, lng: 129.2322 },
        ],
      },
    ],
  },

  /* ================= 제주 ================= */
  {
    id: 102,
    title: "제주 2박 3일",
    tags: ["자연", "힐링"],
    heroImg: "/images/plan/jeju.jpg",
    regionName: "제주특별자치도",
    cityName: "제주시",
    center: { lat: 33.4996, lng: 126.5312 },
    days: [
      {
        title: "공항 → 시내 → 시장",
        items: [
          { type: "START", name: "제주국제공항", addr: "제주시", lat: 33.507, lng: 126.493 },
          { type: "WAYPOINT", name: "용두암", addr: "제주시 용담동", lat: 33.514, lng: 126.511 },
          { type: "END", name: "동문시장", addr: "제주시", lat: 33.5146, lng: 126.526 },
        ],
      },
      {
        title: "동쪽 자연 코스",
        items: [
          { type: "START", name: "성산일출봉", addr: "서귀포시", lat: 33.4589, lng: 126.9425 },
          { type: "WAYPOINT", name: "섭지코지", addr: "서귀포시", lat: 33.424, lng: 126.929 },
          { type: "END", name: "우도", addr: "제주시", lat: 33.505, lng: 126.955 },
        ],
      },
      {
        title: "서쪽 바다 + 카페",
        items: [
          { type: "START", name: "협재해수욕장", addr: "제주시 한림읍", lat: 33.393, lng: 126.239 },
          { type: "END", name: "애월 카페거리", addr: "제주시 애월읍", lat: 33.462, lng: 126.309 },
        ],
      },
    ],
  },

  /* ================= 강릉 ================= */
  {
    id: 103,
    title: "강릉 2박 3일",
    tags: ["바다", "커플"],
    heroImg: "/images/plan/gangneung.jpg",
    regionName: "강원도",
    cityName: "강릉",
    center: { lat: 37.7519, lng: 128.8761 },
    days: [
      {
        title: "해변 산책",
        items: [
          { type: "START", name: "강릉역", addr: "강릉시", lat: 37.764, lng: 128.899 },
          { type: "WAYPOINT", name: "안목해변", addr: "강릉시", lat: 37.773, lng: 128.948 },
          { type: "END", name: "안목 카페거리", addr: "강릉시", lat: 37.773, lng: 128.949 },
        ],
      },
      {
        title: "자연 + 숲길",
        items: [
          { type: "START", name: "경포호", addr: "강릉시", lat: 37.795, lng: 128.907 },
          { type: "END", name: "대관령 양떼목장", addr: "강릉시", lat: 37.682, lng: 128.744 },
        ],
      },
      {
        title: "시장 먹방",
        items: [
          { type: "START", name: "중앙시장", addr: "강릉시", lat: 37.752, lng: 128.897 },
          { type: "END", name: "초당순두부마을", addr: "강릉시", lat: 37.785, lng: 128.92 },
        ],
      },
    ],
  },
];


function toDayPlans(tpl) {
  return (tpl?.days || []).map((d) => {
    const start = d.items.find((x) => x.type === "START") || null;
    const end = d.items.find((x) => x.type === "END") || null;
    const wps = d.items.filter((x) => x.type === "WAYPOINT") || [];

    const toPlace = (x) =>
      x
        ? {
            id: `tpl_${tpl.id}_${d.title}_${x.type}_${x.name}`,
            place_name: x.name,
            address_name: x.addr,
            x: String(x.lng),
            y: String(x.lat),
          }
        : null;

    return {
      title: d.title,
      start: toPlace(start),
      end: toPlace(end),
      waypoints: wps.map(toPlace),
      pickedPois: [],
      memo: "",
      distanceM: null,
      uiItems: d.items, // ✅ 리스트 렌더링용
    };
  });
}

function ensureKakao() {
  if (window.kakao?.maps?.load) return Promise.resolve();
  return Promise.reject(new Error("Kakao SDK 로드 실패 (index.html libraries=services 확인)"));
}

export default function PopularPlanDetail() {
  const nav = useNavigate();
  const { id } = useParams();

  const tpl = useMemo(() => {
    const n = Number(id);
    return TEMPLATES.find((t) => Number(t.id) === n) || null;
  }, [id]);

  const dayPlans = useMemo(() => toDayPlans(tpl), [tpl]);
  const dayCount = Math.max(1, dayPlans.length);

  const [day, setDay] = useState(1);

  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  const curPlan = dayPlans[Math.min(dayCount, Math.max(1, day)) - 1];

  const clearMarkers = () => {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
  };

  const drawMarkers = () => {
    const map = mapRef.current;
    if (!map || !window.kakao?.maps) return;

    clearMarkers();

    const places = [];
    if (curPlan?.start) places.push(curPlan.start);
    (curPlan?.waypoints || []).forEach((w) => places.push(w));
    if (curPlan?.end) places.push(curPlan.end);

    const pts = places
      .filter(Boolean)
      .map((p) => new window.kakao.maps.LatLng(Number(p.y), Number(p.x)));

    if (!pts.length) return;

    pts.forEach((pos) => {
      const m = new window.kakao.maps.Marker({ map, position: pos });
      markersRef.current.push(m);
    });

    const bounds = new window.kakao.maps.LatLngBounds();
    pts.forEach((p) => bounds.extend(p));
    map.setBounds(bounds);
  };

  useEffect(() => {
    if (!tpl) return;

    (async () => {
      try {
        await ensureKakao();
        window.kakao.maps.load(() => {
          const center = tpl.center || { lat: 37.5665, lng: 126.978 };
          const map = new window.kakao.maps.Map(mapElRef.current, {
            center: new window.kakao.maps.LatLng(center.lat, center.lng),
            level: 7,
          });
          mapRef.current = map;
          drawMarkers();
        });
      } catch (e) {
        console.warn(e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tpl?.id]);

  useEffect(() => {
    drawMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  if (!tpl) {
    return (
      <div className="pp-error">
        존재하지 않는 인기 일정표예요.
        <button type="button" onClick={() => nav(-1)} style={{ marginLeft: 8 }}>
          뒤로
        </button>
      </div>
    );
  }

  const onImport = () => {
    nav("/schedule/new", {
      state: {
        prefillForm: {
          scheduleTitle: tpl.title,
          travelWith: tpl.tags?.[0] || "",
          requestDifficulty: "초급",
          regionName: tpl.regionName,
          cityName: tpl.cityName,
        },
        prefillDayPlans: dayPlans,
        prefillCenter: tpl.center,
        startStep: 5,
        forceNewDraft: true, // ✅ 항상 새 드래프트 생성
      },
    });
  };

  return (
    <div className="pp-wrap">
      <div className="pp-top">
        <h3 className="pp-title">인기 일정표</h3>
      </div>

      <div className="pp-hero" style={{ backgroundImage: `url(${tpl.heroImg})` }}>
        <div className="pp-dim" />
        <div className="pp-hero-inner">
          <button className="pp-back" type="button" onClick={() => nav(-1)}>
            ← 뒤로
          </button>

          <div>
            <div className="pp-hero-title">{tpl.title}</div>
            <div className="pp-tags">
              {(tpl.tags || []).map((t) => (
                <span key={t} className="pp-tag">
                  {t}
                </span>
              ))}
            </div>

            <div className="pp-hero-actions">
              {/* <button className="pp-primary" type="button" onClick={onImport}>
                내 일정표로 가져오기
              </button> */}
            </div>
          </div>
        </div>
      </div>

      <div className="pp-body">
        <div className="pp-left">
          <div className="pp-daytabs">
            {Array.from({ length: dayCount }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                className={`pp-daybtn ${n === day ? "on" : ""}`}
                onClick={() => setDay(n)}
              >
                {n}일차
              </button>
            ))}
          </div>

          <div className="pp-daytitle">{curPlan?.title || `${day}일차`}</div>

          <div className="pp-list">
            {(curPlan?.uiItems || []).map((it, idx) => (
              <div key={`${it.type}_${idx}`} className="pp-item">
                {/* ✅ 한글이 원 안에서 깨지지 않게: pill 스타일 + nowrap */}
                <div className={`pp-num ${it.type === "START" ? "start" : it.type === "END" ? "end" : "wp"}`}>
                  {it.type === "START" ? "출발" : it.type === "END" ? "도착" : "경유"}
                </div>

                <div className="pp-itembody">
                  <div className="pp-itop">
                    <div className="pp-iname">{it.name}</div>
                    <div className="pp-itime">{it.time || ""}</div>
                  </div>
                  <div className="pp-iaddr">{it.addr}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="pp-actions">
            <button className="pp-secondary" type="button" onClick={onImport}>
              이 코스 그대로 가져오기
            </button>
          </div>
        </div>

        <div className="pp-right">
          <div ref={mapElRef} className="pp-map" />
          <div className="pp-tip">✅ 가져온 뒤 코스 편집에서 “맛집/카페 추천”을 바로 사용할 수 있어요!</div>
        </div>
      </div>
    </div>
  );
}
