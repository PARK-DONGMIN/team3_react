import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { analyzePlace } from "./aiApi";
import "./AiPlace.css";

export default function AiPlace() {
  const navigate = useNavigate();

  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* ==========================
     📂 이미지 선택
  ========================== */
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImageFile(file);
    setResult(null);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  /* ==========================
     🤖 AI 분석 요청
  ========================== */
  const handleAnalyze = async () => {
    if (!imageFile) {
      alert("이미지를 선택해주세요.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", imageFile);

      const res = await analyzePlace(formData);
      setResult(res.data);

    } catch (e) {
      console.error(e);
      setError("AI 분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-page">

      {/* 상단 네비 */}
      <div className="ai-top-bar">
        <button
          className="ai-top-btn ghost"
          onClick={() => navigate("/")}
        >
          ← 홈으로
        </button>

        <button
          className="ai-top-btn primary"
          onClick={() => navigate("/schedule/new")}
        >
          새 일정 짜기
        </button>
      </div>

      {/* 메인 카드 */}
      <div className="ai-card-lg">
        <h2 className="ai-title">📸 사진으로 장소 추정</h2>
        <p className="ai-sub">
          사진 한 장만 업로드하면 AI가 장소를 분석해드립니다
        </p>

        <label className="ai-file-box">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
          />
          <span>{imageFile ? imageFile.name : "사진 선택하기"}</span>
        </label>

        {preview && (
          <img
            src={preview}
            alt="preview"
            className="ai-preview-lg"
          />
        )}

        <button
          className="ai-main-btn"
          onClick={handleAnalyze}
          disabled={loading}
        >
          {loading ? "AI 분석 중..." : "AI 분석하기"}
        </button>

        {result && (
          <div className="ai-result-card">
            <h3>📍 {result.placeName}</h3>

            {typeof result.confidence === "number" && (
              <p className="ai-confidence">
                신뢰도 {(result.confidence * 100).toFixed(0)}%
              </p>
            )}
          </div>
        )}

        {error && <p className="ai-error">{error}</p>}
      </div>
    </div>
  );
}
