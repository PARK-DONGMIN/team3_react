// src/domains/bike_route/BikeRouteList.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getBikeRoutes } from "../../api/bikeRouteApi";
import { extractProvince } from "./regionNormalizer";
import "./BikeRouteList.css";

export default function BikeRouteList() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getBikeRoutes()
      .then((res) => setRoutes(Array.isArray(res.data) ? res.data : []))
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => {
    const acc = {};
    for (const route of routes) {
      const province = extractProvince(route); // ✅ 광역 기준
      if (!acc[province]) acc[province] = [];
      acc[province].push(route);
    }
    

    // ✅ 그룹 안에서는 이름순 정렬
    Object.values(acc).forEach((list) =>
      list.sort((a, b) => (a.routeName || "").localeCompare(b.routeName || ""))
    );

    // ✅ 광역도 정렬 (기타는 마지막)
    const ordered = Object.entries(acc).sort(([a], [b]) => {
      if (a === "기타") return 1;
      if (b === "기타") return -1;
      return a.localeCompare(b, "ko");
    });

    return ordered;
  }, [routes]);

  if (loading) return <div className="bike-loading">로딩 중...</div>;

  return (
    <div className="bike-route-page">
      <div className="page-header">
        <h1 className="page-title">🚴 전국 자전거길</h1>
      </div>

      {grouped.map(([province, list]) => (
        <section key={province} className="city-section">
          <div className="city-title-row">
            <h2 className="city-title">📍 {province}</h2>
            <span className="city-count">{list.length}개</span>
          </div>

          <div className="route-grid">
            {list.map((route) => (
              <button
                key={route.routeId}
                className="route-card"
                onClick={() => navigate(`/bike_routes/${route.routeId}`)}
                type="button"
              >
                <div className="route-card-top">
                  <span className="route-name">{route.routeName}</span>
                  {route.hasPath && <span className="map-badge">MAP</span>}
                </div>

                <div className="route-card-meta">
                  <span className="meta-item">📍 {route.region}</span>
                </div>

                <div className="route-card-meta">
                  {route.distanceKm != null && (
                    <span className="meta-item">📏 {route.distanceKm}km</span>
                  )}
                  {route.estimatedTimeMin != null && (
                    <span className="meta-item">⏱ {route.estimatedTimeMin}분</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
