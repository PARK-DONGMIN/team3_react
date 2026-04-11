// src/domains/schedule/ScheduleCourse.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import DayCourseBuilder from "../route/DayCourseBuilder";
import "./ScheduleCourse.css";
import { scheduleApi } from "../../api/schedule";

/* ✅ 날짜 안전 파싱 */
function normalizeDateOnly(v) {
  if (!v) return "";
  if (typeof v === "string") {
    const s = v.trim();
    return s.length >= 10 ? s.slice(0, 10) : s;
  }
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return "";
  }
}

function parseDateLocal(yyyyMmDd) {
  const s = normalizeDateOnly(yyyyMmDd);
  if (!s) return null;
  const [y, m, d] = s.split("-").map((x) => Number(x));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return new Date(y, m - 1, d);
}

function daysBetweenInclusive(start, end) {
  const s = parseDateLocal(start);
  const e = parseDateLocal(end);
  if (!s || !e) return 0;
  const ms = 1000 * 60 * 60 * 24;
  const diff = Math.floor((e.getTime() - s.getTime()) / ms);
  return diff + 1;
}

function clamp(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.min(Math.max(x, min), max);
}

export default function ScheduleCourse() {
  const nav = useNavigate();
  const { scheduleId } = useParams();
  const location = useLocation();

  const scheduleIdNum = useMemo(() => Number(scheduleId), [scheduleId]);
  const isValidScheduleId = Number.isFinite(scheduleIdNum) && scheduleIdNum > 0;

  const openDayFromState = Number(location?.state?.openDay);
  const dayCountFromState = Number(location?.state?.dayCount);

  const [dayCount, setDayCount] = useState(
    Number.isFinite(dayCountFromState) && dayCountFromState > 0 ? clamp(dayCountFromState, 1, 7) : 3
  );

  const [day, setDay] = useState(Number.isFinite(openDayFromState) && openDayFromState > 0 ? openDayFromState : 1);

  useEffect(() => {
    if (!isValidScheduleId) return;

    if (Number.isFinite(dayCountFromState) && dayCountFromState > 0) {
      const fixed = clamp(dayCountFromState, 1, 7);
      setDayCount(fixed);
      setDay((prev) => clamp(prev, 1, fixed));
      return;
    }

    (async () => {
      try {
        const res = await scheduleApi.getDetails(scheduleIdNum);
        const s = normalizeDateOnly(res?.startDate ?? res?.start_date);
        const e = normalizeDateOnly(res?.endDate ?? res?.end_date);
        const n = daysBetweenInclusive(s, e);

        const fixed = clamp(n || 3, 1, 7);
        setDayCount(fixed);
        setDay((prev) => clamp(prev, 1, fixed));
      } catch (err) {
        console.warn("ScheduleCourse dayCount fallback fail", err);
        setDayCount((prev) => clamp(prev || 3, 1, 7));
        setDay((prev) => clamp(prev || 1, 1, 7));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleIdNum, isValidScheduleId]);

  const handleSaved = ({ savedDay, nextDay, done }) => {
    if (done) {
      alert("모든 일차 코스 저장 완료! ✅ 상세일정으로 이동할게요.");
      nav(`/schedule/${scheduleIdNum}`, {
        replace: true,
        state: { openDay: savedDay },
      });
      return;
    }

    setDay(clamp(nextDay, 1, dayCount));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!isValidScheduleId) {
    return (
      <div className="scs-wrap">
        <div className="scs-head">
          <h1 className="scs-title">일차별 코스 만들기</h1>
          <p className="scs-desc">scheduleId가 올바르지 않아요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="scs-wrap">
      <div className="scs-head">
        <div>
          <h1 className="scs-title">일차별 코스 만들기</h1>
          <p className="scs-desc">출발/도착/경유지 선택 + 주변 장소를 추가해요.</p>
        </div>

        <div className="scs-actions">{/* 필요하면 버튼 추가 */}</div>
      </div>

      <DayCourseBuilder
        scheduleId={scheduleIdNum}
        dayNumber={day}
        dayCount={dayCount}
        onSaved={handleSaved}
        onChangeDay={(n) => {
          setDay(n);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </div>
  );
}
