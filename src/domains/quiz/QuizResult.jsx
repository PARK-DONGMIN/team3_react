import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "../../store/store";
import { grantReward } from "../reward/rewardApi";
import "./QuizResult.css";

export default function QuizResult({ total, correct, dayNo }) {
  const navigate = useNavigate();

  const userNo = useUserStore((s) => s.userno);
  const email = useUserStore((s) => s.email) || "";

  const [loading, setLoading] = useState(false);

  // ✅ 성공 여부를 따로 관리 (res.data 형태가 달라도 화면 전환 보장)
  const [rewardDone, setRewardDone] = useState(false);

  // ✅ 결과 데이터 (없어도 화면은 rewardDone으로 전환됨)
  const [rewardResult, setRewardResult] = useState(null);

  const [error, setError] = useState("");

  const isPerfect = correct === total;
  const QUIZ_REWARD_ID = 1;

  // ✅ 라우트는 /quiz/day/:dayNo 로 가야 함
  const goQuizPlay = () => {
    navigate(`/quiz/day/${dayNo}`);
  };

  const handleGrantReward = async () => {
    if (!userNo) {
      setError("로그인이 필요합니다.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = {
        userNo,
        rewardId: QUIZ_REWARD_ID,
        rewardType: "EXP",
        sourceType: "QUIZ",
        sourceKey: `QUIZ_DAY_${dayNo}`,
        correctCount: correct,
        totalCount: total,
        email,
      };

      const res = await grantReward(payload);

      // ✅ 백엔드 응답 형태가 (res.data) 또는 (res.data.data) 둘 다 대응
      const data = res?.data?.data ?? res?.data ?? null;

      setRewardResult(data);
      setRewardDone(true); // ✅ 이걸로 화면이 "보상 지급 완료"로 무조건 바뀜
    } catch (e) {
      const data = e.response?.data;
      const msg =
        (data && typeof data === "object" && (data.message || data.error)) ||
        (typeof data === "string" ? data : "") ||
        e.message ||
        "요청 처리 중 오류가 발생했습니다.";

      setError(msg);
      console.log("[grantReward error]", e.response?.status, data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="quiz-result-wrapper">
      <div className="quiz-result-card">
        <div className="quiz-result-top">
          <div className="quiz-result-chip">DAY {dayNo}</div>
          <div className="quiz-result-title">
            {rewardDone ? "보상 지급 완료" : "퀴즈 완료"}
          </div>
          <div className="quiz-result-sub">
            {total}문제 중 <strong>{correct}</strong>문제 정답
          </div>

          {isPerfect && (
            <div className="quiz-result-badge">
              <span className="dot" />
              오늘의 올클리어 🏆
            </div>
          )}
        </div>

        {/* ✅ 보상 전 */}
        {!rewardDone ? (
          <>
            <div className="quiz-result-actions">
              <button
                className="toss-btn primary"
                onClick={handleGrantReward}
                disabled={loading}
              >
                {loading ? "보상 지급 중..." : "🎁 보상 받기"}
              </button>

              <button className="toss-btn ghost" onClick={goQuizPlay}>
                오답풀이 - 비슷한 유형 풀기
              </button>
            </div>

            {error && <p className="quiz-result-error">{error}</p>}
          </>
        ) : (
          <>
            {/* ✅ 보상 후: rewardResult가 없어도 버튼은 무조건 뜨게 */}
            {rewardResult && (
              <div className="quiz-reward-info">
                <div className="info-row">
                  <span>획득 경험치</span>
                  <strong>+{rewardResult.rewardValue} XP</strong>
                </div>
                <div className="info-row">
                  <span>현재 레벨</span>
                  <strong>Lv.{rewardResult.currentLevel}</strong>
                </div>
                <div className="info-row">
                  <span>누적 경험치</span>
                  <strong>{rewardResult.currentExp} XP</strong>
                </div>
              </div>
            )}

            <div className="quiz-result-actions">

              <button className="toss-btn ghost" onClick={goQuizPlay}>
                오답풀이 - 비슷한 유형 풀기
              </button>

              <button
                className="toss-btn secondary"
                onClick={() => navigate("/")}
              >
                홈으로 가기
              </button>
            </div>

            {error && <p className="quiz-result-error">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
