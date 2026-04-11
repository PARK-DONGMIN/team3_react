import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchSurveyDetail, submitSurvey } from "./surveyApi";
import { useUserStore } from "../../store/store";
import "./SurveyDetail.css";

/**
 * ✅ rewardId 매핑은 너 REWARD_MASTER 기준으로 맞춰야 함
 * 예시)
 * 3 = 설문 완료 30xp
 * 4 = 인터뷰형(리서치) 50xp
 */
const SURVEY_REWARD_ID_30 = 3;
const SURVEY_REWARD_ID_50 = 4;

export default function SurveyDetail() {
  const { surveyId } = useParams();
  const navigate = useNavigate();

  const userNo = useUserStore((s) => s.userno);
  // ✅ store 구조가 다를 수 있어서 안전하게 여러 후보 처리
  const email =
    useUserStore((s) => s.email) ||
    useUserStore((s) => s.user?.email) ||
    "";

  const [survey, setSurvey] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  /* =====================
     설문 상세 조회
  ===================== */
  useEffect(() => {
    fetchSurveyDetail(surveyId)
      .then((res) => setSurvey(res.data))
      .catch(() => {
        alert("설문 정보를 불러오지 못했습니다.");
        navigate("/survey");
      });
  }, [surveyId, navigate]);

  // ✅ rewardPoint 필드명이 서버마다 달라서(너 코드상 list는 rewardPoint, detail은 rewardExp)
  // 둘 다 대응
  const rewardPoint = useMemo(() => {
    if (!survey) return 0;
    return (
      survey.rewardPoint ??
      survey.rewardExp ??
      survey.rewardValue ??
      0
    );
  }, [survey]);

  const rewardId = useMemo(() => {
    // 50 이상이면 인터뷰/리서치 취급 (너 정책에 맞게 변경 가능)
    return rewardPoint >= 50 ? SURVEY_REWARD_ID_50 : SURVEY_REWARD_ID_30;
  }, [rewardPoint]);

  if (!survey) {
    return <div className="survey-loading">설문 불러오는 중...</div>;
  }

  /* =====================
     객관식 선택
  ===================== */
  const handleSelect = (questionId, optionId) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        optionId,
        answerText: null,
      },
    }));
  };

  /* =====================
     서술형 입력
  ===================== */
  const handleTextChange = (questionId, text) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        optionId: null,
        answerText: text,
      },
    }));
  };

  /* =====================
     필수 문항 체크
  ===================== */
  const validateRequired = () => {
    const qs = survey.questions || [];
    for (const q of qs) {
      const required =
        q.requiredYn === "Y" || q.required === true; // 백엔드마다 필드 다를 수 있어서 대응
      if (!required) continue;

      const a = answers[q.questionId];
      const isText = q.questionType === "TEXT";

      if (!a) return { ok: false, msg: `${q.questionNo}번 문항에 답변이 필요합니다.` };

      if (isText) {
        if (!a.answerText || a.answerText.trim() === "")
          return { ok: false, msg: `${q.questionNo}번 문항(서술형)에 답변이 필요합니다.` };
      } else {
        if (!a.optionId)
          return { ok: false, msg: `${q.questionNo}번 문항(객관식)을 선택해주세요.` };
      }
    }
    return { ok: true };
  };

  /* =====================
     설문 제출
  ===================== */
  const handleSubmit = async () => {
    if (submitting) return;

    if (!userNo) {
      alert("로그인 후 설문을 제출할 수 있습니다.");
      navigate("/login");
      return;
    }

    const v = validateRequired();
    if (!v.ok) {
      alert(v.msg);
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        surveyId: survey.surveyId,
        userNo,

        // ✅ 보상 지급에 필요한 값들 (최근 RewardService 변경 대응)
        rewardId,                 // ✅ 필수일 가능성 매우 큼
        surveyReward: rewardPoint, // ✅ 30 or 50 같은 값
        email,                    // ✅ 레벨업 메일/보상 로직에서 필요할 수 있음

        answers: Object.entries(answers).map(([questionId, value]) => ({
          questionId: Number(questionId),
          optionId: value.optionId ?? null,
          answerText: value.answerText ?? null,
        })),
      };

      const res = await submitSurvey(payload);

      // ✅ 서버가 보상 결과를 같이 내려주는 경우(있을 수도 있어서)
      const data = res?.data;
      if (data && typeof data === "object" && data.rewardValue != null) {
        alert(
          `설문이 제출되었습니다 🎉\n경험치 +${data.rewardValue}XP 지급!\n현재 레벨: Lv.${data.currentLevel}\n누적 경험치: ${data.currentExp}XP`
        );
      } else {
        alert("설문이 제출되었습니다 🎉\n경험치가 지급되었습니다!");
      }

      navigate("/survey");
    } catch (e) {
      // ✅ 서버 메시지 그대로 보여주기 (400 원인 확인 가능)
      const data = e.response?.data;
      const msg =
        (data && typeof data === "object" && (data.message || data.error)) ||
        (typeof data === "string" ? data : "") ||
        "이미 참여한 설문이거나 요청 값이 올바르지 않습니다.";

      console.log("[submitSurvey error]", e.response?.status, data);
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="survey-detail-wrapper">
      {/* =====================
          헤더
      ===================== */}
      <div className="survey-header">
        <h1 className="survey-title">{survey.title}</h1>
        <p className="survey-desc">{survey.description}</p>

        <div className="survey-meta">
          ⏱ {survey.estTimeMin}분 · 🎁 경험치 {rewardPoint}XP
        </div>
      </div>

      {/* =====================
          질문 목록
      ===================== */}
      <div className="survey-question-list">
        {(survey.questions || []).map((q) => (
          <div key={q.questionId} className="survey-question-card">
            <h2 className="survey-question-title">
              {q.questionNo}. {q.questionText}
              {(q.requiredYn === "Y" || q.required === true) && (
                <span style={{ marginLeft: 6 }}>*</span>
              )}
            </h2>

            {/* 객관식 */}
            {q.questionType !== "TEXT" && q.options && q.options.length > 0 && (
              <div className="survey-options">
                {q.options.map((o) => (
                  <button
                    key={o.optionId}
                    type="button"
                    className={`survey-option ${
                      answers[q.questionId]?.optionId === o.optionId ? "active" : ""
                    }`}
                    onClick={() => handleSelect(q.questionId, o.optionId)}
                  >
                    {o.optionText}
                  </button>
                ))}
              </div>
            )}

            {/* 서술형 (인터뷰형) */}
            {q.questionType === "TEXT" && (
              <textarea
                className="survey-textarea"
                placeholder="자유롭게 의견을 작성해주세요"
                value={answers[q.questionId]?.answerText || ""}
                onChange={(e) => handleTextChange(q.questionId, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      {/* =====================
          제출 버튼
      ===================== */}
      <div className="survey-submit-bar">
        <button
          className="survey-submit-btn"
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting ? "제출 중..." : "설문 제출하기"}
        </button>
      </div>
    </div>
  );
}
