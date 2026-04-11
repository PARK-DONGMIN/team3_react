import { useState } from "react";
import { createQuiz } from "./quizApi";
import "./Quiz.css";

export default function QuizAdmin() {

  const [form, setForm] = useState({
    category: "자전거",
    question: "",
    option1: "",
    option2: "",
    option3: "",
    option4: "",
    correctNo: 1,
    explanation: "",
    expReward: 20,

    // 🔥 추가된 핵심
    dayNo: 1,
    sortOrder: 1,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: value,
    });
  };

  const submitQuiz = async () => {
    try {
      await createQuiz(form);
      alert("✅ 퀴즈가 등록되었습니다.");

      setForm({
        ...form,
        question: "",
        option1: "",
        option2: "",
        option3: "",
        option4: "",
        explanation: "",
      });

    } catch (err) {
      alert("❌ 퀴즈 등록 실패");
      console.error(err);
    }
  };

  return (
    <div className="quiz-page">

      <h2 className="quiz-title">🛠 관리자 퀴즈 등록</h2>

      {/* 📅 일차 선택 */}
      <select name="dayNo" value={form.dayNo} onChange={handleChange}>
        {Array.from({ length: 25 }, (_, i) => i + 1).map(day => (
          <option key={day} value={day}>
            {day}일차
          </option>
        ))}
      </select>

      {/* 🔢 문제 순서 */}
      <select name="sortOrder" value={form.sortOrder} onChange={handleChange}>
        <option value={1}>1번 문제</option>
        <option value={2}>2번 문제</option>
        <option value={3}>3번 문제</option>
        <option value={4}>4번 문제</option>
      </select>

      {/* 카테고리 */}
      <select name="category" value={form.category} onChange={handleChange}>
        <option value="자전거">자전거</option>
        <option value="여행">여행</option>
        <option value="안전">안전</option>
      </select>

      {/* 문제 */}
      <input
        type="text"
        name="question"
        placeholder="문제 내용을 입력하세요"
        value={form.question}
        onChange={handleChange}
      />

      {/* 보기 */}
      <input name="option1" placeholder="보기 1" value={form.option1} onChange={handleChange} />
      <input name="option2" placeholder="보기 2" value={form.option2} onChange={handleChange} />
      <input name="option3" placeholder="보기 3" value={form.option3} onChange={handleChange} />
      <input name="option4" placeholder="보기 4" value={form.option4} onChange={handleChange} />

      {/* 정답 */}
      <select name="correctNo" value={form.correctNo} onChange={handleChange}>
        <option value={1}>정답: 보기 1</option>
        <option value={2}>정답: 보기 2</option>
        <option value={3}>정답: 보기 3</option>
        <option value={4}>정답: 보기 4</option>
      </select>

      {/* 해설 */}
      <textarea
        name="explanation"
        placeholder="해설을 입력하세요"
        value={form.explanation}
        onChange={handleChange}
      />

      {/* 경험치 */}
      <input
        type="number"
        name="expReward"
        value={form.expReward}
        onChange={handleChange}
      />

      <button className="quiz-submit" onClick={submitQuiz}>
        퀴즈 등록
      </button>
    </div>
  );
}
