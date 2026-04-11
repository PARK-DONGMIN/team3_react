import "./MyPage.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "../../store/store";
import axiosInstance from "../../api/axios";
import LoginHistoryList from "../../domains/user/LoginHistoryList";

function MyPage() {
  const {
    isLogin,
    userid,
    name,
    email,
    nickname,
    profileimage,
    phone,
    birth,
    gender,
    createdat,
    grade,
    logout,
    setProfileImage, // 프로필 이미지 상태 변경
  } = useUserStore();

  const navigate = useNavigate();
  const [loginSummary, setLoginSummary] = useState("불러오는 중...");
  const [newProfileFile, setNewProfileFile] = useState(null);
  const [imageKey, setImageKey] = useState(Date.now());

  // ================= AI 이미지 관련 =================
  const [prompt, setPrompt] = useState("");
  const [aiImageUrl, setAiImageUrl] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [errorAI, setErrorAI] = useState("");

  // ✅ 로그인 여부 체크
  useEffect(() => {
    if (!isLogin) {
      alert("로그인이 필요합니다.");
      navigate("/login");
    }
  }, [isLogin, navigate]);

  // ✅ 서버에서 사용자 정보 가져오기
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axiosInstance.get(`/user/read/${useUserStore.getState().userno}`);
        const dbProfileImage = res.data.profileimage || "/images/기본이미지.jpg";
        const fullImageUrl = dbProfileImage.startsWith("http")
          ? dbProfileImage
          : `http://121.160.42.12:9100${dbProfileImage}`;
        setProfileImage(fullImageUrl);
        setImageKey(Date.now());
      } catch (err) {
        console.error("프로필 이미지 로딩 오류:", err);
        setProfileImage("http://121.160.42.12:9100/images/기본이미지.jpg");
      }
    };

    if (isLogin) fetchUser();
  }, [isLogin, setProfileImage]);

  // ✅ 로그인 요약 가져오기
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await axiosInstance.get("/login-history/summary");
        setLoginSummary(res.data.summary);
      } catch (err) {
        console.error(err);
        setLoginSummary("로그인 요약 정보를 불러올 수 없습니다.");
      }
    };
    fetchSummary();
  }, []);

  if (!isLogin) return null;

  const formatPhoneNumber = (phone) => {
    if (!phone) return "-";
    const match = phone.match(/^(\d{3})(\d{3,4})(\d{4})$/);
    return match ? `${match[1]}-${match[2]}-${match[3]}` : phone;
  };

  // ================= 프로필 이미지 선택 =================
  const onProfileImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setNewProfileFile(file);
  };

  // ================= 프로필 이미지 업로드 =================
  const onProfileImageUpload = async () => {
    if (!newProfileFile) {
      alert("이미지를 선택해주세요.");
      return;
    }

    const ok = window.confirm("선택한 이미지로 변경하시겠습니까?");
    if (!ok) return;

    const formData = new FormData();
    formData.append("file", newProfileFile);
    formData.append("userno", useUserStore.getState().userno);

    try {
      const res = await axiosInstance.post("/user/profile-image/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const fullImageUrl = `http://121.160.42.12:9100${res.data.imageUrl}`;
      setProfileImage(fullImageUrl);
      setNewProfileFile(null);
      setImageKey(Date.now());
      alert("프로필 이미지가 업데이트되었습니다.");
    } catch (err) {
      console.error(err);
      alert("프로필 이미지 업로드 중 오류가 발생했습니다.");
    }
  };

  // ================= 프로필 이미지 삭제 =================
  const onProfileImageDelete = async () => {
    const ok = window.confirm("프로필 이미지를 기본 이미지로 초기화하시겠습니까?");
    if (!ok) return;

    try {
      const res = await axiosInstance.post("/user/profile-image/delete", null, {
        params: { userno: useUserStore.getState().userno },
      });
      const defaultUrl = `http://121.160.42.12:9100/images/기본이미지.jpg`;
      setProfileImage(defaultUrl);
      setImageKey(Date.now());
      alert("프로필 이미지가 기본 이미지로 초기화되었습니다.");
    } catch (err) {
      console.error(err);
      alert("프로필 이미지 삭제 중 오류가 발생했습니다.");
    }
  };

  // ================= AI 이미지 생성 =================
  const handleGenerateAIImage = async () => {
    if (!prompt.trim()) return;
    setLoadingAI(true);
    setErrorAI("");

    try {
      const res = await axiosInstance.post("/user/ai-image", null, { params: { prompt } });
      if (res.data.success) {
        const aiUrl = res.data.imageUrl;
        const fullAiUrl = aiUrl.startsWith("http") ? aiUrl : `http://121.160.42.12:9100${aiUrl}`;
        setAiImageUrl(fullAiUrl);
      } else {
        setErrorAI(res.data.message || "이미지 생성 실패");
      }
    } catch (err) {
      setErrorAI(err.message || "서버 오류");
    }
    setLoadingAI(false);
  };

  // ================= 회원탈퇴 =================
  const onWithdraw = async () => {
    const ok = window.confirm(
      "정말 회원탈퇴 하시겠습니까?\n탈퇴 후에는 복구할 수 없습니다."
    );
    if (!ok) return;

    try {
      await axiosInstance.put("/user/withdraw", { userid });
      alert("회원탈퇴가 완료되었습니다.");
      logout();
      navigate("/login");
    } catch (err) {
      console.error(err);
      alert("회원탈퇴 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="mypage-wrapper">
      <div className="mypage-card">
        <h1 className="mypage-title">마이페이지</h1>
        <p className="mypage-sub">
          나의 여행 정보 · <span className="brand-highlight">TRAVLE_LEAF</span>
        </p>

        {/* ================= 프로필 이미지 ================= */}
        <div className="mypage-profile-image">
          <img
            src={`${profileimage}?t=${imageKey}`}
            alt="프로필"
            style={{ width: "120px", height: "120px", borderRadius: "50%" }}
          />
          <div style={{ marginTop: "10px" }}>
            <input
              type="file"
              accept="image/*"
              onChange={onProfileImageSelect}
              style={{ display: "inline-block", marginRight: "10px" }}
            />
            <button className="btn-outline" onClick={onProfileImageUpload}>
              변경
            </button>
            <button
              className="btn-outline danger"
              onClick={onProfileImageDelete}
              style={{ marginLeft: "10px" }}
            >
              기본 이미지로 초기화
            </button>
          </div>
        </div>

        {/* ================= 회원 정보 ================= */}
        <div className="mypage-info">
          <InfoRow label="이름" value={name} />
          <InfoRow label="아이디" value={userid} />
          <InfoRow label="이메일" value={email} />
          <InfoRow label="닉네임" value={nickname} />
          <InfoRow label="전화번호" value={formatPhoneNumber(phone)} />
          <InfoRow label="생년월일" value={birth} />
          <InfoRow label="성별" value={gender} />
          <InfoRow label="가입일" value={createdat} />
          <InfoRow
            label="회원 등급"
            value={Number(grade) === 2 ? "관리자" : "일반 회원"}
          />
        </div>

        {/* ================= AI 이미지 생성 ================= */}
        <div
          style={{
            marginTop: "20px",
            padding: "16px",
            border: "1px solid #e5e5e5",
            borderRadius: "12px",
            background: "#fff",
          }}
        >
          <h3>🤖 AI 프로필 이미지 생성</h3>
          <p>원하는 프로필 사진을 입력하면 AI가 프로필 이미지를 만들어줍니다.</p>

          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <input
              type="text"
              placeholder="예: 고양이"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              style={{ flex: 1, padding: "8px 10px", borderRadius: "8px", border: "1px solid #ccc" }}
            />
            <button
              className="btn-outline"
              onClick={handleGenerateAIImage}
              disabled={loadingAI}
            >
              {loadingAI ? "생성 중..." : "바로 생성"}
            </button>
          </div>

          {errorAI && <p style={{ color: "red", textAlign: "center" }}>{errorAI}</p>}

          {aiImageUrl && (
            <div style={{ textAlign: "center", marginTop: "10px" }}>
              <img
                src={aiImageUrl}
                alt="AI 미리보기"
                style={{ maxWidth: "100%", borderRadius: "12px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
              />
              <div style={{ marginTop: "10px" }}>
                <button
                  className="btn-outline"
                  onClick={async () => {
                    const ok = window.confirm("이 이미지를 프로필 사진으로 변경하시겠습니까?");
                    if (!ok) return;

                    try {
                      // ✅ 서버로 AI 이미지 URL 전달하여 프로필 변경
                      const res = await axiosInstance.post(
  "/user/profile-image/save-ai",
  {
    imageUrl: aiImageUrl,
    userno: useUserStore.getState().userno
  },
  {
    headers: { "Content-Type": "application/json" }
  }
);

const fullImageUrl = `http://121.160.42.12:9100${res.data.imageUrl}`;
setProfileImage(fullImageUrl);
setImageKey(Date.now());
setAiImageUrl("");
alert("프로필 이미지가 변경되었습니다.");

                    } catch (err) {
                      console.error(err);
                      alert("프로필 이미지 변경 중 오류가 발생했습니다.");
                    }
                  }}
                  style={{ marginRight: "10px" }}
                >
                  확인
                </button>
                <button
                  className="btn-outline danger"
                  onClick={() => setAiImageUrl("")}
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ================= 버튼 및 기타 ================= */}
        <div className="mypage-actions">
          <button className="btn-outline" onClick={() => navigate("/")}>
            뒤로 가기
          </button>
          <button className="btn-outline" onClick={() => navigate("/mypage/edit")}>
            정보 수정
          </button>
          <button
            className="btn-outline"
            onClick={() => navigate("/mypage/change-password")}
          >
            비밀번호 변경
          </button>
          <button className="btn-outline danger" onClick={onWithdraw}>
            회원탈퇴
          </button>
        </div>

        <div
          style={{
            marginTop: "20px",
            borderRadius: "12px",
            border: "1px solid #e5e5e5",
            overflow: "hidden",
            background: "#fff",
          }}
        >
          <div
            onClick={() => navigate("/mypage/likes")}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 16px",
              cursor: "pointer",
              borderBottom: "1px solid #eee",
            }}
          >
            <span>❤️ 내가 좋아요한 글 보기</span>
            <span style={{ opacity: 0.6 }}>›</span>
          </div>

          <div
            onClick={() => navigate("/mypage/favorites")}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 16px",
              cursor: "pointer",
            }}
          >
            <span>⭐ 내가 즐겨찾기한 글 보기</span>
            <span style={{ opacity: 0.6 }}>›</span>
          </div>
        </div>

        <div
          style={{
            marginTop: "20px",
            borderRadius: "12px",
            border: "1px solid #e5e5e5",
            padding: "16px",
            background: "#fff",
          }}
        >
          <LoginHistoryList />
          <div
            style={{
              marginTop: "20px",
              borderRadius: "12px",
              border: "1px solid #e5e5e5",
              padding: "16px",
              background: "#f9f9f9",
            }}
          >
            <h3 style={{ marginBottom: "10px" }}>최근 로그인 요약</h3>
            <p>{loginSummary}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="mypage-row">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

export default MyPage;
