// src/api/placesMetaApi.js
import axiosInstance from "./axios";

const isNotFound = (e) => e?.response?.status === 404;
const isServerError = (e) => {
  const s = e?.response?.status;
  return s >= 500 && s < 600;
};

// ✅ description (sourceId로 조회)
export async function fetchPlaceDescBySourceId(sourceId) {
  try {
    const { data } = await axiosInstance.get(`/places/description/source/${sourceId}`);
    return data ?? null;
  } catch (e) {
    // 설명 데이터가 없거나(404), 서버가 에러(500)면 -> "설명 없음"으로 취급
    if (isNotFound(e) || isServerError(e)) return null;
    // 그 외(권한/네트워크 등)는 원인 파악을 위해 다시 throw
    throw e;
  }
}

// ✅ tags (sourceId로 조회)
export async function fetchPlaceTagsBySourceId(sourceId) {
  try {
    const { data } = await axiosInstance.get(`/places/tags/source/${sourceId}`);
    // 기대 포맷: { placeId: ..., tags: [...] }
    if (data && Array.isArray(data.tags)) return data;
    // 혹시 백엔드가 배열만 주는 경우도 방어
    if (Array.isArray(data)) return { placeId: null, tags: data };
    return { placeId: null, tags: [] };
  } catch (e) {
    if (isNotFound(e) || isServerError(e)) {
      return { placeId: null, tags: [] };
    }
    throw e;
  }
}
