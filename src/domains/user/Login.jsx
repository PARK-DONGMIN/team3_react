import { useState, useEffect } from "react";
import axiosInstance from "../../api/axios";
import "./Login.css";
import { useNavigate, useLocation } from "react-router-dom";
import { useUserStore } from "../../store/store";

function Login() {
  const [userid, setUserid] = useState("");
  const [password, setPassword] = useState("");
  const [rememberId, setRememberId] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  const setLogin = useUserStore((state) => state.setLogin);
  const setUserInfo = useUserStore((state) => state.setUserInfo);

  const from = location.state?.from || "/";

  // ✅ 페이지 로드 시 저장된 아이디 불러오기
  useEffect(() => {
    const savedId = localStorage.getItem("savedUserId");
    if (savedId) {
      setUserid(savedId);
      setRememberId(true);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    // 🔹 기존 /user/login 대신 /auth/login 사용 (로그인 내역 기록용)
    axiosInstance
      .post("/auth/login", { userid, password })
      .then((res) => {
        const data = res.data;

        // 서버에서 유저 객체를 그대로 반환하므로 cnt 체크는 필요 없음
        if (data && data.userno) {
          setLogin(true);

          setUserInfo({
            userno: data.userno,
            userid: data.userid,
            email: data.email,
            name: data.name,
            nickname: data.nickname,
            phone: data.phone,
            gender: data.gender,
            createdat: data.createdat,
            birth: data.birth,
            grade: data.grade,
          });

          // ✅ 아이디 저장 처리
          if (rememberId) {
            localStorage.setItem("savedUserId", data.userid);
          } else {
            localStorage.removeItem("savedUserId");
          }

          localStorage.setItem("userNo", String(data.userno));
          localStorage.setItem("isLogin", "true");

          navigate(from, { replace: true });
        } else {
          setError("아이디 또는 비밀번호가 틀렸습니다.");
        }
      })
      .catch(() => {
        setError("서버 오류가 발생했습니다.");
      });
  };

  // ✅ 테스트 계정
  const fillTestAccount = () => {
    setUserid("user1");
    setPassword("1234");
    setRememberId(true);
    setError("");
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h1 className="login-title">로그인</h1>

        <form onSubmit={handleSubmit} className="login-form">
          {/* 아이디 */}
          <input
            type="text"
            placeholder="아이디"
            value={userid}
            onChange={(e) => setUserid(e.target.value)}
            required
          />

          {/* 비밀번호 */}
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {/* 아이디 저장 */}
          <label className="remember-id">
            <input
              type="checkbox"
              checked={rememberId}
              onChange={(e) => setRememberId(e.target.checked)}
            />
            <span>아이디 저장</span>
          </label>

          {error && <p className="login-error">{error}</p>}

          {/* 로그인 */}
          <button type="submit">로그인</button>

          {/* 테스트 계정 */}
          <button
            type="button"
            className="test-login-btn"
            onClick={fillTestAccount}
          >
            테스트 계정
          </button>
        </form>

        <div className="login-links">
          <span onClick={() => navigate("/find-id")}>아이디 찾기</span>
          <span onClick={() => navigate("/find-password")}>비밀번호 찾기</span>
          <span onClick={() => navigate("/signup")}>회원가입</span>
        </div>
      </div>
    </div>
  );
}

export default Login;
