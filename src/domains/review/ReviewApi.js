import api from "../../api/axios";

const BASE = "/review";

// ✅ 신고 API base
const REVIEW_REPORT_BASE = "/reports/reviews";
const COMMENT_REPORT_BASE = "/reports/review-comments";

export const reviewApi = {
  /* =========================
     기본 CRUD
  ========================= */

  list(city, district) {
    return api
      .get(`${BASE}/list`, { params: { city, district } })
      .then((res) => res.data);
  },

  search({
    city,
    district,
    keyword,
    page = 0,
    size = 10,
    sortBy = "createdAt",
    direction = "desc",
  }) {
    return api
      .get(`${BASE}/search`, {
        params: { city, district, keyword, page, size, sortBy, direction },
      })
      .then((res) => res.data);
  },

  detail(reviewId) {
    return api.get(`${BASE}/detail/${reviewId}`).then((res) => res.data);
  },

  // ✅ 상세 + 댓글까지 한번에 (있으면 유지)
  detailWithComments(reviewId, { userId, cpage = 0, csize = 20 } = {}) {
    return api
      .get(`${BASE}/detail-with-comments/${reviewId}`, {
        params: { userId, cpage, csize },
      })
      .then((res) => res.data);
  },

  create(data) {
    return api.post(`${BASE}/create`, data).then((res) => res.data);
  },

  update(reviewId, data) {
    return api.put(`${BASE}/update/${reviewId}`, data).then((res) => res.data);
  },

  delete(reviewId, userId) {
    if (!reviewId) return Promise.reject(new Error("reviewId가 없습니다."));
    if (!userId || String(userId).trim() === "") {
      return Promise.reject(new Error("userId가 없습니다. (로그인 정보 확인 필요)"));
    }

    return api
      .delete(`${BASE}/delete/${reviewId}`, { params: { userId } })
      .then((res) => res.data);
  },

  /* =========================
     AI 기능 (요약/태그)
  ========================= */

  aiSummary(reviewId) {
    return api.get(`${BASE}/ai/summary/${reviewId}`).then((res) => res.data);
  },

  aiTags(reviewId) {
    return api.get(`${BASE}/ai/tags/${reviewId}`).then((res) => res.data);
  },

  regenTags(reviewId) {
    return api.post(`${BASE}/ai/tags/regenerate/${reviewId}`).then((res) => res.data);
  },

  /* =========================
     ✅ 댓글 신고(ReviewCommentReport)
     Controller: /reports/review-comments/...
  ========================= */

  // ✅ 내가 신고한 댓글 목록 (List)
  myCommentReports(reporterId) {
    if (!reporterId || String(reporterId).trim() === "") {
      return Promise.reject(new Error("reporterId(userId)가 없습니다."));
    }
    return api
      .get(`${COMMENT_REPORT_BASE}/reporter/${encodeURIComponent(reporterId)}`)
      .then((res) => res.data);
  },

  // ✅ (관리자) 댓글 신고 검색 (Page)
  searchCommentReports({ status = "", keyword = "", page = 0, size = 10 } = {}) {
    return api
      .get(`${COMMENT_REPORT_BASE}/search`, { params: { status, keyword, page, size } })
      .then((res) => res.data);
  },

  // ✅ (관리자) 댓글 신고 상태 변경
  updateCommentReportStatus(reportId, { status, managerId }) {
    return api
      .put(`${COMMENT_REPORT_BASE}/${reportId}/status`, null, {
        params: { status, managerId },
      })
      .then((res) => res.data);
  },

  // ✅ (관리자) 댓글 신고 승인(강제삭제)
  forceDeleteReportedComment(reportId, { managerId }) {
    return api
      .delete(`${COMMENT_REPORT_BASE}/${reportId}/force-delete`, {
        params: { managerId },
      })
      .then((res) => res.data);
  },

  // ✅ 신고 단건
  getCommentReport(reportId) {
    return api.get(`${COMMENT_REPORT_BASE}/${reportId}`).then((res) => res.data);
  },

  // ✅ 신고 기록 삭제
  deleteCommentReport(reportId) {
    return api.delete(`${COMMENT_REPORT_BASE}/${reportId}`).then((res) => res.data);
  },

  /* =========================
     ✅ 리뷰 신고(ReviewReport)
     Controller: /reports/reviews/...
  ========================= */

  // ✅ 내가 신고한 리뷰 목록 (List)
  myReviewReports(reporterId) {
    if (!reporterId || String(reporterId).trim() === "") {
      return Promise.reject(new Error("reporterId(userId)가 없습니다."));
    }
    return api
      .get(`${REVIEW_REPORT_BASE}/reporter/${encodeURIComponent(reporterId)}`)
      .then((res) => res.data);
  },

  // ✅ (관리자) 리뷰 신고 검색 (Page)
  searchReviewReports({ status = "", keyword = "", page = 0, size = 10 } = {}) {
    return api
      .get(`${REVIEW_REPORT_BASE}/search`, { params: { status, keyword, page, size } })
      .then((res) => res.data);
  },

  // ✅ (관리자) 리뷰 신고 상태 변경
  updateReviewReportStatus(reportId, { status, managerId }) {
    return api
      .put(`${REVIEW_REPORT_BASE}/${reportId}/status`, null, {
        params: { status, managerId },
      })
      .then((res) => res.data);
  },

  // ✅ (관리자) 리뷰 신고 승인(강제삭제)
  forceDeleteReportedReview(reportId, { managerId }) {
    return api
      .delete(`${REVIEW_REPORT_BASE}/${reportId}/force-delete`, {
        params: { managerId },
      })
      .then((res) => res.data);
  },

  // ✅ 리뷰 신고 단건
  getReviewReport(reportId) {
    return api.get(`${REVIEW_REPORT_BASE}/${reportId}`).then((res) => res.data);
  },

  // ✅ 리뷰 신고 기록 삭제
  deleteReviewReport(reportId) {
    return api.delete(`${REVIEW_REPORT_BASE}/${reportId}`).then((res) => res.data);
  },
};

export default reviewApi;
