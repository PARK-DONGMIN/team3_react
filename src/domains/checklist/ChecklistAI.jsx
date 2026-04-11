// src/domains/checklist/ChecklistAI.jsx
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, useRef } from "react";
import { saveAiPlan } from "../../api/aiPlanApi";
import { useUserStore } from "../../store/store";
import "./Checklist.css";
import axiosInstance from "../../api/axios";

export default function ChecklistAI() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const userNo = useUserStore((s) => s.userno);

  /* =========================
     전달받은 데이터
  ========================= */
  const batchId = state?.batchId ?? null;

  const region = state?.region ?? "";
  const district = Array.isArray(state?.district) ? state.district : [];
  const period = state?.period ?? {};

  const routeRegions = Array.isArray(state?.routeRegions) ? state.routeRegions : [];
  const routeCities = Array.isArray(state?.routeCities) ? state.routeCities : [];

  const startPoint = state?.startPoint ?? "";
  const endPoint = state?.endPoint ?? "";

  const selectedItems = Array.isArray(state?.selectedItems) ? state.selectedItems : [];
  const waypointTexts = Array.isArray(state?.waypointTexts) ? state.waypointTexts : [];

  const [aiPlan, setAiPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const aiCalledRef = useRef(false);

  /* =========================
     체크리스트 요약 (표시용만 사용)
  ========================= */
  const grouped = useMemo(() => {
    return (selectedItems || []).reduce((acc, item) => {
      const key = item.category || "기타";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item.itemName);
      return acc;
    }, {});
  }, [selectedItems]);

  const routeText = useMemo(() => {
    const lines = [];

    if (routeRegions.length > 0) {
      lines.push(`지역 경로: ${routeRegions.join(" → ")}`);
    }

    if (routeCities.length > 0) {
      lines.push(`도시 경로: ${routeCities.join(" → ")}`);
    }

    if (lines.length === 0) {
      const loc = district.length
        ? `${region} (${district.join(", ")})`
        : region;

      lines.push(loc ? `지역: ${loc}` : "지역: (미입력)");
    }

    return lines.join("\n");
  }, [routeRegions, routeCities, region, district]);

  const dateText = useMemo(() => {
    const s = period?.startDate || "";
    const e = period?.endDate || "";
    const st = period?.startTime || "";
    const et = period?.endTime || "";

    if (s && e) {
      return `여행 기간: ${s}${st ? ` ${st}` : ""} ~ ${e}${et ? ` ${et}` : ""}`;
    }

    return "여행 기간: (미입력)";
  }, [period]);

  const pointText = useMemo(() => {
    const sp = startPoint?.trim();
    const ep = endPoint?.trim();
    if (!sp && !ep) return "출발/도착 지점: (미입력)";
    return `출발/도착 지점: ${sp || "-"} → ${ep || "-"}`;
  }, [startPoint, endPoint]);

  const waypointText = useMemo(() => {
    if (!waypointTexts.length) return "사용자 희망 경유지: (없음)";
    return `사용자 희망 경유지: ${waypointTexts.join(" / ")}`;
  }, [waypointTexts]);

  const selectedSummary = useMemo(() => {
    const lines = [
      routeText,
      dateText,
      pointText,
      waypointText,
      ...Object.entries(grouped).map(([c, items]) => `${c}: ${items.join(", ")}`),
    ];
    return lines.join("\n");
  }, [routeText, dateText, pointText, waypointText, grouped]);

  /* =========================
     유효성 검사
  ========================= */
  const validateInputs = () => {
    if (!batchId) return "batchId가 없습니다.";
    if (!userNo) return "로그인이 필요합니다.";
    return null;
  };

  /* =========================
     AI 자동 호출 (백엔드 주도)
  ========================= */
  useEffect(() => {
    if (aiCalledRef.current) return;
    aiCalledRef.current = true;

    const err = validateInputs();
    if (err) {
      alert(err);
      if (!userNo) navigate("/login");
      else navigate("/checklist");
      return;
    }

    const generate = async () => {
      setLoading(true);
      setAiPlan(null);

      try {
        const res = await axiosInstance.post("/ai_plan/run", {
          userNo,
          batchId,
        });

        const { requestId, resultJson } = res.data;

        const raw = JSON.parse(resultJson);

        // ✅ 백엔드가 정규화/검증한 결과를 그대로 사용
        setAiPlan({
          ...raw,
          requestId,
        });

      } catch (e) {
        console.error(e);
        alert("AI 추천 생성 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================
     일정 저장 (AI_PLAN)
  ========================= */
  const savePlan = async () => {
    if (!userNo || !batchId || !aiPlan) {
      alert("저장할 정보가 부족합니다.");
      return;
    }

    try {
      await saveAiPlan({
        requestId: aiPlan.requestId,
        batchId,
        userNo,
        resultJson: JSON.stringify(aiPlan),
      });

      alert("AI 여행 일정이 저장되었습니다.");
      navigate("/checklist/detail", { state: { batchId } });
    } catch (e) {
      console.error(e);
      alert("AI 일정 저장 중 오류가 발생했습니다.");
    }
  };

  /* =========================
     AI 일정 렌더
  ========================= */
  const renderPreview = () => {
    if (!aiPlan || !Array.isArray(aiPlan.days)) return null;

    return (
      <>
        <h2 className="ai-preview-title">✨ AI 추천 일정</h2>

        {aiPlan.days.map((day) => (
          <div key={day.dayNumber} className="ai-day-table-card">
            <h3 className="ai-day-title">Day {day.dayNumber}</h3>

            <table className="ai-schedule-table improved">
              <thead>
                <tr>
                  <th>순서</th>
                  <th>장소</th>
                  <th>시간</th>
                  <th>거리</th>
                  <th>메모</th>
                </tr>
              </thead>
              <tbody>
                {(day.details || []).map((it) => (
                  <tr key={it.order} className={`row-${it.stopType?.toLowerCase()}`}>
                    <td>{it.order}</td>
                    <td className="place-cell">
                      <strong>{it.placeName || "-"}</strong>
                    </td>
                    <td>
                      {it.startTime || it.endTime
                        ? `${it.startTime || "-"} ~ ${it.endTime || "-"}`
                        : "-"}
                    </td>
                    <td>
                      {typeof it.distanceKm === "number"
                        ? `${it.distanceKm} km`
                        : "-"}
                    </td>
                    <td className="memo-cell">{it.memo || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <button className="result-ai-btn" onClick={savePlan}>
          📌 이 일정 저장하기
        </button>
      </>
    );
  };

  return (
    <div className="ai-page-wrapper">
      <h1 className="ai-page-title">🤖 AI 라이딩 여행 추천</h1>

      <p className="ai-page-summary">
        <strong>📌 나의 여행 정보</strong>
        <br />
        {selectedSummary.split("\n").map((l, i) => (
          <span key={i}>
            {l}
            <br />
          </span>
        ))}
      </p>

      {loading && <p>⏳ AI가 여행을 설계 중입니다...</p>}
      {!loading && aiPlan && renderPreview()}

      <Link to="/checklist" className="result-home-btn">
        목록으로 →
      </Link>
    </div>
  );
}