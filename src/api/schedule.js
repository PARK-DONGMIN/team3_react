// src/api/schedule.js
import axiosInstance from "./axios";
import { getLoginUserNo } from "../utils/auth";

/* ---------------- utils ---------------- */

const mustPositiveInt = (v, name = "id") => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`Invalid ${name}: ${v}`);
  return n;
};

const cleanStr = (v) => (v == null ? "" : String(v).trim());

const pickMsg = (e) =>
  e?.response?.data?.message ||
  e?.response?.data?.error ||
  e?.message ||
  "요청 실패";

const getUserNoIfAny = () => {
  const n = Number(getLoginUserNo() || 0);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const requireUserNo = () => {
  const userNo = getUserNoIfAny();
  if (!userNo) throw new Error("로그인이 필요합니다. (userNo 없음)");
  return userNo;
};

const buildParams = ({ userNo, shareCode } = {}) => {
  const params = {};
  if (userNo != null) params.userNo = userNo;
  const sc = cleanStr(shareCode);
  if (sc) params.shareCode = sc;
  return Object.keys(params).length ? { params } : undefined;
};

// ✅ 서버(DB CHECK)에 맞는 값으로 보냄: PRIVATE/PUBLIC/LINK
// - 기존 UI가 EDIT/VIEW라면 아래처럼 매핑하는게 안전
const normalizeScope = (s) => {
  const v = String(s || "").trim().toUpperCase();
  if (v === "PRIVATE") return "PRIVATE";
  if (v === "PUBLIC") return "PUBLIC";
  if (v === "LINK") return "LINK";
  if (v === "EDIT") return "LINK";   // ✅ EDIT -> LINK
  if (v === "VIEW") return "PUBLIC"; // ✅ VIEW -> PUBLIC
  return "LINK";
};

const normalizeChannel = (c) => {
  const v = String(c || "").trim().toUpperCase();
  return v === "EMAIL" ? "EMAIL" : "LINK";
};

/* ---------------- api ---------------- */

export const scheduleApi = {
  /* =========================
     기본 일정 CRUD (/schedule)
  ========================= */

  create: async (payload) => {
    const userNo = requireUserNo();
    const res = await axiosInstance.post("/schedule/save", payload, { params: { userNo } });
    return res.data;
  },

  // ✅ 로그인(userNo) 또는 공유(shareCode) 둘 중 하나만 있으면 됨
  get: async (scheduleId, shareCode) => {
    const sid = mustPositiveInt(scheduleId, "scheduleId");
    const userNo = getUserNoIfAny();

    if (!userNo && !cleanStr(shareCode)) {
      throw new Error("로그인이 필요합니다. (또는 shareCode 필요)");
    }

    const res = await axiosInstance.get(
      `/schedule/${sid}`,
      buildParams({ userNo, shareCode })
    );
    return res.data;
  },

  getDetails: async (scheduleId, shareCode) =>
    scheduleApi.get(scheduleId, shareCode),

  update: async (scheduleId, payload, shareCode) => {
    const sid = mustPositiveInt(scheduleId, "scheduleId");
    const userNo = requireUserNo();

    try {
      const res = await axiosInstance.put(
        `/schedule/update/${sid}`,
        payload,
        buildParams({ userNo, shareCode })
      );
      return res.data;
    } catch (err) {
      console.log("update compat fail -> fallback:", pickMsg(err));
      const res = await axiosInstance.put(
        `/schedule/${sid}`,
        payload,
        buildParams({ userNo, shareCode })
      );
      return res.data;
    }
  },

  listMine: async (userNoParam) => {
    const uno = userNoParam
      ? mustPositiveInt(userNoParam, "userNo")
      : requireUserNo();

    try {
      const res = await axiosInstance.get("/schedule/list", {
        params: { userNo: uno },
      });
      const data = res?.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.data)) return data.data;
      return [];
    } catch (e) {
      console.warn("listMine /schedule/list failed:", pickMsg(e));
      const res2 = await axiosInstance.get(`/schedule/user/${uno}`);
      const data2 = res2?.data;
      if (Array.isArray(data2)) return data2;
      if (Array.isArray(data2?.data)) return data2.data;
      return [];
    }
  },

  remove: async (scheduleId) => {
    const sid = mustPositiveInt(scheduleId, "scheduleId");
    const userNo = requireUserNo();

    try {
      const res = await axiosInstance.delete(`/schedule/delete/${sid}`, {
        params: { userNo },
      });
      return res.data;
    } catch (e) {
      console.log("remove compat fail -> fallback:", pickMsg(e));
      const res = await axiosInstance.delete(`/schedule/${sid}`, {
        params: { userNo },
      });
      return res.data;
    }
  },

  /* =========================
     공유 (/api/schedule)
  ========================= */

  /**
   * ✅ 공유 활성화/코드 발급: 항상 shareCode 반환
   */
  shareSchedule: async (
    scheduleId,
    payload = { channel: "LINK", scope: "EDIT" }
  ) => {
    const sid = mustPositiveInt(scheduleId, "scheduleId");

    const fixed = {
      ...payload,
      channel: normalizeChannel(payload?.channel),
      scope: normalizeScope(payload?.scope),
    };

    if (fixed.channel === "EMAIL" && !cleanStr(fixed.baseUrl)) {
      fixed.baseUrl = window.location.origin;
    }

    const userNo = requireUserNo();

    const res = await axiosInstance.post(
      `/api/schedule/${sid}/share`,
      fixed,
      { params: { userNo } }
    );
    return res.data; // { scheduleId, shareCode }
  },

  // ✅ shareCode -> scheduleId
  resolveSharedScheduleId: async (shareCode) => {
    const c = cleanStr(shareCode);
    if (!c) throw new Error("Invalid shareCode");

    const r = await axiosInstance.get(
      `/api/schedule/share/${encodeURIComponent(c)}`
    );

    const scheduleId = Number(r.data);
    if (!Number.isFinite(scheduleId) || scheduleId <= 0) {
      throw new Error("Resolve shared scheduleId failed");
    }
    return scheduleId;
  },

  // ✅ 참여(join): shareCode + body {userNo}
  joinShared: async (shareCode) => {
    const c = cleanStr(shareCode);
    if (!c) throw new Error("Invalid shareCode");
    const userNo = requireUserNo();

    const res = await axiosInstance.post(
      `/api/schedule/share/${encodeURIComponent(c)}/join`,
      { userNo }
    );
    return res.data;
  },

  /**
   * ✅ 공유 페이지에서 쓰는 함수
   * - 여기서는 join을 자동으로 하지 않는게 깔끔(로그 스팸 방지)
   * - "일정 참여 후 편집" 눌렀을 때만 join
   */
  getSharedSchedule: async (shareCode) => {
    const c = cleanStr(shareCode);
    if (!c) throw new Error("Invalid shareCode");

    const scheduleId = await scheduleApi.resolveSharedScheduleId(c);

    // ✅ 비로그인도 /schedule/{id}?shareCode= 로 상세(meta) 받아오는 방식
    // (백엔드에서 schedule 조회도 shareCode를 허용해야 함)
    try {
      const detail = await scheduleApi.getDetails(scheduleId, c);
      return { ...detail, scheduleId, shareCode: c };
    } catch (e) {
      console.log("detail fetch fail:", pickMsg(e));
      return { scheduleId, shareCode: c };
    }
  },

  // ✅ 공유/복사 기록
  getShareLogs: async (scheduleId) => {
    const sid = mustPositiveInt(scheduleId, "scheduleId");
    const userNo = requireUserNo();

    const res = await axiosInstance.get(`/api/schedule/${sid}/share-logs`, {
      params: { userNo },
    });
    return Array.isArray(res.data) ? res.data : [];
  },

  deleteShareLog: async (scheduleId, shareId) => {
    const sid = mustPositiveInt(scheduleId, "scheduleId");
    const hid = mustPositiveInt(shareId, "shareId");
    const userNo = requireUserNo();

    await axiosInstance.delete(`/api/schedule/${sid}/share-logs/${hid}`, {
      params: { userNo },
    });
    return true;
  },
};
