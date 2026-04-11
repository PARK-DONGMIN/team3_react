import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./AiWeather.css";
import { useUserStore } from "../../store/store";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

/* ---------- utils ---------- */

function fmtDateKR(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const week = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${mm}.${dd} (${week})`;
  } catch {
    return iso;
  }
}

function fmtDateTimeKR(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${mm}.${dd} ${hh}:${mi} 기준`;
  } catch {
    return "";
  }
}

function splitReason(reason) {
  if (!reason) return [];
  return String(reason).split(" ").filter(Boolean);
}

function formatSummaryChipsFromRiskReason(reason) {
  if (!reason) return [];

  const tokens = String(reason).split(" ").filter(Boolean);

  // "등급" 같은 애매한 라벨을 "대기질"로 치환
  const renameLabel = (t) => {
    if (t === "등급") return "대기질";
    return t;
  };

  const out = [];
  for (let i = 0; i < tokens.length; i += 2) {
    let label = renameLabel(tokens[i]);
    const value = tokens[i + 1];

    // 홀수 토큰(라벨만 있고 값이 없는 경우)
    if (!value) {
      out.push(label);
      continue;
    }

    out.push(`${label} ${value}`);
  }

  return out;
}

function splitMessageByNumber(text) {
  if (!text) return [];
  return String(text).split(/\n?\d+\.\s+/).filter(Boolean);
}

function riskTone(level) {
  switch (level) {
    case "VERY_SAFE":
      return "verySafe";
    case "SAFE":
      return "safe";
    case "CAUTION":
      return "caution";
    case "WARNING":
      return "warning";
    case "DANGER":
      return "danger";
    default:
      return "safe";
  }
}

/* ---------- component ---------- */

