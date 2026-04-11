import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./QuizPlay.css";
import { getQuizByDay, solveQuiz, getLatestAttempt, getQuizByIds } from "./quizApi";
import { useUserStore } from "../../store/store";

function splitIds(csv) {
  if (!csv) return [];
  return csv
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

// ✅ DONE 될 때까지 attempt 폴링 (최대 약 10초)
async function pollLatestAttempt({
  userId,
  day,
  quizId,
  getLatestAttemptFn,
  maxTry = 14,
  intervalMs = 700,
}) {
  for (let i = 0; i < maxTry; i++) {
    const res = await getLatestAttemptFn(userId, day, quizId);
    const a = res?.data;

    // ✅ DONE + 추천ID가 생기면 종료
    if (a?.aiStatus === "DONE" && a?.recommendQuizIds) return a;

    // ✅ FAILED면 바로 종료
    if (a?.aiStatus === "FAILED") return a;

    await new Promise((r) => setTimeout(r, intervalMs));
  }
  // 시간 초과
  return null;
}

export default function QuizPlay() {
  const { dayNo } = useParams();
  const day = Number(dayNo);
  const navigate = useNavigate();

  const userId = useUserStore((s) => s.userno);

  const [mode, setMode] = useState("day"); // "day" | "practice"
  const [dayList, setDayList] = useState([]);

  // ✅ 현재 문제 기준으로 보여줄 추천문제 리스트(= cache에서 꺼내 씀)
  const [practiceList, setPracticeList] = useState([]);

  // ✅ 문제별 캐시: { [quizId]: { ai, practiceList } }
  const [cache, setCache] = useState({});

  // ✅ 인덱스는 day/practice 따로
  const [dayIdx, setDayIdx] = useState(0);
  const [practiceIdx, setPracticeIdx] = useState(0);

  const idx = mode === "day" ? dayIdx : practiceIdx;
  const list = mode === "day" ? dayList : practiceList;

  const [selectedNo, setSelectedNo] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [ai, setAi] = useState(null);
  const [error, setError] = useState("");

  const [showAnswer, setShowAnswer] = useState(true);
  const [practiceResult, setPracticeResult] = useState(null);

  const current = list[idx] || null;

  const progressText = useMemo(() => {
    if (!list.length) return "";
    return `${idx + 1} / ${list.length}`;
  }, [idx, list.length]);

  // ✅ (중복 재조회 방지용) 현재 dayIdx가 어떤 quizId를 가리키는지 ref로 들고있기
  const activeDayQuizIdRef = useRef(null);

  // ✅ (중복 클릭 방지) 같은 quizId에 대해 생성 중이면 막기
  const generatingRef = useRef({}); // { [quizId]: true/false }

  // ✅ day 바뀌면 day 퀴즈 로딩 + 캐시 초기화 (day 바뀔 때만 초기화)
  useEffect(() => {
    setMode("day");
    setCache({});
    setAi(null);
    setPracticeList([]);

    setError("");
    setDayIdx(0);
    setPracticeIdx(0);
    setSelectedNo(null);
    setPracticeResult(null);
    setShowAnswer(true);

    getQuizByDay(day)
      .then((res) => setDayList(Array.isArray(res.data) ? res.data : []))
      .catch(() => setDayList([]));
  }, [day]);

  // ✅ day 모드에서 현재 문제 바뀔 때: 해당 quizId 캐시 복원
  useEffect(() => {
    if (mode !== "day") return;
    const q = dayList[dayIdx];
    if (!q?.quizId) return;

    activeDayQuizIdRef.current = q.quizId;

    const saved = cache[q.quizId];
    setAi(saved?.ai ?? null);
    setPracticeList(saved?.practiceList ?? []);

    // 화면 입력값은 초기화(하지만 캐시는 유지)
    setError("");
    setSelectedNo(null);
    setPracticeResult(null);
    setShowAnswer(true);
  }, [mode, dayList, dayIdx, cache]);

  const loadPracticeByAttempt = async (attemptData) => {
    const idsCsv = attemptData?.recommendQuizIds || "";
    const ids = splitIds(idsCsv);
    if (!ids.length) return [];

    const res = await getQuizByIds(ids.join(","));
    return Array.isArray(res.data) ? res.data : [];
  };

  /**
   * ✅ "추천 연습문제 생성" 버튼 (안정 버전)
   * 1) 캐시 있으면 즉시 복원
   * 2) 서버 latestAttempt 먼저 조회 → DONE이면 solveQuiz 호출하지 않고 재사용
   * 3) DONE 아니면 solveQuiz로 트리거
   * 4) quizId 포함 폴링으로 DONE 될 때까지 기다림
   */
  const handleGeneratePractice = async () => {
    if (!userId) {
      setError("로그인이 필요해요.");
      return;
    }

    const dayCurrent = dayList[dayIdx];
    if (!dayCurrent?.quizId) return;

    const quizId = dayCurrent.quizId;

    // ✅ 중복 클릭 방지(같은 quizId 생성 중이면 무시)
    if (generatingRef.current[quizId]) return;
    generatingRef.current[quizId] = true;

    // ✅ 1) 캐시에 추천문제가 있으면 API 호출 없이 즉시 사용
    const cached = cache[quizId];
    if (cached?.practiceList?.length) {
      setAi(cached.ai ?? null);
      setPracticeList(cached.practiceList);
      setError("");
      generatingRef.current[quizId] = false;
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      // ✅ 2) 먼저 서버 최신 attempt 조회: 이미 DONE이면 solveQuiz 안 때림 (핵심)
      const latestRes = await getLatestAttempt(userId, day, quizId);
      const latest = latestRes?.data;

      if (latest?.aiStatus === "DONE" && latest?.recommendQuizIds) {
        const pList = await loadPracticeByAttempt(latest);

        if (activeDayQuizIdRef.current === quizId) {
          setAi(latest);
          setPracticeList(pList);
        }

        setCache((prev) => ({
          ...prev,
          [quizId]: { ai: latest, practiceList: pList },
        }));

        return;
      }

      // ✅ 3) DONE이 아니면 그때만 solveQuiz로 트리거
      await solveQuiz(userId, {
        quizId,
        dayNo: day,
        selectedNo: dayCurrent.correctNo, // 트리거용(정답)
      });

      // ✅ 4) quizId 포함해서 DONE 될 때까지 폴링
      const attemptData = await pollLatestAttempt({
        userId,
        day,
        quizId,
        getLatestAttemptFn: getLatestAttempt,
      });

      // 시간초과/NULL
      if (!attemptData) {
        setError("AI 생성이 지연되고 있어요. 잠시 후 다시 눌러주세요!");
        return;
      }

      // FAILED
      if (attemptData.aiStatus === "FAILED") {
        setAi(attemptData);
        setCache((prev) => ({
          ...prev,
          [quizId]: { ...(prev[quizId] || {}), ai: attemptData, practiceList: [] },
        }));
        setError("AI 생성에 실패했어요(FAILED). 서버 로그 확인 필요!");
        return;
      }

      // ✅ 추천문제 상세 조회
      const pList = await loadPracticeByAttempt(attemptData);

      // ✅ 현재 화면 반영
      if (activeDayQuizIdRef.current === quizId) {
        setAi(attemptData);
        setPracticeList(pList);
      }

      // ✅ 캐시에 저장 (다음/이전 눌러도 유지됨)
      setCache((prev) => ({
        ...prev,
        [quizId]: { ai: attemptData, practiceList: pList },
      }));
    } catch (e) {
      setError("추천 연습문제 생성 중 오류가 발생했어. 다시 시도해줘!");
    } finally {
      setSubmitting(false);
      generatingRef.current[quizId] = false;
    }
  };

  const startPractice = () => {
    if (!practiceList.length) {
      setError("아직 추천 연습문제가 없어요. 먼저 '추천 연습문제 생성'을 눌러줘!");
      return;
    }
    setMode("practice");
    setPracticeIdx(0);
    setSelectedNo(null);
    setPracticeResult(null);
    setError("");
  };

  const backToDay = () => {
    setMode("day");
    setPracticeIdx(0);
    setSelectedNo(null);
    setPracticeResult(null);
    setError("");
  };

  // ✅ 이동: day에서는 캐시 유지, 입력만 초기화
  const goNext = () => {
    if (mode === "day") {
      if (dayIdx < dayList.length - 1) setDayIdx((p) => p + 1);
      return;
    }
    if (practiceIdx < practiceList.length - 1) {
      setPracticeIdx((p) => p + 1);
      setSelectedNo(null);
      setPracticeResult(null);
      setError("");
    }
  };

  const goPrev = () => {
    if (mode === "day") {
      if (dayIdx > 0) setDayIdx((p) => p - 1);
      return;
    }
    if (practiceIdx > 0) {
      setPracticeIdx((p) => p - 1);
      setSelectedNo(null);
      setPracticeResult(null);
      setError("");
    }
  };

  const handlePracticeSubmit = () => {
    if (!current) return;
    if (!selectedNo) {
      setError("보기를 선택해줘!");
      return;
    }
    setError("");
    const correct = Number(current.correctNo) === Number(selectedNo);
    setPracticeResult({
      correct,
      explanation: current.explanation || "",
    });
  };

  if (!current) {
    return (
      <div className="quiz-wrap">
        <div className="quiz-card">
          <div className="quiz-title">Day {day} 퀴즈</div>
          <div className="quiz-sub">문제를 불러오는 중이거나 문제가 없어요.</div>
        </div>
      </div>
    );
  }

  const recommendIds = splitIds(ai?.recommendQuizIds);

  return (
    <div className="quiz-wrap">
      <div className="quiz-card">
        <div className="quiz-head">
          <div>
            <div className="quiz-title">
              {mode === "day" ? `Day ${day} 퀴즈 (정답/해설 보기)` : "추천 연습문제"}
            </div>
            <div className="quiz-sub">
              {current.category ? `카테고리: ${current.category}` : ""} · {progressText}
            </div>
          </div>

          <div className="quiz-badge">EXP {current.expReward ?? 0}</div>
        </div>

        {/* 상단 버튼 */}
        <div className="quiz-top-actions">
          {mode === "day" ? (
            <>
              <button className="btn" onClick={() => setShowAnswer((p) => !p)} disabled={submitting}>
                {showAnswer ? "정답 숨기기" : "정답 보기"}
              </button>

              <button className="btn primary" onClick={handleGeneratePractice} disabled={submitting}>
                {submitting ? "생성 중..." : "추천 연습문제 생성(3)"}
              </button>

              <button className="btn" onClick={startPractice} disabled={!practiceList.length}>
                추천문제 풀기 ({practiceList.length})
              </button>

              <button className="btn ghost" onClick={() => navigate("/")}>
                홈으로
              </button>
            </>
          ) : (
            <>
              <button className="btn" onClick={backToDay}>
                ← Day 문제로 돌아가기
              </button>
              <button className="btn ghost" onClick={() => navigate("/")}>
                홈으로
              </button>
            </>
          )}
        </div>

        <div className="quiz-question">{current.question}</div>

        {/* DAY 모드 */}
        {mode === "day" ? (
          <>
            <div className="quiz-options day-readonly">
              {[1, 2, 3, 4].map((no) => {
                const key = `option${no}`;
                const text = current[key];
                if (!text) return null;

                const isAnswer = Number(current.correctNo) === Number(no);

                return (
                  <div key={no} className={`opt readonly ${showAnswer && isAnswer ? "answer" : ""}`}>
                    <span className="opt-no">{no}</span>
                    <span className="opt-text">{text}</span>
                    {showAnswer && isAnswer && <span className="opt-tag">정답</span>}
                  </div>
                );
              })}
            </div>

            {showAnswer && current.explanation && (
              <div className="result ok">
                <div className="result-title">정답 해설</div>
                <div className="result-desc">
                  <div className="result-text">{current.explanation}</div>
                </div>
              </div>
            )}

            <div className="quiz-actions">
              <button className="btn" onClick={goPrev} disabled={dayIdx <= 0}>
                이전 문제
              </button>
              <button className="btn" onClick={goNext} disabled={dayIdx >= dayList.length - 1}>
                다음 문제
              </button>
            </div>

            {error && <div className="quiz-error">{error}</div>}

            {/* AI 패널 */}
            {ai && (
              <div className="ai-panel">
                <div className="ai-title">AI 학습 코치</div>

                {ai.aiStatus === "PENDING" && (
                  <div className="ai-block">
                    <div className="ai-label">AI 생성 중</div>
                    <div className="ai-text dim">코치/추천문제를 생성 중이에요…</div>
                  </div>
                )}

                {ai.aiStatus === "FAILED" && (
                  <div className="ai-block">
                    <div className="ai-label">AI 생성 실패</div>
                    <div className="ai-text dim">서버 로그를 확인해주세요.</div>
                  </div>
                )}

                {ai.coachText && (
                  <div className="ai-block">
                    <div className="ai-label">5분 복습</div>
                    <div className="ai-text pre">{ai.coachText}</div>
                  </div>
                )}

                {(ai.strengthText || ai.improveText || ai.nextActionText) && (
                  <div className="ai-grid">
                    {ai.strengthText && (
                      <div className="ai-chip">
                        <div className="ai-chip-title">잘한 점</div>
                        <div className="ai-chip-text">{ai.strengthText}</div>
                      </div>
                    )}
                    {ai.improveText && (
                      <div className="ai-chip">
                        <div className="ai-chip-title">개선점</div>
                        <div className="ai-chip-text">{ai.improveText}</div>
                      </div>
                    )}
                    {ai.nextActionText && (
                      <div className="ai-chip">
                        <div className="ai-chip-title">다음 행동</div>
                        <div className="ai-chip-text">{ai.nextActionText}</div>
                      </div>
                    )}
                  </div>
                )}

                {ai.recommendReason && (
                  <div className="ai-block">
                    <div className="ai-label">추천 이유</div>
                    <div className="ai-text">{ai.recommendReason}</div>
                  </div>
                )}

                {!ai.recommendReason && recommendIds.length > 0 && (
                  <div className="ai-block">
                    <div className="ai-label">추천 문제 ID</div>
                    <div className="id-row">
                      {recommendIds.map((id) => (
                        <span key={id} className="id-pill">
                          #{id}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          // PRACTICE 모드
          <>
            <div className="quiz-options">
              {[1, 2, 3, 4].map((no) => {
                const key = `option${no}`;
                const text = current[key];
                if (!text) return null;

                return (
                  <label key={no} className={`opt ${selectedNo === no ? "active" : ""}`}>
                    <input
                      type="radio"
                      name="opt"
                      value={no}
                      checked={selectedNo === no}
                      onChange={() => setSelectedNo(no)}
                    />
                    <span className="opt-no">{no}</span>
                    <span className="opt-text">{text}</span>
                  </label>
                );
              })}
            </div>

            {error && <div className="quiz-error">{error}</div>}

            <div className="quiz-actions">
              <button className="btn primary" onClick={handlePracticeSubmit}>
                제출하기
              </button>

              <button className="btn" onClick={goPrev} disabled={practiceIdx <= 0}>
                이전 문제
              </button>
              <button className="btn" onClick={goNext} disabled={practiceIdx >= practiceList.length - 1}>
                다음 문제
              </button>
            </div>

            {practiceResult && (
              <div className={`result ${practiceResult.correct ? "ok" : "no"}`}>
                <div className="result-title">{practiceResult.correct ? "정답!" : "오답!"}</div>
                {practiceResult.explanation && (
                  <div className="result-desc">
                    <div className="result-label">해설</div>
                    <div className="result-text">{practiceResult.explanation}</div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
