import { useEffect, useState } from "react";
import axiosInstance from "../../api/axios";

export default function AiSummaryBox({ postId }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [postId]);

  const load = async () => {
    try {
      // 1️⃣ 먼저 DB에 있는 요약 조회
      const res = await axiosInstance.get(`/posts/summary/${postId}`);

      if (res.data?.summary) {
        setSummary(res.data.summary);
        setLoading(false);
        return;
      }

    } catch (e) {
      // 요약이 없는 경우도 여기로 떨어질 수 있음
    }

    try {
      // 2️⃣ 없으면 AI 요약 생성
      await axiosInstance.post(`/posts/summary/ai/${postId}`);

      // 3️⃣ 다시 조회
      const res2 = await axiosInstance.get(`/posts/summary/${postId}`);
      setSummary(res2.data.summary);
    } catch (e) {
      console.error("AI 요약 실패", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="ai-box">🤖 AI 요약 생성 중...</div>;
  if (!summary) return null;

  return (
    <div className="ai-box">
      <div className="ai-title">🤖 AI 요약</div>
      <div className="ai-content">{summary}</div>
    </div>
  );
}
