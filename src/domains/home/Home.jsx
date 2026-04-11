// src/domains/home/Home.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Home.css";

import { scheduleApi } from "../../api/schedule";
import { locationApi } from "../../api/location";

function parseDateOnly(yyyyMmDd) {
  if (!yyyyMmDd) return null;
  const d = new Date(yyyyMmDd);
  return Number.isNaN(d.getTime()) ? null : d;
}

function ddayLabel(startDate, today0) {
  const s = parseDateOnly(startDate);
  if (!s) return { text: "날짜 미정", type: "unknown" };
  s.setHours(0, 0, 0, 0);

  const ms = 1000 * 60 * 60 * 24;
  const diff = Math.ceil((s.getTime() - today0.getTime()) / ms);

  if (diff > 0) return { text: `D-${diff}`, type: "upcoming" };
  if (diff === 0) return { text: "D-DAY", type: "today" };
  return { text: `D+${Math.abs(diff)}`, type: "past" };
}

// ✅ 난이도 -> CSS 클래스 매핑
function diffLevelClass(v) {
  const s = String(v ?? "").trim();
  if (s === "초급") return "lv-low";
  if (s === "중급") return "lv-mid";
  if (s === "고급") return "lv-high";
  return "lv-etc";
}

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

function toValidId(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function Home() {
  const navigate = useNavigate();

  /* -----------------------------
     🚴 히어로 슬라이더
  ----------------------------- */
  const slides = useMemo(
    () => [
      {
        img: "/images/ban1.jpg",
        title: "바람을 따라 떠나는 자전거 여행",
        subtitle: "해안·산책로·도시 코스를 테마별로 추천해드려요",
      },
      {
        img: "/images/ban2.jpg",
        title: "AI가 만들어주는 나만의 라이딩 코스",
        subtitle: "거리·난이도·시간만 선택하면 자동 생성!",
      },
      {
        img: "/images/ban3.jpg",
        title: "함께 달리는 여행",
        subtitle: "친구와 경로 공유하고 일정까지 공동 편집",
      },
    ],
    []
  );

  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((p) => (p + 1) % slides.length), 3000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const goPrev = () => setIndex((p) => (p - 1 + slides.length) % slides.length);
  const goNext = () => setIndex((p) => (p + 1) % slides.length);

  /* -----------------------------
     ✅ 내 라이딩 일정(백엔드 연동)
  ----------------------------- */
  const userNo = Number(localStorage.getItem("userNo") || 0);

  const [mySchedules, setMySchedules] = useState([]);
  const [loadingMine, setLoadingMine] = useState(false);
  const [filter, setFilter] = useState("all"); // all | upcoming | past

  const [regionMap, setRegionMap] = useState({});
  const [cityMap, setCityMap] = useState({});
  const [loadedCityRegions, setLoadedCityRegions] = useState([]);

  const today0 = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  // 1) 지역 목록 로드
  useEffect(() => {
    (async () => {
      try {
        const regions = await locationApi.regions();
        const map = {};
        (Array.isArray(regions) ? regions : []).forEach((r) => {
          const id = r?.regionId ?? r?.id;
          const name = r?.regionName ?? r?.name;
          if (id != null) map[id] = name ?? `지역#${id}`;
        });
        setRegionMap(map);
      } catch (e) {
        console.error("regions load fail:", e);
      }
    })();
  }, []);

  // 2) 내 일정 목록 로드
  useEffect(() => {
    (async () => {
      try {
        setLoadingMine(true);

        if (!userNo) {
          setMySchedules([]);
          return;
        }

        const res = await scheduleApi.listMine(userNo);
        const arr = Array.isArray(res) ? res : res?.data ?? [];
        setMySchedules(Array.isArray(arr) ? arr : []);
      } catch (e) {
        console.error("내 일정 목록 조회 실패:", e);

        // fallback: 마지막 생성 일정 1개라도 보여주기
        try {
          const lastId = localStorage.getItem("lastCreatedScheduleId");
          const sid = toValidId(lastId);
          if (sid) {
            const one = await scheduleApi.get(sid);
            setMySchedules(one ? [one] : []);
          } else {
            setMySchedules([]);
          }
        } catch (e2) {
          console.error("fallback 단건 조회도 실패:", e2);
          setMySchedules([]);
        }
      } finally {
        setLoadingMine(false);
      }
    })();
  }, [userNo]);

  // 3) 일정에 등장하는 regionId들로 cities 로드
  useEffect(() => {
    (async () => {
      try {
        if (!Array.isArray(mySchedules) || mySchedules.length === 0) return;

        const regionIdsRaw = mySchedules
          .map(
            (s) =>
              s?.regionId ??
              s?.startRegionId ??
              s?.region?.regionId ??
              s?.region?.id ??
              null
          )
          .filter((v) => v != null);

        const needRegionIds = Array.from(new Set(regionIdsRaw)).filter(
          (rid) => !loadedCityRegions.includes(rid)
        );

        if (needRegionIds.length === 0) return;

        const newCityMap = {};
        await Promise.all(
          needRegionIds.map(async (rid) => {
            try {
              const cities = await locationApi.citiesByRegion(Number(rid));
              (Array.isArray(cities) ? cities : []).forEach((c) => {
                const cid = c?.cityId ?? c?.id;
                const cname = c?.cityName ?? c?.name;
                if (cid != null) newCityMap[cid] = cname ?? `도시#${cid}`;
              });
            } catch (e1) {
              console.error("cities load fail for region:", rid, e1);
            }
          })
        );

        setCityMap((prev) => ({ ...prev, ...newCityMap }));
        setLoadedCityRegions((prev) => Array.from(new Set([...prev, ...needRegionIds])));
      } catch (e) {
        console.error("city mapping effect fail:", e);
      }
    })();
  }, [mySchedules, loadedCityRegions]);

  const filteredSchedules = useMemo(() => {
    if (!Array.isArray(mySchedules)) return [];
    if (filter === "all") return mySchedules;

    return mySchedules.filter((s) => {
      const end = parseDateOnly(s?.endDate ?? s?.end_date);
      if (!end) return filter === "upcoming";
      end.setHours(0, 0, 0, 0);
      const isUpcoming = end.getTime() >= today0.getTime();
      return filter === "upcoming" ? isUpcoming : !isUpcoming;
    });
  }, [mySchedules, filter, today0]);

  const hasSchedules = filteredSchedules.length > 0;

  const handleAddSchedule = () => {
    if (!userNo) {
      alert("로그인이 필요합니다!");
      navigate("/login");
      return;
    }
    navigate("/schedule/new");
  };

  const getRegionName = (s) =>
    s?.regionName ??
    s?.region?.regionName ??
    s?.region?.name ??
    regionMap[s?.regionId] ??
    regionMap[s?.startRegionId] ??
    regionMap[s?.region?.regionId] ??
    "-";

  const getCityName = (s) =>
    s?.cityName ??
    s?.city?.cityName ??
    s?.city?.name ??
    cityMap[s?.cityId] ??
    cityMap[s?.startCityId] ??
    cityMap[s?.city?.cityId] ??
    "-";

  /* 아래 섹션용 샘플 데이터(그대로 유지) */
  const popularAreas = [
    { city: "부산 해안 코스", tag: "바다 · 해안도로", emoji: "🌊" },
    { city: "한강 종주", tag: "도심 · 강변", emoji: "🚴" },
    { city: "제주 환상 자전거길", tag: "풍경 · 힐링", emoji: "🌿" },
    { city: "섬진강 자전거길", tag: "강변 · 감성", emoji: "🍃" },
    { city: "남한강 자전거길", tag: "평지 · 장거리", emoji: "🚵" },
  ];

  const [areaIndex, setAreaIndex] = useState(0);
  const areasPerPage = 3;
  const areaTotalPages = Math.ceil(popularAreas.length / areasPerPage);
  const areaPrev = () => setAreaIndex((p) => Math.max(p - 1, 0));
  const areaNext = () => setAreaIndex((p) => Math.min(p + 1, areaTotalPages - 1));

  const reviews = [
    { user: "정환", text: "AI 추천 코스가 너무 정확해서 놀랐어요! 풍경 최고!", emoji: "🚴✨" },
    { user: "동민", text: "친구랑 일정 공유하니까 진짜 편하더라구요!", emoji: "🤝" },
    { user: "은지", text: "안전 구간 안내 덕분에 첫 장거리도 안심!", emoji: "🛡️" },
    { user: "윤지", text: "해안 코스 사진 맛집! 라이딩 최고였습니다.", emoji: "📸🌊" },
    { user: "정은", text: "초보자도 부담 없는 경로 추천! 만족도 100%", emoji: "💯" },
  ];

  const [reviewIndex, setReviewIndex] = useState(0);
  const reviewTotalPages = Math.ceil(reviews.length / 3);
  const reviewPrev = () => setReviewIndex((p) => Math.max(p - 1, 0));
  const reviewNext = () => setReviewIndex((p) => Math.min(p + 1, reviewTotalPages - 1));

  return (
    <div className="home-page">
      {/* 히어로 슬라이더 */}
      <section className="hero-slider">
        <div className="hero-slider-wrapper">
          {slides.map((slide, i) => (
            <div
              key={i}
              className={`hero-slide ${index === i ? "active" : ""}`}
              style={{ backgroundImage: `url(${slide.img})` }}
            >
              <div className="hero-slide-text">
                <h2>{slide.title}</h2>
                <p>{slide.subtitle}</p>
              </div>
            </div>
          ))}
          <button className="hero-btn prev" onClick={goPrev} type="button">
            ‹
          </button>
          <button className="hero-btn next" onClick={goNext} type="button">
            ›
          </button>
          <div className="hero-dots">
            {slides.map((_, i) => (
              <span
                key={i}
                className={`dot ${index === i ? "active" : ""}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ✅ 내 라이딩 일정 */}
      <section className="home-list-section">
        <div className="home-list-header">
          <div className="home-list-title-wrap">
            <h2 className="home-list-title">내 라이딩 계획</h2>
            <p className="home-list-subtitle">
              {userNo ? "내가 만든 일정들을 한눈에 볼 수 있어요." : "로그인하면 내 일정이 여기에 쫘악 보여요!"}
            </p>
          </div>

          <div className="home-list-actions">
            <button
              className={`chip ${filter === "all" ? "" : "chip-outline"}`}
              onClick={() => setFilter("all")}
              type="button"
            >
              전체
            </button>
            <button
              className={`chip ${filter === "upcoming" ? "" : "chip-outline"}`}
              onClick={() => setFilter("upcoming")}
              type="button"
            >
              다가오는 라이딩
            </button>
            <button
              className={`chip ${filter === "past" ? "" : "chip-outline"}`}
              onClick={() => setFilter("past")}
              type="button"
            >
              지난 라이딩
            </button>

            <button className="home-add-btn" type="button" onClick={handleAddSchedule}>
              + 일정 추가하기
            </button>
          </div>
        </div>

        <div className="home-list-panel">
          {loadingMine ? (
            <div className="home-list-empty">
              <p className="home-list-empty-title">내 일정을 불러오는 중이에요…</p>
              <p className="home-list-empty-sub">잠시만 기다려주세요... 🥹</p>
            </div>
          ) : hasSchedules ? (
            <div className="home-list-grid">
              {filteredSchedules.map((s, idx) => {
                const d = ddayLabel(s?.startDate ?? s?.start_date, today0);

                const diff =
                  s?.requestDifficulty ??
                  s?.REQUEST_DIFFICULTY ??
                  s?.courseType ??
                  "-";

                const regionName = getRegionName(s);
                const cityName = getCityName(s);

                const sid = toValidId(pickScheduleId(s));
                
                const title = s?.scheduleTitle ?? s?.schedule_title ?? s?.title ?? "제목 없음";

                // ✅ Link로 이동할 때도 NaN 방지
                const handleCardClick = (e) => {
                  if (!sid) {
                    e.preventDefault();
                    alert("일정 ID가 올바르지 않아서 상세로 이동할 수 없어요 🥺 (백엔드 응답 필드 확인!)");
                    return;
                  }
                };

                return (
                  <Link
                    key={sid ? `sid_${sid}` : `invalid_${idx}`}
                    to={sid ? `/schedule/${sid}` : "#"}
                    onClick={handleCardClick}
                    className="home-schedule-card"
                    style={!sid ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
                    title={!sid ? "일정 ID가 올바르지 않습니다(백엔드 응답 확인 필요)" : ""}
                  >
                    <div className="home-schedule-top">
                      <div className="home-schedule-title">{title}</div>
                      <span className={`home-dday ${d.type}`}>{d.text}</span>
                    </div>

                    <div className="home-schedule-loc">
                      <span className="home-loc-icon">📍</span>
                      <span className="home-loc-text">
                        {regionName}
                        {cityName && cityName !== "-" ? ` · ${cityName}` : ""}
                      </span>
                    </div>

                    <div className="home-schedule-meta">
                      <span className="home-schedule-date">
                        📅 {(s?.startDate ?? s?.start_date ?? "-")} ~ {(s?.endDate ?? s?.end_date ?? "-")}
                      </span>
                      <span className="home-dot">·</span>

                      <span className={`home-schedule-chip ${diffLevelClass(diff)}`}>
                        {diff}
                      </span>
                    </div>

                    <div className="home-schedule-submeta">
                      <span>🚵🏻 인원 {s?.peopleCount ?? s?.people_count ?? "-"}명</span>
                      <span className="home-dot">·</span>
                      <span>
                        🪙 예산{" "}
                        {Number.isFinite(Number(s?.budget))
                          ? Number(s?.budget).toLocaleString()
                          : "-"}
                        원
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="home-list-empty">
              {!userNo ? (
                <>
                  <p className="home-list-empty-title">로그인이 필요합니다!</p>
                  <p className="home-list-empty-sub">로그인하면 내 일정이 이곳에 예쁘게 모여요 🚴✨</p>
                  <Link to="/login" className="btn-outline">
                    로그인 하러가기 →
                  </Link>
                </>
              ) : (
                <>
                  <p className="home-list-empty-title">
                    {filter === "all"
                      ? "아직 저장된 라이딩 계획이 없어요."
                      : filter === "upcoming"
                      ? "다가오는 라이딩이 아직 없어요."
                      : "지난 라이딩이 아직 없어요."}
                  </p>
                  <p className="home-list-empty-sub">첫 일정을 만들어보자! (완전 금방이야 🤏)</p>
                  <button className="btn-outline" type="button" onClick={handleAddSchedule}>
                    + 첫 라이딩 일정 만들기
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="home-cta-section">
        <div className="home-cta-box">
          <p className="home-cta-title">✨ 5초면 추천!</p>
          <h3 className="home-cta-main">나만의 라이딩 스타일 테스트</h3>
          <p className="home-cta-sub">AI가 나에게 맞는 라이딩 코스를 추천해줘요</p>
          <button className="home-cta-btn" onClick={() => navigate("/checklist/test")} type="button">
            라이딩 스타일 테스트 시작하기 →
          </button>
        </div>
      </section>

      {/* USP */}
      <section className="home-usp-section">
        <h2 className="home-section-title">TRAVLE_LEAF만의 특별함</h2>
        <div className="home-usp-grid">
          <div className="home-usp-item">
            <span className="home-usp-icon">🗺️</span>
            <p className="home-usp-title">테마별 자전거 코스</p>
            <p className="home-usp-desc">해안 · 강변 · 도시 · 힐링 원하는 분위기 추천</p>
          </div>
          <div className="home-usp-item">
            <span className="home-usp-icon">⚡</span>
            <p className="home-usp-title">AI 맞춤 경로 생성</p>
            <p className="home-usp-desc">거리 · 시간 · 난이도 기반 자동 생성</p>
          </div>
          <div className="home-usp-item">
            <span className="home-usp-icon">🤝</span>
            <p className="home-usp-title">친구와 공동 편집</p>
            <p className="home-usp-desc">공유 코드로 함께 여행 준비</p>
          </div>
          <div className="home-usp-item">
            <span className="home-usp-icon">📍</span>
            <p className="home-usp-title">현지 라이더 추천</p>
            <p className="home-usp-desc">지역별 인기 코스 & 안전 정보 제공</p>
          </div>
        </div>
      </section>

      {/* 인기 지역 */}
      <section className="home-ranking-section">
        <h2 className="home-section-title">지금 가장 인기 있는 라이딩 지역</h2>
        <div className="slider-container">
          <button className="slide-arrow left" onClick={areaPrev} disabled={areaIndex === 0} type="button">
            ‹
          </button>
          <div className="slider-track" style={{ transform: `translateX(-${areaIndex * 100}%)` }}>
            {popularAreas.map((item, idx) => (
              <div key={idx} className="slide-item">
                <div className="home-ranking-card">
                  <span className="home-ranking-emoji">{item.emoji}</span>
                  <p className="home-ranking-city">{item.city}</p>
                  <p className="home-ranking-tag">{item.tag}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            className="slide-arrow right"
            onClick={areaNext}
            disabled={areaIndex === areaTotalPages - 1}
            type="button"
          >
            ›
          </button>
        </div>
      </section>

      {/* 후기 */}
      <section className="home-review-section">
        <div className="home-review-header">
          <h2 className="home-section-title">라이더들의 후기</h2>
        </div>

        <div className="slider-container">
          <button className="slide-arrow left" onClick={reviewPrev} disabled={reviewIndex === 0} type="button">
            ‹
          </button>
          <div className="slider-track" style={{ transform: `translateX(-${reviewIndex * 100}%)` }}>
            {reviews.map((review, idx) => (
              <div key={idx} className="slide-item">
                <div className="home-review-card">
                  <p className="home-review-text">“{review.text}”</p>
                  <p className="home-review-user">
                    - {review.user}님 {review.emoji}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button
            className="slide-arrow right"
            onClick={reviewNext}
            disabled={reviewIndex === reviewTotalPages - 1}
            type="button"
          >
            ›
          </button>
        </div>
      </section>
    </div>
  );
}
