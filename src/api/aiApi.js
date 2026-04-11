import axios from "axios";
import axiosInstance from "./axios";

const api = axios.create({
  baseURL: "http://121.160.42.71:9100",
  withCredentials: true,
});

export const aiApi = {
  summary: (scheduleId, force = 0) =>
    api
      .post(`/api/ai/schedules/${scheduleId}/summary`, null, { params: { force } })
      .then((r) => r.data),

  hashtags: (scheduleId, force = 0) =>
    api
      .post(`/api/ai/schedules/${scheduleId}/hashtags`, null, { params: { force } })
      .then((r) => r.data),

  dayHighlights: (scheduleId, force = 0) =>
    api
      .post(`/api/ai/schedules/${scheduleId}/day-highlights`, null, { params: { force } })
      .then((r) => r.data),
      
    // ✅ NEW: 준비물/주의사항
  prep: (scheduleId, force = 0) =>
    axiosInstance
      .post(`/api/ai/schedules/${scheduleId}/prep`, null, { params: { force } })
      .then((r) => r.data),

  chat: (scheduleId, payload) =>
    api.post(`/api/ai/schedules/${scheduleId}/chat`, payload).then((r) => r.data),

  // ✅ 생성 화면용(미리보기): scheduleId 없이 itinerary(JSON)를 보내서 해시태그 받기
  hashtagsPreview: (itinerary, force = 0) =>
    api
      .post(`/api/ai/schedules/preview/hashtags`, itinerary, { params: { force } })
      .then((r) => r.data),
};