export default function AiWeather() {
  const nav = useNavigate();
  const { scheduleId } = useParams();
  const scheduleIdNum = Number(scheduleId);
  const userNo = useUserStore((s) => s.userno);

  // ✅ summary(기존) + route(신규) 분리해서 저장
  const [summaryData, setSummaryData] = useState(null); // GET /ai_weather/{id}
  const [routeData, setRouteData] = useState(null);     // GET /ai_weather/schedule/{id}/route

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const summaryDays = Array.isArray(summaryData?.days) ? summaryData.days : [];
  const routeDays = Array.isArray(routeData?.days) ? routeData.days : [];

  /* ✅ 상단 요약 문구: summary 기준(기존 로직 유지) */
  const summaryText = useMemo(() => {
    if (summaryDays.length === 0) return "";

    const dangerDay = summaryDays.find((d) =>
      ["DANGER", "WARNING"].includes(d.riskLevel)
    );

    if (dangerDay) {
      return `일부 날짜에는 날씨 또는 대기질로 인해 주의가 필요합니다. (${fmtDateKR(
        dangerDay.date
      )})`;
    }

    return "전체 일정은 대체로 안정적인 날씨로 자전거 여행에 적합합니다.";
  }, [summaryDays]);

  // ✅ analyzedAt: DTO 필드명이 analyzedAt (너 DTO에 그렇게 있음)
  const analyzedAt = useMemo(() => {
    if (summaryDays.length === 0) return "";
    return fmtDateTimeKR(summaryDays[0]?.analyzedAt);
  }, [summaryDays]);

  /* ---------- api ---------- */

  // ✅ 기존 summary는 “항상” 가져온다 (없으면 기존 카드도 못 그림)
  const getSummary = async () => {
    const res = await axios.get(`${BASE_URL}/ai_weather/${scheduleIdNum}`, {
      params: { userNo },
    });
    return res.data;
  };

  // ✅ route는 실패해도 무시 (추가 정보일 뿐)
  const getRoute = async () => {
    try {
      const res = await axios.get(
        `${BASE_URL}/ai_weather/schedule/${scheduleIdNum}/route`,
        { params: { userNo } }
      );
      return res.data;
    } catch {
      return null;
    }
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      setErrMsg("");

      // summary 먼저
      const s = await getSummary();
      setSummaryData(s);

      // route는 있으면 표시
      const r = await getRoute();
      setRouteData(r);
    } catch (e) {
      setErrMsg("날씨 분석 정보를 불러오지 못했습니다.");
      setSummaryData(null);
      setRouteData(null);
    } finally {
      setLoading(false);
    }
  };

  // ✅ 분석 생성 버튼 (네 컨트롤러에 맞춤)
  const runAnalyze = async () => {
    try {
      setBusy(true);
      await axios.post(
        `${BASE_URL}/ai_weather/${scheduleIdNum}/summary`,
        null,
        { params: { userNo } }
      );
      await loadAll();
    } catch {
      alert("날씨 분석 생성에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line
  }, []);

  /* ---------- render ---------- */

  return (
    <div className="aw-wrap">
      {/* Topbar */}
      <div className="aw-topbar">
        <button className="aw-back-text" onClick={() => nav(-1)}>
          ← 이전으로
        </button>

        <div className="aw-title-wrap">
          <h1 className="aw-title">날씨 · 대기질 분석</h1>
          {analyzedAt && <div className="aw-analyzed-at">{analyzedAt}</div>}
        </div>

        <button className="aw-btn primary" onClick={runAnalyze} disabled={busy}>
          {busy ? "분석 중..." : "최신 정보 확인"}
        </button>
      </div>

      {/* Error */}
      {errMsg && <div className="aw-error">{errMsg}</div>}

      {/* Loading */}
      {loading && <div className="aw-loading">불러오는 중…</div>}

      {/* ✅ 분석 데이터 없음: summary가 비면 진짜 없는 것 */}
      {!loading && !errMsg && summaryDays.length === 0 && (
        <div className="aw-empty">
          <div className="aw-empty-icon">🌤️</div>
          <h3 className="aw-empty-title">아직 날씨 분석이 없습니다</h3>
          <p className="aw-empty-desc">
            일정 정보를 기준으로<br />
            날씨 · 대기질 · 라이딩 위험도를 분석할 수 있어요.
          </p>
          <button className="aw-btn primary" onClick={runAnalyze} disabled={busy}>
            {busy ? "분석 중..." : "날씨 분석 시작하기"}
          </button>
        </div>
      )}

      {/* ✅ 1) 기존 summary 화면(풍속/미세먼지/AI 메시지 포함) */}
      {!loading && !errMsg && summaryDays.length > 0 && (
        <>
          <div className="aw-summary">
            <div className="aw-summary-icon">🌤️</div>
            <div className="aw-summary-text">{summaryText}</div>
          </div>

          <div className="aw-grid">
            {summaryDays.map((d) => (
              <div key={d.date} className={`aw-card ${riskTone(d.riskLevel)}`}>
                <div className="aw-card-head">
                  <div className="aw-date">{fmtDateKR(d.date)}</div>
                  <div
                    className="aw-badge"
                    style={{ backgroundColor: d.riskColor || undefined }}
                  >
                    {d.riskIcon ? `${d.riskIcon} ` : ""}
                    {d.riskLabel || d.riskLevel}
                  </div>
                </div>

                {/* ✅ 풍속/강수/미세먼지 같은 텍스트는 riskReason에 들어오던 기존 형태 유지 */}
                <div className="aw-reasons">
                  {formatSummaryChipsFromRiskReason(d.riskReason).map((r, i) => (
                    <span key={i} className="aw-chip">
                      {r}
                    </span>
                  ))}

                </div>

                <div className="aw-message">
                  {splitMessageByNumber(d.message).map((line, i) => (
                    <p key={i} className="aw-message-line">
                      {i + 1}. {line}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ✅ 2) route 화면(동선 시군구별) : “추가 정보”로 아래에 붙임 */}
      {!loading && !errMsg && routeDays.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div className="aw-summary" style={{ marginBottom: 12 }}>
            <div className="aw-summary-icon">🧭</div>
            <div className="aw-summary-text">
              동선 기준 시군구별 요약
            </div>
          </div>

          <div className="aw-grid">
            {routeDays.map((day) => {
              const cities = Array.isArray(day?.cities) ? day.cities : [];

              return (
                <div key={`${day.dayNumber}-${day.date}`} className="aw-card">
                  <div className="aw-card-head">
                    <div className="aw-date">
                      Day {day.dayNumber} · {fmtDateKR(day.date)}
                    </div>
                    <div className="aw-badge">
                      시군구 {cities.length}곳
                    </div>
                  </div>

                  {/* 시군구별 */}
                  <div style={{ display: "grid", gap: 10 }}>
                    {cities.map((c) => (
                      <div
                        key={c.cityId ?? `${day.dayNumber}-${c.regionName}`}
                        className={`aw-card ${riskTone(c.riskLevel)}`}
                        style={{ margin: 0 }}
                      >
                        {/* 헤더 */}
                        <div className="aw-card-head">
                          <div className="aw-city-name">
                            {c.regionName}
                          </div>
                          <div
                            className="aw-badge"
                            style={{ backgroundColor: c.riskColor || undefined }}
                          >
                            {c.riskIcon ? `${c.riskIcon} ` : ""}
                            {c.riskLabel || c.riskLevel}
                          </div>
                        </div>

                        {/* 시군구 수치 요약 */}
                        <div className="aw-inline-metrics">
                          {c.tempMin != null && c.tempMax != null && (
                            <div className="aw-inline-item">
                              <span className="aw-inline-icon">🌡</span>
                              <span className="aw-inline-value">
                                최저 {c.tempMin}° / 최고 {c.tempMax}°
                              </span>
                            </div>
                          )}

                          {c.windSpeed != null && (
                            <div className="aw-inline-item">
                              <span className="aw-inline-icon">💨</span>
                              <span className="aw-inline-label">풍속</span>
                              <span className="aw-inline-value">
                                {c.windSpeed} m/s
                              </span>
                            </div>
                          )}

                          {c.precipProb != null && (
                            <div className="aw-inline-item">
                              <span className="aw-inline-icon">☔</span>
                              <span className="aw-inline-label">강수확률</span>
                              <span className="aw-inline-value">
                                {c.precipProb}%
                              </span>
                            </div>
                          )}

                          {c.airGrade && (
                            <div className="aw-inline-item">
                              <span className="aw-inline-icon">🌫</span>
                              <span className="aw-inline-label">대기질</span>
                              <span className="aw-inline-value">
                                {c.airGrade}
                              </span>
                            </div>
                          )}

                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
