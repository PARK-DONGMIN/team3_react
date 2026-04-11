import { useEffect, useState } from "react";
import axiosInstance from "../../api/axios";
import { useUserStore } from "../../store/store.js";
import "./ReportsAdminStyles.css";

/* 페이지 번호 범위 생성 */
function range(start, end) {
  const arr = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
}

/* 페이지 버튼 계산 */
function getPageNumbers(totalPages, current) {
  if (totalPages === 0) return [];
  const WIN = 4;

  let start = Math.max(1, current - WIN);
  let end = Math.min(totalPages, current + WIN);

  while (end - start < 8) {
    if (start > 1) start--;
    else if (end < totalPages) end++;
    else break;
  }

  return range(start, end);
}

export default function PostsReportsAdmin() {
  const adminId = useUserStore((s) => s.userid);
  const grade = useUserStore((s) => s.grade);

  const [list, setList] = useState([]);
  const [status, setStatus] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(0);
  const [size] = useState(10);

  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  if (Number(grade) !== 2) {
    return <h2 style={{ color: "red" }}>⚠ 관리자만 접근 가능합니다</h2>;
  }

  /* 목록 로드 */
  const load = async () => {
    try {
      const res = await axiosInstance.get("/reports/posts/search", {
        params: { status, keyword, page, size },
      });

      setList(res.data.content);
      setTotalPages(res.data.totalPages);
      setTotalElements(res.data.totalElements);
    } catch (e) {
      console.error(e);
      alert("신고 목록을 불러오지 못했습니다.");
    }
  };

  useEffect(() => {
    load();
  }, [page, status, keyword]);

  const search = () => setPage(0);

  /* 상태 변경 */
  const updateStatus = async (reportId, nextStatus) => {
    try {
      await axiosInstance.put(`/reports/posts/${reportId}/status`, null, {
        params: {
          status: nextStatus,
          adminId: adminId,
        },
      });

      alert("처리 완료");
      load();
    } catch (e) {
      console.error(e);
      alert("처리 실패");
    }
  };

  /* 승인 */
  const approve = (reportId) => {
    if (!window.confirm("승인을 하면 게시글이 삭제됩니다.\n진행할까요?")) return;
    updateStatus(reportId, "APPROVED");
  };

  /* 신고 삭제 */
  const deleteReport = async (reportId) => {
    if (!window.confirm("신고 기록을 삭제하시겠습니까?")) return;

    try {
      await axiosInstance.delete(`/reports/posts/${reportId}`);
      alert("삭제 완료");
      load();
    } catch (e) {
      console.error(e);
      alert("삭제 실패");
    }
  };

  const current1 = page + 1;
  const nums = getPageNumbers(totalPages, current1);

  return (
    <div className="admin-container">
      <h2 className="admin-title">🚨 게시글 신고 관리</h2>

      {/* 🔍 검색 */}
      <div className="admin-top-bar">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="admin-select"
        >
          <option value="">전체</option>
          <option value="PENDING">PENDING</option>
          <option value="IN_REVIEW">IN_REVIEW</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
        </select>

        <input
          className="admin-input"
          type="text"
          placeholder="사유 검색..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />

        <button className="btn btn-outline-secondary btn-sm" onClick={search}>
          검색
        </button>
      </div>

      {/* 📋 테이블 */}
      <table className="admin-table">
        <thead>
          <tr>
            <th>신고ID</th>
            <th>게시글ID</th>
            <th>신고자</th>
            <th>사유</th>
            <th>상태</th>
            <th style={{ textAlign: "center", width: "200px" }}>처리</th>
            <th style={{ textAlign: "center", width: "110px" }}>신고삭제</th>
          </tr>
        </thead>

        <tbody>
          {list.map((r) => (
            <tr key={r.reportId}>
              <td>{r.reportId}</td>
              <td>{r.postId}</td>
              <td>{r.reporterId}</td>
              <td>{r.reason}</td>
              <td>{r.status}</td>

              <td style={{ textAlign: "center" }}>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => updateStatus(r.reportId, "IN_REVIEW")}
                >
                  검토중
                </button>{" "}
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => approve(r.reportId)}
                >
                  승인
                </button>{" "}
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => updateStatus(r.reportId, "REJECTED")}
                >
                  거절
                </button>
              </td>

              <td style={{ textAlign: "center" }}>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => deleteReport(r.reportId)}
                >
                  신고 삭제
                </button>
              </td>
            </tr>
          ))}

          {list.length === 0 && (
            <tr>
              <td colSpan="7" style={{ textAlign: "center", padding: "14px" }}>
                데이터가 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* 페이지네이션 */}
      <div className="admin-pagination">
        <button
          className="admin-page-btn"
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
        >
          &lt;
        </button>

        {nums.map((n) => {
          const zeroBase = n - 1;
          const isCurr = n === current1;

          return (
            <button
              key={n}
              onClick={() => setPage(zeroBase)}
              className={`admin-page-btn ${isCurr ? "btn-secondary" : ""} mx-1`}
            >
              {n}
            </button>
          );
        })}

        <button
          className="admin-page-btn"
          disabled={page + 1 >= totalPages}
          onClick={() => setPage(page + 1)}
        >
          &gt;
        </button>
      </div>

      <div style={{ marginTop: 10, textAlign: "center", color: "#666" }}>
        page: {current1} / {totalPages} • total: {totalElements}
      </div>
    </div>
  );
}
