import { useEffect, useMemo, useState, useCallback } from "react";
import { useUserStore } from "../../store/store";
import axiosInstance from "../../api/axios";
import "./Review.css";

/**
 * ReviewReportList.jsx
 * - 관리자(grade===2): 리뷰 신고 관리 (/reports/reviews/search)
 * - 일반 유저: 내가 신고한 리뷰 신고 목록 (/reports/reviews/reporter/{reporterId})
 *
 * ✅ 상태값(백엔드 기준):
 * PENDING / IN_REVIEW / APPROVED / REJECTED
 */
export default function ReviewReportList() {
  const BASE = "/reports/reviews";

  // ✅ 권한/로그인
  const grade = useUserStore((s) => s.grade);
  const isAdmin = grade === 2;

  const isLoginStore = useUserStore((s) => s.isLogin);
  const useridStore = useUserStore((s) => s.userid);

  const isLoginLS = localStorage.getItem("isLogin") === "true";
  const useridLS = localStorage.getItem("userid");

  const isLogin = Boolean(isLoginStore || isLoginLS);
  const loginUserid = useridStore || useridLS || null;

  const managerId = loginUserid;

  // ✅ UI
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [errMsg, setErrMsg] = useState("");

  // ✅ 검색/필터/페이징
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState(""); // admin only
  const [page, setPage] = useState(0);
  const size = 10;

  // ✅ data
  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  /* =========================
     Fetch
  ========================= */
  const fetchAdminPage = useCallback(
    async (p = page) => {
      const res = await axiosInstance.get(`${BASE}/search`, {
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
      `${BASE}/reporter/${encodeURIComponent(loginUserid)}`
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
    if (!reportId) return alert("reportId가 없습니다. (데이터 확인 필요)");

    setBusyId(reportId);
    try {
      await axiosInstance.put(`${BASE}/${reportId}/status`, null, {
        params: { status: newStatus, managerId },
      });

      // ✅ 낙관적 업데이트
      setItems((prev) =>
        prev.map((it) => {
          const id = it?.reportId ?? it?.id;
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
   * ✅ 승인 처리 (강제삭제)
   *
   * 핵심 수정:
   * - force-delete가 성공하면, 서버에서 report를 삭제하거나(혹은 review를 삭제)해서
   *   그 다음 PUT /status 를 호출하면 404가 날 수 있음.
   * - 그래서 승인 버튼에서는 force-delete만 호출하고,
   *   프론트에서 상태를 APPROVED로 바꾸거나(또는 목록에서 제거) 처리.
   */
  const forceDelete = async (reportId) => {
    if (!isAdmin) return;
    if (!reportId) return alert("reportId가 없습니다. (데이터 확인 필요)");
    if (!window.confirm("신고된 리뷰를 강제 삭제(승인)할까요?")) return;

    setBusyId(reportId);
    try {
      await axiosInstance.delete(`${BASE}/${reportId}/force-delete`, {
        params: { managerId },
      });

      // ✅ 화면 즉시 반영: (선택1) 상태를 APPROVED로 바꿔서 남겨두기
      setItems((prev) =>
        prev.map((it) => {
          const id = it?.reportId ?? it?.id;
          return id === reportId ? { ...it, status: "APPROVED" } : it;
        })
      );

      // ✅ 또는 (선택2) 승인 처리된 건 목록에서 제거하고 싶으면 아래로 교체
      // setItems((prev) => prev.filter((it) => (it?.reportId ?? it?.id) !== reportId));

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
    if (!reportId) return alert("reportId가 없습니다. (데이터 확인 필요)");
    if (!window.confirm("신고 기록을 삭제할까요?")) return;

    setBusyId(reportId);
    try {
      await axiosInstance.delete(`${BASE}/${reportId}`);

      // ✅ 화면 즉시 제거
      setItems((prev) => prev.filter((it) => (it?.reportId ?? it?.id) !== reportId));

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
      const id = String(r?.reportId ?? r?.id ?? "");
      const reviewId = String(r?.reviewId ?? r?.targetId ?? "");
      const reason = String(r?.reason ?? "").toLowerCase();
      const st = String(r?.status ?? "").toLowerCase();
      const reporter = String(r?.reporterId ?? "").toLowerCase();
      return (
        id.includes(q) ||
        reviewId.includes(q) ||
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
    if (isAdmin) return filtered; // admin: 서버에서 이미 페이징된 content
    const start = page * size;
    return filtered.slice(start, start + size);
  }, [isAdmin, filtered, page]);

  // ✅ 검색
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

  // ✅ 유저: 키워드 바뀌면 1페이지로
  useEffect(() => {
    if (!isAdmin) setPage(0);
  }, [keyword, isAdmin]);

  // ✅ paging
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
          {isAdmin ? "🧾 리뷰 신고 관리" : "내가 신고한 리뷰 목록"}
        </h2>
        <p className="report-subtitle">
          {isAdmin
            ? "신고된 리뷰를 검토하고 승인/거절/삭제 처리할 수 있습니다."
            : "내가 신고한 리뷰의 처리 상태를 확인할 수 있습니다."}
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
          placeholder="검색 (사유/상태/리뷰ID/신고ID/신고자)"
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
          <div className="col col-comment">리뷰ID</div>
          <div className="col col-reporter">신고자</div>
          <div className="col col-reason">사유</div>
          <div className="col col-status">상태</div>
          {isAdmin && <div className="col col-actions">처리</div>}
          {isAdmin && <div className="col col-delete">신고삭제</div>}
        </div>

        {pageItems.length === 0 ? (
          <div className="report-empty">데이터가 없습니다.</div>
        ) : (
          pageItems.map((r) => {
            // ✅ 절대 가짜 ID 만들지 말기 (가짜로 호출하면 404남)
            const reportId = r?.reportId ?? r?.id;
            const reviewId = r?.reviewId ?? r?.targetId ?? "";
            const reporterId = r?.reporterId ?? "";
            const reason = r?.reason ?? "";
            const st = r?.status ?? "UNKNOWN";
            const isBusy = busyId === reportId;

            return (
              <div key={String(reportId ?? `${reviewId}-${reporterId}-${reason}`)} className="report-row">
                <div className="col col-id">{reportId ?? "-"}</div>
                <div className="col col-comment">{reviewId}</div>
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
                      disabled={isBusy || !reportId}
                      title={!reportId ? "reportId가 없어 처리할 수 없습니다." : ""}
                    >
                      검토중
                    </button>

                    <button
                      className="btn-outline mini-btn mini-approve"
                      onClick={() => forceDelete(reportId)}
                      disabled={isBusy || !reportId}
                      title={!reportId ? "reportId가 없어 처리할 수 없습니다." : ""}
                    >
                      승인
                    </button>

                    <button
                      className="btn-outline mini-btn mini-reject"
                      onClick={() => updateStatus(reportId, "REJECTED")}
                      disabled={isBusy || !reportId}
                      title={!reportId ? "reportId가 없어 처리할 수 없습니다." : ""}
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
                      disabled={isBusy || !reportId}
                      title={!reportId ? "reportId가 없어 처리할 수 없습니다." : ""}
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
