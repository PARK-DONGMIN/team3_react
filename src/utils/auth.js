// src/utils/auth.js
export function getLoginUser() {
  const raw = localStorage.getItem("loginUser");
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    // 혹시 이중 JSON 문자열로 저장된 경우 대비
    if (typeof parsed === "string") {
      return JSON.parse(parsed);
    }

    return parsed;
  } catch (e) {
    console.error("loginUser parse error:", e, raw);
    return null;
  }
}

export function getLoginUserId() {
  const user = getLoginUser();
  if (!user) return null;

  return user.userId || user.userid || user.id || user.user_id || null;
}

/** ✅ 공동편집/권한용: 로그인 유저의 userNo(PK) 가져오기 */
export function getLoginUserNo() {
  const user = getLoginUser();

  // 1) loginUser 객체에서 먼저 찾기
  const candidate =
    user?.userNo ??
    user?.userno ??
    user?.user_no ??
    user?.USER_NO ??
    user?.USERNO;

  const n1 = Number(candidate || 0);
  if (Number.isFinite(n1) && n1 > 0) return n1;

  // 2) localStorage fallback (RequireAuth랑 동일 키)
  const raw =
    localStorage.getItem("userNo") ||
    localStorage.getItem("userno") ||
    localStorage.getItem("user_no");

  const n2 = Number(raw || 0);
  if (Number.isFinite(n2) && n2 > 0) return n2;

  return 0;
}
