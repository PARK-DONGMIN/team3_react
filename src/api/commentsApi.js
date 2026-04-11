// src/api/commentsApi.js
import axiosInstance from "./axios";

export const commentsApi = {

  /* =========================================================
     🔥 트리 목록 + 정렬 옵션 지원
     ---------------------------------------------------------
     sort 옵션:
     - undefined  → 기본 (oldest)
     - latest     → 최신순
     - likes      → 좋아요 많은 순
  ========================================================= */
  listTree(postId, sort) {
    return axiosInstance.get(`/comments/list/tree/${postId}`, {
      params: sort ? { sort } : {}
    });
  },

  // 댓글/대댓글 등록
  create({ postId, parentCommentId = null, content, imageUrl = null, userId }) {
    return axiosInstance.post("/comments/create", {
      postId,
      parentCommentId,
      content,
      imageUrl,
      userId,   // ⭐ 반드시 포함!
    });
  },

  // 수정
update(commentId, { content, imageUrl = null, userId }) {
  return axiosInstance.post(`/comments/update/${commentId}`, {
    content,
    imageUrl,
    userId,
  });
},


  // 삭제(작성자)
  remove(commentId) {
    return axiosInstance.delete(`/comments/delete/${commentId}`);
  },

  // 관리자 삭제
  adminRemove(commentId, requestUserId, requestUserGrade) {
    return axiosInstance.delete(`/comments/admin/delete/${commentId}`, {
      params: { requestUserId, requestUserGrade },
    });
  },

  // 관리자: 게시글 댓글 전체 삭제
  adminRemoveAllByPost(postId, requestUserId, requestUserGrade) {
    return axiosInstance.delete(
      `/comments/admin/delete-all-by-post/${postId}`,
      {
        params: { requestUserId, requestUserGrade },
      }
    );
  },
};
