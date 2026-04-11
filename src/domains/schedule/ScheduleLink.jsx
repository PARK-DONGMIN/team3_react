import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserStore } from "../../store/store";
import { scheduleApi } from "../../api/schedule";
import { buildAiRequest, applyAiResult } from "./aiSchedule";
import "./ScheduleLink.css";

export default function ScheduleLink() {
  const nav = useNavigate();
  const { state } = useLocation();
  const userNo = useUserStore((s) => s.userno);

  /** 전달받은 체크리스트 */
  const checklist = state?.checklist;
  const checklistItems = checklist?.items || [];

  /** 스케줄 */
  const [schedules, setSchedules] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userNo) return;
    (async () => {
      const res = await scheduleApi.listMine(userNo);
      setSchedules(Array.isArray(res) ? res : []);
    })();
  }, [userNo]);

  const onRunAi = async () => {
    if (!selectedScheduleId) {
      alert("연동할 일정을 선택해주세요!");
      return;
    }

    setLoading(true);
    try {
      const schedule = schedules.find(
        (s) => String(s.scheduleId ?? s.id) === String(selectedScheduleId)
      );

      /** 🔥 AI 요청 생성 */
      const payload = buildAiRequest(schedule, checklistItems);

      /** 🔥 임시 AI 호출 (백엔드 붙일 자리) */
      const aiResponse = await fakeAiCall(payload);

      /** 🔥 결과 적용 */
      applyAiResult(selectedScheduleId, aiResponse, checklist);

      alert("체크리스트 기준 AI 일정이 생성되었습니다!");
      nav(`/schedule/${selectedScheduleId}`);
    } catch (e) {
      console.error(e);
      alert("AI 일정 생성 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="slk-wrap">
      <button className="back-btn" onClick={() => nav(-1)}>←</button>

      <h1>체크리스트 → 일정 연동</h1>

      <section className="slk-box">
        <h2>선택한 체크리스트</h2>
        <b>{checklist?.title}</b>
        <p>{checklistItems.length}개 항목</p>
      </section>

      <section className="slk-box">
        <h2>연동할 일정 선택</h2>
        <select
          value={selectedScheduleId}
          onChange={(e) => setSelectedScheduleId(e.target.value)}
        >
          <option value="">일정 선택</option>
          {schedules.map((s) => (
            <option key={s.scheduleId ?? s.id} value={s.scheduleId ?? s.id}>
              {s.scheduleTitle ?? s.title}
            </option>
          ))}
        </select>
      </section>

      <button className="slk-btn ai" onClick={onRunAi} disabled={loading}>
        🤖 체크리스트 기준 AI 일정 생성
      </button>
    </div>
  );
}

/** ❗ 임시 AI 호출 (백엔드 연동 예정) */
async function fakeAiCall(payload) {
  console.log("AI REQUEST PAYLOAD", payload);

  return {
    dayPlans: {
      1: {
        start: { place_name: "출발지" },
        end: { place_name: "도착지" },
        waypoints: [],
        pickedPois: [],
        memo: "체크리스트 조건을 반영한 AI 일정",
      },
    },
  };
}
