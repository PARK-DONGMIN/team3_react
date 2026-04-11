import { useState } from "react";
import axiosInstance from "../../api/axios";
import { useNavigate } from "react-router-dom";
import "./Login.css"; // 로그인 CSS 재사용

function FindId() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [resultId, setResultId] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleFindId = (e) => {
    e.preventDefault();
    setError("");
    setResultId("");

    axiosInstance
      .post("/user/find-id", { name, email })
      .then((res) => {
        setResultId(res.data.userid);
      })
      .catch((err) => {
        setError(
          err.response?.data?.message || "일치하는 회원이 없습니다."
        );
      });
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h1 className="login-title">아이디 찾기</h1>

        <form onSubmit={handleFindId} className="login-form">
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

          {resultId && (
            <p className="login-success">
              회원님의 아이디는 <b>{resultId}</b> 입니다.
            </p>
          )}

          {error && <p className="login-error">{error}</p>}

          <button type="submit">아이디 찾기</button>

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

export default FindId;
