import { useEffect, useState } from "react";
import { useUserStore } from "../../store/store";
import {
  grantReward,
  getRewardStatus,
  getRewardMasters,
  getRewardLogs,
} from "./rewardApi";
import "./Reward.css";

export default function RewardPage() {
  const userNo = useUserStore((s) => s.userno);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [status, setStatus] = useState(null);
  const [masters, setMasters] = useState([]);
  const [logs, setLogs] = useState([]);

  const loadAll = async () => {
    if (!userNo) return;
    setError("");

    try {
      const [sRes, mRes, lRes] = await Promise.all([
        getRewardStatus(userNo),
        getRewardMasters(),
        getRewardLogs(userNo),
      ]);

      setStatus(sRes.data);
      setMasters(mRes.data || []);
      setLogs(lRes.data || []);
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.message || "보상 데이터 조회 실패");
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userNo]);

  const handleGrantReward = async () => {
    if (!userNo) return;

    setLoading(true);
    setError("");

    try {
      await grantReward({
        userNo,
        rewardType: "EXP",
        sourceType: "QUIZ",
        sourceKey: "QUIZ_DAY_1",
        correctCount: 4,
        totalCount: 4,
      });

      await loadAll();
      alert("보상이 지급되었습니다!");
    } catch (e) {
      setError(e.response?.data?.message || "이미 보상을 받았어요");
    } finally {
      setLoading(false);
    }
  };

  const currentExp = status?.currentExp ?? 0;
  const currentLevel = status?.currentLevel ?? 1;
  const inLevelExp = currentExp % 100;
  const progress = Math.min(100, Math.round((inLevelExp / 100) * 100));
  const remain = Math.max(0, 100 - inLevelExp);

  return (
    <div className="reward-wrapper">
      <div className="reward-card">
        <h1 className="reward-title">🎁 내 성장 현황</h1>

        {error && <p className="reward-error">{error}</p>}

        {/* 성장 표시 */}
        <div className="reward-info">
          <div>
            <span>현재 레벨</span>
            <strong>Lv.{currentLevel}</strong>
          </div>
          <div>
            <span>누적 경험치</span>
            <strong>{currentExp} XP</strong>
          </div>
        </div>

        <div className="reward-progress">
          <div className="reward-progress-bar">
            <div className="reward-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="reward-progress-text">다음 레벨까지 {remain} XP</p>
        </div>

        <button className="reward-btn" onClick={handleGrantReward} disabled={loading}>
          {loading ? "지급 중..." : "보상 받기"}
        </button>

        {/* ✅ 보상 정의 (무조건 표시) */}
        <div className="reward-section">
          <h2 className="reward-section-title">📌 보상 정의</h2>

          {masters.length === 0 ? (
            <p className="reward-empty">보상 정의가 없습니다.</p>
          ) : (
            masters.map((m) => (
              <div key={m.rewardId} className="reward-master-item">
                <div className="reward-row">
                  <strong>{m.rewardName}</strong>
                  <span className="reward-pill">
                    {m.rewardType} · {m.rewardValue}
                  </span>
                </div>
                <p className="reward-desc">{m.description}</p>
              </div>
            ))
          )}
        </div>

        {/* ✅ 보상 기록 (무조건 표시) */}
        <div className="reward-section">
          <h2 className="reward-section-title">🧾 보상 지급 기록</h2>

          {logs.length === 0 ? (
            <p className="reward-empty">아직 보상 지급 기록이 없습니다.</p>
          ) : (
            logs.map((l) => (
              <div key={l.rewardLogId} className="reward-log-item">
                <div className="reward-row">
                  <strong>+{l.rewardValue} XP</strong>
                  <span className="reward-time">{l.createdAt}</span>
                </div>
                <p className="reward-desc">
                  {l.sourceType} · {l.sourceKey}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
