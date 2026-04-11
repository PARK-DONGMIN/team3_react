import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserStore } from "../../store/store";
import axios from "axios";
import { scheduleApi } from "../../api/schedule";
import "./Checklist.css";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function ChecklistDetail() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const userNo = useUserStore((s) => s.userno);

  const batchId = state?.batchId;
  const [group, setGroup] = useState(null);

  // ✅ 처음엔 접힌 상태
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);

  /* =========================
      날짜 계산 (날짜 기준, 시간 무시)
    ========================= */
  const calcDaysFromDateTime = (startDatetime, endDatetime) => {
    if (!startDatetime || !endDatetime) return 0;

    const s =
      typeof startDatetime === "string"
        ? startDatetime.slice(0, 10)
        : startDatetime;
    const e =
      typeof endDatetime === "string"
        ? endDatetime.slice(0, 10)
        : endDatetime;

    const start = new Date(s);
    const end = new Date(e);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    return Math.max(
      1,
      Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1
    );
  };

  const formatDate = (dt) => {
    if (!dt) return "-";
    if (typeof dt !== "string") return "-";
    return dt.slice(0, 10);
  };

  /* =========================
     ✅ Activity 체크리스트 기반 난이도 계산
     - 여러 개면 가장 높은 난이도 우선
  ========================= */
  const deriveDifficultyFromChecklist = (items) => {
    const activities = items.filter(
      (it) => it.category === "Activity" && typeof it.itemName === "string"
    );

    if (activities.some((it) => it.itemName.includes("고급"))) {
      return "고급";
    }
    if (activities.some((it) => it.itemName.includes("중급"))) {
      return "중급";
    }
    return "초급";
  };

  /* =========================
     ✅ 지역/도시 이름 → ID 변환 (추가)
     - payload에 regionId/cityId 넣기 위해 필요
  ========================= */
  const resolveRegionCityId = async (regionName, cityName) => {
    if (!regionName) return { regionId: null, cityId: null };

    const regionRes = await axios.get(`${BASE_URL}/location/regions`);
    const region = Array.isArray(regionRes.data)
      ? regionRes.data.find((r) => r.regionName === regionName)
      : null;

    if (!region) return { regionId: null, cityId: null };

    if (!cityName) {
      return { regionId: region.regionId, cityId: null };
    }

    const cityRes = await axios.get(`${BASE_URL}/location/cities`, {
      params: { regionId: region.regionId },
    });

    const city = Array.isArray(cityRes.data)
      ? cityRes.data.find((c) => c.cityName === cityName)
      : null;

    return {
      regionId: region.regionId,
      cityId: city ? city.cityId : null,
    };
  };

  /* =========================
     데이터 로드
  ========================= */
  useEffect(() => {
    if (!userNo || !batchId) {
      alert("잘못된 접근입니다.");
      navigate("/checklist");
      return;
    }

    const fetchData = async () => {
      try {
        /* 1️⃣ 여행 메타 */
        const batchRes = await axios.get(
          `${BASE_URL}/checklist_batch/${batchId}`
        );
        const batch = batchRes.data;

        /* 2️⃣ 선택된 체크리스트 */
        const itemsRes = await axios.get(
          `${BASE_URL}/checklist_user/detail/${userNo}/${batchId}`
        );

        /* 3️⃣ AI 최신 결과 */
        let aiResult = null;
        try {
          const aiRes = await axios.get(
            `${BASE_URL}/ai_plan/batch/${batchId}/latest`
          );
          if (aiRes.data?.resultJson) {
            aiResult = JSON.parse(aiRes.data.resultJson);
          }
        } catch {
          aiResult = null;
        }

        /* routeRegions 파싱 */
        let regionsArr = [];
        try {
          regionsArr = JSON.parse(batch.routeRegions || "[]");
        } catch {
          regionsArr = [];
        }

        /* ✅ routeCities 파싱 (추가) */
        let citiesArr = [];
        try {
          citiesArr = JSON.parse(batch.routeCities || "[]");
        } catch {
          citiesArr = [];
        }

        const days = calcDaysFromDateTime(
          batch.startDatetime,
          batch.endDatetime
        );

        setGroup({
          batchId,
          title: batch.title,
          createdAt: batch.createdAt,
          routeRegions: regionsArr,
          routeCities: citiesArr, // ✅ 추가
          startPoint: batch.startPoint,
          endPoint: batch.endPoint,
          period: {
            startDatetime: batch.startDatetime,
            endDatetime: batch.endDatetime,
            days,
          },
          items: Array.isArray(itemsRes.data) ? itemsRes.data : [],
          aiResult,
        });
      } catch (err) {
        console.error(err);
        alert("여행 정보를 불러오지 못했습니다.");
        navigate("/checklist");
      }
    };

    fetchData();
  }, [userNo, batchId, navigate]);

  if (!group) {
    return <p className="toss-sub">불러오는 중...</p>;
  }

  /* =========================
     이동 / 액션
  ========================= */
  const goEdit = () => {
    navigate("/checklist/test", {
      state: { prevGroup: group },
    });
  };

  const goAI = () => {
    const extractTime = (v) => {
      if (!v || typeof v !== "string") return "";
      if (v.includes("T")) return v.split("T")[1]?.slice(0, 5) || "";
      if (v.includes(" ")) return v.split(" ")[1]?.slice(0, 5) || "";
      return "";
    };

    navigate("/checklist/ai", {
      state: {
        batchId,
        routeRegions: group.routeRegions,
        startPoint: group.startPoint,
        endPoint: group.endPoint,
        period: {
          startDate: formatDate(group.period.startDatetime),
          endDate: formatDate(group.period.endDatetime),
          startTime: extractTime(group.period.startDatetime),
          endTime: extractTime(group.period.endDatetime),
        },
        selectedItems: group.items,
      },
    });
  };

  /* =========================
     스케줄에 추가
  ========================= */
  const goAddSchedule = async () => {
    if (!group.aiResult) {
      alert("AI 일정이 있어야 스케줄에 추가할 수 있습니다.");
      return;
    }

    try {
      const extractTime = (v) => {
        if (!v || typeof v !== "string") return null;
        if (v.includes("T")) return v.split("T")[1]?.slice(0, 5) || null;
        if (v.includes(" ")) return v.split(" ")[1]?.slice(0, 5) || null;
        return null;
      };

      /* ✅ 대표 지역/도시 추출 + ID 변환 (추가) */
      const 대표지역 =
        Array.isArray(group.routeRegions) && group.routeRegions.length > 0
          ? group.routeRegions[0]
          : null;

      const 대표도시 =
        Array.isArray(group.routeCities) && group.routeCities.length > 0
          ? group.routeCities[0]
          : null;

      const { regionId, cityId } = await resolveRegionCityId(대표지역, 대표도시);

      const payload = {
        userNo,

        /* ✅ 지역/도시 ID 추가 (핵심) */
        regionId,
        cityId,

        scheduleTitle: group.title,

        startDate: formatDate(group.period.startDatetime),
        endDate: formatDate(group.period.endDatetime),

        startTime: extractTime(group.period.startDatetime),
        endTime: extractTime(group.period.endDatetime),

        peopleCount: 1,
        isPublic: "Y",

        // ✅ checklist(Activity) 기준 난이도
        requestDifficulty: deriveDifficultyFromChecklist(group.items),

        hashtags: JSON.stringify(group.aiResult?.schedule?.hashtags ?? []),
        aiKeywords: JSON.stringify(group.aiResult?.schedule?.aiKeywords ?? []),
        memo: group.aiResult?.summary ?? null,
      };

      // 1) schedule 생성
      const scheduleRes = await scheduleApi.create(payload);
      const scheduleId = scheduleRes?.scheduleId;

      if (!scheduleId) {
        console.error("scheduleRes:", scheduleRes);
        alert("스케줄 생성은 되었지만 scheduleId를 받지 못했습니다.");
        return;
      }

      // 2) detail 저장 (핵심: LocalDateTime ISO 포맷으로 보냄)
      const scheduleStartDate = formatDate(group.period.startDatetime); // "YYYY-MM-DD"
      const baseDate = new Date(scheduleStartDate);
      if (isNaN(baseDate.getTime())) {
        alert("시작 날짜 형식이 올바르지 않아 상세 일정 저장이 중단되었습니다.");
        return;
      }

      // ✅ "09:20" + (startDate + dayNumber) => "YYYY-MM-DDTHH:mm:ss"
      const toIsoLocalDateTime = (dayNumber, hhmm) => {
        if (!hhmm || typeof hhmm !== "string") return null;

        const m = hhmm.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
        if (!m) return null;

        const d = new Date(baseDate);
        d.setDate(d.getDate() + (Number(dayNumber) - 1));

        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const HH = m[1];
        const MI = m[2];

        // ✅ Jackson 기본 LocalDateTime 파서가 잘 받는 ISO 형태
        return `${yyyy}-${mm}-${dd}T${HH}:${MI}:00`;
      };

      const days = Array.isArray(group.aiResult?.days) ? group.aiResult.days : [];
      if (days.length === 0) {
        alert("AI 일정(days)이 비어있어 상세 일정을 저장할 수 없습니다.");
        navigate("/schedule");
        return;
      }

      for (const day of days) {
        const dayNumber = Number(day.dayNumber);
        const details = Array.isArray(day.details) ? day.details : [];

        let fallbackOrder = 1;

        for (const d of details) {
          const orderInDay =
            typeof d.order === "number" && d.order > 0
              ? d.order
              : fallbackOrder++;

          const startTime = toIsoLocalDateTime(dayNumber, d.startTime);
          const endTime = toIsoLocalDateTime(dayNumber, d.endTime);

          const detailPayload = {
            scheduleId,
            dayNumber,
            orderInDay,

            region: d.region ?? null,
            city: d.city ?? null,

            placeId: null, // 카카오 연동은 나중에
            placeName: d.placeName ?? null,
            stopType: d.stopType || "WAYPOINT",
            startTime,
            endTime,
            cost: null,
            memo: d.memo ?? (d.placeName ? `${d.placeName}` : null),
            distanceKM:
              typeof d.distanceKm === "number"
                ? d.distanceKm
                : typeof d.distanceKM === "number"
                ? d.distanceKM
                : null,
          };

          await axios.post(`${BASE_URL}/schedule/detail/save`, detailPayload, {
            params: { userNo },
          });
        }
      }

      alert("스케줄 + AI 상세 일정 저장 완료!");
      navigate("/schedule");
    } catch (e) {
      // ✅ 여기서 response body를 같이 찍어야 원인 확정 가능
      console.error("goAddSchedule error:", e);
      console.error("server response:", e?.response?.data);
      alert("스케줄 생성 중 오류가 발생했습니다.");
    }
  };

  const deleteGroup = async () => {
    const ok = window.confirm(
      "이 여행을 삭제하면 체크리스트와 AI 추천 결과가 모두 삭제됩니다.\n정말 삭제하시겠습니까?"
    );
    if (!ok) return;

    try {
      await axios.delete(`${BASE_URL}/checklist_batch/${batchId}`);
      alert("여행이 삭제되었습니다.");
      navigate("/checklist");
    } catch (err) {
      console.error(err);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  /* =========================
     AI 일정 렌더
  ========================= */
  const renderAiResult = () => {
    const r = group.aiResult;
    if (!r || !Array.isArray(r.days)) return null;

    return (
      <div className="ai-day-wrapper">
        {r.days.map((day) => (
          <div key={day.dayNumber} className="ai-day-card">
            <h3 className="ai-day-title">Day {day.dayNumber}</h3>

            <div className="ai-day-details">
              {(day.details || []).map((d, idx) => (
                <div key={idx} className="ai-detail-row">
                  <div className="ai-detail-main">
                    <strong>{d.placeName || "장소 정보 없음"}</strong>
                    {d.stopType === "COURSE" &&
                      typeof d.distanceKm === "number" && (
                        <span className="ai-distance">🚴 {d.distanceKm} km</span>
                      )}
                  </div>

                  {(d.startTime || d.endTime) && (
                    <div className="ai-detail-time">
                      ⏰ {d.startTime || "-"} ~ {d.endTime || "-"}
                    </div>
                  )}

                  {d.memo && <div className="ai-detail-memo">{d.memo}</div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="detail-wrapper">
      <div className="detail-header">
        <h1 className="detail-title">{group.title}</h1>
        <div className="detail-btn-row">
          <button className="btn-outline" onClick={goEdit}>
            수정
          </button>
        </div>
      </div>

      <div className="detail-card">
        <h3>📍 여행 경로</h3>
        <p>
          {group.routeRegions.length > 0
            ? group.routeRegions.join(" → ")
            : "경로 정보 없음"}
        </p>

        {(group.startPoint || group.endPoint) && (
          <p>
            🚩 {group.startPoint || "-"} → {group.endPoint || "-"}
          </p>
        )}

        <p>
          📅 {formatDate(group.period.startDatetime)} ~{" "}
          {formatDate(group.period.endDatetime)} ({group.period.days}일)
        </p>
      </div>

      <div className="detail-card">
        <h3
          style={{
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
          onClick={() => setIsChecklistOpen((v) => !v)}
        >
          <span>✅ 선택한 체크리스트 ({group.items.length})</span>
          <span>{isChecklistOpen ? "▲ 접기" : "▼ 펼치기"}</span>
        </h3>

        {isChecklistOpen && (
          <div className="detail-list">
            {group.items.length === 0 ? (
              <p className="toss-sub">선택된 체크리스트가 없습니다.</p>
            ) : (
              group.items.map((item, idx) => (
                <div className="detail-card" key={`${item.itemId}-${idx}`}>
                  <h3>{item.itemName}</h3>
                  <p>{item.description}</p>
                  <span className="tag">{item.category}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="detail-ai-section">
        {group.aiResult ? (
          <div className="ai-card">
            <h2 className="ai-section-title">🤖 AI 여행 일정</h2>
            {renderAiResult()}
          </div>
        ) : (
          <p className="toss-sub">아직 AI 일정이 생성되지 않았어요.</p>
        )}
      </div>

      <div className="detail-footer">
        <div className="detail-footer-split">
          <button className="btn-primary half" onClick={goAI}>
            {group.aiResult ? "🤖 AI 재추천 받기" : "🤖 AI 추천 받기"}
          </button>
          <button className="btn-secondary half" onClick={goAddSchedule}>
            📅 스케줄에 추가
          </button>
        </div>

        <button className="btn-back full" onClick={() => navigate("/checklist")}>
          ← 목록으로 이동
        </button>

        <button className="btn-delete full" onClick={deleteGroup}>
          이 여행 삭제
        </button>
      </div>
    </div>
  );
}
