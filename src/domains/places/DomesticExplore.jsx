import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DomesticExplore.css";

// ✅ 이미지: public/images/domestic/...
const DOMESTIC = [
  { key: "seoul", name: "서울", sub: "도시", lat: 37.5665, lng: 126.9780, img: "/images/domestic/seoul.jpg" },
  { key: "busan", name: "부산", sub: "바다", lat: 35.1796, lng: 129.0756, img: "/images/domestic/busan.jpg" },
  { key: "jeju", name: "제주", sub: "자연", lat: 33.4996, lng: 126.5312, img: "/images/domestic/jeju.jpg" },
  { key: "incheon", name: "인천", sub: "도시", lat: 37.4563, lng: 126.7052, img: "/images/domestic/incheon.jpg" },
  { key: "gangneung", name: "강릉", sub: "바다", lat: 37.7519, lng: 128.8761, img: "/images/domestic/gangneung.jpg" },
  { key: "sokcho", name: "속초", sub: "바다", lat: 38.2070, lng: 128.5918, img: "/images/domestic/sokcho.jpg" },
  { key: "gyeongju", name: "경주", sub: "역사", lat: 35.8562, lng: 129.2247, img: "/images/domestic/gyeongju.jpg" },
  { key: "jeonju", name: "전주", sub: "감성", lat: 35.8242, lng: 127.1480, img: "/images/domestic/jeonju.jpg" },
  { key: "yeosu", name: "여수", sub: "바다", lat: 34.7604, lng: 127.6622, img: "/images/domestic/yeosu.jpg" },
  { key: "tongyeong", name: "통영", sub: "바다", lat: 34.8544, lng: 128.4331, img: "/images/domestic/tongyeong.jpg" },
  { key: "chuncheon", name: "춘천", sub: "자연", lat: 37.8813, lng: 127.7298, img: "/images/domestic/chuncheon.jpg" },
  { key: "daejeon", name: "대전", sub: "도시", lat: 36.3504, lng: 127.3845, img: "/images/domestic/daejeon.jpg" },
  { key: "daegu", name: "대구", sub: "도시", lat: 35.8714, lng: 128.6014, img: "/images/domestic/daegu.jpg" },
  { key: "gwangju", name: "광주", sub: "도시", lat: 35.1595, lng: 126.8526, img: "/images/domestic/gwangju.jpg" },
  { key: "pohang", name: "포항", sub: "바다", lat: 36.0190, lng: 129.3435, img: "/images/domestic/pohang.jpg" },
  { key: "namhae", name: "남해", sub: "자연", lat: 34.8375, lng: 127.8924, img: "/images/domestic/namhae.jpg" },
];

const ROUTE_PLACES_LIST = "/places";

export default function DomesticExplore() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return DOMESTIC;
    return DOMESTIC.filter((d) => (d.name + " " + d.sub).toLowerCase().includes(s));
  }, [q]);

  const goPlaces = (d) => {
  navigate(`/places/region/${d.key}`, { state: { region: d } });

};

  return (
    <div className="de-wrap">
      <div className="de-head">
        <button className="de-back" onClick={() => navigate(-1)} type="button">
          ←
        </button>
        <div>
          <h1 className="de-title">국내 여행지 전체</h1>
          <p className="de-desc">원하는 지역을 검색하고, 클릭하면 지도에서 관광명소를 바로 찾아줘요.</p>
        </div>
      </div>

      <div className="de-search">
        <span className="de-ic">⌕</span>
        <input
          className="de-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="예) 제주, 강릉, 경주, 바다, 역사..."
        />
        {q && (
          <button className="de-clear" type="button" onClick={() => setQ("")} aria-label="지우기">
            ×
          </button>
        )}
      </div>

      <div className="de-grid">
        {filtered.map((d) => (
          <button key={d.key} type="button" className="de-card" onClick={() => goPlaces(d)}>
            <div className="de-bg" style={{ backgroundImage: `url(${d.img})` }} />
            <div className="de-dim" />
            <div className="de-badge">{d.sub}</div>
            <div className="de-txt">
              <div className="de-name">{d.name}</div>
              <div className="de-sub">관광명소 자동 검색</div>
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="de-empty">
          <div className="de-empty-title">검색 결과가 없어요 🥲</div>
          <div className="de-empty-sub">다른 키워드로 다시 검색해봐!</div>
        </div>
      )}
    </div>
  );
}
