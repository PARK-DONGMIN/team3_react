import { useState } from "react";
import axiosInstance from "../../api/axios";
import { useNavigate } from "react-router-dom";
import "./Login.css"; // 기존 로그인 CSS 재사용

function FindPassword() {
  const [userid, setUserid] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleFindPassword = (e) => {
    e.preventDefault();
    setSuccess("");
    setError("");

    axiosInstance
      .post("/user/find-password", {
        userid,
        name,
        email,
        phone,
      })
      .then((res) => {
        setSuccess(res.data.message);
      })
      .catch((err) => {
        setError(
          err.response?.data?.message || "입력한 정보와 일치하는 회원이 없습니다."
        );
      });
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h1 className="login-title">비밀번호 찾기</h1>

        <form onSubmit={handleFindPassword} className="login-form">
          <input
            type="text"
            placeholder="아이디"
            value={userid}
            onChange={(e) => setUserid(e.target.value)}
            required
          />

          <input
            type="text"
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="text"
            placeholder="전화번호 - 제외하고 입력해주세요"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          {success && <p className="login-success">{success}</p>}
          {error && <p className="login-error">{error}</p>}

          <button type="submit">임시 비밀번호 발급</button>

          <button
            type="button"
            className="test-login-btn"
            onClick={() => navigate("/login")}
          >
            로그인으로 돌아가기
          </button>
        </form>
      </div>
    </div>
  );
}

export default FindPassword;
