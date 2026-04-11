import api from "../../api/axios";

/* 보상 지급 */
export const grantReward = (data) => api.post("/reward/grant", data);

/* 보상 상태 조회 */
export const getRewardStatus = (userNo) =>
  api.get("/reward/status", {
    params: { userNo },
  });

/* ✅ 보상 정의 목록 */
export const getRewardMasters = () => api.get("/reward/master");

/* ✅ 보상 지급 기록 */
export const getRewardLogs = (userNo) =>
  api.get("/reward/log", {
    params: { userNo },
  });
