import { useState } from "react";
import { commentsApi } from "../../api/commentsApi";
import { useUserStore } from "../../store/store";

const CommentForm = ({ postId, parentCommentId = null, onSuccess }) => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const userId = useUserStore(s => s.userid);
  const isLogin = useUserStore(s => s.isLogin);

  const submit = async () => {
    if (loading) return;

    if (!content.trim()) {
      alert("댓글 내용을 입력하세요");
      return;
    }

    if (!isLogin || !userId) {
      alert("로그인이 필요합니다.");
      return;
    }

    try {
      setLoading(true);

      await commentsApi.create({
        postId,
        parentCommentId,
        content,
        userId   // ⚠ 서버가 요구하는 구조 유지
      });

      setContent("");
      onSuccess?.();

    } catch (e) {
      console.error(e);
      alert("댓글 등록 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="댓글을 입력하세요"
        rows={3}
        style={{ width: "100%", resize: "none" }}
      />

      <div style={{ textAlign: "right", marginTop: 6 }}>
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          style={{
            padding: "8px 18px",
            borderRadius: "999px",
            border: "1px solid #d0d7ff",
            background: loading ? "#adb5ff" : "#4c6ef5",
            color: "white",
            fontSize: "13px",
            fontWeight: "700",
            cursor: loading ? "not-allowed" : "pointer",
            transition: ".2s",
            opacity: loading ? 0.7 : 1
          }}
          onMouseEnter={e => {
            if (loading) return;
            e.target.style.background = "#3b5bdb";
            e.target.style.boxShadow = "0 6px 14px rgba(76,110,245,.35)";
            e.target.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={e => {
            if (loading) return;
            e.target.style.background = "#4c6ef5";
            e.target.style.boxShadow = "none";
            e.target.style.transform = "none";
          }}
        >
          {loading ? "등록 중..." : "댓글 등록"}
        </button>
      </div>
    </div>
  );
};

export default CommentForm;
