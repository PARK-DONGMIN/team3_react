import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../../api/axios";
import "./AdminLogTable.css";

function fmt(dt) {
  if (!dt) return "-";
  return String(dt).replace("T", " ").slice(0, 19);
}

export default function AdminNotificationList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [date, setDate] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/admin/notifications", {
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

  const onDelete = async (notiId) => {
    if (!window.confirm("이 메일 기록을 삭제할까?")) return;
    try {
      await axiosInstance.delete(`/admin/notifications/${notiId}`);
      await load();
      alert("삭제 완료!");
    } catch (e) {
      console.error(e);
      alert("삭제 실패 😭");
    }
  };

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return rows;

    return rows.filter((r) => {
      return (
        String(r.userId || "").toLowerCase().includes(qq) ||
        String(r.toEmail || "").toLowerCase().includes(qq) ||
        String(r.title || "").toLowerCase().includes(qq) ||
        String(r.type || "").toLowerCase().includes(qq) ||
        String(r.status || "").toLowerCase().includes(qq)
      );
    });
  }, [rows, q]);

  return (
    <div className="admin-log-wrap">
      <h2 className="admin-log-title">메일 기록 관리</h2>

      <div className="admin-log-tools">
        <input
          className="admin-log-input"
          placeholder="USER_ID/이메일/제목/타입/상태 검색"
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
              <th className="col-to">수신자</th>
              <th className="col-title">제목</th>
              <th className="col-created">생성일시</th>
              <th className="col-sent">발송일시</th>
              <th className="col-act align-center">관리</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="admin-log-empty">
                  불러오는 중...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="admin-log-empty">
                  데이터가 없어요
                </td>
              </tr>
            ) : (
              filtered.map((r, idx) => (
                <tr key={r.notiId}>
                  <td className="align-center">{idx + 1}</td>

                  <td style={{ wordBreak: "break-all" }}>{r.userId || "-"}</td>

                  <td className="align-center">
                    <span
                      className={`admin-chip status ${String(
                        r.status || ""
                      ).toLowerCase()}`}
                    >
                      {r.status || "-"}
                    </span>
                  </td>

                  <td className="align-center">
                    <span className="admin-chip">{r.channel || "-"}</span>
                  </td>

                  <td style={{ wordBreak: "break-all" }}>{r.toEmail || "-"}</td>

                  <td style={{ wordBreak: "break-word", whiteSpace: "normal" }}>
                    {r.title || "-"}
                    {r.failReason ? (
                      <button
                        className="admin-mini-btn"
                        onClick={() => alert(r.failReason)}
                        title="실패 사유"
                      >
                        실패사유
                      </button>
                    ) : null}
                  </td>

                  <td>{fmt(r.createdAt)}</td>
                  <td>{fmt(r.sentAt)}</td>

                  <td className="align-center">
                    <button
                      className="admin-log-btn danger sm"
                      onClick={() => onDelete(r.notiId)}
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
