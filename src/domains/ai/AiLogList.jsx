import { useEffect, useState } from "react";
import axiosInstance from "../../api/axios";
import "./AiLogList.css";

export default function AiLogList() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ===============================
     페이지네이션 상태
  =============================== */
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  /* ===============================
     필터 상태 (백엔드 전달용)
  =============================== */
  const [showFailOnly, setShowFailOnly] = useState(false);

  /* ===============================
     로그 조회 (백엔드 페이지네이션)
  =============================== */
  useEffect(() => {
    setLoading(true);

    axiosInstance
      .get("/ai_log/list", {
        params: {
          page: page,
          size: 20,
          status: showFailOnly ? "FAIL" : undefined
        }
      })
      .then((res) => {
        setLogs(res.data?.content ?? []);
        setTotalPages(res.data?.totalPages ?? 1);
      })
      .catch((err) => {
        console.error("AI 로그 조회 실패", err);
        setLogs([]);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  }, [page, showFailOnly]);

  /* ===============================
     로딩 처리
  =============================== */
  if (loading) {
    return <div style={{ padding: "20px" }}>로딩 중...</div>;
  }

  return (
    <div className="ai-log-page">
      <h2>🤖 AI 실행 로그</h2>

      {/* ===============================
         필터 버튼
      =============================== */}
      <div className="ai-log-actions">
        <button
          className={!showFailOnly ? "active" : ""}
          onClick={() => {
            setShowFailOnly(false);
            setPage(1); // 필터 변경 시 페이지 초기화
          }}
        >
          전체 로그
        </button>

        <button
          className={showFailOnly ? "active fail" : "fail"}
          onClick={() => {
            setShowFailOnly(true);
            setPage(1); // 필터 변경 시 페이지 초기화
          }}
        >
          FAIL만 보기
        </button>
      </div>

      {/* ===============================
         로그 테이블
      =============================== */}
      <table className="ai-log-table">
        <thead>
          <tr>
            <th>LOG_ID</th>
            <th>REQUEST_ID</th>
            <th>AI_TYPE</th>
            <th>STATUS</th>
            <th>LATENCY(ms)</th>
            <th>ERROR</th>
            <th>CREATED_AT</th>
          </tr>
        </thead>

        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan="7" className="empty">
                로그 데이터가 없습니다.
              </td>
            </tr>
          ) : (
            logs.map((log) => (
              <tr
                key={log.logId}
                className={log.status === "FAIL" ? "fail-row" : ""}
              >
                <td>{log.logId}</td>
                <td>{log.requestId}</td>
                <td>
                  <span className={`ai-type ai-${log.aiType?.toLowerCase()}`}>
                    {log.aiType ?? "-"}
                  </span>
                </td>
                <td>
                  <span className={`status ${log.status.toLowerCase()}`}>
                    {log.status}
                  </span>
                </td>
                <td>{log.latencyMs ?? "-"}</td>
                <td className="error-cell">
                  {log.errorMessage ? (
                    <pre>{log.errorMessage}</pre>
                  ) : (
                    "-"
                  )}
                </td>
                <td>
                  {log.createdAt
                    ? new Date(log.createdAt).toLocaleString()
                    : "-"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* ===============================
         페이지네이션 버튼
      =============================== */}
      <div className="pagination">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            className={p === page ? "active" : ""}
            onClick={() => setPage(p)}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
