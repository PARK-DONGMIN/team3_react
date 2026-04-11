import { useState } from "react";
import axios from "axios";
import "./AiImagePage.css";

export default function AiImagePage() {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
  if (!prompt.trim()) return;
  setLoading(true);
  setError("");

  try {
    const res = await axios.post("/api/ai-image", null, { params: { prompt } });
    if (res.data.success) {
      setImageUrl(res.data.imageUrl);
    } else {
      setError(res.data.message || "이미지 생성 실패");
    }
  } catch (err) {
    setError(err.message || "서버 오류");
  }

  setLoading(false);
};


  return (
    <div className="mypage-wrapper">
      <div className="mypage-card">
        <h1 className="mypage-title">AI 이미지 생성</h1>
        <p className="mypage-sub">원하는 내용을 입력하면 AI가 이미지를 만들어 줍니다.</p>
        <p className="mypage-sub">자신만의 프로필 이미지를 만들어보세요!</p>

        <div className="mypage-info">
          <div className="mypage-row">
            <span>프롬프트</span>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="예: 귀여운 강아지 그림"
              style={{ flex: 1, padding: "8px 10px", borderRadius: "8px", border: "1px solid #ccc" }}
            />
          </div>
        </div>

        <div className="mypage-actions">
          <button className="btn-outline" onClick={handleGenerate} disabled={loading}>
            {loading ? "생성 중..." : "이미지 생성"}
          </button>
        </div>

        {error && <p style={{ color: "red", marginTop: "14px", textAlign: "center" }}>{error}</p>}

        {imageUrl && (
          <div style={{ marginTop: "30px", textAlign: "center" }}>
            <img
              src={imageUrl}
              alt="AI 생성"
              style={{ maxWidth: "100%", borderRadius: "12px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
