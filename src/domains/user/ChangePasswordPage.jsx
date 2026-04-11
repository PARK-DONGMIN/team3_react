import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "../../store/store";
import axiosInstance from "../../api/axios";
import "./ChangePasswordPage.css";

function ChangePasswordPage() {
  const navigate = useNavigate();
  const { userid } = useUserStore();

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (form.newPassword !== form.confirmPassword) {
      alert("새 비밀번호와 확인이 일치하지 않습니다.");
      return;
    }

    axiosInstance
      .post("/user/update_password", {
        userid,
        password: form.currentPassword,
        newPassword: form.newPassword,
      })
      .then((res) => {
        if (res.data === 1) {
          alert("비밀번호가 변경되었습니다.");
          navigate("/mypage");
        } else if (res.data === 2) {
          alert("기존 비밀번호가 일치하지 않습니다.");
        } else {
          alert("비밀번호 변경 실패");
        }
      })
      .catch((err) => {
        console.error(err);
        alert("비밀번호 변경 중 오류가 발생했습니다.");
      });
  };

  return (
    <div className="changepassword-wrapper">
      <div className="changepassword-card">
        <h1 className="changepassword-title">비밀번호 변경</h1>
        <form className="changepassword-form" onSubmit={handleSubmit}>
          <label>현재 비밀번호</label>
          <input
            type="password"
            name="currentPassword"
            value={form.currentPassword}
            onChange={handleChange}
            required
          />

          <label>새 비밀번호</label>
          <input
            type="password"
            name="newPassword"
            value={form.newPassword}
            onChange={handleChange}
            required
          />

          <label>새 비밀번호 확인</label>
          <input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />

          <div className="changepassword-actions">
            
            <button type="submit" className="btn-outline">변경</button>
            <button
              type="button"
              className="btn-outline"
              onClick={() => navigate("/mypage")}
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChangePasswordPage;
