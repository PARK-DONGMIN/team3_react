import { useEffect, useState } from "react";
import { useUserStore } from "../../store/store";
import confetti from "canvas-confetti";
import {
  getRewardStatus,
  getRewardMasters,
  getRewardLogs,
} from "../reward/rewardApi";
import "./RewardStatus.css";

/* =====================
   레벨별 칭호 + 배지 이미지
===================== */
const LEVEL_META = [
  { min: 1, title: "초보 라이더", badgeImg: "/images/reward/reward1.jpg" },
  { min: 6, title: "중급 라이더", badgeImg: "/images/reward/reward2.jpg" },
  { min: 11, title: "고급 라이더", badgeImg: "/images/reward/reward3.jpg" },
  { min: 16, title: "마스터 라이더", badgeImg: "/images/reward/reward4.jpg" },
];

const MEMBERSHIP_BENEFITS = [
  { min: 1, name: "초보 라이더", color: "#93b8f3ff", benefits: ["정식 출시 후 추가 예정"] },
  { min: 6, name: "중급 라이더", color: "#5689ffff", benefits: ["정식 출시 후 추가 예정"] },
  { min: 11, name: "고급 라이더", color: "#4c3cfbff", benefits: ["정식 출시 후 추가 예정"] },
  { min: 16, name: "마스터 라이더", color: "#a371f8ff", benefits: ["정식 출시 후 추가 예정"] },
];

const getLevelMeta = (level) =>
  [...LEVEL_META].reverse().find((m) => level >= m.min) || LEVEL_META[0];

const getMembership = (level) =>
  [...MEMBERSHIP_BENEFITS].reverse().find((m) => level >= m.min) || MEMBERSHIP_BENEFITS[0];

function formatTime(isoString) {
  if (!isoString) return "";
  return isoString.replace("T", " ").slice(0, 16);
}

