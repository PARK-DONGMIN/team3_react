import axiosInstance from "./axios";

export const getLoginHistory = (userno) => {
  return axiosInstance.get(`/login-history/${userno}`);
};
