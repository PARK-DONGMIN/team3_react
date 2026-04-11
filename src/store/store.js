import { create } from "zustand";

export const useUserStore = create((set) => ({
  // 로그인 여부
  isLogin: localStorage.getItem("isLogin") === "true",

  // 회원 정보
  userno: Number(localStorage.getItem("userno")),
  userid: localStorage.getItem("userid"),
  name: localStorage.getItem("name"),
  email: localStorage.getItem("email"),
  nickname: localStorage.getItem("nickname"),
  profileimage: localStorage.getItem("profileimage") || "/images/기본이미지.jpg",
  phone: localStorage.getItem("phone"),
  birth: localStorage.getItem("birth"),
  gender: localStorage.getItem("gender"),
  createdat: localStorage.getItem("createdat"),

  // 🔥 핵심 수정: grade는 반드시 Number
  grade: Number(localStorage.getItem("grade")) || 0,

  // 로그인 상태 설정
  setLogin: (status) => {
    set({ isLogin: status });
    localStorage.setItem("isLogin", status ? "true" : "false");
  },

  // 로그인 시 회원 정보 저장
  setUserInfo: (data) => {
    set({
      userno: Number(data.userno),
      name: data.name,
      userid: data.userid,
      email: data.email,
      nickname: data.nickname,
      profileimage: data.profileimage || "/images/기본이미지.jpg",
      phone: data.phone,
      birth: data.birth,
      gender: data.gender,
      createdat: data.createdat,
      grade: Number(data.grade),
    });

    // localStorage 저장
    Object.entries(data).forEach(([key, val]) => {
      if (val !== null && val !== undefined) {
        if (key === "userno" || key === "grade") {
          localStorage.setItem(key, Number(val));
        } else {
          localStorage.setItem(key, val);
        }
      }
    });
  },

  // 프로필 이미지 상태 변경
  setProfileImage: (url) => {
    set({ profileimage: url });
    localStorage.setItem("profileimage", url);
  },

  // 로그아웃
  logout: () => {
    // 🔥 아이디 저장 여부 유지
    const savedUserId = localStorage.getItem("savedUserId");

    // 전부 초기화
    localStorage.clear();

    // 아이디 저장이 있었다면 복구
    if (savedUserId) {
      localStorage.setItem("savedUserId", savedUserId);
    }

    set({
      isLogin: false,
      userno: null,
      userid: null,
      name: null,
      email: null,
      nickname: null,
      profileimage: "/images/기본이미지.jpg",
      phone: null,
      birth: null,
      gender: null,
      createdat: null,
      grade: 0,
    });
  },
}));
