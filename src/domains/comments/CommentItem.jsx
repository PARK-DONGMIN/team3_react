import { useEffect, useState } from "react";
import { useUserStore } from "../../store/store";
import CommentForm from "./CommentForm";
import { commentsApi } from "../../api/commentsApi";
import axiosInstance from "../../api/axios";

const CommentItem = ({ comment, replies = [], depth = 0, onReload }) => {
  const [showReply, setShowReply] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [saving, setSaving] = useState(false);

  const loginUserId = useUserStore((state) => state.userid);
  const grade = useUserStore((state) => state.grade);

  const isOwner = loginUserId === comment.userId;
  const isAdmin = Number(grade) === 2;

  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);

  const loadLikes = async () => {
    try {
      const countRes = await axiosInstance.get(
        `/comment-reactions/count/${comment.commentId}`
      );
      setLikeCount(countRes.data);

      if (loginUserId) {
        const checkRes = await axiosInstance.get(
          `/comment-reactions/check`,
          {
            params: { userId: loginUserId, commentId: comment.commentId }
          }
        );
        setLiked(checkRes.data);
      }
    } catch (e) {
      console.error("좋아요 상태 불러오기 실패", e);
    }
  };

  useEffect(() => {
    loadLikes();
  }, [comment.commentId, loginUserId]);


  const toggleLike = async () => {
    if (!loginUserId) {
      alert("로그인이 필요합니다.");
      return;
    }

    try {
      const res = await axiosInstance.post("/comment-reactions/toggle", {
        userId: loginUserId,
        commentId: comment.commentId
      });

      if (res.data === "LIKED") {
        setLiked(true);
        setLikeCount((prev) => prev + 1);
      } else {
        setLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
      }

    } catch (e) {
      console.error(e);
      alert("좋아요 처리 실패");
    }
  };


  const formatRelativeTime = (dateString) => {
    if (!dateString) return "";
    const now = new Date();
    const date = new Date(dateString);
    const diff = (now - date) / 1000;

    if (diff < 60) return "방금 전";
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    if (diff < 172800) return "어제";
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;

    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };


  const remove = async () => {
    if (!window.confirm("댓글을 삭제할까요?")) return;

    try {
      setDeleting(true);

      if (isAdmin) {
        await commentsApi.adminRemove(comment.commentId, loginUserId, grade);
      } else {
        await commentsApi.remove(comment.commentId);
      }

      onReload();
    } catch (e) {
      console.error(e);
      alert("삭제 실패");
    } finally {
      setDeleting(false);
    }
  };


  /* =====================
        🔥 수정 저장
  ===================== */
  const saveEdit = async () => {
    if (!editContent.trim()) {
      alert("내용을 입력하세요");
      return;
    }

    try {
      setSaving(true);

      await commentsApi.update(comment.commentId, {
        content: editContent,
        userId: loginUserId    // ⭐⭐ 중요: 세션 대신 ID 전달
      });

      setEditing(false);
      onReload();
    } catch (e) {
      console.error(e);
      alert("수정 실패");
    } finally {
      setSaving(false);
    }
  };


  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState({
    reportCategory: "욕설",
    reason: "",
    evidenceUrl: ""
  });

  const submitReport = async () => {
    if (!loginUserId) {
      alert("로그인이 필요합니다");
      return;
    }

    if (!report.reason.trim()) {
      alert("신고 사유를 입력하세요");
      return;
    }

    try {
      await axiosInstance.post("/reports/comments", {
        reporterId: loginUserId,
        reportCategory: report.reportCategory,
        reason: report.reason,
        evidenceUrl: report.evidenceUrl,
        commentId: comment.commentId
      });

      alert("신고가 접수되었습니다.");
      setShowReport(false);
      setReport({ reportCategory: "욕설", reason: "", evidenceUrl: "" });

    } catch (err) {
      console.error(err);
      alert("신고 실패");
    }
  };


  return (
    <div
      style={{
        marginLeft: depth * 24,
        padding: "12px 0",
        borderBottom: depth === 0 ? "1px solid #eee" : "none",
      }}
    >
      <div
        style={{
          background: depth > 0 ? "#f7f7f7" : "transparent",
          padding: depth > 0 ? "10px" : 0,
          borderLeft: depth > 0 ? "3px solid #ccc" : "none",
        }}
      >
        <div style={{ fontSize: 13, color: "#555", display: "flex", gap: 8 }}>
          <strong>{comment.userId}</strong>
          <span style={{ color: "#888" }}>
            {formatRelativeTime(comment.createdAt)}
          </span>
        </div>

        {!editing ? (
          <div style={{ margin: "6px 0" }}>{comment.content}</div>
        ) : (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
            style={{ width: "100%", resize: "none" }}
          />
        )}

        <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
          <button className="btn btn-sm btn-light" onClick={toggleLike}>
            {liked ? "❤️ 좋아요 취소" : "🤍 좋아요"}
          </button>

          <span style={{ fontSize: 13, color: "#555" }}>
            좋아요 {likeCount}
          </span>

          <button
            className="btn btn-sm btn-light"
            onClick={() => setShowReply(!showReply)}
          >
            답글
          </button>

          {!editing && (
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={() => setShowReport(true)}
            >
              신고
            </button>
          )}

          {(isOwner || isAdmin) && !editing && (
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setEditing(true)}
            >
              수정
            </button>
          )}

          {editing && (
            <>
              <button
                className="btn btn-sm btn-primary"
                onClick={saveEdit}
                disabled={saving}
              >
                {saving ? "저장 중..." : "저장"}
              </button>
              <button
                className="btn btn-sm btn-light"
                onClick={() => {
                  setEditing(false);
                  setEditContent(comment.content);
                }}
              >
                취소
              </button>
            </>
          )}

          {(isOwner || isAdmin) && !editing && (
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={remove}
              disabled={deleting}
            >
              {deleting ? "삭제 중..." : "삭제"}
            </button>
          )}
        </div>
      </div>


      {showReply && (
        <div style={{ marginTop: 8 }}>
          <CommentForm
            postId={comment.postId}
            parentCommentId={comment.commentId}
            onSuccess={() => {
              setShowReply(false);
              onReload();
            }}
          />
        </div>
      )}

      {replies.map((reply) => (
        <CommentItem
          key={reply.commentId}
          comment={reply}
          replies={reply.replies || []}
          depth={depth + 1}
          onReload={onReload}
        />
      ))}

      {showReport && (
        <div style={{
          position: "fixed",
          top: 0, left: 0,
          width: "100%", height: "100%",
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center"
        }}>
          <div style={{
            width: 420,
            background: "#fff",
            padding: 20,
            borderRadius: 8
          }}>
            <h4>댓글 신고하기</h4>

            <label>신고 유형</label>
            <select
              value={report.reportCategory}
              onChange={(e) =>
                setReport({ ...report, reportCategory: e.target.value })
              }
              style={{ width: "100%", marginBottom: 10 }}
            >
              <option value="욕설">욕설</option>
              <option value="도배">도배</option>
              <option value="광고">광고</option>
              <option value="기타">기타</option>
            </select>

            <label>사유</label>
            <textarea
              rows={4}
              style={{ width: "100%" }}
              value={report.reason}
              onChange={(e) =>
                setReport({ ...report, reason: e.target.value })
              }
            />

            <label>증거 URL (선택)</label>
            <input
              style={{ width: "100%" }}
              value={report.evidenceUrl}
              onChange={(e) =>
                setReport({ ...report, evidenceUrl: e.target.value })
              }
            />

            <div style={{ marginTop: 10, textAlign: "right" }}>
              <button onClick={() => setShowReport(false)}>취소</button>
              <button
                style={{ marginLeft: 10, color: "red" }}
                onClick={submitReport}
              >
                신고
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CommentItem;
