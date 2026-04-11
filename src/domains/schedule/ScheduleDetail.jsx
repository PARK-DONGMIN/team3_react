// src/domains/schedule/ScheduleDetail.jsx
import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import "./ScheduleDetail.css";

import { scheduleApi } from "../../api/schedule";
import { scheduleDetailApi } from "../../api/scheduleDetailApi";
import { locationApi } from "../../api/location";

import { getLoginUserNo } from "../../utils/auth";

// ✅ AiPanel
import AiPanel from "../ai/AiPanel";

// ✅ AI API
import { aiApi } from "../../api/aiApi";

/* ---------- utils ---------- */

function normalizeDateOnly(v) {
  if (!v) return "";
  if (typeof v === "string") {
    const s = v.trim();
    if (s.length >= 10) return s.slice(0, 10);
    return s;
  }
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return "";
  }
}

function parseDateLocal(yyyyMmDd) {
  const s = normalizeDateOnly(yyyyMmDd);
  if (!s) return null;
  const [y, m, d] = s.split("-").map((x) => Number(x));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return new Date(y, m - 1, d);
}

function daysBetweenInclusive(start, end) {
  const s = parseDateLocal(start);
  const e = parseDateLocal(end);
  if (!s || !e) return 0;

  const ms = 1000 * 60 * 60 * 24;
  const diff = Math.floor((e.getTime() - s.getTime()) / ms);
  return diff + 1;
}

function formatMoney(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "-";
  return num.toLocaleString("ko-KR");
}

function diffTone(v) {
  if (v === "고급") return "hard";
  if (v === "중급") return "mid";
  return "easy";
}

// ✅ NEW: risk badge tone
function riskTone(v) {
  if (v === "HIGH") return "high";
  if (v === "MID") return "mid";
  if (v === "LOW") return "low";
  return "unknown";
}

const pickAddress = (p) => p?.road_address_name || p?.address_name || p?.address || p?.addr || "";

function toDateInputValue(v) {
  if (!v) return "";
  if (typeof v === "string") return v.slice(0, 10);
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return "";
  }
}

/** ✅ 좌표 추출 강화 */
function getLatLng(p) {
  if (!p) return null;

  const latRaw = p?.lat ?? p?.y ?? p?.mapy ?? p?.latitude ?? p?.Latitude ?? p?.LAT ?? p?.LATITUDE;
  const lngRaw = p?.lng ?? p?.x ?? p?.mapx ?? p?.longitude ?? p?.Longitude ?? p?.LNG ?? p?.LONGITUDE;

  const lat = Number(latRaw);
  const lng = Number(lngRaw);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(s));
}

function estimateBikeMinutes(km, speedKmh = 15) {
  if (!Number.isFinite(km) || km <= 0) return null;
  const hours = km / speedKmh;
  const min = Math.max(1, Math.round(hours * 60));
  return min;
}

/** ✅ DB(schedule_detail) row -> 화면 POI 형태로 변환 */
function mapScheduleDetailRowToPoi(r, fallbackKey) {
  const placeId = r?.placeId ?? r?.place_id ?? r?.placeNo ?? r?.place_no ?? r?.id ?? null;

  const lat = Number(r?.lat ?? r?.y ?? r?.mapy);
  const lng = Number(r?.lng ?? r?.x ?? r?.mapx);

  return {
    id: r?.detailId ?? r?.detail_id ?? r?.id ?? fallbackKey,
    place_id: placeId ?? fallbackKey,
    placeId: placeId ?? fallbackKey,

    name: r?.placeName ?? r?.place_name ?? r?.name ?? "장소",
    place_name: r?.placeName ?? r?.place_name ?? r?.name ?? "장소",

    category: r?.category ?? r?.category_name ?? "",
    category_name: r?.category ?? r?.category_name ?? "",

    address: r?.address ?? r?.addr ?? "",
    address_name: r?.address ?? r?.addr ?? "",
    road_address_name: r?.address ?? r?.addr ?? "",

    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
    y: Number.isFinite(lat) ? String(lat) : undefined,
    x: Number.isFinite(lng) ? String(lng) : undefined,

    memo: r?.memo ?? "",
    stopType: r?.stopType ?? r?.stop_type ?? "POI",
    orderInDay: r?.orderInDay ?? r?.order_in_day ?? 0,

    place_url: r?.placeUrl ?? r?.place_url ?? r?.url ?? "",
  };
}

/** ✅ 해시태그 merge (중복 제거 + 공백 구분 유지) */
function mergeHashtags(current, nextArr) {
  const cur = String(current || "")
    .split(" ")
    .map((x) => x.trim())
    .filter(Boolean);

  const next = (Array.isArray(nextArr) ? nextArr : [])
    .map((x) => String(x || "").trim())
    .filter(Boolean);

  const set = new Set(cur);
  next.forEach((t) => set.add(t));

  return Array.from(set).join(" ");
}

function stopTypeUpper(r) {
  return String(r?.stopType ?? r?.stop_type ?? "").trim().toUpperCase();
}

