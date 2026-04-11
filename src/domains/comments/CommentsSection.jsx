import { useEffect, useState } from "react";
import { commentsApi } from "../../api/commentsApi";
import CommentForm from "./CommentForm";
import CommentItem from "./CommentItem";

const CommentsSection = ({ postId }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  // ⭐ 정렬 상태 (기본 oldest)
  const [sort, setSort] = useState("oldest");

  const loadComments = async () => {
    try {
      setLoading(true);

      // 댓글 정렬 방식에 맞춰서 로드
      const res = await commentsApi.listTree(postId, sort);
      setComments(res.data);

    } catch (err) {
      console.error("댓글 불러오기 실패", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (postId) loadComments();
  }, [postId, sort]);  // ⭐ 정렬 바뀌면 자동 reload

  /* ======================
      부모 / 자식 분리
  ====================== */
  const parents = comments.filter(c => !c.parentCommentId);
  const childrenMap = {};
  comments
    .filter(c => c.parentCommentId)
    .forEach(c => {
      if (!childrenMap[c.parentCommentId]) {
        childrenMap[c.parentCommentId] = [];
      }
      childrenMap[c.parentCommentId].push(c);
    });

  const visibleParents = showAll ? parents : parents.slice(0, 10);

  return (
    <div style={{ marginTop: 30 }}>
      <h3>
        댓글 {comments.length}
      </h3>

      {/* ⭐ 정렬 드롭다운 */}
      <div style={{ marginBottom: 10, display: "flex", gap: 8 }}>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #ddd' }}
        >
          <option value="oldest">등록순</option>
          <option value="latest">최신순</option>
          <option value="likes">좋아요순</option>
        </select>
      </div>

      <CommentForm postId={postId} onSuccess={loadComments} />

      {loading && <p>불러오는 중...</p>}

      {!loading && parents.length === 0 && (
        <p>아직 댓글이 없습니다.</p>
      )}

      {!loading &&
        visibleParents.map(parent => (
          <CommentItem
            key={parent.commentId}
            comment={parent}
            replies={childrenMap[parent.commentId] || []}
            onReload={loadComments}
          />
        ))
      }

      {/* 🔥 댓글 접기 / 펼치기 */}
      {parents.length > 10 && (
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <button
            className="btn btn-sm btn-light"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "댓글 접기 ▲" : "댓글 더보기 ▼"}
          </button>
        </div>
      )}
    </div>
  );
};

export default CommentsSection;
