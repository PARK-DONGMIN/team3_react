import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

/** AI 일정 저장 (AI_PLAN) */
export const saveAiPlan = async ({
  batchId,
  userNo,
  requestId,
  region,
  districtJson,
  periodStart,
  periodEnd,
  periodDays,
  resultJson,
}) => {
  const res = await axios.post(`${BASE_URL}/ai_plan/create`, {
    batchId,
    userNo,
    requestId,
    region,
    districtJson,
    periodStart,
    periodEnd,
    periodDays,
    resultJson,
  });
  return res.data;
};

/** 특정 batch의 최신 AI 일정 1건 */
export const getLatestAiPlanByBatch = async (batchId) => {
  const res = await axios.get(`${BASE_URL}/ai_plan/batch/${batchId}/latest`);
  return res.data; // null 가능
};
