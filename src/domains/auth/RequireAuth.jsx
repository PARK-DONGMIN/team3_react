import { Navigate, useLocation } from "react-router-dom";
import Toast from "../ui/Toast";
import { useUserStore } from "../../store/store";

export default function RequireAuth({ children }) {
  const location = useLocation();

  // ✅ Zustand 상태(로그인 여부)
  const isLogin = useUserStore((s) => s.isLogin);
  const userInfo = useUserStore((s) => s.userInfo);

  // ✅ localStorage도 같이 체크(새로고침 대비)
  const rawUserNo =
    localStorage.getItem("userNo") ||
    localStorage.getItem("userno") ||
    localStorage.getItem("user_no");

  const userNoFromLS = Number(rawUserNo || 0);
  const userNoFromStore = Number(userInfo?.userno || 0);

  const isAuthed =
    Boolean(isLogin) || userNoFromStore > 0 || userNoFromLS > 0;

  if (!isAuthed) {
    const from = location.pathname + location.search;

    return (
      <>
        <Toast message="로그인이 필요합니다." />
        <Navigate to="/login" replace state={{ from }} />
      </>
    );
  }

  return children;
}
