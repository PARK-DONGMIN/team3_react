// QuizPage.jsx
import { useEffect, useState, useMemo } from "react";
import { getQuizByDay, solveQuiz } from "./quizApi";
import QuizCard from "./QuizCard";
import QuizResult from "./QuizResult";
import { useUserStore } from "../../store/store";
import "./Quiz.css";

const SERVICE_START_DATE = new Date("2026-01-13");

function getDayNo() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(SERVICE_START_DATE);
  start.setHours(0, 0, 0, 0);

  const diff = Math.floor((today - start) / (1000 * 60 * 60 * 24));
  return diff + 1;
}

export default function QuizPage() {
  const userNo = useUserStore((s) => s.userno);
  const isLogin = useUserStore((s) => s.isLogin);

  const [dayNo, setDayNo] = useState(getDayNo());
  const [quizList, setQuizList] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedNo, setSelectedNo] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLogin || !userNo) return;

    setLoading(true);

    getQuizByDay(dayNo)
      .then((res) => {
        setQuizList(res.data || []);
        setCurrentIdx(0);
        setSelectedNo(null);
        setIsCorrect(null);
        setCorrectCount(0);
      })
      .finally(() => setLoading(false));
  }, [dayNo, isLogin, userNo]);

  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date();
    nextMidnight.setHours(24, 0, 0, 0);

    const timeout = nextMidnight - now;

    const timer = setTimeout(() => {
      setDayNo(getDayNo());
    }, timeout);

    return () => clearTimeout(timer);
  }, []);

  const total = quizList.length;
  const progressText = useMemo(() => {
    if (total === 0) return "";
    return `${Math.min(currentIdx + 1, total)} / ${total} 문제`;
  }, [currentIdx, total]);

  if (!isLogin || !userNo) {
    return <div className="quiz-loading">로그인 후 퀴즈를 이용할 수 있습니다.</div>;
  }

  const submitAnswer = async () => {
    if (selectedNo === null) return;
    if (submitting) return;

    const quiz = quizList[currentIdx];

    setSubmitting(true);
    try {
      const res = await solveQuiz(userNo, {
        quizId: quiz.quizId,
        selectedNo,
        dayNo,
      });

      if (res.data === true) setCorrectCount((prev) => prev + 1);
      setIsCorrect(res.data);
    } finally {
      setSubmitting(false);
    }
  };

  const nextQuiz = () => {
    setSelectedNo(null);
    setIsCorrect(null);
    setSubmitting(false);
    setCurrentIdx((prev) => prev + 1);
  };

  if (loading) return <div className="quiz-loading">퀴즈 불러오는 중...</div>;
  if (quizList.length === 0) return <div className="quiz-loading">오늘의 퀴즈가 아직 준비되지 않았어요.</div>;
  if (currentIdx >= quizList.length) return <QuizResult total={quizList.length} correct={correctCount} dayNo={dayNo} />;

  const currentQuiz = quizList[currentIdx];

  return (
    <div className="quiz-page-wrapper">
      <div className="quiz-page">
        {/* ✅ 배너 (public/images/quiz/quiz.png 기준) */}
        <div className="quiz-banner" />

        <div className="quiz-header">
          <h2 className="quiz-title">📅 {dayNo}일차 퀴즈</h2>
          <div className="quiz-progress-text">{progressText}</div>
        </div>

        {/* ✅ 넓은 화면에서 허전하지 않게: 메인 + 사이드 */}
        <div className="quiz-layout">
          <main className="quiz-main">
            <QuizCard
              quiz={currentQuiz}
              selectedNo={selectedNo}
              setSelectedNo={setSelectedNo}
              onSubmit={submitAnswer}
              disabled={isCorrect !== null || submitting}
              submitting={submitting}
            />

            {submitting && isCorrect === null && (
              <div className="quiz-feedback loading">AI 채점/분석 중...</div>
            )}

            {isCorrect !== null && (
              <div className={`quiz-feedback ${isCorrect ? "correct" : "wrong"}`}>
                <p className="quiz-feedback-title">{isCorrect ? "정답입니다 🎉" : "틀렸어요 😢"}</p>

                {!isCorrect && (
                  <div className="quiz-explanation">
                    <p className="quiz-answer">✅ 정답: {currentQuiz[`option${currentQuiz.correctNo}`]}</p>
                    <p className="quiz-explain-text">💡 {currentQuiz.explanation}</p>
                  </div>
                )}

                <button className="quiz-submit" onClick={nextQuiz}>
                  다음 문제
                </button>
              </div>
            )}
          </main>

          <aside className="quiz-side">
            <div className="quiz-side-card">
              <div className="quiz-side-title">오늘 진행</div>
              <div className="quiz-side-row">
                <span>진행</span>
                <b>{currentIdx + 1} / {total}</b>
              </div>
              <div className="quiz-side-row">
                <span>정답</span>
                <b>{correctCount}</b>
              </div>
            </div>

            <div className="quiz-side-card">
              <div className="quiz-side-title">팁</div>
              <div className="quiz-side-tip">
                문제를 끝까지 읽고, 보기에서 “조건/예외” 단어를 먼저 체크하면 정답률이 올라가요.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