export default function RewardStatusPage() {
  const userNo = useUserStore((s) => s.userno);

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const [levelUp, setLevelUp] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState(null);

  // ✅ master/log
  const [masters, setMasters] = useState([]);
  const [logs, setLogs] = useState([]);
  const [extraLoading, setExtraLoading] = useState(false);
  const [extraError, setExtraError] = useState("");

  // ✅ 버튼 방식 (탭 X)
  const [showMasters, setShowMasters] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  /* =====================
     상태 조회
  ===================== */
  useEffect(() => {
    if (!userNo) {
      setLoading(false);
      return;
    }

    setLoading(true);

    getRewardStatus(userNo)
      .then((res) => {
        const data = res.data;
        setStatus(data);
        setSelectedMembership(getMembership(data.currentLevel));

        if (data.prevLevel !== null && data.currentLevel > data.prevLevel) {
          setLevelUp(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userNo]);

  /* =====================
     레벨업 효과
  ===================== */
  useEffect(() => {
    if (!levelUp) return;
    confetti({ particleCount: 150, spread: 120, origin: { y: 0.6 } });
    const timer = setTimeout(() => setLevelUp(false), 1000);
    return () => clearTimeout(timer);
  }, [levelUp]);

  /* =====================
     master/log 불러오기 (한 번만)
  ===================== */
  const loadMastersAndLogs = async () => {
    if (!userNo) return;

    setExtraLoading(true);
    setExtraError("");

    try {
      const [mRes, lRes] = await Promise.all([
        getRewardMasters(),
        getRewardLogs(userNo),
      ]);

      setMasters(Array.isArray(mRes.data) ? mRes.data : []);
      setLogs(Array.isArray(lRes.data) ? lRes.data : []);
    } catch (e) {
      console.error(e);
      setExtraError(e.response?.data?.message || "보상 데이터 조회 실패");
    } finally {
      setExtraLoading(false);
    }
  };

  const onClickMasters = async () => {
    const next = !showMasters;
    setShowMasters(next);
    // 하나만 보기 원하면 아래 2줄 유지
    // if (next) setShowLogs(false);

    if (next && masters.length === 0) {
      await loadMastersAndLogs();
    }
  };

  const onClickLogs = async () => {
    const next = !showLogs;
    setShowLogs(next);
    // 하나만 보기 원하면 아래 2줄 유지
    // if (next) setShowMasters(false);

    if (next && logs.length === 0) {
      await loadMastersAndLogs();
    }
  };

  if (loading) {
    return <div className="reward-loading">불러오는 중...</div>;
  }

  if (!userNo) {
    return <div className="reward-loading">로그인이 필요합니다.</div>;
  }

  if (!status) {
    return <div className="reward-loading">상태 정보를 불러오지 못했습니다.</div>;
  }

  const meta = getLevelMeta(status.currentLevel);
  const expPercent = Math.min(
    100,
    Math.round((status.currentExp / status.nextLevelExp) * 100)
  );

  return (
    <div className="reward-status-wrapper">
      {levelUp && (
        <div className="levelup-overlay">
          <div className="levelup-box">
            🎉 LEVEL UP!
            <span>Lv.{status.currentLevel}</span>
          </div>
        </div>
      )}

      {/* ================= 메인 카드 ================= */}
      <div className="reward-status-card premium">
        <h1 className="reward-status-title">내 성장 현황</h1>

        <div className="badge-main-wrapper">
          <img src={meta.badgeImg} alt={meta.title} className="badge-main-image" />
        </div>

        <div className="badge-info">
          <p className="badge-title">{meta.title}</p>
          <p className="badge-level">Lv.{status.currentLevel}</p>
        </div>

        <div className="exp-box">
          <div className="exp-bar">
            <div className="exp-fill" style={{ width: `${expPercent}%` }} />
          </div>
          <p className="exp-sub">
            다음 레벨까지 {status.nextLevelExp - status.currentExp} XP
          </p>
        </div>

        {/* ✅ 버튼 2개로 master/log 열기 */}
        <div className="reward-btn-row">
          <button className="reward-sub-btn" onClick={onClickMasters}>
            {showMasters ? "📌 보상 정의 닫기" : "📌 보상 정의 보기"}
          </button>
          <button className="reward-sub-btn" onClick={onClickLogs}>
            {showLogs ? "🧾 보상 기록 닫기" : "🧾 보상 기록 보기"}
          </button>
        </div>

        {extraError && <p className="reward-error" style={{ textAlign: "left" }}>{extraError}</p>}

        {/* ✅ 보상 정의 */}
        {showMasters && (
          <div className="reward-section">
            <h2 className="reward-section-title">📌 보상 정의</h2>

            {extraLoading && masters.length === 0 ? (
              <p className="reward-empty">불러오는 중...</p>
            ) : masters.length === 0 ? (
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
        )}

        {/* ✅ 보상 기록 */}
        {showLogs && (
          <div className="reward-section">
            <h2 className="reward-section-title">🧾 보상 지급 기록</h2>

            {extraLoading && logs.length === 0 ? (
              <p className="reward-empty">불러오는 중...</p>
            ) : logs.length === 0 ? (
              <p className="reward-empty">아직 보상 지급 기록이 없습니다.</p>
            ) : (
              logs.map((l) => (
                <div key={l.rewardLogId} className="reward-log-item">
                  <div className="reward-row">
                    <strong>+{l.rewardValue} XP</strong>
                    <span className="reward-time">{formatTime(l.createdAt)}</span>
                  </div>
                  <p className="reward-desc">
                    {l.sourceType} · {l.sourceKey}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ================= 멤버십 영역 ================= */}
      <div className="membership-section">
        <h2 className="membership-title">레벨 혜택</h2>

        <div className="membership-tier-bar">
          {MEMBERSHIP_BENEFITS.map((m) => (
            <div
              key={m.name}
              className={`tier-card ${selectedMembership?.name === m.name ? "active" : ""}`}
              style={{ borderColor: m.color }}
              onClick={() => setSelectedMembership(m)}
            >
              <div className="tier-badge" style={{ background: m.color }}>
                {m.name[0]}
              </div>
              <p>{m.name}</p>
              <span>Lv.{m.min}+</span>
            </div>
          ))}
        </div>

        {selectedMembership && (
          <div className="membership-benefit-card">
            <h3 style={{ color: selectedMembership.color }}>
              {selectedMembership.name} 혜택
            </h3>
            <ul>
              {selectedMembership.benefits.map((b, i) => (
                <li key={i}>✔ {b}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
