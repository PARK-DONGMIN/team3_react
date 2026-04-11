// src/api/scheduleDetailApi.js
import axiosInstance from "./axios";
import { getLoginUserNo } from "../utils/auth";

const mustPositiveInt = (v, name = "id") => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`Invalid ${name}: ${v}`);
  return n;
};

const cleanStr = (v) => (v == null ? "" : String(v).trim());

const getUserNoIfAny = () => {
  const n = Number(getLoginUserNo() || 0);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const mustUserNo = () => {
  const userNo = getUserNoIfAny();
  if (!userNo) throw new Error("로그인이 필요합니다. (userNo 없음)");
  return userNo;
};

// ✅ 조회용: 로그인(userNo) 또는 공유코드(shareCode) 중 하나
const buildReadParams = (shareCode) => {
  const userNo = getUserNoIfAny();
  const sc = cleanStr(shareCode);

  const params = {};
  if (userNo) params.userNo = userNo;
  if (sc) params.shareCode = sc;

  if (!params.userNo && !params.shareCode) {
    throw new Error("로그인이 필요합니다. (또는 shareCode 필요)");
  }
  return { params };
};

export const scheduleDetailApi = {
  /** ✅ 특정 day 조회 (A방식 핵심) - shareCode 옵션 */
  getDay: async (scheduleId, dayNumber, shareCode) => {
    const sid = mustPositiveInt(scheduleId, "scheduleId");
    const dn = mustPositiveInt(dayNumber, "dayNumber");

    const { data } = await axiosInstance.get(
      `/schedule/detail/day/${sid}/${dn}`,
      buildReadParams(shareCode)
    );
    return data;
  },

  /** ✅ 특정 day 덮어쓰기 저장(기존 기능 유지) - 로그인 필수 */
  saveDay: async (scheduleId, dayNumber, rows) => {
    const userNo = mustUserNo();
    const sid = mustPositiveInt(scheduleId, "scheduleId");
    const dn = mustPositiveInt(dayNumber, "dayNumber");

    const payload = Array.isArray(rows) ? rows : [];
    const { data } = await axiosInstance.put(
      `/schedule/detail/day/${sid}/${dn}`,
      payload,
      { params: { userNo } }
    );
    return data;
  },

  /** ✅ 단건 추가(PlacesDetail “일정에 담기”용) - 로그인 필수 */
  create: async (req) => {
    const userNo = mustUserNo();
    try {
      const { data } = await axiosInstance.post(`/schedule/detail/save`, req, {
        params: { userNo },
      });
      return data;
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "ScheduleDetail create 실패";
      throw new Error(msg);
    }
  },

  /** ✅ 전체 조회(옵션, 기존 기능 유지) - shareCode 옵션 */
  listAll: async (scheduleId, shareCode) => {
    const sid = mustPositiveInt(scheduleId, "scheduleId");

    const { data } = await axiosInstance.get(
      `/schedule/detail/list/${sid}`,
      buildReadParams(shareCode)
    );
    return data;
  },

  /** ✅ (기존 팀원 코드 호환) list - shareCode 옵션 */
  list: async (scheduleId, shareCode) => {
    const sid = mustPositiveInt(scheduleId, "scheduleId");
    const res = await axiosInstance.get(
      `/schedule/${sid}/details`,
      buildReadParams(shareCode)
    );
    return res.data;
  },

  /** ✅ (기존 팀원 코드 호환) createBulk - 로그인 필수 */
  createBulk: async (scheduleId, items) => {
    const userNo = mustUserNo();
    const sid = mustPositiveInt(scheduleId, "scheduleId");
    const payload = Array.isArray(items) ? items : [];
    const res = await axiosInstance.post(
      `/schedule/${sid}/details`,
      payload,
      { params: { userNo } }
    );
    return res.data;
  },
};
