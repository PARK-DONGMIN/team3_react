import api from "../../api/axios";

/* =====================
   설문 목록 조회 (페이징)
===================== */
export const fetchSurveyList = (page = 0, size = 5) =>
  api.get("/api/survey", {
    params: { page, size },
  });

/* =====================
   설문 상세 조회
===================== */
export const fetchSurveyDetail = (surveyId) =>
  api.get(`/api/survey/${surveyId}`);

/* =====================
   설문 제출
===================== */
export const submitSurvey = (data) =>
  api.post("/api/survey/submit", data);

/* =====================
   ⭐ 설문 결과 조회 (분석용)
===================== */
export const fetchSurveyResult = (surveyId) =>
  api.get(`/api/survey/${surveyId}/result`);
