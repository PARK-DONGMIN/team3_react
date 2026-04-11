import { useLocation, Link, useNavigate } from "react-router-dom";
import { useUserStore } from "../../store/store";
import { useMemo, useState } from "react";
import axios from "axios";
import "./Checklist.css";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function ChecklistResult() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const userNo = useUserStore((s) => s.userno);

  /* =========================
     전달 데이터
  ========================= */
  const {
    selectedItems = [],
    region = "",
    period = {},
    routeRegions = null,
    routeCities = [], 
    startPoint = "",
    endPoint = "",
    waypointTexts = [], 
  } = state || {};

  /* =========================
     여행 제목
  ========================= */
  const [title, setTitle] = useState("");

  /* =========================
     route / datetime 정규화
     - Batch 저장용 (LocalDateTime)
  ========================= */
  const normalized = useMemo(() => {
    const regionsArr =
      Array.isArray(routeRegions) && routeRegions.length > 0
        ? routeRegions
        : region
        ? [region]
        : [];

    const toLocalDateTime = (dateStr, timeStr) => {
      if (!dateStr) return null;

      // 이미 날짜+시간이면 그대로 사용
      if (dateStr.includes("T") || dateStr.includes(" ")) {
        return dateStr;
      }

      if (!timeStr) return null;

      return `${dateStr}T${timeStr}`;
    };

    const toDateOnly = (v) =>
      typeof v === "string" ? v.slice(0, 10) : null;

    return {
      regionsArr,
      startDatetime: toLocalDateTime(period?.startDate, period?.startTime),
      endDatetime: toLocalDateTime(period?.endDate, period?.endTime),

      // ✅ UI/계산용은 날짜만
      startDate: toDateOnly(period?.startDate),
      endDate: toDateOnly(period?.endDate),

      locationText: regionsArr.length ? regionsArr.join(" → ") : "",
    };
  }, [routeRegions, region, period]);

  /* =========================
     카테고리별 묶기 (UI)
  ========================= */
  const groupedItems = useMemo(() => {
    return (selectedItems || []).reduce((acc, item) => {
      const key = item.category || "기타";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [selectedItems]);

  /* =========================
     Batch + 체크리스트 저장
  ========================= */
  const saveChecklistCore = async () => {
    if (!userNo) {
      alert("로그인이 필요합니다!");
      navigate("/login");
      return null;
    }

    if (!title.trim()) {
      alert("여행 제목을 입력해주세요.");
      return null;
    }

    if (!selectedItems.length) {
      alert("선택된 항목이 없습니다.");
      return null;
    }

    if (!normalized.regionsArr.length) {
      alert("여행 경로가 비어있습니다.");
      return null;
    }

    if (!normalized.startDatetime || !normalized.endDatetime) {
      alert("여행 기간 또는 시간이 비어있습니다.");
      return null;
    }

    const batchPayload = {
      userNo,
      title: title.trim(),
      routeRegions: JSON.stringify(normalized.regionsArr),

      // 도시 경로 저장 (누락되던 핵심 포인트)
      routeCities: routeCities.length
        ? JSON.stringify(routeCities)
        : null,

      routeWaypoints: waypointTexts.length
        ? JSON.stringify(waypointTexts)
        : null,

      startPoint: startPoint || null,
      endPoint: endPoint || null,
      startDatetime: normalized.startDatetime,
      endDatetime: normalized.endDatetime,
    };

    const batchRes = await axios.post(
      `${BASE_URL}/checklist_batch/create`,
      batchPayload
    );

    const batchId = batchRes?.data?.batchId;
    if (!batchId) {
      alert("batchId 생성 실패");
      return null;
    }

    for (const item of selectedItems) {
      await axios.post(`${BASE_URL}/checklist_user/add`, {
        userNo,
        batchId,
        itemId: item.itemId,
      });
    }

    return batchId;
  };

  /* =========================
     저장만
  ========================= */
  const saveOnly = async () => {
    try {
      const batchId = await saveChecklistCore();
      if (!batchId) return;

      alert("체크리스트가 저장되었습니다.");
      navigate("/checklist/detail", { state: { batchId } });
    } catch (err) {
      console.error(err);
      alert("체크리스트 저장 중 오류가 발생했습니다.");
    }
  };

  /* =========================
     저장 + AI 이동
     - period 그대로 전달
  ========================= */
  const saveAndGoAI = async () => {
    try {
      const batchId = await saveChecklistCore();
      if (!batchId) return;

      navigate("/checklist/ai", {
        state: {
          batchId,

          // 🔥 AI 필수 입력
          period,
          routeRegions: normalized.regionsArr,
          routeCities,        // ✅ AI 쪽에서도 필요하면 그대로 전달
          startPoint,
          endPoint,
          waypointTexts,

          selectedItems,
        },
      });
    } catch (err) {
      console.error(err);
      alert("체크리스트 저장 중 오류가 발생했습니다.");
    }
  };

  const titlePlaceholder =
    normalized.locationText && normalized.startDate
      ? `예) ${normalized.locationText} 라이딩 여행`
      : "예) 나만의 라이딩 여행";

  /* =========================
     UI
  ========================= */
  return (
    <div className="toss-wrapper">
      <h1 className="toss-title">✨ 여행 취향 결과</h1>

      {/* 여행 제목 */}
      <div className="title-input-card">
        <div className="title-input-header">
          ✏️ 여행 제목 <span>(필수)</span>
        </div>

        <input
          className="title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={titlePlaceholder}
        />

        <p className="title-input-desc">
          이 이름은 여행 목록과 AI 일정에 표시됩니다
        </p>
      </div>

      {/* 위치/기간 */}
      <div className="result-location">
        {/* 지역 경로 */}
        <p>
          📍 지역 경로:{" "}
          {normalized.locationText || "경로 정보 없음"}
        </p>

        {/* 도시 경로 */}
        {routeCities.length > 0 && (
          <p>
            🧭 도시 경로: {routeCities.join(" → ")}
          </p>
        )}

        {/* 기간 */}
        <p>
          📅 {normalized.startDate || "-"} ~ {normalized.endDate || "-"}
          {period.startTime && period.endTime
            ? ` (${period.startTime} ~ ${period.endTime})`
            : ""}
        </p>

        {/* 출발/도착 */}
        {(startPoint || endPoint) && (
          <p>🚩 {startPoint || "-"} → {endPoint || "-"}</p>
        )}
      </div>


      {/* 선택 결과 */}
      <div className="result-box-list">
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category} className="result-category-group">
            <h2 className="result-category-title">▸ {category}</h2>
            {items.map((item) => (
              <div className="result-box" key={item.itemId}>
                <h3>{item.itemName}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* 버튼 */}
      <div className="detail-btn-row">
        <button className="result-save-btn" onClick={saveOnly}>
          ✔ 저장만 하기
        </button>

        <button className="result-ai-btn" onClick={saveAndGoAI}>
          🤖 저장하고 AI 추천받기
        </button>
      </div>

      <Link className="result-home-btn" to="/checklist">
        목록으로 돌아가기 →
      </Link>
    </div>
  );
}
