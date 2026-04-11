// src/domains/schedule/ScheduleCreate.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./ScheduleCreate.css";

import DayCourseBuilder from "../route/DayCourseBuilder";
import { scheduleApi } from "../../api/schedule";
import { locationApi } from "../../api/location";
import { scheduleDetailApi } from "../../api/scheduleDetailApi"; // ✅ 추가

const MAX_DAYS = 7;

function daysBetweenInclusive(start, end) {
  if (!start || !end) return 1;
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.floor((e - s) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

const pickName = (p) => p?.place_name || p?.name || p?.title || "";
const pickAddr = (p) => p?.road_address_name || p?.address_name || p?.address || "";
const pickLat = (p) => Number(p?.lat ?? p?.y);
const pickLng = (p) => Number(p?.lng ?? p?.x);
const pickCat = (p) => p?.category_group_name || p?.category_name || p?.category || null;

const pickPlaceIdNum = (p) => {
  const raw = p?.id ?? p?.place_id ?? p?.placeId ?? null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
};

function buildDetailsFromPlans(dayPlans) {
  const details = [];
  (dayPlans || []).forEach((d, dayIdx) => {
    let order = 1;

    const push = (type, p) => {
      if (!p) return;
      const lat = pickLat(p);
      const lng = pickLng(p);

      details.push({
        dayNumber: dayIdx + 1,
        orderInDay: order++,
        type,
        placeName: pickName(p),
        address: pickAddr(p),
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
      });
    };

    push("START", d?.start);
    (d?.waypoints || []).forEach((w) => push("WAYPOINT", w));
    push("END", d?.end);
    (d?.pickedPois || d?.pois || []).forEach((p) => push("POI", p));
  });
  return details;
}

/**
 * ✅ ScheduleCreate에서 DB 저장을 DayCourseBuilder(saveDay)와 동일한 포맷으로 맞춤
 * - scheduleDetailApi.saveDay(/schedule/detail/day/{sid}/{dn})에 넣는 rows 배열 생성
 */
function buildRowsFromPlanForSaveDay(scheduleId, dayNumber, plan) {
  const rows = [];
  let ord = 1;

  const push = (stopType, p, extra = {}) => {
    if (!p) return;
    const lat = pickLat(p);
    const lng = pickLng(p);

    rows.push({
      scheduleId: Number(scheduleId),
      dayNumber: Number(dayNumber),
      orderInDay: ord++,
      stopType,
      placeId: pickPlaceIdNum(p),
      placeName: pickName(p) || "(장소)",
      category: pickCat(p),
      address: pickAddr(p) || null,
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      startTime: null,
      endTime: null,
      cost: null,
      memo: plan?.memo ?? null,
      distanceKM: null,
      ...extra,
    });
  };

  // START (distanceKM는 START에만)
  push("START", plan?.start, {
    distanceKM: plan?.distanceM != null ? Number(plan.distanceM) / 1000 : null,
  });

  // WAYPOINT
  (Array.isArray(plan?.waypoints) ? plan.waypoints : []).forEach((w) => push("WAYPOINT", w));

  // END
  push("END", plan?.end);

  // POI
  (Array.isArray(plan?.pickedPois) ? plan.pickedPois : plan?.pois || []).forEach((p) => push("POI", p));

  return rows;
}

function addDaysISO(iso, plusDays) {
  const d = new Date(iso);
  d.setDate(d.getDate() + plusDays);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const getRegionName = (r) => (r?.regionName ?? r?.name ?? "").trim();
const getCityName = (c) => (c?.cityName ?? c?.name ?? "").trim();

/** ✅ 문자열 비교용 normalize */
const norm = (s) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

/** ✅ name으로 region/city id 찾기 */
function findRegionIdByName(regions, regionName) {
  const key = norm(regionName);
  if (!key) return null;

  const hit = (regions || []).find((r) => {
    const n = norm(getRegionName(r));
    return n && (n.includes(key) || key.includes(n));
  });

  return hit ? Number(hit?.regionId ?? hit?.id) : null;
}

function findCityIdByName(cities, cityName) {
  const key = norm(cityName);
  if (!key) return null;

  const hit = (cities || []).find((c) => {
    const n = norm(getCityName(c));
    return n && (n.includes(key) || key.includes(n));
  });

  return hit ? Number(hit?.cityId ?? hit?.id) : null;
}

/* ============================================================
   ✅ draftStorageKey(localStorage)에 저장된 최신 dayPlans 읽기
============================================================ */
function readPlansFromDraftStorage(draftStorageKey, totalDays) {
  try {
    const raw = localStorage.getItem(draftStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    const daysObj = parsed?.days;
    if (!daysObj || typeof daysObj !== "object") return null;

    const need = Math.max(1, totalDays || 1);
    const plansArr = Array.from({ length: need }, (_, i) => {
      const dayNum = i + 1;
      return daysObj?.[dayNum] ?? null;
    });

    return plansArr;
  } catch (e) {
    console.warn("readPlansFromDraftStorage fail:", e);
    return null;
  }
}

/** ✅ time 기본값(선택사항): 빈값이면 "" */
const clampTime = (t) => (typeof t === "string" ? t.slice(0, 5) : "");

export default function ScheduleCreate() {
  const nav = useNavigate();
  const loc = useLocation();

  const userNo = Number(localStorage.getItem("userNo") || 1);

  // ✅ 원하는 순서로 steps 재배치
  const steps = [
    { title: "제목", desc: "여행 제목을 먼저 정해줘" },                 // 0
    { title: "출발/도착", desc: "지역/도시를 선택해줘" },               // 1
    { title: "시간+날짜", desc: "출발·종료 시간 + 여행 기간(최대 7일)" }, // 2
    { title: "동행", desc: "누구와 가?" },                             // 3
    { title: "설정", desc: "인원/예산/공개/메모" },                     // 4
    { title: "일차별 코스", desc: "코스를 저장하면 완료!" },            // 5
  ];

  const [step, setStep] = useState(0);

  const [regions, setRegions] = useState([]);
  const [startCities, setStartCities] = useState([]);
  const [endCities, setEndCities] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ UX: 기본은 "도착=출발"
  const [sameAsStart, setSameAsStart] = useState(true);

  const [form, setForm] = useState({
    userNo,

    // ✅ 출발/도착 분리
    startRegionId: null,
    startCityId: null,
    endRegionId: null,
    endCityId: null,

    // ✅ 출발/종료 시간
    startTime: "", // "HH:mm"
    endTime: "",

    scheduleTitle: "",
    startDate: "",
    endDate: "",
    travelWith: "",
    peopleCount: 1,
    budget: 0,
    isPublic: "Y",
    memo: "",
    requestDifficulty: "초급",
  });

  const totalDays = useMemo(
    () => daysBetweenInclusive(form.startDate, form.endDate),
    [form.startDate, form.endDate]
  );

  const [dayTab, setDayTab] = useState(1);
  const [dayPlans, setDayPlans] = useState([]);

  /* ============================================================
     ✅ 새 일정 만들기는 기본 "새 draftKey"
  ============================================================ */
  const [draftStorageKey] = useState(() => {
    const st = loc?.state;

    // ✅ 기본은 새로 만들기 (state로 forceNewDraft:false 넘기면 이어쓰기 허용)
    const forceNew = st?.forceNewDraft !== false;

    const existing = sessionStorage.getItem("TL_DRAFT_COURSE_KEY");

    // ✅ 이어쓰기(정말 원할 때만)
    if (!forceNew && existing) return existing;

    // ✅ 새로 만들기라면: 기존 draft(localStorage) 삭제해서 이전 출발/도착이 안 뜨게
    if (existing) {
      try {
        localStorage.removeItem(existing);
      } catch (e) {
        console.log(e);
      }
    }

    const k = `coursePlans_draft_${userNo}_${Date.now()}`;
    sessionStorage.setItem("TL_DRAFT_COURSE_KEY", k);
    return k;
  });

  // ✅ 새 일정 진입 시, 예전 prefill 메타가 남아있으면 자동매칭될 수 있어서 제거
  useEffect(() => {
    const st = loc?.state;
    const hasPrefill = !!(st?.prefillForm || st?.prefillDayPlans);

    if (!hasPrefill) {
      try {
        sessionStorage.removeItem("TL_PREFILL_CITY_NAMES");
      } catch (e) {
        console.log(e);
      }
    }
  }, [loc?.state]);

  // ✅ 지역 로드
  useEffect(() => {
    (async () => {
      try {
        const r = await locationApi.regions();
        setRegions(Array.isArray(r) ? r : []);
      } catch (e) {
        console.error(e);
        setError("지역 목록 로드 실패(/location/regions 확인)");
      }
    })();
  }, []);

  // ✅ 출발 도시 로드
  useEffect(() => {
    if (!form.startRegionId) {
      setStartCities([]);
      setForm((p) => ({ ...p, startCityId: null }));
      if (sameAsStart) setForm((p) => ({ ...p, endRegionId: null, endCityId: null }));
      return;
    }

    (async () => {
      try {
        const c = await locationApi.citiesByRegion(form.startRegionId);
        setStartCities(Array.isArray(c) ? c : []);
      } catch (e) {
        console.error(e);
        setError("출발 도시 목록 로드 실패(/location/cities... 확인)");
      }
    })();
  }, [form.startRegionId, sameAsStart]);

  // ✅ 도착 도시 로드
  useEffect(() => {
    if (!form.endRegionId) {
      setEndCities([]);
      setForm((p) => ({ ...p, endCityId: null }));
      return;
    }

    (async () => {
      try {
        const c = await locationApi.citiesByRegion(form.endRegionId);
        setEndCities(Array.isArray(c) ? c : []);
      } catch (e) {
        console.error(e);
        setError("도착 도시 목록 로드 실패(/location/cities... 확인)");
      }
    })();
  }, [form.endRegionId]);

  // ✅ sameAsStart=true면 end를 start로 자동 동기화
  useEffect(() => {
    if (!sameAsStart) return;
    setForm((p) => ({
      ...p,
      endRegionId: p.startRegionId,
      endCityId: p.startCityId,
    }));
  }, [sameAsStart, form.startRegionId, form.startCityId]);

  // ✅ prefill 적용(출발/도착, 제목/동행/난이도, dayPlans, 날짜)
  const prefillAppliedRef = useRef(false);
  useEffect(() => {
    const st = loc?.state;
    if (!st || prefillAppliedRef.current) return;

    const pf = st?.prefillForm || null;
    const plans = Array.isArray(st?.prefillDayPlans) ? st.prefillDayPlans : null;

    // 1) 텍스트류 세팅
    if (pf) {
      setForm((p) => ({
        ...p,
        scheduleTitle: pf.scheduleTitle ?? p.scheduleTitle,
        travelWith: pf.travelWith ?? p.travelWith,
        requestDifficulty: pf.requestDifficulty ?? p.requestDifficulty,
        startTime: clampTime(pf.startTime ?? p.startTime),
        endTime: clampTime(pf.endTime ?? p.endTime),
      }));
    }

    // 2) 출발/도착 name 기반 세팅
    if (pf && regions.length) {
      const startRegionName = pf.startRegionName ?? pf.regionName ?? null;
      const startCityName = pf.startCityName ?? pf.cityName ?? null;

      const endRegionName = pf.endRegionName ?? null;
      const endCityName = pf.endCityName ?? null;

      const hasEnd = !!(endRegionName || endCityName);
      if (hasEnd) setSameAsStart(false);

      const startRegionId = startRegionName
        ? findRegionIdByName(regions, startRegionName)
        : null;

      const endRegionId = hasEnd
        ? endRegionName
          ? findRegionIdByName(regions, endRegionName)
          : null
        : startRegionId;

      if (startRegionId) {
        setForm((p) => ({
          ...p,
          startRegionId,
          startCityId: null,
          ...(hasEnd
            ? { endRegionId: endRegionId ?? null, endCityId: null }
            : { endRegionId: startRegionId, endCityId: null }),
        }));
      }

      sessionStorage.setItem(
        "TL_PREFILL_CITY_NAMES",
        JSON.stringify({
          startCityName: startCityName ?? "",
          endCityName: endCityName ?? "",
          hasEnd,
        })
      );
    }

    // 3) plans가 있으면 날짜/일차도 세팅
    if (plans && plans.length) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const startISO = `${yyyy}-${mm}-${dd}`;
      const endISO = addDaysISO(startISO, Math.min(MAX_DAYS, plans.length) - 1);

      setForm((p) => ({
        ...p,
        startDate: startISO,
        endDate: endISO,
        peopleCount: pf?.travelWith === "혼자" ? 1 : p.peopleCount,
      }));

      setDayPlans(plans);

      // ✅ step 재배치 후에도: plans 있으면 코스편집(step 5)로 점프
      setStep(typeof st?.startStep === "number" ? Math.max(0, Math.min(5, st.startStep)) : 5);
      setDayTab(1);

      try {
        const daysObj = {};
        plans.forEach((pl, idx) => {
          daysObj[idx + 1] = {
            start: pl.start ?? null,
            end: pl.end ?? null,
            waypoints: Array.isArray(pl.waypoints) ? pl.waypoints : [],
            pickedPois: Array.isArray(pl.pickedPois) ? pl.pickedPois : [],
            memo: pl.memo ?? "",
            distanceM: typeof pl.distanceM === "number" ? pl.distanceM : null,
            updatedAt: new Date().toISOString(),
          };
        });

        localStorage.setItem(
          draftStorageKey,
          JSON.stringify({ scheduleId: null, days: daysObj, updatedAt: new Date().toISOString() })
        );
      } catch (e) {
        console.warn("prefill draft write failed:", e);
      }
    }

    prefillAppliedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc?.state, regions, draftStorageKey]);

  // ✅ startCities 로드된 뒤 startCityName 매칭
  useEffect(() => {
    let meta = null;
    try {
      meta = JSON.parse(sessionStorage.getItem("TL_PREFILL_CITY_NAMES") || "null");
    } catch (err) {
      console.log(err);
    }
    if (!meta) return;

    const { startCityName } = meta;
    if (!startCityName) return;

    if (!form.startCityId && startCities.length) {
      const id = findCityIdByName(startCities, startCityName);
      if (id) {
        setForm((p) => ({
          ...p,
          startCityId: id,
          ...(sameAsStart ? { endCityId: id } : {}),
        }));
      }
    }
  }, [startCities, form.startCityId, sameAsStart]);

  // ✅ endCities 로드된 뒤 endCityName 매칭
  useEffect(() => {
    let meta = null;
    try {
      meta = JSON.parse(sessionStorage.getItem("TL_PREFILL_CITY_NAMES") || "null");
    } catch (err) {
      console.log(err);
    }
    if (!meta) return;

    const { endCityName, hasEnd } = meta;
    if (!hasEnd) return;
    if (!endCityName) return;
    if (sameAsStart) return;

    if (!form.endCityId && endCities.length) {
      const id = findCityIdByName(endCities, endCityName);
      if (id) setForm((p) => ({ ...p, endCityId: id }));
    }
  }, [endCities, form.endCityId, sameAsStart]);

  // ✅ 날짜 바뀌면 dayPlans 길이 보정
  useEffect(() => {
    setDayPlans((prev) => {
      const need = Math.max(1, totalDays);
      return Array.from({ length: need }, (_, i) => prev?.[i] ?? null);
    });
    setDayTab((prev) => Math.min(Math.max(1, prev), Math.max(1, totalDays)));
  }, [totalDays]);

  // ✅ step 검증 (순서 변경 반영)
  const step0Ok = !!form.scheduleTitle.trim(); // 제목
  const step1Ok = // 출발/도착
    !!form.startRegionId && !!form.startCityId && !!form.endRegionId && !!form.endCityId;

  const step2Ok = // 시간 + 날짜
    !!form.startTime &&
    !!form.endTime &&
    !!form.startDate &&
    !!form.endDate &&
    form.startDate <= form.endDate &&
    totalDays <= MAX_DAYS;

  const step3Ok = !!form.travelWith; // 동행
  const step4Ok = Number(form.peopleCount) >= 1; // 설정(인원)

  const step5Ok = useMemo(() => {
    const need = Math.max(1, totalDays);
    for (let i = 0; i < need; i++) {
      const d = dayPlans?.[i];
      if (!d?.start || !d?.end) return false;
    }
    return true;
  }, [dayPlans, totalDays]);

  const validateStep = () => {
    setError("");
    if (step === 0 && !step0Ok) return setError("여행 제목을 입력해줘!");
    if (step === 1 && !step1Ok) return setError("출발/도착 지역·도시를 모두 선택해줘!");
    if (step === 2 && !step2Ok) return setError(`시간/날짜 확인! (최대 ${MAX_DAYS}일, 시간도 필수)`);
    if (step === 3 && !step3Ok) return setError("동행을 선택해줘!");
    if (step === 4 && !step4Ok) return setError("인원은 1명 이상!");
    if (step === 5 && !step5Ok) return setError("모든 일차에 출발/도착이 있어야 해!");
    return true;
  };

  const next = () => {
    const ok = validateStep();
    if (ok === true) setStep((s) => Math.min(5, s + 1));
  };

  const back = () => {
    setError("");
    if (step === 0) return nav(-1);
    setStep((s) => Math.max(0, s - 1));
  };

  // ✅ DayCourseBuilder 저장 콜백
  const onSavedDay = ({ savedDay, nextDay, plan }) => {
    if (!Number.isFinite(savedDay)) return;

    setDayPlans((prev) => {
      const nextArr = [...(prev || [])];
      nextArr[savedDay - 1] = plan;
      return nextArr;
    });

    if (Number.isFinite(nextDay)) {
      setDayTab(Math.min(Math.max(1, nextDay), Math.max(1, totalDays)));
    }
  };

  const doneDays = useMemo(() => {
    const out = [];
    for (let i = 0; i < Math.max(1, totalDays); i++) {
      const d = dayPlans?.[i];
      if (d?.start && d?.end) out.push(i + 1);
    }
    return out;
  }, [dayPlans, totalDays]);

  const submit = async () => {
    const ok = validateStep();
    if (ok !== true) return;

    try {
      setLoading(true);
      setError("");

      const endRegionId = form.endRegionId ?? form.startRegionId;
      const endCityId = form.endCityId ?? form.startCityId;

      const payload = {
        userNo: form.userNo,
        startRegionId: form.startRegionId,
        startCityId: form.startCityId,
        endRegionId,
        endCityId,

        // ✅ [추가]
        startTime: form.startTime,
        endTime: form.endTime,

        scheduleTitle: form.scheduleTitle,
        startDate: form.startDate,
        endDate: form.endDate,
        peopleCount: Number(form.peopleCount),
        budget: Number(form.budget),
        isPublic: form.isPublic,
        memo: form.memo,
        requestDifficulty: form.requestDifficulty,
      };

      let created = null;

      try {
        created = await scheduleApi.create(payload);
      } catch (e) {
        // ✅ 백엔드가 startTime/endTime을 싫어하면(400/415) -> 시간 필드 제거해서 재시도
        const status = e?.response?.status;
        if (status === 400 || status === 415) {
          const safePayload = { ...payload };
          delete safePayload.startTime;
          delete safePayload.endTime;
          created = await scheduleApi.create(safePayload);

          // 프론트에서 시간은 유지되게 로컬에 따로 저장
          try {
            localStorage.setItem(
              "TL_LAST_TIME_RANGE",
              JSON.stringify({ startTime: form.startTime, endTime: form.endTime })
            );
          } catch (err) {
            console.log(err);
          }
        } else {
          throw e;
        }
      }

      const scheduleId = created?.scheduleId ?? created?.id;

      if (!scheduleId) {
        setError("생성 응답에 scheduleId가 없음(백엔드 응답 확인 필요)");
        return;
      }

      // ✅ draft -> scheduleId용으로 복사 (기존 로컬 구조 유지)
      try {
        const draftRaw = localStorage.getItem(draftStorageKey);
        if (draftRaw) localStorage.setItem(`coursePlans_${scheduleId}`, draftRaw);
      } catch (e) {
        console.warn("draft copy failed:", e);
      }

      // ✅ 최신 저장본 우선 사용
      const latestPlans = readPlansFromDraftStorage(draftStorageKey, totalDays) || dayPlans;

      // ✅ (옵션) 로컬에도 남겨두기
      try {
        const details = buildDetailsFromPlans(latestPlans);
        localStorage.setItem(`scheduleDetails_${scheduleId}`, JSON.stringify(details));
      } catch (e) {
        console.warn("local scheduleDetails write failed:", e);
      }

      /**
       * ✅ 생성 직후 DB에 day별로 저장 (DayCourseBuilder 저장 방식과 동일)
       */
      try {
        const need = Math.max(1, totalDays);

        for (let d = 1; d <= need; d++) {
          const plan = latestPlans?.[d - 1];
          if (!plan?.start || !plan?.end) {
            throw new Error(`${d}일차에 출발/도착이 없어요. (${d}일차 저장 눌렀는지 확인!)`);
          }
          const rows = buildRowsFromPlanForSaveDay(scheduleId, d, plan);
          // eslint-disable-next-line no-await-in-loop
          await scheduleDetailApi.saveDay(Number(scheduleId), Number(d), rows);
        }
      } catch (e) {
        console.error("❌ create 후 schedule_detail 저장 실패:", e);
        setError(e?.message || "일정은 생성됐지만 코스 저장(DB)이 실패했어요. 콘솔/네트워크 확인!");
        return;
      }

      alert("일정 생성 완료! 🚴✨");

      // ✅ 다음 새 일정 만들 때 이전 값 섞이지 않도록 draft 정리 (nav 전에 실행!)
      try {
        localStorage.removeItem(draftStorageKey);
      } catch (e) {
        console.log(e);
      }
      try {
        sessionStorage.removeItem("TL_DRAFT_COURSE_KEY");
        sessionStorage.removeItem("TL_PREFILL_CITY_NAMES");
      } catch (e) {
        console.log(e);
      }

      nav(`/schedule/${scheduleId}`, { replace: true, state: { openDay: 1 } });
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.message || e?.message || "일정 생성 실패");
    } finally {
      setLoading(false);
    }
  };

  const startRegionLabel = useMemo(() => {
    const hit = regions.find((r) => (r?.regionId ?? r?.id) === form.startRegionId);
    return hit ? getRegionName(hit) : "";
  }, [regions, form.startRegionId]);

  const startCityLabel = useMemo(() => {
    const hit = startCities.find((c) => (c?.cityId ?? c?.id) === form.startCityId);
    return hit ? getCityName(hit) : "";
  }, [startCities, form.startCityId]);

  const endRegionLabel = useMemo(() => {
    const hit = regions.find((r) => (r?.regionId ?? r?.id) === form.endRegionId);
    return hit ? getRegionName(hit) : "";
  }, [regions, form.endRegionId]);

  const endCityLabel = useMemo(() => {
    const list = sameAsStart ? startCities : endCities;
    const hit = list.find((c) => (c?.cityId ?? c?.id) === form.endCityId);
    return hit ? getCityName(hit) : "";
  }, [sameAsStart, startCities, endCities, form.endCityId]);

  const progressPct = useMemo(() => {
    const total = steps.length - 1;
    return Math.round((step / total) * 100);
  }, [step]);

  const curTitle = steps?.[step]?.title ?? "";
  const curDesc = steps?.[step]?.desc ?? "";

  return (
    <div className="sc-wrap">
      {/* 헤더 */}
      <div className="sc-head">
        <div>
          <h1 className="sc-title">새 여행 일정 만들기</h1>
          <p className="sc-desc">한 단계씩 입력하고 다음으로 넘어가요!</p>

          <div className="sc-summary">
            <span className="sc-summary-pill">
              제목: {form.scheduleTitle?.trim() ? form.scheduleTitle : "미입력"}
            </span>
            <span className="sc-summary-pill">
              출발:{" "}
              {startRegionLabel && startCityLabel
                ? `${startRegionLabel} · ${startCityLabel}`
                : "미선택"}
            </span>
            <span className="sc-summary-pill">
              도착:{" "}
              {endRegionLabel && endCityLabel ? `${endRegionLabel} · ${endCityLabel}` : "미선택"}
            </span>
            <span className="sc-summary-pill">
              시간: {form.startTime && form.endTime ? `${form.startTime} ~ ${form.endTime}` : "미입력"}
            </span>
            <span className="sc-summary-pill">
              날짜: {form.startDate && form.endDate ? `${form.startDate} ~ ${form.endDate}` : "미선택"}
            </span>
          </div>
        </div>
      </div>

      {/* wizard 진행도 */}
      <div className="sc-wizard">
        <div className="sc-wizard-top">
          <div className="sc-wizard-step">
            <div className="sc-wizard-badge">{step + 1}</div>
            <div>
              <div className="sc-wizard-title">{curTitle}</div>
              <div className="sc-wizard-desc">{curDesc}</div>
            </div>
          </div>
          <div className="sc-wizard-pct">{progressPct}%</div>
        </div>

        <div className="sc-progress">
          <div className="sc-progress-bar" style={{ width: `${progressPct}%` }} />
        </div>

        <div className="sc-wizard-dots" aria-label="steps">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className={`sc-dot ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}
              title={`${i + 1}. ${s.title}`}
            />
          ))}
        </div>
      </div>

      {error && <div className="sc-error">{error}</div>}

      <div className="sc-card">
        {/* ✅ step 0: 제목 */}
        {step === 0 && (
          <>
            <h2 className="sc-card-title">여행 제목</h2>
            <input
              className="sc-input"
              value={form.scheduleTitle}
              onChange={(e) => setForm((p) => ({ ...p, scheduleTitle: e.target.value }))}
              placeholder="예) 한강 라이딩 당일치기"
            />
            <div className="sc-mini">* 사람들이 보기 쉬운 코스 이름으로 추천!</div>
          </>
        )}

        {/* ✅ step 1: 출발/도착 */}
        {step === 1 && (
          <>
            <h2 className="sc-card-title">출발/도착</h2>

            <div className="sc-toggle-row">
              <label className="sc-toggle">
                <input
                  type="checkbox"
                  checked={sameAsStart}
                  onChange={(e) => {
                    const v = e.target.checked;
                    setSameAsStart(v);

                    if (v) {
                      setForm((p) => ({
                        ...p,
                        endRegionId: p.startRegionId,
                        endCityId: p.startCityId,
                      }));
                    } else {
                      setForm((p) => ({
                        ...p,
                        endRegionId: p.endRegionId ?? p.startRegionId,
                        endCityId: p.endCityId ?? null,
                      }));
                    }
                  }}
                />
                <span>도착지를 출발지와 동일하게</span>
              </label>
              <div className="sc-toggle-hint">당일치기/왕복 라이딩이면 체크 추천!</div>
            </div>

            <div className="sc-grid2">
              <div>
                <label className="sc-label">출발 지역</label>
                <select
                  className="sc-select"
                  value={form.startRegionId ?? ""}
                  onChange={(e) => {
                    const v = e.target.value === "" ? null : Number(e.target.value);
                    setForm((p) => ({
                      ...p,
                      startRegionId: v,
                      startCityId: null,
                      ...(sameAsStart ? { endRegionId: v, endCityId: null } : {}),
                    }));
                  }}
                >
                  <option value="">출발 지역 선택</option>
                  {regions.map((r) => {
                    const id = r?.regionId ?? r?.id;
                    const name = getRegionName(r) || "지역";
                    return (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="sc-label">출발 도시</label>
                <select
                  className="sc-select"
                  value={form.startCityId ?? ""}
                  disabled={!form.startRegionId}
                  onChange={(e) => {
                    const cityId = e.target.value === "" ? null : Number(e.target.value);
                    setForm((p) => ({
                      ...p,
                      startCityId: cityId,
                      ...(sameAsStart ? { endCityId: cityId } : {}),
                    }));
                  }}
                >
                  <option value="">
                    {!form.startRegionId ? "먼저 출발 지역 선택" : "출발 도시 선택"}
                  </option>
                  {startCities.map((c) => {
                    const id = c?.cityId ?? c?.id;
                    const name = getCityName(c) || "도시";
                    return (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="sc-label">도착 지역</label>
                <select
                  className="sc-select"
                  value={form.endRegionId ?? ""}
                  disabled={sameAsStart}
                  onChange={(e) => {
                    const v = e.target.value === "" ? null : Number(e.target.value);
                    setForm((p) => ({
                      ...p,
                      endRegionId: v,
                      endCityId: null,
                    }));
                  }}
                >
                  <option value="">{sameAsStart ? "출발지와 동일" : "도착 지역 선택"}</option>
                  {regions.map((r) => {
                    const id = r?.regionId ?? r?.id;
                    const name = getRegionName(r) || "지역";
                    return (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="sc-label">도착 도시</label>
                <select
                  className="sc-select"
                  value={form.endCityId ?? ""}
                  disabled={sameAsStart || !form.endRegionId}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      endCityId: e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                >
                  <option value="">
                    {sameAsStart
                      ? "출발지와 동일"
                      : !form.endRegionId
                      ? "먼저 도착 지역 선택"
                      : "도착 도시 선택"}
                  </option>

                  {!sameAsStart &&
                    endCities.map((c) => {
                      const id = c?.cityId ?? c?.id;
                      const name = getCityName(c) || "도시";
                      return (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      );
                    })}
                </select>
              </div>
            </div>
          </>
        )}

        {/* ✅ step 2: 시간 + 날짜 */}
        {step === 2 && (
          <>
            <h2 className="sc-card-title">출발/종료 시간 + 날짜</h2>

            {/* 시간 입력 */}
            <div className="sc-grid2">
              <div>
                <label className="sc-label">출발 시간</label>
                <input
                  className="sc-input"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                />
              </div>
              <div>
                <label className="sc-label">종료 시간</label>
                <input
                  className="sc-input"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                />
              </div>
            </div>

            {/* 날짜 입력 */}
            <div className="sc-grid2 sc-mt16">
              <div>
                <label className="sc-label">시작일</label>
                <input
                  className="sc-input"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="sc-label">종료일</label>
                <input
                  className="sc-input"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="sc-mini">
              총 {totalDays}일 (최대 {MAX_DAYS}일) · 시간은 하루 기준(예: 09:00~18:00)
            </div>
          </>
        )}

        {/* step 3: 동행 */}
        {step === 3 && (
          <>
            <h2 className="sc-card-title">동행</h2>
            <div className="sc-choice-grid">
              {["혼자", "연인", "친구", "가족", "동호회"].map((x) => (
                <button
                  key={x}
                  type="button"
                  className={`sc-choice ${form.travelWith === x ? "active" : ""}`}
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      travelWith: x,
                      peopleCount: x === "혼자" ? 1 : p.peopleCount,
                    }))
                  }
                >
                  {x}
                </button>
              ))}
            </div>
          </>
        )}

        {/* step 4: 설정 */}
        {step === 4 && (
          <>
            <h2 className="sc-card-title">설정</h2>

            <label className="sc-label">인원</label>
            <input
              className="sc-input"
              type="number"
              min="1"
              value={form.peopleCount}
              disabled={form.travelWith === "혼자"}
              onChange={(e) => setForm((p) => ({ ...p, peopleCount: Number(e.target.value) }))}
            />

            <label className="sc-label">예산(원)</label>
            <input
              className="sc-input"
              type="number"
              min="0"
              value={form.budget}
              onChange={(e) => setForm((p) => ({ ...p, budget: Number(e.target.value) }))}
            />

            <label className="sc-label">공개</label>
            <select
              className="sc-select"
              value={form.isPublic}
              onChange={(e) => setForm((p) => ({ ...p, isPublic: e.target.value }))}
            >
              <option value="Y">공개</option>
              <option value="N">비공개</option>
            </select>

            <label className="sc-label">난이도</label>
            <select
              className="sc-select"
              value={form.requestDifficulty}
              onChange={(e) => setForm((p) => ({ ...p, requestDifficulty: e.target.value }))}
            >
              <option value="초급">초급</option>
              <option value="중급">중급</option>
              <option value="고급">고급</option>
            </select>

            <label className="sc-label">메모</label>
            <textarea
              className="sc-textarea"
              value={form.memo}
              onChange={(e) => setForm((p) => ({ ...p, memo: e.target.value }))}
              placeholder="예) 점심은 12시쯤, 비 오면 실내 코스로 변경"
            />
          </>
        )}

        {/* step 5: 일차별 코스 */}
        {step === 5 && (
          <DayCourseBuilder
            scheduleId={null}
            dayNumber={dayTab}
            dayCount={Math.max(1, totalDays)}
            storageKey={draftStorageKey}
            onChangeDay={setDayTab}
            doneDays={doneDays}
            prefillPlan={dayPlans?.[dayTab - 1] || null}
            onSaved={onSavedDay}
          />
        )}

        {/* 하단 액션 */}
        <div className="sc-actions">
          <button type="button" className="sc-btn ghost" onClick={back}>
            이전
          </button>

          {step < 5 ? (
            <button type="button" className="sc-btn primary" onClick={next}>
              다음
            </button>
          ) : (
            <button
              type="button"
              className="sc-btn primary"
              onClick={submit}
              disabled={loading || !step5Ok}
            >
              {loading ? "생성 중..." : "일정 생성"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
