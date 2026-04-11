import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { reviewRegions } from "./reviewData";
import "./Review.css";

export default function ReviewHome() {
  const navigate = useNavigate();
  const [selectedCity, setSelectedCity] = useState(null);

  return (
    <div className="review-page">
      <div className="review-home-header">
        <h2>지역별 리뷰</h2>

        <button
          className="btn-primary fixed-btn"
          onClick={() => navigate("/review/create")}
        >
          + 리뷰 추가
        </button>
      </div>

      {/* 1️⃣ 도시 선택 */}
      {!selectedCity && (
        <div className="region-grid">
          {reviewRegions.map((region) => (
            <div
              key={region.city}
              className="region-card"
              onClick={() => setSelectedCity(region)}
            >
              <img src={region.image} alt={region.city} />
              <span>{region.city}</span>
            </div>
          ))}
        </div>
      )}

      {/* 2️⃣ 구/군 선택 */}
      {selectedCity && (
        <>
          <div className="region-header">
            <button className="btn-outline" onClick={() => setSelectedCity(null)}>
              ← 도시 선택
            </button>
            <h3>{selectedCity.city}</h3>
          </div>

          <div className="region-grid">
            {selectedCity.districts.map((d) => (
              <div
                key={d.name}
                className="region-card"
                onClick={() =>
                  navigate(
                    `/review/list?city=${encodeURIComponent(selectedCity.city)}&district=${encodeURIComponent(d.name)}`
                  )
                }
              >
                <img src={d.image} alt={d.name} />
                <span>{d.name}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
