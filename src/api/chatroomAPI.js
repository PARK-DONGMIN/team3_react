import axios from "axios";

// 🔥 env 기반 BASE URL
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

/* ===========================
   호텔 ↔ 유저 채팅
=========================== */

/** 호텔 채팅방 생성 */
export const createHotelChatRoom = (userNo, hotelExtId, hotelName) => {
  return axios.post(`${BASE_URL}/hotelchatroom/create`, {
    userNo,
    hotelExtId,
    hotelName,
  });
};

/** 호텔 채팅방 목록 조회 */
export const getHotelChatRooms = (userNo) => {
  return axios.get(`${BASE_URL}/hotelchatroom/user/${userNo}`);
};

/* ===========================
   유저 ↔ 유저 채팅
=========================== */

/** 유저 채팅방 생성 */
export const createUserChatRoom = (userANo, userBNo) => {
  return axios.post(`${BASE_URL}/userchatroom/create`, {
    userANo,
    userBNo,
  });
};

/** 유저 채팅방 목록 조회 */
export const getUserChatRooms = (userNo) => {
  return axios.get(`${BASE_URL}/userchatroom/user/${userNo}`);
};

/* ===========================
   공통 메시지
=========================== */

/** 특정 채팅방 메시지 조회 (호텔/유저 공통) */
export const getMessages = (roomId) => {
  return axios.get(`${BASE_URL}/chatmessage/room/${roomId}`);
};
