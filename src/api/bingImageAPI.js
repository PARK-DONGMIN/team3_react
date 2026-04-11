// /** import axios from "axios"
//  * 호텔 대표 이미지 조회 (Bing 크롤링 서버)
//  */
// export const getHotelImageFromBing = async (name, address = "") => {
//   const res = await axios.get("http://localhost:8000/image", {
//     params: { name, address },
//   });
//   return res.data;
// };

/**
 * 팀원 호환 + 너의 Pexels 버전까지 "하나의 함수"로 통일
 *
 * 우선순위:
 * 1) 로컬 이미지 서버가 살아있으면: http://localhost:8000/image (axios)
 * 2) 아니면: Pexels API (fetch)
 *
 * 반환 형식은 PlacesDetail/PlacesRegion에서 쓰기 쉽게:
 * { success: boolean, imageUrl: string|null }
 */

// src/api/bingImageAPI.js

/**
 * ✅ 이미지 가져오기 유틸 (팀 호환용)
 * - VITE_PEXELS_KEY 있으면: Pexels API로 바로 이미지 가져옴(프론트에서)
 * - 없으면: 로컬 프록시 서버(기본 http://localhost:8000/image)로 fallback
 *
 * 반환 형태는 항상: { success: boolean, imageUrl: string|null }
 */

const PEXELS_SEARCH = "https://api.pexels.com/v1/search";

export async function getHotelImageFromBing(name, area = "") {
  try {
    const q = [name, area].filter(Boolean).join(" ").trim();
    if (!q) return { success: false, imageUrl: null };

    const pexelsKey = import.meta.env.VITE_PEXELS_KEY;

    // ✅ 1) Pexels (키 있으면 이걸 우선)
    if (pexelsKey) {
      const url =
        `${PEXELS_SEARCH}?query=${encodeURIComponent(q)}` +
        `&per_page=1&orientation=landscape&locale=ko-KR`;

      const res = await fetch(url, {
        headers: { Authorization: pexelsKey },
      });

      if (!res.ok) return { success: false, imageUrl: null };

      const data = await res.json();
      const photo = data?.photos?.[0];
      const imageUrl =
        photo?.src?.landscape || photo?.src?.large || photo?.src?.medium || null;

      return { success: Boolean(imageUrl), imageUrl };
    }

    // ✅ 2) 로컬 프록시 서버 fallback (없으면 connection refused 뜸)
    const proxyBase = import.meta.env.VITE_IMAGE_PROXY_BASE || "http://localhost:8000/image";
    const u = new URL(proxyBase);
    u.searchParams.set("name", name);
    u.searchParams.set("address", area);

    const res = await fetch(u.toString());
    if (!res.ok) return { success: false, imageUrl: null };

    const data = await res.json();
    const imageUrl = data?.imageUrl || data?.url || null;

    return { success: Boolean(imageUrl), imageUrl };
  } catch (e) {
    console.error("이미지 조회 실패", e);
    return { success: false, imageUrl: null };
  }
}

// ✅ default import도 호환(팀원이 default로 import하더라도 안 깨짐)
export default getHotelImageFromBing;
