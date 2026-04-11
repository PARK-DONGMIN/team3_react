// src/domains/schedule/aiSchedule.js

/**
 * 체크리스트 + 스케줄 → AI 요청 payload 생성
 */
export function buildAiRequest(schedule, checklistItems) {
  return {
    schedule: {
      title: schedule.scheduleTitle ?? schedule.title,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      regionId: schedule.regionId,
      cityId: schedule.cityId,
      people: schedule.peopleCount,
      budget: schedule.budget,
      difficulty: schedule.requestDifficulty,
    },
    checklist: checklistItems.map((i) => ({
      category: i.category,
      name: i.itemName,
    })),
    request: {
      goal: "체크리스트 조건을 충족하는 일정 재구성",
    },
  };
}

/**
 * AI 결과 → ScheduleDetail에서 사용하는 coursePlans 구조로 저장
 */
export function applyAiResult(scheduleId, aiResponse, checklist) {
  const storageKey = `coursePlans_${scheduleId}`;

  const days = {};
  Object.entries(aiResponse.dayPlans || {}).forEach(([day, plan]) => {
    days[day] = plan;
  });

  localStorage.setItem(
    storageKey,
    JSON.stringify({
      source: "AI_CHECKLIST",
      checklistTitle: checklist?.title,
      days,
    })
  );
}
