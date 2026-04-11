import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DayCourseBuilder from "./DayCourseBuilder";
import "./RouteBuilder.css";

export default function RouteBuilder() {
  const nav = useNavigate();

  // ✅ RouteBuilder는 “1일차만”
  const [dayPlans, setDayPlans] = useState([{ start: null, end: null, waypoints: [], poi: [] }]);
  const day0 = dayPlans[0] || { start: null, end: null, waypoints: [], poi: [] };

  const goScheduleCreate = () => {
    if (!day0.start || !day0.end) {
      alert("출발/도착을 먼저 선택해줘!");
      return;
    }

    // ✅ ScheduleCreate로 전달
    nav("/schedule/new", {
      state: {
        prefillDayPlans: dayPlans,
        startStep: 5, // 마지막(코스) 단계부터 열고 싶을 때
      },
    });
  };

  return (
    <div className="rb-wrap">
      <div className="rb-head">
        <div>
          <h1 className="rb-title">코스 만들기 (빠른 1일차)</h1>
          <p className="rb-desc">검색으로 출발/도착/경유/추천을 선택하고 일정 생성 화면으로 가져가요.</p>
        </div>

        <div className="rb-head-actions">
          <button className="rb-btn ghost" type="button" onClick={() => nav(-1)}>
            ← 뒤로
          </button>
          <button className="rb-btn primary" type="button" onClick={goScheduleCreate}>
            일정 만들기로 가져가기
          </button>
        </div>
      </div>

      <DayCourseBuilder days={1} value={dayPlans} onChange={setDayPlans} />
    </div>
  );
}
