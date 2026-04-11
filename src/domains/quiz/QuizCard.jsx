// QuizCard.jsx
import "./Quiz.css";

export default function QuizCard({
  quiz,
  selectedNo,
  setSelectedNo,
  onSubmit,
  disabled = false,
  submitting = false,
}) {
  const options = [quiz.option1, quiz.option2, quiz.option3, quiz.option4].filter(Boolean);

  return (
    <div className="quiz-card">
      <h3 className="quiz-question">{quiz.question}</h3>

      {options.length === 0 && (
        <p className="quiz-empty">⚠️ 보기가 없습니다. 관리자에게 문의하세요.</p>
      )}

      <div className="quiz-options">
        {options.map((option, idx) => {
          const no = idx + 1;
          const checked = selectedNo === no;

          let optionClass = "quiz-option";
          if (!disabled && checked) optionClass += " selected";
          if (disabled) {
            if (no === quiz.correctNo) optionClass += " correct";
            else if (checked && no !== quiz.correctNo) optionClass += " wrong";
          }

          return (
            <label key={no} className={optionClass}>
              <span className="quiz-radio">
                <input
                  type="radio"
                  name="quizOption"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => setSelectedNo(no)}
                />
              </span>
              <span className="quiz-option-text">{option}</span>
            </label>
          );
        })}
      </div>

      {!disabled && (
        <button
          className="quiz-submit"
          disabled={selectedNo === null || submitting}
          onClick={onSubmit}
        >
          {submitting ? "채점 중..." : "제출"}
        </button>
      )}
    </div>
  );
}
