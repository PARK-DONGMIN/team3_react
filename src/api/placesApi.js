// src/api/placesApi.js
import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  // ✅ 세션/쿠키 기반이면 켜기 (JWT Bearer면 필요없음)
  // withCredentials: true,
});

export async function getPlaceDetailBySource(kakaoId) {
  const res = await api.get(`/places/source/kakao/${kakaoId}`);
  return res.data;
}

export async function upsertPlace(payload) {
  const fixed = {
    ...payload,
    placeId: payload?.placeId != null ? Number(payload.placeId) : payload?.placeId,
  };

  try {
    const res = await api.post(`/places/upsert`, fixed);
    return res.data;
  } catch (e) {
    console.log("STATUS", e?.response?.status);
    console.log("DATA", e?.response?.data);
    console.log("SENT", fixed);
    throw e;
  }
}
