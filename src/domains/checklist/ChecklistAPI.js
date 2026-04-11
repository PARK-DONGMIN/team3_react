// src/domains/checklist/ChecklistAPI.js
import api from "../../api/axios";

/* =====================
   체크리스트 마스터
===================== */
export const getChecklistItems = async () => {
  const res = await api.get("/checklist/find_all");
  return res.data;
};

/* =====================
   🔥 CHECKLIST_USER 전체 조회 (목록용)
===================== */
export const getChecklistUserAll = async () => {
  const res = await api.get("/checklist_user/all");
  return res.data;
};

/* =====================
   🔥 특정 사용자 + 특정 여행(batch) 체크 조회
===================== */
export const getUserCheckedItems = async (userNo, batchId) => {
  const url = batchId
    ? `/checklist_user/user/${userNo}/${batchId}`
    : `/checklist_user/user/${userNo}`;

  const res = await api.get(url);
  return res.data;
};

/* =====================
   🔥 체크 토글
   (서버가 @RequestParam 방식)
===================== */
export const toggleChecklist = async (userNo, itemId, batchId) => {
  const params = { userNo, itemId };
  if (batchId) params.batchId = batchId;

  const res = await api.post("/checklist_user/toggle", null, { params });
  return res.data; // "checked" | "unchecked"
};
