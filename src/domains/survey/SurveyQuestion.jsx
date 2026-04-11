export default function SurveyQuestion({ question, onAnswer }) {
  const { questionId, questionText, questionType, options } = question;

  if (questionType === "TEXT") {
    return (
      <div className="survey-question">
        <p>{questionText}</p>
        <textarea
          onChange={(e) =>
            onAnswer(questionId, {
              questionId,
              answerText: e.target.value,
            })
          }
        />
      </div>
    );
  }

  if (questionType === "SCORE") {
    return (
      <div className="survey-question">
        <p>{questionText}</p>
        <input
          type="range"
          min="0"
          max="10"
          onChange={(e) =>
            onAnswer(questionId, {
              questionId,
              scoreValue: Number(e.target.value),
            })
          }
        />
      </div>
    );
  }

  return (
    <div className="survey-question">
      <p>{questionText}</p>

      {options.map((o) => (
        <label key={o.optionId}>
          <input
            type={questionType === "MULTI" ? "checkbox" : "radio"}
            name={questionId}
            onChange={() =>
              onAnswer(questionId, {
                questionId,
                optionId: o.optionId,
              })
            }
          />
          {o.optionText}
        </label>
      ))}
    </div>
  );
}
