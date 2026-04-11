// src/domains/checklist/checklistApi.js
import api from "../../api/axios";

/* =====================
   체크리스트 전체 조회
===================== */
export const getChecklistItems = async () => {
  const res = await api.get("/checklist/find_all");
  return res.data;
};

/* =====================
   유저 체크된 항목 조회
===================== */
export const getUserCheckedItems = async (userNo) => {
  const res = await api.get(`/checklist_user/user/${userNo}`);
  return res.data;
};

/* =====================
   체크 토글
   (서버가 @RequestParam 이므로 쿼리스트링 유지)
===================== */
export const toggleChecklist = async (userNo, itemId) => {
  const res = await api.post(
    `/checklist_user/toggle?userNo=${userNo}&itemId=${itemId}`
  );
  return res.data; // "checked" | "unchecked"
};
