import { useEffect, useState } from "react";
import { fetchSurveyResult } from "./surveyApi";
import "./SurveyResultAnalytics.css";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = [
  "#4c6ef5",
  "#15aabf",
  "#82c91e",
  "#fab005",
  "#fa5252",
];

export default function SurveyResultAnalytics({ surveyId }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!surveyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    fetchSurveyResult(surveyId)
      .then((res) => {
        setQuestions(res.data.questions || []);
      })
      .catch((e) => {
        console.error("설문 결과 조회 실패", e);
        setError("설문 결과를 불러오지 못했습니다.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [surveyId]);

  if (loading) {
    return (
      <div className="survey-analytics-loading">
        📡 설문 결과 불러오는 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="survey-analytics-error">
        ❌ {error}
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="survey-analytics-empty">
        📭 아직 집계된 설문 결과가 없습니다.
      </div>
    );
  }

  return (
    <div className="survey-analytics-wrapper">
      <h1 className="survey-analytics-title">
        📊 설문 결과 분석
      </h1>

      {questions.map((q) => (
        <div
          key={q.questionId}
          className="survey-analytics-card"
        >
          <h2 className="survey-question-title">
            {q.questionText}
          </h2>

          {/* 객관식 */}
          {q.questionType !== "TEXT" && q.options && (
            <div className="survey-chart-row">
              <div className="survey-chart-box">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={q.options}>
                    <XAxis dataKey="optionText" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#4c6ef5" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="survey-chart-box">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={q.options}
                      dataKey="count"
                      nameKey="optionText"
                      innerRadius={60}
                      outerRadius={90}
                      label
                    >
                      {q.options.map((_, idx) => (
                        <Cell
                          key={idx}
                          fill={COLORS[idx % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 주관식 */}
          {q.questionType === "TEXT" && (
            <div className="survey-text-result">
              {q.textAnswers?.length > 0 ? (
                <ul>
                  {q.textAnswers.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              ) : (
                <p>응답 없음</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