function orderInDayNum(r) {
  const n = Number(r?.orderInDay ?? r?.order_in_day ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export default function ScheduleDetail() {
  const nav = useNavigate();
  const { scheduleId } = useParams();
  const location = useLocation();

  const loginUserNo = useMemo(() => Number(getLoginUserNo?.() || 0), []);
  const isAuthed = loginUserNo > 0;

  const shareCodeFromQuery = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    return sp.get("shareCode") || "";
  }, [location.search]);

  const isShareMode = !!shareCodeFromQuery;

  const scheduleIdNum = useMemo(() => Number(scheduleId), [scheduleId]);
  const isValidScheduleId = Number.isFinite(scheduleIdNum) && scheduleIdNum > 0;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  // ✅ 로컬/DB 코스(기존 유지)
  const [courseDays, setCourseDays] = useState({});
  const [dayTab, setDayTab] = useState(1);

  // ✅ DB에서 불러온 “추가한 장소(POI)”
  const [dbPois, setDbPois] = useState([]);
  const [showAllPois, setShowAllPois] = useState(false);

  const [shareBusy, setShareBusy] = useState(false);
  const [shareCodeOverride, setShareCodeOverride] = useState("");

  const poiTitle = (p) => p?.place_name || p?.name || p?.title || "장소";
  const poiCategory = (p) => p?.category_name || p?.category || "";
  const poiKey = (p, i) => p?.id || p?.place_id || p?.placeId || p?.place_url || `${i}`;

  const poiImg = (p) =>
    p?.imageUrl ||
    p?.image_url ||
    p?.thumbnail ||
    p?.thumb ||
    p?.photoUrl ||
    p?.photo_url ||
    p?.firstImageUrl ||
    p?.first_image_url ||
    "";

  const poiRating = (p) => p?.rating ?? p?.score ?? p?.star ?? null;
  const poiUrl = (p) => p?.place_url || p?.placeUrl || p?.url || "";

  const openPoi = (p) => {
    const url = poiUrl(p);
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  /* ---------- edit mode ---------- */
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const [regions, setRegions] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const [form, setForm] = useState({
    regionId: "",
    cityId: "",
    scheduleTitle: "",
    startDate: "",
    endDate: "",
    peopleCount: "",
    budget: "",
    memo: "",
    hashtags: "",
    isPublic: "Y",
    requestDifficulty: "",
  });

  // ✅ AI 해시태그 상태 (unused 경고 방지: 실제로 onAiHashtags에서 사용)
  const [aiTagBusy, setAiTagBusy] = useState(false);
  const [aiTagErr, setAiTagErr] = useState("");

  // ✅ NEW: AI 준비물/주의사항 상태
  const [prep, setPrep] = useState(null);
  const [prepBusy, setPrepBusy] = useState(false);
  const [prepErr, setPrepErr] = useState("");
  const [prepChecked, setPrepChecked] = useState({});

  // ✅ NEW: 접기/펼치기 상태 추가 (기본: 펼침)
  const [prepOpen, setPrepOpen] = useState(true);

  const requireLogin = (fromAction = "이 기능") => {
    if (isAuthed) return true;
    alert(`${fromAction}은(는) 로그인 후 사용 가능합니다! 🥺`);
    nav("/login", { replace: true, state: { from: location.pathname + location.search } });
    return false;
  };

  const load = async () => {
    try {
      setLoading(true);
      setErrMsg("");

      if (!isValidScheduleId) {
        setErrMsg("일정 번호가 올바르지 않습니다. (scheduleId 확인 필요)");
        return;
      }

      // shareCodeFromQuery는 scheduleApi가 무시해도 문제없음(추가 인자)
      const res = await scheduleApi.getDetails(scheduleIdNum, shareCodeFromQuery);
      setData(res);
    } catch (e) {
      console.error(e);
      setErrMsg("일정 정보를 불러오지 못했습니다. 🥺 (백엔드 /schedule/{id} 확인!)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleIdNum, shareCodeFromQuery]);

  // ✅ 지역 목록(한 번)
  useEffect(() => {
    (async () => {
      try {
        setLoadingRegions(true);
        const res = await locationApi.regions();
        setRegions(Array.isArray(res) ? res : []);
      } catch (e) {
        console.error("regions load fail", e);
        setRegions([]);
      } finally {
        setLoadingRegions(false);
      }
    })();
  }, []);

  // ✅ DB에서 전체 디테일 조회 -> dayNumber 묶기 (START/END/WAYPOINT/POI 정확히 분리)
  useEffect(() => {
    if (!isValidScheduleId) {
      setCourseDays({});
      return;
    }

    const canRead = isAuthed || !!shareCodeFromQuery;
    if (!canRead) {
      setCourseDays({});
      return;
    }

    (async () => {
      try {
        const rows = await scheduleDetailApi.listAll(scheduleIdNum, shareCodeFromQuery);
        const byDay = {};

        (Array.isArray(rows) ? rows : []).forEach((r) => {
          const day = Number(r.dayNumber ?? r.day_number);
          if (!Number.isFinite(day)) return;

          if (!byDay[day]) {
            byDay[day] = { start: null, end: null, waypoints: [], pickedPois: [], memo: null };
          }

          const st = stopTypeUpper(r);

          if (st === "START") byDay[day].start = r;
          else if (st === "END") byDay[day].end = r;
          else if (st === "WAYPOINT") byDay[day].waypoints.push(r);
          else if (st === "POI") byDay[day].pickedPois.push(r);
        });

        // 정렬 + memo 보정
        Object.keys(byDay).forEach((k) => {
          const d = Number(k);
          const obj = byDay[d];
          obj.waypoints = (obj.waypoints || []).slice().sort((a, b) => orderInDayNum(a) - orderInDayNum(b));
          obj.pickedPois = (obj.pickedPois || []).slice().sort((a, b) => orderInDayNum(a) - orderInDayNum(b));
          // memo는 rows에서 공통으로 내려오면 첫번째 기준으로 보여주도록
          const any = [...(obj.waypoints || []), ...(obj.pickedPois || []), obj.start, obj.end].filter(Boolean)[0];
          obj.memo = String(any?.memo ?? obj.memo ?? "");
        });

        setCourseDays(byDay);
      } catch (e) {
        if (isAuthed) console.error("schedule detail load fail", e);
        setCourseDays({});
      }
    })();
  }, [scheduleIdNum, isValidScheduleId, isAuthed, shareCodeFromQuery]);

  /* ---------- data parse ---------- */
  const title = data?.scheduleTitle ?? data?.schedule_title ?? "여행 일정";

  const startDateRaw = data?.startDate ?? data?.start_date ?? "";
  const endDateRaw = data?.endDate ?? data?.end_date ?? "";
  const startDate = normalizeDateOnly(startDateRaw);
  const endDate = normalizeDateOnly(endDateRaw);

  const difficulty = data?.requestDifficulty ?? data?.courseType ?? "-";
  const isPublic = data?.isPublic ?? data?.is_public ?? "Y";

  const shareCodeFromDetail = data?.shareCode ?? data?.share_code ?? "";
  const shareCode = shareCodeOverride || shareCodeFromDetail || shareCodeFromQuery;

  const shareUrl = shareCode ? `${window.location.origin}/schedule/share/${shareCode}` : "";

  const peopleCount = data?.peopleCount ?? data?.people_count ?? "";
  const budget = data?.budget ?? "";
  const memo = data?.memo ?? "";
  const hashtags = data?.hashtags ?? "";

  const regionId = data?.regionId ?? data?.region?.regionId ?? data?.region?.id ?? null;
  const cityId = data?.cityId ?? data?.city?.cityId ?? data?.city?.id ?? null;

  const [regionNameResolved, setRegionNameResolved] = useState("");
  const [cityNameResolved, setCityNameResolved] = useState("");

  const regionLabelRaw = data?.regionName ?? data?.region?.regionName ?? data?.region?.name ?? "";
  const cityLabelRaw = data?.cityName ?? data?.city?.cityName ?? data?.city?.name ?? "";

  useEffect(() => {
    if (!data) return;

    if (regionLabelRaw) setRegionNameResolved(regionLabelRaw);
    if (cityLabelRaw) setCityNameResolved(cityLabelRaw);

    (async () => {
      try {
        if (!regionLabelRaw && regionId) {
          const r = regions?.find((x) => (x?.regionId ?? x?.id) === regionId);
          if (r) setRegionNameResolved(r?.regionName ?? r?.name ?? "");
        }
        if (!cityLabelRaw && regionId && cityId) {
          const citiesRes = await locationApi.citiesByRegion(regionId);
          const c = Array.isArray(citiesRes)
            ? citiesRes.find((x) => (x?.cityId ?? x?.id) === cityId)
            : null;
          if (c) setCityNameResolved(c?.cityName ?? c?.name ?? "");
        }
      } catch (e) {
        console.error("지역/도시 이름 변환 실패:", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, regionId, cityId, regions]);

  const placeText = useMemo(() => {
    const r = regionNameResolved || regionLabelRaw;
    const c = cityNameResolved || cityLabelRaw;
    if (r || c) return `${r || ""}${r && c ? " · " : ""}${c || ""}`;
    return `지역ID ${regionId ?? "-"} · 도시ID ${cityId ?? "-"}`;
  }, [regionNameResolved, cityNameResolved, regionLabelRaw, cityLabelRaw, regionId, cityId]);

  const displayStart = editMode ? form.startDate || "" : startDate;
  const displayEnd = editMode ? form.endDate || "" : endDate;

  const totalDays = useMemo(() => daysBetweenInclusive(displayStart, displayEnd), [displayStart, displayEnd]);

  // ✅ course 저장 후 돌아오면 해당 일차 탭 자동 오픈
  useEffect(() => {
    const openDay = Number(location?.state?.openDay);
    if (!Number.isFinite(openDay)) return;

    const max = totalDays || 7;
    const clamped = Math.min(Math.max(1, openDay), max);
    setDayTab(clamped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.state?.openDay, totalDays]);

  useEffect(() => setShowAllPois(false), [dayTab]);

  // ✅ dayTab이 바뀔 때마다 DB에서 “추가한 장소(POI)” 불러오기 (shareCode 지원)
  useEffect(() => {
    if (!isValidScheduleId) return;

    const canRead = isAuthed || !!shareCodeFromQuery;
    if (!canRead) {
      setDbPois([]);
      return;
    }

    (async () => {
      try {
        const rows = await scheduleDetailApi.getDay(scheduleIdNum, dayTab, shareCodeFromQuery);
        const arr = Array.isArray(rows) ? rows : [];

        const poiOnly = arr
          .filter((r) => stopTypeUpper(r) === "POI")
          .sort((a, b) => orderInDayNum(a) - orderInDayNum(b));

        const mapped = poiOnly.map((r, i) => mapScheduleDetailRowToPoi(r, `${scheduleIdNum}_${dayTab}_POI_${i}`));
        setDbPois(mapped);
      } catch (e) {
        if (isAuthed) console.error("DB schedule_detail getDay fail:", e);
        setDbPois([]);
      }
    })();
  }, [isValidScheduleId, scheduleIdNum, dayTab, isAuthed, shareCodeFromQuery]);

  /* ---------- edit handlers ---------- */
  const onChangeRegion = async (v) => {
    setForm((p) => ({ ...p, regionId: v, cityId: "" }));
    setCities([]);
    if (!v) return;

    try {
      setLoadingCities(true);
      const res = await locationApi.citiesByRegion(Number(v));
      setCities(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error("cities load fail", e);
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  };

  const openEditInternal = async (overrideHashtags = null) => {
    const nextRegionId = regionId ? String(regionId) : "";
    const nextCityId = cityId ? String(cityId) : "";

    setForm({
      regionId: nextRegionId,
      cityId: nextCityId,
      scheduleTitle: title ?? "",
      startDate: toDateInputValue(startDate),
      endDate: toDateInputValue(endDate),
      peopleCount: peopleCount ?? "",
      budget: budget ?? "",
      memo: memo ?? "",
      hashtags: overrideHashtags != null ? overrideHashtags : hashtags ?? "",
      isPublic: isPublic ?? "Y",
      requestDifficulty: difficulty ?? "",
    });

    setEditMode(true);

    if (nextRegionId) {
      try {
        setLoadingCities(true);
        const res = await locationApi.citiesByRegion(Number(nextRegionId));
        setCities(Array.isArray(res) ? res : []);
      } catch (e) {
        console.error("cities load fail", e);
        setCities([]);
      } finally {
        setLoadingCities(false);
      }
    } else {
      setCities([]);
    }

    return true;
  };

  const openEdit = async () => {
    if (!requireLogin("수정")) return;
    return openEditInternal(null);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setSaving(false);
    setAiTagErr("");
  };

  const onSave = async () => {
    if (!requireLogin("저장")) return;

    if (!form.scheduleTitle?.trim()) {
      alert("일정 제목은 필수야! 🥺");
      return;
    }
    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      alert("시작일이 종료일보다 늦을 수 없어! 🥺");
      return;
    }
    if (form.regionId && !form.cityId) {
      alert("도시도 선택해줘! 🥺");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        regionId: form.regionId ? Number(form.regionId) : null,
        cityId: form.cityId ? Number(form.cityId) : null,
        scheduleTitle: form.scheduleTitle.trim(),
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        peopleCount: form.peopleCount === "" ? null : Number(form.peopleCount),
        budget: form.budget === "" ? null : Number(form.budget),
        memo: form.memo ?? "",
        hashtags: form.hashtags ?? "",
        isPublic: form.isPublic ?? "Y",
        requestDifficulty: form.requestDifficulty ?? "",
      };

      const updated = await scheduleApi.update(scheduleIdNum, payload, shareCodeFromQuery);
      setData(updated);
      setEditMode(false);
      alert("일정 수정 완료! ✅");
    } catch (e) {
      console.error(e);
      const status = e?.response?.status;
      if (status === 403) alert("수정 권한이 없어요. (OWNER/EDITOR만 가능) 🥺");
      else alert("수정 실패(백엔드 PUT /schedule/{id} 확인) 😭");
    } finally {
      setSaving(false);
    }
  };

  // ✅ AI 해시태그 추천 (mergeHashtags / aiTagBusy 사용 → unused 경고 제거)
  const onAiHashtags = async () => {
    if (!isValidScheduleId) {
      alert("일정 번호가 올바르지 않습니다. 🥺");
      return;
    }
    if (!requireLogin("AI 해시태그 추천")) return;

    try {
      setAiTagErr("");
      setAiTagBusy(true);

      const res = await aiApi.hashtags(scheduleIdNum, 0);
      const tags = Array.isArray(res?.hashtags) ? res.hashtags : [];

      if (!tags.length) {
        setAiTagErr("추천 해시태그가 비어있어요.");
        return;
      }

      const base = editMode ? form.hashtags : hashtags ?? "";
      const merged = mergeHashtags(base, tags);

      if (!editMode) {
        await openEditInternal(merged);
        alert("AI 추천 해시태그가 입력칸에 추가됐어! 오른쪽 위 ‘저장’ 누르면 반영돼 ✅");
        return;
      }

      setForm((p) => ({ ...p, hashtags: mergeHashtags(p.hashtags, tags) }));
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || "AI 해시태그 추천 실패";
      setAiTagErr(msg);
      alert(`AI 해시태그 추천 실패 😭\n${msg}`);
    } finally {
      setAiTagBusy(false);
    }
  };

  const copyText = async (text, successMsg = "복사 완료! 📋") => {
    if (!text) return;
    try {
      if (navigator?.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(String(text));
      } else {
        const ta = document.createElement("textarea");
        ta.value = String(text);
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.top = "-9999px";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);

        ta.focus();
        ta.select();
        ta.setSelectionRange(0, ta.value.length);

        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (!ok) throw new Error("execCommand(copy) failed");
      }
      alert(successMsg);
    } catch (err) {
      console.error(err);
      alert("복사 실패! HTTPS(또는 localhost)로 접속했는지/권한을 확인해줘 🥺");
    }
  };

  // ✅ NEW: AI 준비 체크 helpers
  const togglePrep = (key) => {
    setPrepChecked((p) => ({ ...p, [key]: !p[key] }));
  };

  const loadPrep = async (force = 0) => {
    if (!isValidScheduleId) return;

    try {
      setPrepErr("");
      setPrepBusy(true);

      const res = await aiApi.prep(scheduleIdNum, force);

      const next = {
        summary: String(res?.summary || ""),
        packing: Array.isArray(res?.packing) ? res.packing : [],
        cautions: Array.isArray(res?.cautions) ? res.cautions : [],
        riskLevel: String(res?.riskLevel || ""),
      };

      setPrep(next);
      setPrepChecked({});
      setPrepOpen(true); // ✅ NEW: 새로 생성하면 자동으로 펼치기
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || "AI 준비 체크 실패";
      setPrepErr(msg);
    } finally {
      setPrepBusy(false);
    }
  };

  const copyPrep = async () => {
    if (!prep) return;
    const text =
      `🧳 AI 준비 체크\n` +
      `${prep.summary ? `- ${prep.summary}\n` : ""}\n` +
      `✅ 준비물\n` +
      (prep.packing || []).map((x) => `- ${x}`).join("\n") +
      `\n\n⚠️ 주의사항\n` +
      (prep.cautions || []).map((x) => `- ${x}`).join("\n");
    await copyText(text, "준비 체크 복사 완료! 📋");
  };

  // ✅ NEW: 일정 상세 로드되면 Prep 자동 1회 로드(로그인 or 공유모드일 때만)
  useEffect(() => {
    if (!data) return;
    if (!isValidScheduleId) return;

    const canRead = isAuthed || !!shareCodeFromQuery;
    if (!canRead) return;

    if (prep || prepBusy) return;
    loadPrep(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, scheduleIdNum, isValidScheduleId, isAuthed, shareCodeFromQuery]);

  // ✅ 공유코드 생성/확보
  const ensureShareCode = async (payload = { channel: "LINK", scope: "LINK" }) => {
    try {
      if (!isValidScheduleId) {
        alert("일정 번호가 올바르지 않습니다. 🥺");
        return "";
      }

      // ✅ 공유 링크로 들어온 경우: 새 코드 만들지 말고 현재 코드 사용
      if (isShareMode) {
        return shareCodeFromQuery || shareCodeFromDetail || "";
      }

      if (!requireLogin("공유코드 생성")) return "";

      setShareBusy(true);

      const res = await scheduleApi.shareSchedule(scheduleIdNum, payload);
      const code = res?.shareCode || "";
      if (!code) throw new Error("share code missing");

      setShareCodeOverride(code);
      return code;
    } catch (e) {
      console.error("shareSchedule error:", e);
      const status = e?.response?.status;
      const data = e?.response?.data;
      const msg = data?.message || data?.error || e?.message || "공유 코드 생성 실패";

      alert(`공유 코드 생성 실패 ❌\nstatus: ${status}\nmsg: ${msg}\n\nresponse: ${JSON.stringify(data)}`);
      return "";
    } finally {
      setShareBusy(false);
    }
  };

  const copyCode = async () => {
    const code = await ensureShareCode({ channel: "LINK", scope: "LINK" });
    if (!code) return;
    await copyText(code, "공유 코드 복사 완료! 📋");
  };

  const copyShareLink = async () => {
    const code = await ensureShareCode({ channel: "LINK", scope: "LINK" });
    if (!code) return;

    const url = `${window.location.origin}/schedule/share/${code}`;
    await copyText(url, "공유 링크 복사 완료! 🔗");
  };

  const shareByEmail = async () => {
    if (isShareMode) {
      alert("공유 링크로 들어온 화면에서는 메일 발송 요청을 할 수 없어요.");
      return;
    }
    if (!requireLogin("메일 공유")) return;

    const email = window.prompt("공유 메일을 받을 이메일을 입력해줘!");
    if (!email) return;

    const code = await ensureShareCode({ channel: "EMAIL", target: email, scope: "LINK" });
    if (!code) return;

    const url = `${window.location.origin}/schedule/share/${code}`;
    alert(`메일 발송 요청 완료! ✅\n\n공유 링크:\n${url}`);
  };

  const onDelete = async () => {
    if (isShareMode) {
      alert("공유 링크로 들어온 사용자는 삭제할 수 없어요.");
      return;
    }
    if (!requireLogin("삭제")) return;

    if (!window.confirm("삭제하시겠습니까? 삭제 시 복구가 불가능합니다. 🥺")) return;
    try {
      await scheduleApi.remove(scheduleIdNum);
      alert("삭제 완료!");
      nav("/schedule", { replace: true });
    } catch (e) {
      console.error(e);
      const status = e?.response?.status;
      if (status === 403) alert("삭제 권한이 없어요. (OWNER만 가능) 🥺");
      else alert("삭제 실패(서버 확인 필요) 😭");
    }
  };

  const goCourse = () => {
    if (!requireLogin("코스 편집")) return;

    nav(`/schedule/${scheduleIdNum}/course`, {
      state: {
        openDay: dayTab,
        dayCount: totalDays || 3,
      },
    });
  };

  const dayTabs = useMemo(() => {
    const n = totalDays || 1;
    return Array.from({ length: Math.min(7, Math.max(1, n)) }, (_, i) => i + 1);
  }, [totalDays]);

  const dayPlan = courseDays?.[dayTab] ?? null;

  // ✅ 코스 타임라인 + 거리/시간 (START/WAYPOINT/END만)
  const timelineStops = useMemo(() => {
    if (!dayPlan) return [];

    const waypoints = Array.isArray(dayPlan?.waypoints) ? dayPlan.waypoints : [];
    const stops = [
      dayPlan?.start ? { ...dayPlan.start, __type: "start", __badge: "출발" } : null,
      ...waypoints.map((w) => ({ ...w, __type: "mid", __badge: "경유" })),
      dayPlan?.end ? { ...dayPlan.end, __type: "end", __badge: "도착" } : null,
    ].filter(Boolean);

    return stops.map((p, i) => {
      if (i === 0) return { ...p, __segKm: null, __segMin: null };

      const prev = stops[i - 1];
      const a = getLatLng(prev);
      const b = getLatLng(p);
      if (!a || !b) return { ...p, __segKm: null, __segMin: null };

      const km = haversineKm(a, b);
      const min = estimateBikeMinutes(km, 15);

      return { ...p, __segKm: km, __segMin: min };
    });
  }, [dayPlan]);

  // ✅ “추가한 장소”는 DB 우선, 없으면 로컬 fallback
  const effectivePois = useMemo(() => {
    if (Array.isArray(dbPois) && dbPois.length > 0) return dbPois;
    const local = Array.isArray(dayPlan?.pickedPois) ? dayPlan.pickedPois : [];
    return local;
  }, [dbPois, dayPlan]);

  const timelinePois = useMemo(() => {
    const pois = Array.isArray(effectivePois) ? effectivePois : [];
    if (pois.length === 0) return [];

    const base = dayPlan?.start ? dayPlan.start : null;

    return pois.map((p, i) => {
      const prev = i === 0 ? base : pois[i - 1];
      const a = prev ? getLatLng(prev) : null;
      const b = getLatLng(p);

      if (!a || !b) return { ...p, __segKm: null, __segMin: null };

      const km = haversineKm(a, b);
      const min = estimateBikeMinutes(km, 15);

      return { ...p, __segKm: km, __segMin: min };
    });
  }, [effectivePois, dayPlan]);

  /* ---------- render ---------- */
  if (loading) {
    return (
      <div className="sd-wrap">
        <div className="sd-top">
          <div className="sd-skel-title" />
          <div className="sd-skel-sub" />
        </div>
        <div className="sd-grid">
          <div className="sd-card sd-skel-card" />
          <div className="sd-card sd-skel-card" />
        </div>
      </div>
    );
  }

  if (errMsg) {
    return (
      <div className="sd-wrap">
        <div className="sd-error">{errMsg}</div>
        <div className="sd-actions">
          <button className="sd-btn ghost" onClick={() => nav(-1)}>
            이전
          </button>
          <button className="sd-btn primary" onClick={() => nav("/schedule", { replace: true })}>
            목록으로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sd-wrap">
      <div className="sd-topbar">
        <div className="sd-top">
          <button className="sd-back" onClick={() => nav(-1)} aria-label="back">
            ←
          </button>

          <div className="sd-top-text">
            <div className="sd-title-row">
              <div className="sd-title-left">
                {!editMode ? (
                  <h1 className="sd-title">{title}</h1>
                ) : (
                  <input
                    className="sd-title-input"
                    value={form.scheduleTitle}
                    onChange={(e) => setForm((p) => ({ ...p, scheduleTitle: e.target.value }))}
                    placeholder="일정 제목"
                  />
                )}

                <div className="sd-badges">
                  <span className={`sd-badge diff ${diffTone(difficulty)}`}>{difficulty}</span>
                  <span className={`sd-badge pub ${isPublic === "Y" ? "open" : "closed"}`}>
                    {isPublic === "Y" ? "공개" : "비공개"}
                  </span>
                  {editMode ? <span className="sd-badge editing">편집중</span> : null}
                </div>
              </div>
            </div>

            <p className="sd-sub">
              {placeText} · {displayStart && displayEnd ? `${displayStart} ~ ${displayEnd}` : "날짜 정보 없음"}
              {totalDays ? <span className="sd-pill">{totalDays}일</span> : null}
            </p>
          </div>

          <div className="sd-top-cta">
            <Link to="/schedule/new" className="sd-btn ghost">
              + 새 일정
            </Link>
            <Link to="/schedule" className="sd-btn ghost">
              목록
            </Link>

            <button className="sd-btn ghost" onClick={() => nav(`/weather/${scheduleIdNum}`)}>
              🌤️ 날씨 · 대기질 분석
            </button>

            {!editMode ? (
              <button
                className="sd-btn primary"
                onClick={openEdit}
                disabled={!isAuthed}
                title={!isAuthed ? "로그인 후 수정 가능" : ""}
              >
                수정
              </button>
            ) : (
              <>
                <button className="sd-btn ghost" onClick={cancelEdit} disabled={saving}>
                  취소
                </button>
                <button className="sd-btn primary" onClick={onSave} disabled={saving}>
                  {saving ? "저장중..." : "저장"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ✅ NEW: AI 준비물/주의사항 카드 (맨 위) */}
      <div className="sd-prep">
        <div className="sd-prep-head">
          <div>
            <div className="sd-prep-title">🧳 AI 준비 체크</div>
            <div className="sd-prep-sub">준비물 + 주의사항을 한 번에 확인</div>
          </div>

          <div className="sd-prep-actions">
            <span className={`sd-prep-risk ${riskTone(prep?.riskLevel)}`}>{prep?.riskLevel || "-"}</span>

            {/* ✅ NEW: 접기/펼치기 버튼 */}
            <button
              className="sd-btn ghost sm"
              type="button"
              onClick={() => setPrepOpen((v) => !v)}
              disabled={!prep}
              title={!prep ? "AI 준비 체크를 먼저 생성해줘!" : prepOpen ? "내용 접기" : "내용 펼치기"}
            >
              {prepOpen ? "접기" : "펼치기"}
            </button>

            <button
              className="sd-btn ghost sm"
              onClick={() => {
                if (!requireLogin("다시 생성")) return;
                loadPrep(1);
              }}
              disabled={prepBusy}
              title={!isAuthed ? "로그인 후 다시 생성 가능" : ""}
            >
              {prepBusy ? "생성중..." : "다시 생성"}
            </button>

            <button className="sd-btn ghost sm" onClick={copyPrep} disabled={!prep}>
              복사
            </button>
          </div>
        </div>

        {prepBusy ? (
          <div className="sd-prep-loading">AI가 체크리스트 만드는 중… ✨</div>
        ) : prepErr ? (
          <div className="sd-prep-error">
            AI 준비 체크 실패 😭<br />
            {prepErr}
          </div>
        ) : prep ? (
          <>
            {/* ✅ NEW: 접힘 상태면 미리보기만 */}
            {!prepOpen ? (
              <div className="sd-tip" style={{ marginTop: 10 }}>
                {(() => {
                  const list = [
                    ...(Array.isArray(prep?.packing) ? prep.packing : []),
                    ...(Array.isArray(prep?.cautions) ? prep.cautions : []),
                  ]
                    .map((x) => String(x || "").trim())
                    .filter(Boolean);

                  if (prep?.summary) return `“${prep.summary}”`;
                  if (list.length) return list.slice(0, 3).join(" · ");
                  return "내용을 펼쳐서 확인해줘!";
                })()}
              </div>
            ) : (
              <div className="sd-prep-grid">
                <div className="sd-prep-col">
                  {prep.summary ? <div className="sd-prep-oneline">“{prep.summary}”</div> : null}
                  <div className="sd-prep-sec-title">✅ 준비물</div>
                  <ul className="sd-prep-list">
                    {(prep.packing || []).map((t) => {
                      const key = `p:${t}`;
                      return (
                        <li key={key} className="sd-prep-item">
                          <label>
                            <input
                              type="checkbox"
                              checked={!!prepChecked[key]}
                              onChange={() => togglePrep(key)}
                            />
                            <span>{t}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="sd-prep-col">
                  <div className="sd-prep-sec-title">⚠️ 주의사항</div>
                  <ul className="sd-prep-list">
                    {(prep.cautions || []).map((t) => {
                      const key = `c:${t}`;
                      return (
                        <li key={key} className="sd-prep-item">
                          <label>
                            <input
                              type="checkbox"
                              checked={!!prepChecked[key]}
                              onChange={() => togglePrep(key)}
                            />
                            <span>{t}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>

                  {!isAuthed ? (
                    <div className="sd-tip" style={{ marginTop: 10 }}>
                      * 로그인하면 “다시 생성”으로 최신 체크리스트를 뽑을 수 있어요.
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="sd-prep-empty">
            AI가 일정 기반으로 준비물/주의사항을 정리해줘요.
            <div style={{ marginTop: 10 }}>
              <button className="sd-btn primary sm" onClick={() => loadPrep(0)} disabled={prepBusy}>
                AI 준비 체크 생성
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="sd-grid">
        {/* LEFT */}
        <div className="sd-card">
          <div className="sd-card-head">
            <h2 className="sd-card-title">📍 일정 정보</h2>
            <div className="sd-card-sub">목적지/기간/인원/예산을 한 번에 정리</div>
          </div>

          {!editMode ? (
            <>
              <div className="sd-info fancy">
                <div className="sd-row">
                  <span>🚩 목적지</span>
                  <b>{placeText}</b>
                </div>
                <div className="sd-row">
                  <span>📅 기간</span>
                  <b>
                    {startDate && endDate ? `${startDate} ~ ${endDate}` : "-"}
                    {daysBetweenInclusive(startDate, endDate) ? (
                      <span className="sd-mini">({daysBetweenInclusive(startDate, endDate)}일)</span>
                    ) : null}
                  </b>
                </div>
                <div className="sd-row">
                  <span>👥 인원</span>
                  <b>{peopleCount ? `${peopleCount}명` : "-"}</b>
                </div>
                <div className="sd-row">
                  <span>🪙 예산</span>
                  <b>{budget !== "" ? `${formatMoney(budget)}원` : "-"}</b>
                </div>
              </div>

              <div className="sd-sep" />

              <div className="sd-block">
                <p className="sd-label">📝 메모</p>
                <div className="sd-memo">{memo?.trim() ? memo : "아직 메모가 없어요."}</div>
              </div>

              <div className="sd-block">
                <div className="sd-label-row">
                  <p className="sd-label">🖇️ 해시태그</p>

                  <button
                    className="sd-btn ghost sm"
                    type="button"
                    onClick={onAiHashtags}
                    disabled={aiTagBusy || !isAuthed}
                    title={!isAuthed ? "로그인 후 사용 가능" : ""}
                  >
                    {aiTagBusy ? "추천중..." : "AI 해시태그 추천"}
                  </button>
                </div>

                <div className="sd-tags">
                  {hashtags?.trim() ? (
                    hashtags
                      .split(" ")
                      .filter(Boolean)
                      .map((t, i) => (
                        <span key={i} className="sd-tag">
                          {t}
                        </span>
                      ))
                  ) : (
                    <span className="sd-empty">태그 없음</span>
                  )}
                </div>

                {aiTagErr ? <div style={{ marginTop: 8, color: "#d33", fontSize: 13 }}>{aiTagErr}</div> : null}

                <div className="sd-tip" style={{ marginTop: 6 }}>
                  * AI 추천을 누르면 편집 모드로 전환되고, 저장을 눌러야 반영돼요!
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="sd-edit-hint">
                목적지/날짜/메모 바꾼 다음에 오른쪽 위 <b>저장</b> 누르면 반영됩니다! ✨
              </div>

              <div className="sd-block">
                <p className="sd-label">목적지(지역 / 도시)</p>
                <div className="sd-form-row">
                  <select
                    className="sd-select"
                    value={form.regionId}
                    onChange={(e) => onChangeRegion(e.target.value)}
                    disabled={loadingRegions}
                  >
                    <option value="">{loadingRegions ? "지역 불러오는 중..." : "지역 선택"}</option>
                    {regions.map((r) => {
                      const id = r?.regionId ?? r?.id;
                      const name = r?.regionName ?? r?.name ?? "지역";
                      return (
                        <option key={id} value={String(id)}>
                          {name}
                        </option>
                      );
                    })}
                  </select>

                  <select
                    className="sd-select"
                    value={form.cityId}
                    onChange={(e) => setForm((p) => ({ ...p, cityId: e.target.value }))}
                    disabled={!form.regionId || loadingCities}
                  >
                    <option value="">
                      {!form.regionId ? "지역 먼저 선택" : loadingCities ? "도시 불러오는 중..." : "도시 선택"}
                    </option>
                    {cities.map((c) => {
                      const id = c?.cityId ?? c?.id;
                      const name = c?.cityName ?? c?.name ?? "도시";
                      return (
                        <option key={id} value={String(id)}>
                          {name}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="sd-block">
                <p className="sd-label">기간</p>
                <div className="sd-form-row">
                  <input
                    type="date"
                    className="sd-input"
                    value={form.startDate}
                    onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                  />
                  <input
                    type="date"
                    className="sd-input"
                    value={form.endDate}
                    onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="sd-block">
                <p className="sd-label">인원 / 예산</p>
                <div className="sd-form-row">
                  <input
                    type="number"
                    className="sd-input"
                    value={form.peopleCount}
                    onChange={(e) => setForm((p) => ({ ...p, peopleCount: e.target.value }))}
                    placeholder="인원"
                    min="1"
                  />
                  <input
                    type="number"
                    className="sd-input"
                    value={form.budget}
                    onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))}
                    placeholder="예산"
                    min="0"
                  />
                </div>
              </div>

              <div className="sd-block">
                <p className="sd-label">공개 / 난이도</p>
                <div className="sd-form-row">
                  <select
                    className="sd-select"
                    value={form.isPublic}
                    onChange={(e) => setForm((p) => ({ ...p, isPublic: e.target.value }))}
                  >
                    <option value="Y">공개</option>
                    <option value="N">비공개</option>
                  </select>

                  <select
                    className="sd-select"
                    value={form.requestDifficulty}
                    onChange={(e) => setForm((p) => ({ ...p, requestDifficulty: e.target.value }))}
                  >
                    <option value="">-</option>
                    <option value="초급">초급</option>
                    <option value="중급">중급</option>
                    <option value="고급">고급</option>
                  </select>
                </div>
              </div>

              <div className="sd-block">
                <p className="sd-label">메모</p>
                <textarea
                  className="sd-textarea"
                  value={form.memo}
                  onChange={(e) => setForm((p) => ({ ...p, memo: e.target.value }))}
                  rows={4}
                />
              </div>

              <div className="sd-block">
                <p className="sd-label">해시태그(띄어쓰기)</p>

                <div className="sd-form-row inline">
                  <input
                    className="sd-input"
                    value={form.hashtags}
                    onChange={(e) => setForm((p) => ({ ...p, hashtags: e.target.value }))}
                    placeholder="#자전거여행 #당일치기"
                  />

                  <button className="sd-btn ghost" type="button" onClick={onAiHashtags} disabled={aiTagBusy}>
                    {aiTagBusy ? "추천중..." : "AI 해시태그 추천"}
                  </button>
                </div>

                {aiTagErr ? <div style={{ marginTop: 8, color: "#d33", fontSize: 13 }}>{aiTagErr}</div> : null}

                <div className="sd-tip" style={{ marginTop: 6 }}>
                  * 추천 후 오른쪽 위 저장을 눌러야 반영돼요!
                </div>
              </div>
            </>
          )}
        </div>

        {/* RIGHT */}
        <div className="sd-card">
          <h2 className="sd-card-title">📌 공유 & 상세 일정</h2>

          {/* ✅ AI 패널 */}
          <div style={{ marginBottom: 12 }}>
            <AiPanel scheduleId={scheduleIdNum} mode="detail" userNo={isAuthed ? loginUserNo : null} />
          </div>

          <div className="sd-share">
            <div className="sd-share-row">
              <span className="sd-share-label">공유 코드</span>
              <b className="sd-share-code">{shareCode || "-"}</b>
            </div>

            <div className="sd-share-actions">
              <button className="sd-btn primary" onClick={copyCode} disabled={shareBusy}>
                {shareBusy ? "처리중..." : "코드 복사"}
              </button>

              <button className="sd-btn ghost" onClick={copyShareLink} disabled={shareBusy}>
                링크 복사
              </button>

              <button className="sd-btn ghost" onClick={shareByEmail} disabled={shareBusy || isShareMode || !isAuthed}>
                메일로 공유
              </button>

              <button className="sd-btn ghost" onClick={() => nav("/places")}>
                더 많은 장소 찾아보기
              </button>
            </div>

            {shareUrl ? (
              <p className="sd-tip" style={{ wordBreak: "break-all" }}>
                * 공유 링크: <b>{shareUrl}</b>
              </p>
            ) : (
              <p className="sd-tip">* “링크 복사”를 누르면 공유 링크가 생성돼요!</p>
            )}
          </div>

          <div className="sd-sep" />

          <div className="sd-block">
            <p className="sd-label">일차별 상세 일정</p>

            <div className="sd-daytabs-wrap">
              <div className="sd-daytabs">
                {dayTabs.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`sd-daytab ${dayTab === n ? "on" : ""}`}
                    onClick={() => setDayTab(n)}
                  >
                    {n}일차
                  </button>
                ))}
              </div>
            </div>

            {!dayPlan ? (
              <div className="sd-empty-card">
                <p className="sd-empty-title">아직 {dayTab}일차 코스가 없어요.</p>
                <p className="sd-empty-sub">“코스 만들기”에서 출발/도착/경유지 + 주변 장소를 추가해봐!</p>
                <button className="sd-btn primary" onClick={goCourse} disabled={!isAuthed}>
                  + {dayTab}일차 코스 만들기
                </button>
                {!isAuthed ? <div className="sd-tip" style={{ marginTop: 8 }}>* 로그인 후 사용 가능</div> : null}
              </div>
            ) : (
              <div className="sd-dayplan">
                <div className="sd-plan-top">
                  <div className="sd-plan-title">
                    <span className="sd-plan-day">{dayTab}일차</span>
                    <span className="sd-plan-hint">타임라인으로 한눈에 보기</span>
                  </div>

                  <button className="sd-btn ghost sm" onClick={goCourse} disabled={!isAuthed}>
                    코스 편집
                  </button>
                </div>

                <div className="sd-plan-stats">
                  <span className="sd-stat-chip">
                    경유지 <b>{Array.isArray(dayPlan?.waypoints) ? dayPlan.waypoints.length : 0}개</b>
                  </span>
                  <span className="sd-stat-chip">
                    추가한 장소 <b>{Array.isArray(effectivePois) ? effectivePois.length : 0}개</b>
                  </span>
                </div>

                {/* ✅ 코스(출발/경유/도착) */}
                <div className="sd-route">
                  <div className="sd-route-head">
                    <div className="sd-route-title">코스 경유지</div>
                    <div className="sd-route-count">{timelineStops.length}곳</div>
                  </div>

                  <div className="sd-tl-list">
                    {timelineStops.map((p, i) => {
                      const name = poiTitle(p);
                      const addr = pickAddress(p) || "-";
                      const img = poiImg(p);
                      const rating = poiRating(p);
                      const url = poiUrl(p);

                      const km = p.__segKm;
                      const min = p.__segMin;
                      const hasSeg = i > 0 && min != null && km != null;

                      const isStart = i === 0;
                      const isEnd = i === timelineStops.length - 1;
                      const dotCls = `sd-dot ${isStart ? "start" : isEnd ? "end" : "place"}`;

                      return (
                        <Fragment key={`stop_${poiKey(p, i)}`}>
                          {hasSeg ? (
                            <div className="sd-seg-row">
                              <div className="sd-rail">
                                <div className="sd-seg-badge">
                                  <span className="sd-seg-ico">🚲</span>
                                  <div className="sd-seg-text">
                                    <div className="sd-seg-min">{min}분</div>
                                    <div className="sd-seg-km">{km.toFixed(1)}km</div>
                                  </div>
                                </div>
                              </div>
                              <div />
                            </div>
                          ) : null}

                          <div className="sd-tl-row">
                            <div className="sd-rail">
                              <div className={dotCls}>{i + 1}</div>
                            </div>

                            <div
                              className={`sd-tl-card ${url ? "clickable" : ""}`}
                              onClick={() => url && openPoi(p)}
                              role={url ? "button" : undefined}
                              tabIndex={url ? 0 : undefined}
                              onKeyDown={(e) => e.key === "Enter" && url && openPoi(p)}
                            >
                              <div className="sd-tl-thumb">
                                {img ? <img src={img} alt="" /> : <div className="sd-tl-ph">{name?.[0] || "📍"}</div>}
                              </div>

                              <div className="sd-tl-body">
                                <div className="sd-tl-title-row">
                                  <div className="sd-tl-title">{name}</div>
                                  {rating != null ? <div className="sd-tl-rating">⭐ {rating}</div> : null}
                                </div>

                                <div className="sd-tl-meta">
                                  <span className={`sd-tl-pill badge ${p.__type}`}>{p.__badge}</span>
                                </div>

                                <div className="sd-tl-sub">{addr}</div>
                                {url ? <div className="sd-tl-link">상세 보기 →</div> : null}
                              </div>
                            </div>
                          </div>
                        </Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* ✅ 추가한 장소 (DB 우선) */}
                {(() => {
                  const pois = Array.isArray(effectivePois) ? effectivePois : [];
                  const visible = showAllPois ? timelinePois : timelinePois.slice(0, 5);

                  if (pois.length === 0) {
                    return (
                      <div className="sd-pois sd-pois-empty">
                        <div className="sd-pois-head">
                          <div className="sd-pois-title">추가한 장소</div>
                          <div className="sd-pois-count">0개</div>
                        </div>
                        <div className="sd-pois-empty-text">아직 추가한 장소가 없어요.</div>
                      </div>
                    );
                  }

                  return (
                    <div className="sd-pois">
                      <div className="sd-pois-head">
                        <div className="sd-pois-title">추가한 장소</div>
                        <div className="sd-pois-count">{pois.length}개</div>
                      </div>

                      <div className="sd-tl-list">
                        {visible.map((p, i) => {
                          const name = poiTitle(p);
                          const cat = poiCategory(p);
                          const addr = pickAddress(p) || "-";
                          const img = poiImg(p);
                          const rating = poiRating(p);
                          const url = poiUrl(p);

                          const km = p.__segKm;
                          const min = p.__segMin;
                          const hasSeg = i > 0 && min != null && km != null;

                          return (
                            <Fragment key={`poi_${poiKey(p, i)}`}>
                              {hasSeg ? (
                                <div className="sd-seg-row">
                                  <div className="sd-rail">
                                    <div className="sd-seg-badge">
                                      <span className="sd-seg-ico">🚲</span>
                                      <div className="sd-seg-text">
                                        <div className="sd-seg-min">{min}분</div>
                                        <div className="sd-seg-km">{km.toFixed(1)}km</div>
                                      </div>
                                    </div>
                                  </div>
                                  <div />
                                </div>
                              ) : null}

                              <div className="sd-tl-row">
                                <div className="sd-rail">
                                  <div className="sd-dot place">{i + 1}</div>
                                </div>

                                <div
                                  className={`sd-tl-card ${url ? "clickable" : ""}`}
                                  onClick={() => url && openPoi(p)}
                                  role={url ? "button" : undefined}
                                  tabIndex={url ? 0 : undefined}
                                  onKeyDown={(e) => e.key === "Enter" && url && openPoi(p)}
                                >
                                  <div className="sd-tl-thumb">
                                    {img ? <img src={img} alt="" /> : <div className="sd-tl-ph">{name?.[0] || "☕"}</div>}
                                  </div>

                                  <div className="sd-tl-body">
                                    <div className="sd-tl-title-row">
                                      <div className="sd-tl-title">{name}</div>
                                      {rating != null ? <div className="sd-tl-rating">⭐ {rating}</div> : null}
                                    </div>

                                    <div className="sd-tl-meta">
                                      <span className="sd-tl-pill cat">{cat || "추가 장소"}</span>
                                    </div>

                                    <div className="sd-tl-sub">{addr}</div>
                                    {url ? <div className="sd-tl-link">카카오 상세 →</div> : null}
                                  </div>
                                </div>
                              </div>
                            </Fragment>
                          );
                        })}
                      </div>

                      {pois.length > 5 ? (
                        <button className="sd-pois-more" type="button" onClick={() => setShowAllPois((v) => !v)}>
                          {showAllPois ? "접기" : `+ ${pois.length - 5}개 더보기`}
                        </button>
                      ) : null}
                    </div>
                  );
                })()}

                {dayPlan?.memo ? (
                  <div className="sd-plan-memo">
                    <span>메모</span>
                    <div>{dayPlan.memo}</div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="sd-sep" />

          <button className="sd-btn danger" onClick={onDelete} disabled={isShareMode || !isAuthed}>
            일정 삭제
          </button>
          {isShareMode ? <div className="sd-tip" style={{ marginTop: 8 }}>* 공유 화면에서는 삭제 불가</div> : null}
        </div>
      </div>
    </div>
  );
}
