// src/domains/quiz/quizApi.js
import api from "../../api/axios";

/* 사용자 */
export const getQuizByDay = (dayNo) =>
  api.get(`/api/quiz/day/${dayNo}`);

export const solveQuiz = (userId, data) =>
  api.post(`/api/quiz/solve`, data, {
    params: { userId },
  });

export const isTodayQuizCompleted = (userId, dayNo) =>
  api.get(`/api/quiz/completed`, {
    params: { userId, dayNo },
  });

/* ✅ AI 결과 포함: 최신 attempt 조회 */
export const getLatestAttempt = (userId, dayNo, quizId) =>
  api.get(`/api/quiz/attempt/latest`, {
    params: { userId, dayNo, ...(quizId ? { quizId } : {}) },
  });


/* ✅ (선택) attemptId로 단건 조회 */
export const getAttemptById = (attemptId) =>
  api.get(`/api/quiz/attempt/${attemptId}`);

/* 관리자 */
export const getAdminQuizList = () =>
  api.get(`/api/quiz/admin/list`);

export const createQuiz = (data) =>
  api.post(`/api/quiz/admin`, data);

export const updateQuiz = (quizId, data) =>
  api.put(`/api/quiz/admin/${quizId}`, data);

export const deleteQuiz = (quizId) =>
  api.delete(`/api/quiz/admin/${quizId}`);

// ✅ 추천 ids(csv)로 문제 상세 조회
export const getQuizByIds = (ids) =>
  api.get(`/api/quiz/byIds`, {
    params: { ids },
  });

