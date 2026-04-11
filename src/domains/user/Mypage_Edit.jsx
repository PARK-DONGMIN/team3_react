import "./EditPage.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "../../store/store";
import axiosInstance from "../../api/axios";

function EditPage() {
  const navigate = useNavigate();

  const {
    isLogin,
    userno,
    userid,
    name,          // ✅ 이름 추가
    email,
    nickname,
    phone,
    birth,
    gender,
    createdat,
    grade,
    setUserInfo,
  } = useUserStore();

  const formattedCreatedAt = createdat ? createdat.split("T")[0] : "";

  const [form, setForm] = useState({
    email: "",
    nickname: "",
    phone: "",
    birth: "",
    gender: "",
  });

  const [nicknameCheck, setNicknameCheck] = useState({
    checked: false,
    available: false,
    message: "",
  });

  /* ===============================
     로그인 체크 + 초기값 세팅
  =============================== */
  useEffect(() => {
    if (!isLogin) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    setForm({
      email: email || "",
      nickname: nickname || "",
      phone: phone || "",
      birth: birth || "",
      gender: gender || "",
    });

    setNicknameCheck({ checked: false, available: false, message: "" });
  }, [isLogin, navigate, email, nickname, phone, birth, gender]);

  /* ===============================
     입력 변경
  =============================== */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    if (name === "nickname") {
      setNicknameCheck({ checked: false, available: false, message: "" });
    }
  };

  /* ===============================
     닉네임 중복 체크
  =============================== */
  const checkNickname = () => {
    if (form.nickname === nickname) {
      setNicknameCheck({
        checked: true,
        available: true,
        message: "기존 닉네임입니다.",
      });
      return;
    }

    axiosInstance
      .get("/user/check_nickname", {
        params: {
          nickname: form.nickname,
          userno: Number(userno),
        },
      })
      .then((res) => {
        if (res.data.available) {
          setNicknameCheck({
            checked: true,
            available: true,
            message: "사용 가능한 닉네임입니다.",
          });
        } else {
          setNicknameCheck({
            checked: true,
            available: false,
            message: "이미 사용 중인 닉네임입니다.",
          });
        }
      })
      .catch(() => {
        setNicknameCheck({
          checked: false,
          available: false,
          message: "중복 체크 오류",
        });
      });
  };

  /* ===============================
     저장
  =============================== */
  const handleSubmit = (e) => {
    e.preventDefault();

    if (
      form.nickname === nickname &&
      form.email === email &&
      form.phone === phone &&
      form.birth === birth &&
      form.gender === gender
    ) {
      alert("변경된 정보가 없습니다.");
      return;
    }

    if (form.nickname !== nickname) {
      if (!nicknameCheck.checked) {
        alert("닉네임 중복 체크를 먼저 해주세요.");
        return;
      }
      if (!nicknameCheck.available) {
        alert("사용할 수 없는 닉네임입니다.");
        return;
      }
    }

    axiosInstance
      .put("/user/update", { userid, ...form })
      .then(() => {
        alert("정보가 수정되었습니다.");

        // ✅ name 유지 필수
        setUserInfo({
          userno: Number(userno),
          userid,
          name,            // 🔥 이름 유지
          email: form.email,
          nickname: form.nickname,
          phone: form.phone,
          birth: form.birth,
          gender: form.gender,
          createdat,
          grade,
        });

        navigate("/mypage");
      })
      .catch(() => {
        alert("수정 중 오류가 발생했습니다.");
      });
  };

  return (
    <div className="editpage-wrapper">
      <div className="editpage-card">
        <h1 className="editpage-title">정보 수정</h1>

        <form className="editpage-form" onSubmit={handleSubmit}>
          {/* 이름 (수정 불가) */}
          <label>이름</label>
          <input value={name || ""} disabled />

          <label>아이디</label>
          <input value={userid || ""} disabled />

          <label>이메일</label>
          <input name="email" value={form.email} onChange={handleChange} />

          <label>닉네임</label>
          <div className="nickname-check-wrapper">
            <input
              name="nickname"
              value={form.nickname}
              onChange={handleChange}
              className="nickname-input"
            />
            <button
              type="button"
              className="btn-outline nickname-btn"
              onClick={checkNickname}
            >
              중복 체크
            </button>
          </div>

          {nicknameCheck.checked && (
            <p className={nicknameCheck.available ? "msg-success" : "msg-error"}>
              {nicknameCheck.message}
            </p>
          )}

          <label>전화번호</label>
          <input name="phone" value={form.phone} onChange={handleChange} />

          <label>생년월일</label>
          <input
            type="date"
            name="birth"
            value={form.birth}
            onChange={handleChange}
          />

          <label>성별</label>
          <div className="gender-toggle">
            <button
              type="button"
              className={form.gender === "남" ? "selected" : ""}
              onClick={() => setForm({ ...form, gender: "남" })}
            >
              남
            </button>
            <button
              type="button"
              className={form.gender === "여" ? "selected" : ""}
              onClick={() => setForm({ ...form, gender: "여" })}
            >
              여
            </button>
          </div>

          <label>가입일</label>
          <input value={formattedCreatedAt} disabled />

          <label>회원 등급</label>
          <input
            value={Number(grade) === 2 ? "관리자" : "일반 회원"}
            disabled
          />

          <div className="editpage-actions">
            <button type="submit" className="btn-outline">
              저장
            </button>
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

export default EditPage;
