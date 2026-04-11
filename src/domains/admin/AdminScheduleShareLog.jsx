import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../../api/axios";
import "./AdminLogTable.css";

function fmt(dt) {
  if (!dt) return "-";
  return String(dt).replace("T", " ").slice(0, 19);
}

export default function AdminScheduleShareLog() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [date, setDate] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/admin/schedule-share-logs", {
        params: { q: q.trim() || undefined, date: date || undefined },
      });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDelete = async (shareId) => {
    if (!window.confirm("이 공유 기록을 삭제할까?")) return;
    try {
      await axiosInstance.delete(`/admin/schedule-share-logs/${shareId}`);
      await load();
      alert("삭제 완료!");
    } catch (e) {
      console.error(e);
      alert("삭제 실패 😭");
    }
  };

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (!qq) return true;
      return (
        String(r.userId || "").toLowerCase().includes(qq) ||
        String(r.scheduleId || "").toLowerCase().includes(qq) ||
        String(r.scheduleTitle || "").toLowerCase().includes(qq) ||
        String(r.channel || "").toLowerCase().includes(qq) ||
        String(r.target || "").toLowerCase().includes(qq) ||
        String(r.status || "").toLowerCase().includes(qq)
      );
    });
  }, [rows, q]);

  return (
    <div className="admin-log-wrap">
      <h2 className="admin-log-title">스케줄 공유 기록 관리</h2>

      <div className="admin-log-tools">
        <input
          className="admin-log-input"
          placeholder="USER_ID/scheduleId/제목/채널/대상/상태 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <input
          type="date"
          className="admin-log-date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <button className="admin-log-btn primary" onClick={load}>
          검색
        </button>

        <button
          className="admin-log-btn ghost"
          onClick={() => {
            setQ("");
            setDate("");
            setTimeout(load, 0);
          }}
        >
          초기화
        </button>
      </div>

      <div className="admin-log-table-wrap">
        <table className="admin-log-table">
          <thead>
            <tr>
              <th className="col-no">#</th>
              <th className="col-user">USER_ID</th>
              <th className="col-status align-center">상태</th>
              <th className="col-chan align-center">채널</th>
              <th className="col-to">대상</th>
              <th className="col-sid">SCHEDULE_ID</th>
              <th className="col-title">일정제목</th>
              <th className="col-created">생성일시</th>
              <th className="col-sent">발송일시</th>
              <th className="col-act align-center">관리</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="admin-log-empty">
                  불러오는 중...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="admin-log-empty">
                  데이터가 없어요
                </td>
              </tr>
            ) : (
              filtered.map((r, idx) => (
                <tr key={r.shareId}>
                  <td>{idx + 1}</td>

                  {/* ✅ USER_ID */}
                  <td className="td-user">{r.userId || "-"}</td>

                  {/* ✅ 상태 */}
                  <td className="align-center">
                    <span
                      className={`admin-chip status ${String(
                        r.status || ""
                      ).toLowerCase()}`}
                    >
                      {r.status}
                    </span>
                  </td>

                  {/* ✅ 채널 */}
                  <td className="align-center">
                    <span className="admin-chip">{r.channel}</span>
                  </td>

                  {/* ✅ 대상 */}
                  <td className="td-target">
                    {r.target?.trim() ? r.target : "링크 복사"}
                    {r.errorMsg ? (
                      <button
                        className="admin-mini-btn"
                        onClick={() => alert(r.errorMsg)}
                      >
                        에러
                      </button>
                    ) : null}
                  </td>

                  {/* ✅ SCHEDULE_ID */}
                  <td className="td-sid">{r.scheduleId ?? "-"}</td>

                  {/* ✅ 일정제목 */}
                  <td className="td-title">{r.scheduleTitle || "-"}</td>

                  <td>{fmt(r.createdAt)}</td>
                  <td>{fmt(r.sentAt)}</td>

                  <td className="align-center">
                    <button
                      className="admin-log-btn danger sm"
                      onClick={() => onDelete(r.shareId)}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
