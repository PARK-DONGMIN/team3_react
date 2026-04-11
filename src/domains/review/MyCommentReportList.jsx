import { useEffect, useMemo, useState, useCallback } from "react";
import { useUserStore } from "../../store/store";
import axiosInstance from "../../api/axios";
import "./Review.css";

/**
 * MyCommentReportList.jsx
 * - 관리자(grade===2): 댓글 신고 관리 (/reports/review-comments/search)
 * - 일반 유저: 내가 신고한 목록 (/reports/review-comments/reporter/{reporterId})
 *
 * ✅ 상태값은 백엔드와 동일하게 사용:
 * PENDING / IN_REVIEW / APPROVED / REJECTED
 */
export default function MyCommentReportList() {
  // 권한/로그인
  const grade = useUserStore((s) => s.grade);
  const isAdmin = grade === 2;

  const isLoginStore = useUserStore((s) => s.isLogin);
  const useridStore = useUserStore((s) => s.userid);

  const isLoginLS = localStorage.getItem("isLogin") === "true";
  const useridLS = localStorage.getItem("userid");

  const isLogin = Boolean(isLoginStore || isLoginLS);
  const loginUserid = useridStore || useridLS || null;

  // UI
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [errMsg, setErrMsg] = useState("");

  // 검색/필터/페이징
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState(""); // admin only
  const [page, setPage] = useState(0);
  const size = 10;

  // data
  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const managerId = loginUserid;

  /* =========================
     Fetch
  ========================= */
  const fetchAdminPage = useCallback(
    async (p = page) => {
      const res = await axiosInstance.get("/reports/review-comments/search", {
        params: { status, keyword, page: p, size },
      });

      const data = res.data;
      const content = Array.isArray(data?.content) ? data.content : [];

      setItems(content);
      setTotalPages(Number(data?.totalPages ?? 1));
      setTotalElements(Number(data?.totalElements ?? content.length ?? 0));
    },
    [status, keyword, page]
  );

  const fetchMyList = useCallback(async () => {
    if (!loginUserid) return;

    const res = await axiosInstance.get(
      `/reports/review-comments/reporter/${encodeURIComponent(loginUserid)}`
    );

    const list = Array.isArray(res.data) ? res.data : [];
    setItems(list);

    setTotalElements(list.length);
    setTotalPages(Math.max(1, Math.ceil(list.length / size)));
  }, [loginUserid]);

  const refetch = useCallback(async () => {
    if (!isLogin || !loginUserid) {
      setErrMsg("로그인 후 이용할 수 있습니다.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrMsg("");

    try {
      if (isAdmin) await fetchAdminPage(page);
      else await fetchMyList();
    } catch (e) {
      console.error(e);
      setErrMsg(e?.response?.data?.message || "신고 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, fetchAdminPage, fetchMyList, isLogin, loginUserid, page]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  /* =========================
     Admin actions
  ========================= */
  const updateStatus = async (reportId, newStatus) => {
    if (!isAdmin) return;

    setBusyId(reportId);
    try {
      await axiosInstance.put(`/reports/review-comments/${reportId}/status`, null, {
        params: { status: newStatus, managerId },
      });

      // 낙관적 업데이트(선택)
      setItems((prev) =>
        prev.map((it) => {
          const id = it.reportId ?? it.id;
          return id === reportId ? { ...it, status: newStatus } : it;
        })
      );

      await refetch();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "상태 변경 실패");
    } finally {
      setBusyId(null);
    }
  };

  /**
   * ✅ 승인(강제삭제) 시:
   * 1) force-delete로 댓글 삭제
   * 2) status API로 APPROVED로 변경 (중요)
   */
  const forceDelete = async (reportId) => {
    if (!isAdmin) return;
    if (!window.confirm("신고된 댓글을 강제 삭제(승인)할까요?")) return;

    setBusyId(reportId);
    try {
      // 1) 댓글 강제 삭제
      await axiosInstance.delete(`/reports/review-comments/${reportId}/force-delete`, {
        params: { managerId },
      });

      // 2) ✅ 신고 상태를 APPROVED로 변경
      await axiosInstance.put(`/reports/review-comments/${reportId}/status`, null, {
        params: { status: "APPROVED", managerId },
      });

      // 3) UI 즉시 반영(선택)
      setItems((prev) =>
        prev.map((it) => {
          const id = it.reportId ?? it.id;
          return id === reportId ? { ...it, status: "APPROVED" } : it;
        })
      );

      await refetch();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "승인(강제삭제) 처리 실패");
    } finally {
      setBusyId(null);
    }
  };

  const deleteReport = async (reportId) => {
    if (!isAdmin) return;
    if (!window.confirm("신고 기록을 삭제할까요?")) return;

    setBusyId(reportId);
    try {
      await axiosInstance.delete(`/reports/review-comments/${reportId}`);

      // UI 즉시 제거(선택)
      setItems((prev) =>
        prev.filter((it) => (it.reportId ?? it.id) !== reportId)
      );

      await refetch();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "신고 삭제 실패");
    } finally {
      setBusyId(null);
    }
  };

  /* =========================
     User list filter + paging (React only)
  ========================= */
  const filtered = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    if (isAdmin) return list;

    const q = keyword.trim().toLowerCase();
    if (!q) return list;

    return list.filter((r) => {
      const id = String(r?.id ?? r?.reportId ?? "");
      const commentId = String(r?.commentId ?? r?.reviewCommentId ?? "");
      const reason = String(r?.reason ?? r?.reportReason ?? "").toLowerCase();
      const st = String(r?.status ?? "").toLowerCase();
      const reporter = String(r?.reporterId ?? r?.reporter ?? "").toLowerCase();
      return (
        id.includes(q) ||
        commentId.includes(q) ||
        reason.includes(q) ||
        st.includes(q) ||
        reporter.includes(q)
      );
    });
  }, [items, keyword, isAdmin]);

  const uiTotalPages = useMemo(() => {
    if (isAdmin) return totalPages;
    return Math.max(1, Math.ceil(filtered.length / size));
  }, [isAdmin, totalPages, filtered.length]);

  const pageItems = useMemo(() => {
    if (isAdmin) return filtered; // admin: server paging already
    const start = page * size;
    return filtered.slice(start, start + size);
  }, [isAdmin, filtered, page]);

  // 검색
  const handleSearch = async () => {
    if (!isAdmin) {
      setPage(0);
      return;
    }

    setLoading(true);
    setErrMsg("");
    setPage(0);
    try {
      await fetchAdminPage(0);
    } catch (e) {
      console.error(e);
      setErrMsg(e?.response?.data?.message || "신고 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 유저: 키워드 바뀌면 1페이지로
  useEffect(() => {
    if (!isAdmin) setPage(0);
  }, [keyword, isAdmin]);

  // paging
  const canPrev = page > 0;
  const canNext = page + 1 < uiTotalPages;

  const goPrev = () => canPrev && setPage((p) => Math.max(0, p - 1));
  const goNext = () => canNext && setPage((p) => Math.min(uiTotalPages - 1, p + 1));

  if (loading) return <div className="report-page loading">로딩 중...</div>;
  if (errMsg) return <div className="report-page error">{errMsg}</div>;

  return (
    <div className="report-page">
      <div className="report-header">
        <h2 className="report-title">
          {isAdmin ? "💬 댓글 신고 관리" : "내가 신고한 댓글 목록"}
        </h2>
        <p className="report-subtitle">
          {isAdmin
            ? "신고된 댓글을 검토하고 승인/거절/삭제 처리할 수 있습니다."
            : "내가 신고한 댓글의 처리 상태를 확인할 수 있습니다."}
        </p>
      </div>

      {/* Top Bar */}
      <div className="report-toolbar">
        {isAdmin && (
          <select
            className="report-select"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            <option value="">전체</option>
            <option value="PENDING">PENDING</option>
            <option value="IN_REVIEW">IN_REVIEW</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        )}

        <input
          className="report-search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="검색 (사유/상태/댓글ID/신고ID/신고자)"
        />

        <button className="btn-outline report-search-btn" onClick={handleSearch}>
          검색
        </button>

        <span className="report-count">
          총 {isAdmin ? totalElements : filtered.length}건
        </span>
      </div>

      {/* Table */}
      <div className="report-table">
        <div className="report-thead">
          <div className="col col-id">신고ID</div>
          <div className="col col-comment">댓글ID</div>
          <div className="col col-reporter">신고자</div>
          <div className="col col-reason">사유</div>
          <div className="col col-status">상태</div>
          {isAdmin && <div className="col col-actions">처리</div>}
          {isAdmin && <div className="col col-delete">신고삭제</div>}
        </div>

        {pageItems.length === 0 ? (
          <div className="report-empty">데이터가 없습니다.</div>
        ) : (
          pageItems.map((r, idx) => {
            const reportId = r.reportId ?? r.id ?? `${page}-${idx}`;
            const commentId = r.commentId ?? r.reviewCommentId ?? r.comment_id ?? "";
            const reporterId = r.reporterId ?? r.reporter ?? "";
            const reason = r.reason ?? r.reportReason ?? r.report_content ?? "";
            const st = r.status ?? "UNKNOWN";
            const isBusy = busyId === reportId;

            return (
              <div key={String(reportId)} className="report-row">
                <div className="col col-id">{reportId}</div>
                <div className="col col-comment">{commentId}</div>
                <div className="col col-reporter">{reporterId}</div>

                <div className="col col-reason" title={reason}>
                  {reason}
                </div>

                <div className="col col-status">
                  <span className={`status-pill status-${String(st).toLowerCase()}`}>
                    {st}
                  </span>
                </div>

                {isAdmin && (
                  <div className="col col-actions">
                    <button
                      className="btn-outline mini-btn"
                      onClick={() => updateStatus(reportId, "IN_REVIEW")}
                      disabled={isBusy}
                    >
                      검토중
                    </button>

                    <button
                      className="btn-outline mini-btn mini-approve"
                      onClick={() => forceDelete(reportId)}
                      disabled={isBusy}
                    >
                      승인
                    </button>

                    <button
                      className="btn-outline mini-btn mini-reject"
                      onClick={() => updateStatus(reportId, "REJECTED")}
                      disabled={isBusy}
                    >
                      거절
                    </button>
                  </div>
                )}

                {isAdmin && (
                  <div className="col col-delete">
                    <button
                      className="btn-danger mini-btn"
                      onClick={() => deleteReport(reportId)}
                      disabled={isBusy}
                    >
                      신고 삭제
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Paging */}
      {uiTotalPages > 1 && (
        <div className="report-pager">
          <button className="btn-outline" onClick={goPrev} disabled={!canPrev}>
            &lt;
          </button>
          <span className="pager-info">
            {page + 1} / {uiTotalPages}
          </span>
          <button className="btn-outline" onClick={goNext} disabled={!canNext}>
            &gt;
          </button>
        </div>
      )}
    </div>
  );
}
