import { useEffect, useState } from "react";
import { fetchSurveyList } from "./surveyApi";
import { useNavigate } from "react-router-dom";
import surveyHero from "/images/survey/survey1.jpeg";
import "./Survey.css";

export default function SurveyList() {
  const [list, setList] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    fetchSurveyList(page).then((res) => {
      const data = res.data;
      setList(data.content || []);
      setTotalPages(data.totalPages || 0);
    });
  }, [page]);

  return (
    <div className="survey-wrapper">

      {/* ================= 상단 히어로 ================= */}
      <div className="survey-hero">
        <img src={surveyHero} alt="survey hero" />
        <div className="survey-hero-overlay">
          <h1>사용자 설문조사</h1>
          <p>여러분의 경험이 더 나은 서비스를 만듭니다</p>
        </div>
      </div>

      {/* ================= 목록 ================= */}
      <div className="survey-content">

        {list.length === 0 && (
          <p className="survey-empty">
            현재 진행 중인 설문이 없습니다.
          </p>
        )}

        {list.map((s) => (
          <div
            key={s.surveyId}
            className="survey-card"
            onClick={() => navigate(`/survey/${s.surveyId}`)}
          >
            <div className="survey-card-header">
              <h2>{s.title}</h2>
              <p>
                ⏱ {s.estTimeMin}분 · 🎁 경험치 {s.rewardPoint} XP
              </p>
            </div>

            <div className="survey-card-actions">
              <button
                className="survey-admin-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/admin/survey/${s.surveyId}/result`);
                }}
              >
                📊 결과 분석 보기
              </button>
            </div>
          </div>
        ))}

        {/* ================= 페이징 ================= */}
        {/* ================= 번호 페이징 ================= */}
        {totalPages >= 1 && (
          <div className="survey-pagination">
            {Array.from({ length: totalPages }, (_, idx) => (
              <button
                key={idx}
                className={`page-btn ${page === idx ? "active" : ""}`}
                onClick={() => setPage(idx)}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
