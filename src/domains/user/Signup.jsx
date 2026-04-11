import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axios";
import "./Signup.css";

function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    userid: "",
    name: "",          
    email: "",
    password: "",
    passwordConfirm: "",
    nickname: "",
    phone: "",
    birth: "",
    gender: "",
  });

  const [idCheck, setIdCheck] = useState({ checked: false, available: false, message: "" });
  const [nicknameCheck, setNicknameCheck] = useState({ checked: false, available: false, message: "" });
  const [passwordMatch, setPasswordMatch] = useState({ matched: false, checked: false });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    if (name === "userid") setIdCheck({ checked: false, available: false, message: "" });
    if (name === "nickname") setNicknameCheck({ checked: false, available: false, message: "" });

    if (name === "password" || name === "passwordConfirm") {
      const matched = name === "password" ? value === form.passwordConfirm : form.password === value;
      setPasswordMatch({ matched, checked: true });
    }

    setErrors({ ...errors, [name]: "" });
  };

  const checkId = () => {
    if (!form.userid) return;
    axiosInstance.get("/user/check_id", { params: { userid: form.userid } })
      .then(res => {
        if (res.data === 0) setIdCheck({ checked: true, available: true, message: "사용 가능한 아이디입니다." });
        else setIdCheck({ checked: true, available: false, message: "이미 사용 중인 아이디입니다." });
      })
      .catch(() => setIdCheck({ checked: false, available: false, message: "아이디 확인 중 오류 발생" }));
  };

  const checkNickname = () => {
    if (!form.nickname) return;
    axiosInstance.get("/user/check_nickname", { params: { nickname: form.nickname, userno: 0 } })
      .then(res => {
        if (res.data.available) setNicknameCheck({ checked: true, available: true, message: "사용 가능한 닉네임입니다." });
        else setNicknameCheck({ checked: true, available: false, message: "이미 사용 중인 닉네임입니다." });
      })
      .catch(() => setNicknameCheck({ checked: false, available: false, message: "닉네임 확인 중 오류 발생" }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    ["userid","name","email","password","passwordConfirm","nickname","birth","gender"].forEach(field => {
      if (!form[field]) newErrors[field] = "필수 입력입니다.";
    });

    // 이메일 @ 포함 체크
    if (form.email && !form.email.includes("@")) {
      newErrors.email = "유효한 이메일을 입력해주세요. (@ 포함)";
    }

    if (!passwordMatch.matched) newErrors.passwordConfirm = "비밀번호가 일치하지 않습니다.";
    if (!idCheck.checked || !idCheck.available) newErrors.userid = "아이디 중복 확인을 해주세요.";
    if (!nicknameCheck.checked || !nicknameCheck.available) newErrors.nickname = "닉네임 중복 확인을 해주세요.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // 🔥 가입일 추가 (ISO 문자열 형식)
    const formWithCreatedAt = {
      ...form,
      createdat: new Date().toISOString().slice(0, 10),
    };

    axiosInstance.post("/user/save", formWithCreatedAt)
      .then(() => {
        alert("회원가입 완료!");
        navigate("/login");
      })
      .catch(() => alert("회원가입 중 오류가 발생했습니다."));
  };

  return (
    <div className="signup-wrapper">
      <h1 className="signup-title">회원가입</h1>
      <p className="signup-sub">계정을 만들어 여행을 시작하세요.</p>

      <form className="signup-form" onSubmit={handleSubmit}>
        {/* 아이디 */}
        <label>아이디</label>
        <div className="check-wrapper">
          <input name="userid" value={form.userid} onChange={handleChange} />
          <button type="button" onClick={checkId}>중복 확인</button>
        </div>
        {idCheck.checked && <p className={idCheck.available ? "msg-success" : "msg-error"}>{idCheck.message}</p>}
        {errors.userid && <p className="login-error">{errors.userid}</p>}

        {/* 이름 */}
        <label>이름</label>
        <input name="name" value={form.name} onChange={handleChange} />
        {errors.name && <p className="login-error">{errors.name}</p>}

        {/* 닉네임 */}
        <label>닉네임</label>
        <div className="check-wrapper">
          <input name="nickname" value={form.nickname} onChange={handleChange} />
          <button type="button" onClick={checkNickname}>중복 확인</button>
        </div>
        {nicknameCheck.checked && <p className={nicknameCheck.available ? "msg-success" : "msg-error"}>{nicknameCheck.message}</p>}
        {errors.nickname && <p className="login-error">{errors.nickname}</p>}

        {/* 비밀번호 */}
        <label>비밀번호</label>
        <input type="password" name="password" value={form.password} onChange={handleChange} />
        {errors.password && <p className="login-error">{errors.password}</p>}

        {/* 비밀번호 확인 */}
        <label>비밀번호 확인</label>
        <input type="password" name="passwordConfirm" value={form.passwordConfirm} onChange={handleChange} />
        {passwordMatch.checked && <p className={passwordMatch.matched ? "msg-success" : "msg-error"}>{passwordMatch.matched ? "비밀번호가 일치합니다." : "비밀번호가 일치하지 않습니다."}</p>}
        {errors.passwordConfirm && <p className="login-error">{errors.passwordConfirm}</p>}

        {/* 이메일 */}
        <label>이메일</label>
        <input name="email" value={form.email} onChange={handleChange} />
        {errors.email && <p className="login-error">{errors.email}</p>}

        {/* 전화번호 */}
        <label>전화번호</label>
        <input name="phone" value={form.phone} onChange={handleChange} placeholder="- 제외하고 입력해주세요." />

        {/* 생년월일 */}
        <label>생년월일</label>
        <input type="date" name="birth" value={form.birth} onChange={handleChange} />
        {errors.birth && <p className="login-error">{errors.birth}</p>}

        {/* 성별 */}
        <label>성별</label>
        <div className="gender-toggle">
          <button type="button" className={form.gender === "남" ? "selected" : ""} onClick={() => setForm({ ...form, gender: "남" })}>남</button>
          <button type="button" className={form.gender === "여" ? "selected" : ""} onClick={() => setForm({ ...form, gender: "여" })}>여</button>
        </div>
        {errors.gender && <p className="login-error">{errors.gender}</p>}

        <button type="submit" className="signup-submit">회원가입</button>
      </form>
    </div>
  );
}

export default Signup;
