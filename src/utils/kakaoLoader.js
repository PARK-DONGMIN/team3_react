// src/utils/kakaoLoader.js
let kakaoPromise = null;

/**
 * Kakao Maps SDK 로딩 완료 보장 (autoload=true/false 모두 대응)
 * - services 필요하면 window.kakao.maps.services 존재까지 보장
 * - 이미 services 없이 로드된 경우: 명확한 에러로 알려줌
 */
export function ensureKakaoLoaded({ requireServices = true } = {}) {
  // 이미 로드되어 있으면 즉시 처리
  if (window.kakao?.maps) {
    // autoload=false면 load 함수가 있고, load로 감싸야 안전
    if (typeof window.kakao.maps.load === "function") {
      return new Promise((resolve, reject) => {
        window.kakao.maps.load(() => {
          if (requireServices && !window.kakao?.maps?.services) {
            reject(
              new Error(
                "Kakao SDK가 services 없이 로드되어 있어요. index.html SDK URL에 libraries=services가 포함되어야 합니다."
              )
            );
            return;
          }
          resolve();
        });
      });
    }

    // autoload=true 케이스
    if (requireServices && !window.kakao?.maps?.services) {
      return Promise.reject(
        new Error("Kakao SDK가 services 없이 로드되어 있어요. libraries=services가 필요합니다.")
      );
    }
    return Promise.resolve();
  }

  // 중복 로딩 방지
  if (kakaoPromise) return kakaoPromise;

  kakaoPromise = new Promise((resolve, reject) => {
    // index.html에 이미 붙어있는 script 기다리기
    const existing =
      document.querySelector('script[data-kakao-sdk="true"]') ||
      document.querySelector('script[src*="dapi.kakao.com/v2/maps/sdk.js"]');

    const finish = () => {
      if (!window.kakao?.maps) {
        reject(new Error("Kakao SDK 로드 실패 (window.kakao.maps 없음)"));
        return;
      }

      // autoload=false면 load로 감싸기
      if (typeof window.kakao.maps.load === "function") {
        window.kakao.maps.load(() => {
          if (requireServices && !window.kakao?.maps?.services) {
            reject(
              new Error(
                "Kakao SDK가 services 없이 로드되어 있어요. libraries=services가 필요합니다."
              )
            );
            return;
          }
          resolve();
        });
      } else {
        if (requireServices && !window.kakao?.maps?.services) {
          reject(new Error("Kakao SDK가 services 없이 로드되어 있어요. libraries=services가 필요합니다."));
          return;
        }
        resolve();
      }
    };

    if (existing) {
      // 이미 로드 완료했을 수도 있음
      setTimeout(() => {
        if (window.kakao?.maps) finish();
      }, 0);

      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", () => reject(new Error("Kakao SDK script 로드 실패")), { once: true });
      return;
    }

    // (혹시 index.html에서 제거했을 때) 동적 삽입 fallback
    const key = import.meta.env.VITE_KAKAO_MAP_KEY;
    if (!key) {
      reject(new Error("VITE_KAKAO_MAP_KEY 가 없습니다. .env에 카카오 JavaScript 키를 넣어주세요."));
      return;
    }

    const script = document.createElement("script");
    script.dataset.kakaoSdk = "true";
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false&libraries=services`;
    script.onload = finish;
    script.onerror = () => reject(new Error("Kakao SDK script 로드 실패"));
    document.head.appendChild(script);
  });

  return kakaoPromise;
}
