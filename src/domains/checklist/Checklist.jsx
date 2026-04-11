import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "../../store/store";
import axios from "axios";
import "./Checklist.css";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function Checklist() {
  const navigate = useNavigate();
  const userNo = useUserStore((state) => state.userno);
  const [batches, setBatches] = useState([]);

  /* 여행 일수 계산 */
  const calcDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate.slice(0, 10));
    const end = new Date(endDate.slice(0, 10));
    return Math.max(
      1,
      Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
    );
  };

  /* 날짜 + 시간 포맷 */
  const formatDateTime = (iso) => {
    if (!iso) return "";
    const [date, time] = iso.split("T");
    if (!time) return date;
    return `${date} ${time.slice(0, 5)}`;
  };

  useEffect(() => {
    if (!userNo) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    const fetchBatches = async () => {
      try {
        const res = await axios.get(
          `${BASE_URL}/checklist_batch/user/${userNo}`
        );

        const baseList = res.data || [];

        const enriched = await Promise.all(
          baseList.map(async (b) => {
            let hasAiPlan = false;
            let aiSummary = null;

            try {
              const aiRes = await axios.get(
                `${BASE_URL}/ai_plan/batch/${b.batchId}/latest`
              );

              const raw = aiRes.data?.resultJson;
              if (raw) {
                const parsed =
                  typeof raw === "string" ? JSON.parse(raw) : raw;

                // ✅ AI 일정 존재 판단
                if (Array.isArray(parsed?.days) && parsed.days.length > 0) {
                  hasAiPlan = true;
                }

                // ✅ summary 인식 (string이면 무조건 사용)
                if (typeof parsed?.summary === "string" && parsed.summary.trim()) {
                  aiSummary = parsed.summary.trim();
                }
              }
            } catch (e) {
              console.warn("AI plan load failed:", e);
            }

            return {
              ...b,
              startDate: b.startDatetime,
              endDate: b.endDatetime,
              days: calcDays(b.startDatetime, b.endDatetime),
              hasAiPlan,
              aiSummary,
            };
          })
        );

        setBatches(enriched);
      } catch (err) {
        console.error(err);
        alert("여행 목록을 불러오지 못했습니다.");
      }
    };

    fetchBatches();
  }, [userNo, navigate]);

  const goDetail = (batch) => {
    navigate("/checklist/detail", {
      state: { batchId: batch.batchId },
    });
  };

  const goCreate = () => {
    navigate("/checklist/test");
  };

  return (
    <div className="toss-wrapper">
      <h1 className="page-title">내가 저장한 여행</h1>

      <button className="add-style-btn" onClick={goCreate}>
        ➕ 라이딩 스타일 추가하기
      </button>

      {batches.length === 0 ? (
        <p className="toss-sub">아직 저장한 여행이 없어요.</p>
      ) : (
        batches.map((batch) => (
          <div
            key={batch.batchId}
            className="taste-card"
            onClick={() => goDetail(batch)}
          >
            <div className="taste-card-header">
              <h3 className="taste-title">{batch.title}</h3>
              <span className="taste-date">
                {formatDateTime(batch.startDate)} ~{" "}
                {formatDateTime(batch.endDate)}
              </span>
            </div>

            <p className="taste-desc">
              여행 · {batch.days}일
            </p>

            {batch.hasAiPlan ? (
              <>
                <div className="taste-ai-state">
                  🤖 AI 일정 생성됨
                </div>

                {/* ✅ summary는 있을 때만 출력 */}
                {batch.aiSummary && (
                  <p className="taste-desc">
                    {batch.aiSummary}
                  </p>
                )}
              </>
            ) : (
              <div className="taste-ai-state">
                ⏳ AI 일정 미생성
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
