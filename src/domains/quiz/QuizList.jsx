import { useEffect, useState } from "react";
import {
  getAdminQuizList,
  updateQuiz,
  deleteQuiz,
} from "./quizApi";
import "./Quiz.css";

export default function QuizList() {
  const [list, setList] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editQuestion, setEditQuestion] = useState("");

  /* =====================
     목록 조회
  ===================== */
  const loadList = async () => {
    try {
      const res = await getAdminQuizList();
      setList(res.data || []);
    } catch (err) {
      console.error("퀴즈 목록 조회 실패", err);
    }
  };

  /* =====================
     최초 로딩
     (React 18 StrictMode 대응)
  ===================== */
  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!mounted) return;
      await loadList();
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /* =====================
     삭제
  ===================== */
  const handleDelete = async (quizId) => {
    const ok = window.confirm("정말 이 퀴즈를 삭제하시겠습니까?");
    if (!ok) return;

    try {
      await deleteQuiz(quizId);
      alert("삭제되었습니다.");
      loadList();
    } catch (err) {
      console.error(err);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  /* =====================
     수정 시작
  ===================== */
  const startEdit = (quiz) => {
    setEditingId(quiz.quizId);
    setEditQuestion(quiz.question);
  };

  /* =====================
     수정 취소
  ===================== */
  const cancelEdit = () => {
    setEditingId(null);
    setEditQuestion("");
  };

  /* =====================
     수정 저장
  ===================== */
  const saveEdit = async (quizId) => {
    if (!editQuestion.trim()) {
      alert("문제 내용을 입력하세요.");
      return;
    }

    try {
      await updateQuiz(quizId, { question: editQuestion });
      alert("수정되었습니다.");
      cancelEdit();
      loadList();
    } catch (err) {
      console.error(err);
      alert("수정 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="quiz-admin-wrapper">
      <div className="quiz-admin-page">
        <h2 className="quiz-title">📋 퀴즈 관리 목록</h2>

        {list.length === 0 && (
          <p className="quiz-empty">등록된 퀴즈가 없습니다.</p>
        )}

        {list.map((q) => (
          <div key={q.quizId} className="quiz-card">
            {/* 상단 정보 */}
            <div className="quiz-admin-row">
              <span className="quiz-badge">
                {q.dayNo}일차 · {q.sortOrder}번
              </span>
              <span className="quiz-category">{q.category}</span>
            </div>

            {/* 문제 내용 */}
            {editingId === q.quizId ? (
              <textarea
                className="quiz-edit-input"
                value={editQuestion}
                onChange={(e) => setEditQuestion(e.target.value)}
              />
            ) : (
              <p className="quiz-question">{q.question}</p>
            )}

            {/* 관리자 버튼 */}
            <div className="quiz-admin-actions">
              {editingId === q.quizId ? (
                <>
                  <button
                    className="quiz-btn save"
                    onClick={() => saveEdit(q.quizId)}
                  >
                    저장
                  </button>
                  <button
                    className="quiz-btn cancel"
                    onClick={cancelEdit}
                  >
                    취소
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="quiz-btn edit"
                    onClick={() => startEdit(q)}
                  >
                    수정
                  </button>
                  <button
                    className="quiz-btn delete"
                    onClick={() => handleDelete(q.quizId)}
                  >
                    삭제
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
