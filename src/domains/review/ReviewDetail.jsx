import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { reviewApi } from "./ReviewApi";
import axiosInstance from "../../api/axios";
import { useUserStore } from "../../store/store";
import "./Review.css";

export default function ReviewDetail() {
  const { reviewId } = useParams();
  const navigate = useNavigate();

  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ 로그인(스토어 + localStorage fallback)
  const isLoginStore = useUserStore((s) => s.isLogin);
  const useridStore = useUserStore((s) => s.userid);

  const isLoginLS = localStorage.getItem("isLogin") === "true";
  const useridLS = localStorage.getItem("userid");

  const isLogin = Boolean(isLoginStore || isLoginLS);
  const loginUserid = useridStore || useridLS || null;

  // ✅ AI 요약/태그
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [tags, setTags] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(false);

  // ✅ 번역(저장 X)
  const [translateLang, setTranslateLang] = useState("en");
  const [transLoading, setTransLoading] = useState(false);

  // ✅ 백엔드 응답 필드명에 맞춤: translatedPlaceName / translatedContent
  const [translated, setTranslated] = useState(null); // { translatedPlaceName, translatedContent }
  const [showTranslated, setShowTranslated] = useState(false);

  // ✅ 댓글
  const [comments, setComments] = useState([]);
  const [cpage, setCpage] = useState(0);
  const csize = 20;
  const [commentTotalPages, setCommentTotalPages] = useState(0);
  const [commentTotalElements, setCommentTotalElements] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);

  // =========================
  // ✅ 신고(리뷰/댓글) UI 상태
  // =========================
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState(null); 
  // { type: "review"|"comment", id: number, label: string }

  const [reportCategory, setReportCategory] = useState("SPAM");
  const [reportReason, setReportReason] = useState("");
  const [reportEvidenceUrl, setReportEvidenceUrl] = useState("");
  const [reportBusy, setReportBusy] = useState(false);

  const canEdit = useMemo(() => {
    if (!review) return false;
    return Boolean(isLogin && loginUserid && review.userId === loginUserid);
  }, [review, isLogin, loginUserid]);

  const alertServerMessageOr = (err, fallback) => {
    const msg = err?.response?.data?.message ?? err?.response?.data ?? err?.message;
    if (typeof msg === "string" && msg.trim()) alert(msg);
    else alert(fallback);
  };

  const gotoList = useCallback(
    (rv) => {
      const c = rv?.city || review?.city || "";
      const d = rv?.district || review?.district || "";

      if (c && d) {
        navigate(`/review/list?city=${encodeURIComponent(c)}&district=${encodeURIComponent(d)}`);
      } else {
        navigate(-1);
      }
    },
    [navigate, review]
  );

  const normalizeTagArray = (data) => {
    if (!Array.isArray(data)) return [];
    return data
      .map((t) => ({
        tagType: String(t?.tagType ?? t?.type ?? "").trim(),
        tagValue: String(t?.tagValue ?? t?.value ?? "").trim(),
      }))
      .filter((x) => x.tagType && x.tagValue);
  };

  // ✅ 번역 응답 정규화 (필드명 다를 가능성도 안전하게 흡수)
  const normalizeTranslate = (data) => {
    if (!data) return null;

    let tp = data.translatedPlaceName ?? data.placeName ?? data.place_name ?? "";
    let tc = data.translatedContent ?? data.content ?? data.content_text ?? "";

    if (!tp && !tc && data.result) {
      tp = data.result.translatedPlaceName ?? data.result.placeName ?? "";
      tc = data.result.translatedContent ?? data.result.content ?? "";
    }

    tp = String(tp ?? "").trim();
    tc = String(tc ?? "").trim();

    return { translatedPlaceName: tp, translatedContent: tc };
  };

  // ✅ 상세 + 댓글 한번에 조회
  const fetchDetailWithComments = useCallback(
    async (page = 0) => {
      if (!reviewId) return;

      setLoading(true);
      setTagsLoading(true);

      try {
        const res = await axiosInstance.get(`/review/detail-with-comments/${reviewId}`, {
          params: {
            userId: loginUserid || "", // 로그인 안 했으면 빈값
            cpage: page,
            csize,
          },
        });

        const data = res.data;
        if (!data) {
          alert("존재하지 않는 리뷰입니다.");
          navigate(-1);
          return;
        }

        setReview(data);

        // tags: DTO에 포함된 tags 사용
        setTags(normalizeTagArray(data.tags));

        // comments: DTO에 포함된 comments 사용
        setComments(Array.isArray(data.comments) ? data.comments : []);
        setCpage(Number.isFinite(page) ? page : 0);
        setCommentTotalPages(Number(data.commentTotalPages ?? 0));
        setCommentTotalElements(Number(data.commentTotalElements ?? 0));

        // ✅ DB에 저장된 요약/키워드가 있으면 표시
        const summary1 = String(data.aiSummary || "").trim();
        const kwStr = String(data.aiKeywords || "").trim();
        const keywords = kwStr ? kwStr.split(",").map((s) => s.trim()).filter(Boolean) : [];

        if (summary1 || keywords.length > 0) {
          setAiSummary({ summary1, keywords, tags: {} });
        } else {
          setAiSummary(null);
        }
      } catch (err) {
        console.error(err);
        alert("리뷰 정보를 불러오지 못했습니다.");
        navigate(-1);
      } finally {
        setLoading(false);
        setTagsLoading(false);
      }
    },
    [reviewId, loginUserid, navigate]
  );

  // ✅ 최초 로딩
  useEffect(() => {
    if (!reviewId) {
      alert("잘못된 접근입니다.");
      navigate(-1);
      return;
    }
    fetchDetailWithComments(0);
  }, [reviewId, navigate, fetchDetailWithComments]);

  // ✅ 수정 이동
  const handleUpdate = () => {
    if (!review) return;

    if (!isLogin || !loginUserid) {
      alert("로그인 후 수정할 수 있습니다.");
      navigate("/login", { state: { from: `/review/detail/${reviewId}` } });
      return;
    }

    if (loginUserid !== review.userId) {
      alert("작성자만 수정할 수 있습니다.");
      return;
    }

    navigate(`/review/update/${reviewId}`);
  };

  // ✅ 삭제
  const handleDelete = async () => {
    if (!review) return;

    if (!isLogin || !loginUserid) {
      alert("로그인 후 삭제할 수 있습니다.");
      navigate("/login", { state: { from: `/review/detail/${reviewId}` } });
      return;
    }

    if (loginUserid !== review.userId) {
      alert("작성자만 삭제할 수 있습니다.");
      return;
    }

    if (!window.confirm("리뷰를 삭제할까요?")) return;

    try {
      await reviewApi.delete(review.reviewId, loginUserid);
      alert("삭제되었습니다.");
      gotoList(review);
    } catch (err) {
      console.error(err);
      alertServerMessageOr(err, "삭제에 실패했습니다.");
    }
  };

  // ✅ 요약/태그 생성
  const handleAiSummary = async () => {
    if (!reviewId || aiLoading) return;

    setAiLoading(true);
    try {
      const res = await axiosInstance.get(`/review/ai/summary/${reviewId}`);
      setAiSummary(res.data || null);

      // ✅ 태그/요약/키워드가 리뷰에 저장되므로 상세 재조회
      await fetchDetailWithComments(cpage);
    } catch (err) {
      console.error(err);
      alertServerMessageOr(err, "요약 생성에 실패했습니다.");
    } finally {
      setAiLoading(false);
    }
  };

  // ✅ 번역 호출 (저장 X)
  const fetchTranslate = useCallback(
    async (lang) => {
      if (!reviewId || transLoading) return;

      setTransLoading(true);
      try {
        const res = await axiosInstance.get(`/review/ai/translate/${reviewId}`, {
          params: { targetLang: lang },
        });

        const norm = normalizeTranslate(res.data);

        if (!norm || (!norm.translatedPlaceName && !norm.translatedContent)) {
          setTranslated(null);
          setShowTranslated(false);
          alert("번역 결과가 비어있어요. (OPENAI KEY / 서버 응답 확인)");
          return;
        }

        setTranslated(norm);
        setShowTranslated(true);
      } catch (err) {
        console.error(err);
        setTranslated(null);
        setShowTranslated(false);
        alertServerMessageOr(err, "번역에 실패했습니다.");
      } finally {
        setTransLoading(false);
      }
    },
    [reviewId, transLoading]
  );

  const handleToggleTranslate = async () => {
    if (translated && !transLoading) {
      setShowTranslated((v) => !v);
      return;
    }
    await fetchTranslate(translateLang);
  };

  const handleChangeLang = async (e) => {
    const lang = e.target.value;
    setTranslateLang(lang);

    if (showTranslated) {
      await fetchTranslate(lang);
    } else {
      setTranslated(null);
    }
  };

  // ✅ reviewId 바뀌면 번역 상태 초기화
  useEffect(() => {
    setTranslated(null);
    setShowTranslated(false);
    setTransLoading(false);
  }, [reviewId]);

  // =========================
  // ✅ 댓글 기능
  // =========================
  const canWriteComment = Boolean(isLogin && loginUserid);

  const handleCreateComment = async () => {
    const content = commentText.trim();
    if (!content) return;

    if (!canWriteComment) {
      alert("로그인 후 댓글을 작성할 수 있습니다.");
      navigate("/login", { state: { from: `/review/detail/${reviewId}` } });
      return;
    }

    setCommentBusy(true);
    try {
      await axiosInstance.post(`/review/${reviewId}/comment`, {
        userId: loginUserid,
        content,
      });

      setCommentText("");
      await fetchDetailWithComments(cpage);
    } catch (err) {
      console.error(err);
      alertServerMessageOr(err, "댓글 작성에 실패했습니다.");
    } finally {
      setCommentBusy(false);
    }
  };

  const handleDeleteComment = async (commentId, commentUserId, isDeleted) => {
    if (isDeleted === 1) return;

    if (!canWriteComment) {
      alert("로그인 후 삭제할 수 있습니다.");
      navigate("/login", { state: { from: `/review/detail/${reviewId}` } });
      return;
    }

    if (loginUserid !== commentUserId) {
      alert("작성자만 삭제할 수 있습니다.");
      return;
    }

    if (!window.confirm("댓글을 삭제할까요?")) return;

    setCommentBusy(true);
    try {
      await axiosInstance.delete(`/review/comment/${commentId}`, {
        params: { userId: loginUserid },
      });
      await fetchDetailWithComments(cpage);
    } catch (err) {
      console.error(err);
      alertServerMessageOr(err, "댓글 삭제에 실패했습니다.");
    } finally {
      setCommentBusy(false);
    }
  };

  const handleToggleCommentLike = async (commentId, isDeleted) => {
    if (isDeleted === 1) return;

    if (!canWriteComment) {
      alert("로그인 후 좋아요를 누를 수 있습니다.");
      navigate("/login", { state: { from: `/review/detail/${reviewId}` } });
      return;
    }

    // ✅ 낙관적 업데이트
    setComments((prev) =>
      prev.map((c) => {
        if (c.commentId !== commentId) return c;
        const liked = !c.likedByMe;
        const likeCount = Math.max(0, (c.likeCount || 0) + (liked ? 1 : -1));
        return { ...c, likedByMe: liked, likeCount };
      })
    );

    try {
      const res = await axiosInstance.post(`/review/comment/${commentId}/like`, null, {
        params: { userId: loginUserid },
      });

      const { liked, likeCount } = res.data || {};
      setComments((prev) =>
        prev.map((c) =>
          c.commentId === commentId ? { ...c, likedByMe: !!liked, likeCount: likeCount ?? c.likeCount } : c
        )
      );
    } catch (err) {
      console.error(err);
      await fetchDetailWithComments(cpage);
      alertServerMessageOr(err, "좋아요 처리에 실패했습니다.");
    }
  };

  const goPrevComments = () => {
    if (cpage <= 0) return;
    fetchDetailWithComments(cpage - 1);
  };

  const goNextComments = () => {
    if (cpage + 1 >= commentTotalPages) return;
    fetchDetailWithComments(cpage + 1);
  };

  // =========================
  // ✅ 신고 기능
  // =========================
  const requireLoginOrGo = () => {
    if (isLogin && loginUserid) return true;
    alert("로그인 후 이용할 수 있습니다.");
    navigate("/login", { state: { from: `/review/detail/${reviewId}` } });
    return false;
  };

  const openReviewReport = () => {
    if (!requireLoginOrGo()) return;
    setReportTarget({ type: "review", id: Number(reviewId), label: "리뷰" });
    setReportCategory("SPAM");
    setReportReason("");
    setReportEvidenceUrl("");
    setReportOpen(true);
  };

  const openCommentReport = (commentId) => {
    if (!requireLoginOrGo()) return;
    setReportTarget({ type: "comment", id: commentId, label: `댓글 #${commentId}` });
    setReportCategory("SPAM");
    setReportReason("");
    setReportEvidenceUrl("");
    setReportOpen(true);
  };

  const closeReport = () => {
    if (reportBusy) return;
    setReportOpen(false);
    setReportTarget(null);
  };

  const submitReport = async () => {
    if (!reportTarget) return;
    if (!requireLoginOrGo()) return;

    const reason = reportReason.trim();
    if (!reason) {
      alert("신고 사유를 입력해 주세요.");
      return;
    }

    setReportBusy(true);
    try {
      if (reportTarget.type === "review") {
        await axiosInstance.post("/reports/reviews", {
          reporterId: loginUserid,
          reviewId: Number(reviewId),
          reportCategory,
          reason,
          evidenceUrl: reportEvidenceUrl?.trim() || null,
        });
      } else {
        await axiosInstance.post("/reports/review-comments", {
          reporterId: loginUserid,
          commentId: reportTarget.id,
          reportCategory,
          reason,
          evidenceUrl: reportEvidenceUrl?.trim() || null,
        });
      }

      alert("신고가 접수되었습니다.");
      closeReport();
    } catch (err) {
      console.error(err);
      alertServerMessageOr(err, "신고 접수에 실패했습니다.");
    } finally {
      setReportBusy(false);
    }
  };

  // =========================
  // 렌더링
  // =========================
  if (loading) return <p>로딩 중...</p>;
  if (!review) return null;

  const isTranslatedReady =
    showTranslated &&
    translated &&
    (translated.translatedContent || translated.translatedPlaceName);

  const shownPlaceName =
    isTranslatedReady && translated.translatedPlaceName
      ? translated.translatedPlaceName
      : review.placeName;

  const shownContent =
    isTranslatedReady && translated.translatedContent
      ? translated.translatedContent
      : review.content;

  return (
    <div className="review-detail">
      <h2>리뷰 상세</h2>

      <div className="review-box">
        <p className="review-place">
          📍 {review.city} {review.district} · {shownPlaceName}
        </p>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <p className="review-rating" style={{ margin: 0 }}>⭐ {review.rating}</p>

          {/* ✅ 리뷰 신고 버튼 */}
          <button
            className="btn-outline"
            onClick={openReviewReport}
            title="부적절한 리뷰를 신고합니다"
            style={{ padding: "8px 12px", borderRadius: 10 }}
          >
            🚨 신고
          </button>
        </div>

        {/* ✅ 번역 컨트롤 */}
        <div className="review-translate-bar">
          <select
            className="translate-select"
            value={translateLang}
            onChange={handleChangeLang}
            disabled={transLoading}
          >
            <option value="en">영어</option>
            <option value="ja">일본어</option>
            <option value="zh">중국어</option>
            <option value="zh-Hans">중국어(간체)</option>
            <option value="zh-Hant">중국어(번체)</option>
            <option value="es">스페인어</option>
            <option value="fr">프랑스어</option>
            <option value="de">독일어</option>
            <option value="vi">베트남어</option>
            <option value="th">태국어</option>
          </select>

          <button
            className="btn-outline"
            onClick={handleToggleTranslate}
            disabled={transLoading}
            title="번역은 저장되지 않고 화면에만 표시됩니다."
          >
            {transLoading ? "번역 중..." : showTranslated ? "원문 보기" : "번역 보기"}
          </button>

          <span className="translate-hint">* 번역은 저장되지 않습니다.</span>
        </div>

        {/* ✅ 태그 (DTO에 포함된 tags 사용) */}
        <div className="review-tags">
          {tagsLoading ? (
            <span className="tag-loading">태그 불러오는 중...</span>
          ) : tags.length === 0 ? (
            <span className="tag-empty">태그 없음</span>
          ) : (
            tags.map((t, idx) => (
              <span key={`${t.tagType}-${t.tagValue}-${idx}`} className="tag-chip">
                {t.tagType} · {t.tagValue}
              </span>
            ))
          )}
        </div>

        <p className="review-content">{shownContent}</p>

        <p className="review-user">작성자 · {review.userId}</p>

        {/* ✅ AI 박스 */}
        <div className="review-ai-box">
          <div className="review-ai-header">
            <span className="review-ai-title">🤖 AI 요약/하이라이트</span>

            <div className="review-ai-actions">
              <button className="btn-outline" onClick={handleAiSummary} disabled={aiLoading}>
                {aiLoading ? "생성 중..." : "요약/태그 생성"}
              </button>
            </div>
          </div>

          {aiSummary ? (
            <>
              <div className="review-ai-summary">
                <p className="review-ai-line">• {aiSummary.summary1 || "요약 결과가 없습니다."}</p>
              </div>

              <div className="review-ai-keywords">
                <span className="review-ai-subtitle">핵심 키워드</span>
                <div className="review-ai-keyword-chips">
                  {(aiSummary.keywords || []).length === 0 ? (
                    <span className="tag-empty">키워드 없음</span>
                  ) : (
                    aiSummary.keywords.map((k, i) => (
                      <span key={i} className="tag-chip">#{k}</span>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="review-ai-hint">요약/태그 생성 버튼을 눌러주세요.</p>
          )}
        </div>

        {/* ✅ 댓글 섹션 */}
        <div className="review-comment-box" style={{ marginTop: 16 }}>
          <div className="review-comment-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700 }}>댓글</span>
            <span style={{ fontSize: 12, color: "#6b7280" }}>총 {commentTotalElements}개</span>
          </div>

          {/* 댓글 작성 */}
          <div className="review-comment-form" style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <input
              className="comment-input"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={canWriteComment ? "댓글을 입력하세요" : "로그인 후 댓글 작성 가능"}
              disabled={!canWriteComment || commentBusy}
              style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb" }}
            />
            <button
              className="btn-outline"
              onClick={handleCreateComment}
              disabled={!canWriteComment || commentBusy || !commentText.trim()}
            >
              {commentBusy ? "처리 중..." : "등록"}
            </button>
          </div>

          {/* 댓글 리스트 */}
          <div className="review-comment-list" style={{ marginTop: 12 }}>
            {(!comments || comments.length === 0) && (
              <p style={{ color: "#6b7280", marginTop: 10 }}>첫 댓글을 남겨보세요.</p>
            )}

            {comments.map((c) => (
              <div
                key={c.commentId}
                className="review-comment-item"
                style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12, paddingBottom: 12 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>
                    {c.userId}
                    {c.isDeleted === 1 && (
                      <span style={{ marginLeft: 6, color: "#9ca3af" }}>(삭제됨)</span>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <button
                      className="btn-outline"
                      onClick={() => handleToggleCommentLike(c.commentId, c.isDeleted)}
                      disabled={commentBusy || c.isDeleted === 1}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 10,
                        border: "1px solid #e5e7eb",
                        background: c.likedByMe ? "#fee2e2" : "white",
                        fontWeight: 700,
                      }}
                      title="좋아요"
                    >
                      ❤️ {c.likeCount ?? 0}
                    </button>

                    {/* ✅ 댓글 신고 버튼 */}
                    <button
                      className="btn-outline"
                      onClick={() => openCommentReport(c.commentId)}
                      disabled={commentBusy || c.isDeleted === 1}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 10,
                        border: "1px solid #e5e7eb",
                        background: "white",
                        fontWeight: 700,
                      }}
                      title="댓글 신고"
                    >
                      🚨 신고
                    </button>

                    {loginUserid && loginUserid === c.userId && (
                      <button
                        className="btn-danger"
                        onClick={() => handleDeleteComment(c.commentId, c.userId, c.isDeleted)}
                        disabled={commentBusy || c.isDeleted === 1}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 10,
                          border: "1px solid #e5e7eb",
                          background: "white",
                          color: "#ef4444",
                          fontWeight: 700,
                        }}
                        title="삭제"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 6, color: c.isDeleted === 1 ? "#9ca3af" : "#111827" }}>
                  {c.content}
                </div>
              </div>
            ))}
          </div>

          {/* 댓글 페이징 */}
          {commentTotalPages > 1 && (
            <div style={{ marginTop: 10, display: "flex", justifyContent: "center", gap: 10, alignItems: "center" }}>
              <button className="btn-outline" onClick={goPrevComments} disabled={commentBusy || cpage <= 0}>
                이전
              </button>
              <span style={{ fontSize: 12, color: "#6b7280" }}>
                {cpage + 1} / {commentTotalPages}
              </span>
              <button
                className="btn-outline"
                onClick={goNextComments}
                disabled={commentBusy || cpage + 1 >= commentTotalPages}
              >
                다음
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="review-actions">
        <button className="btn-outline" onClick={handleUpdate}>수정</button>
        <button className="btn-danger" onClick={handleDelete}>삭제</button>
        <button className="btn-outline" onClick={() => gotoList(review)}>목록</button>
      </div>

      {!canEdit && <p className="review-permission-hint">* 수정/삭제는 작성자만 가능합니다.</p>}

      {/* =========================
          ✅ 신고 모달 (리뷰/댓글 공통)
         ========================= */}
      {reportOpen && reportTarget && (
        <div
          className="modal-backdrop"
          onClick={closeReport}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 100%)",
              background: "white",
              borderRadius: 16,
              padding: 16,
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>
                🚨 {reportTarget.label} 신고
              </div>
              <button className="btn-outline" onClick={closeReport} disabled={reportBusy}>
                닫기
              </button>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, color: "#6b7280" }}>카테고리</span>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  disabled={reportBusy}
                  style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
                >
                  <option value="SPAM">스팸/도배</option>
                  <option value="INSULT">욕설/모욕</option>
                  <option value="HATE">혐오/차별</option>
                  <option value="AD">광고/홍보</option>
                  <option value="SEXUAL">음란/성적</option>
                  <option value="VIOLENCE">폭력/위협</option>
                  <option value="ETC">기타</option>
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, color: "#6b7280" }}>신고 사유</span>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  disabled={reportBusy}
                  placeholder="어떤 점이 문제인지 자세히 적어주세요."
                  rows={4}
                  style={{ resize: "vertical", padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, color: "#6b7280" }}>증빙 URL (선택)</span>
                <input
                  value={reportEvidenceUrl}
                  onChange={(e) => setReportEvidenceUrl(e.target.value)}
                  disabled={reportBusy}
                  placeholder="스크린샷 링크 등(선택)"
                  style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
                />
              </label>

              <button
                className="btn-danger"
                onClick={submitReport}
                disabled={reportBusy || !reportReason.trim()}
                style={{ marginTop: 6 }}
              >
                {reportBusy ? "접수 중..." : "신고 접수"}
              </button>

              <div style={{ fontSize: 12, color: "#9ca3af" }}>
                * 허위 신고는 제재될 수 있습니다.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
