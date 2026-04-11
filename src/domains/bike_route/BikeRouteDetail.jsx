import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ensureKakaoLoaded } from "../../utils/kakaoLoader";
import { extractProvince } from "./regionNormalizer";
import "./BikeRouteDetail.css";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const toValidLatLng = (lat, lng) => {
  const y = Number(lat);
  const x = Number(lng);

  if (
    !Number.isFinite(y) ||
    !Number.isFinite(x) ||
    Math.abs(y) < 1 ||
    Math.abs(x) < 1
  ) {
    return null;
  }
  return new window.kakao.maps.LatLng(y, x);
};

export default function BikeRouteDetail() {
  const { routeId } = useParams();
  const navigate = useNavigate();

  const [route, setRoute] = useState(null);
  const [path, setPath] = useState([]);
  const [mapMode, setMapMode] = useState(null); // PATH | SEARCH
  const [mapReady, setMapReady] = useState(false);

  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const polylineRef = useRef(null);
  const markerRef = useRef(null);

  /* =========================
     1️⃣ 데이터 로드
  ========================= */
  useEffect(() => {
    let canceled = false;

    (async () => {
      try {
        const [r, p] = await Promise.all([
          axios.get(`${BASE_URL}/bike_routes/${routeId}`),
          axios.get(`${BASE_URL}/bike_routes/${routeId}/path`),
        ]);

        if (canceled) return;

        const rawPath = Array.isArray(p.data) ? p.data : [];

        setRoute(r.data);
        setPath(rawPath);
        setMapMode(rawPath.length > 0 ? "PATH" : "SEARCH");
      } catch (e) {
        console.error(e);
        alert("자전거길 정보를 불러오지 못했습니다.");
        navigate("/bike_routes");
      }
    })();

    return () => {
      canceled = true;
    };
  }, [routeId, navigate]);

  /* =========================
     2️⃣ 지도 생성 (1회)
  ========================= */
  useEffect(() => {
    if (!mapMode) return;
    if (mapRef.current) return;

    let canceled = false;

    (async () => {
      await ensureKakaoLoaded({ requireServices: true });
      if (canceled) return;

      requestAnimationFrame(() => {
        const container = mapElRef.current;
        if (!container || canceled) return;

        const map = new window.kakao.maps.Map(container, {
          center: new window.kakao.maps.LatLng(37.5665, 126.978),
          level: 6,
        });

        mapRef.current = map;
        map.relayout();
        setMapReady(true);
      });
    })();

    return () => {
      canceled = true;
    };
  }, [mapMode]);

  /* =========================
     3️⃣ PATH → Polyline + Marker
  ========================= */
  useEffect(() => {
    if (mapMode !== "PATH" || !mapReady) return;

    const map = mapRef.current;
    if (!map) return;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    const points = path
      .slice()
      .sort((a, b) => a.seq - b.seq)
      .map((p) => toValidLatLng(p.lat, p.lng))
      .filter(Boolean);

    if (points.length === 0) return;

    // 시작점 마커
    if (markerRef.current) markerRef.current.setMap(null);
    markerRef.current = new window.kakao.maps.Marker({
      map,
      position: points[0],
    });

    if (points.length >= 2) {
      const polyline = new window.kakao.maps.Polyline({
        path: points,
        strokeWeight: 5,
        strokeColor: "#2563eb",
        strokeOpacity: 0.9,
      });
      polyline.setMap(map);
      polylineRef.current = polyline;
    }

    const bounds = new window.kakao.maps.LatLngBounds();
    points.forEach((p) => bounds.extend(p));
    map.setBounds(bounds);
  }, [mapMode, mapReady, path]);

  /* =========================
     4️⃣ SEARCH → 키워드 검색 + 마커
  ========================= */
  useEffect(() => {
    if (mapMode !== "SEARCH" || !mapReady || !route) return;

    const map = mapRef.current;
    if (!map) return;

    const ps = new window.kakao.maps.services.Places();
    const keyword = `${route.routeName} ${extractProvince(route)}`;

    ps.keywordSearch(keyword, (data, status) => {
      if (
        status !== window.kakao.maps.services.Status.OK ||
        !data.length
      ) {
        console.warn("검색 실패:", keyword);
        return;
      }

      const first = data[0];
      const pos = toValidLatLng(first.y, first.x);
      if (!pos) return;

      if (markerRef.current) markerRef.current.setMap(null);

      markerRef.current = new window.kakao.maps.Marker({
        map,
        position: pos,
      });

      map.setCenter(pos);
      map.setLevel(5);
    });
  }, [mapMode, mapReady, route]);

  if (!route) return <p style={{ padding: 20 }}>불러오는 중...</p>;

  const province = extractProvince(route);

  /* =========================
     UI
  ========================= */
  return (
    <div className="route-detail-page">
      <div className="route-card">
        {/* 헤더 */}
        <header className="route-header">
          <h1 className="route-title">{route.routeName}</h1>

          <div className="route-meta">
            <span>📍 {province}{route.region && ` · ${route.region}`}</span>
            <span>🚴 {route.distanceKm} km</span>
            <span>⏱ {route.estimatedTimeMin} 분</span>
          </div>
        </header>

        {/* 지도 */}
        <div className="map-wrapper">
          <div ref={mapElRef} className="route-map" />
        </div>

        {/* 설명 */}
        <section className="route-section">
          <h3>📘 코스 설명</h3>
          <p>{route.description}</p>
        </section>

        {route.highlights?.length > 0 && (
          <section className="route-section">
            <h3>✨ 주요 포인트</h3>
            <ul className="chip-list">
              {route.highlights.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </section>
        )}

        {route.food?.length > 0 && (
          <section className="route-section">
            <h3>🍽 먹거리</h3>
            <ul className="chip-list">
              {route.food.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </section>
        )}

        {route.tips?.length > 0 && (
          <section className="route-section">
            <h3>💡 여행 팁</h3>
            <ul className="tip-list">
              {route.tips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </section>
        )}

        {/* 하단 버튼 */}
        <footer className="route-footer">
          <button className="back-button" onClick={() => navigate("/bike_routes")}>
            ← 목록으로
          </button>
        </footer>
      </div>
    </div>
  );
}
