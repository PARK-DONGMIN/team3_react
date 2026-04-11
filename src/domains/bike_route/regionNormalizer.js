// src/domains/bike_route/regionNormalizer.js

// 광역 표준명 맵 (필요시 더 추가)
const PROVINCE_MAP = {
  서울: "서울특별시",
  서울특별시: "서울특별시",

  부산: "부산광역시",
  부산광역시: "부산광역시",

  대구: "대구광역시",
  대구광역시: "대구광역시",

  인천: "인천광역시",
  인천광역시: "인천광역시",

  광주: "광주광역시",
  광주광역시: "광주광역시",

  대전: "대전광역시",
  대전광역시: "대전광역시",

  울산: "울산광역시",
  울산광역시: "울산광역시",

  세종: "세종특별자치시",
  세종특별자치시: "세종특별자치시",

  경기: "경기도",
  경기도: "경기도",

  강원: "강원도",
  강원도: "강원도",
  강원특별자치도: "강원도", // 너희 데이터에 들어올 수 있어서 통일

  충북: "충청북도",
  충청북도: "충청북도",

  충남: "충청남도",
  충청남도: "충청남도",

  전북: "전라북도",
  전라북도: "전라북도",

  전남: "전라남도",
  전라남도: "전라남도",

  경북: "경상북도",
  경상북도: "경상북도",

  경남: "경상남도",
  경상남도: "경상남도",

  제주: "제주특별자치도",
  제주도: "제주특별자치도",
  제주특별자치도: "제주특별자치도",
};

const normalizeToken = (v) =>
  (v ?? "")
    .toString()
    .trim()
    .replace(/\s+/g, "")
    .replace(/특별자치도|특별자치시|광역시|특별시|도$/g, (m) => m); // 형태 유지

// 문자열 어디든 광역 키워드가 들어있으면 잡아냄
export const extractProvince = (route) => {
  const candidates = [
    route?.city,
    route?.region,
    route?.routeName,
  ]
    .filter(Boolean)
    .map((s) => s.toString());

  // 1) 맵에 있는 키가 포함되는지 검사 (길게 매칭 우선)
  const keys = Object.keys(PROVINCE_MAP).sort((a, b) => b.length - a.length);

  for (const text of candidates) {
    const t = normalizeToken(text);
    for (const k of keys) {
      if (t.includes(normalizeToken(k))) return PROVINCE_MAP[k];
    }
  }

  // 2) 못 찾으면 일단 city를 표준화 시도
  const c = normalizeToken(route?.city);
  if (PROVINCE_MAP[c]) return PROVINCE_MAP[c];

  // 3) 최후: region이 광역일 수도
  const r = normalizeToken(route?.region);
  if (PROVINCE_MAP[r]) return PROVINCE_MAP[r];

  return "기타";
};
