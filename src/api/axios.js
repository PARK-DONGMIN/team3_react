import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 120000,
  withCredentials: true,
});

/* =====================
   요청 인터셉터
===================== */
axiosInstance.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};

  const method = String(config.method || "get").toLowerCase();
  const hasBodyMethod = ["post", "put", "patch", "delete"].includes(method);

  // FormData는 Content-Type 제거 → 브라우저가 boundary 자동 세팅
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
    delete config.headers["content-type"];
    return config;
  }

  // 바디가 있는 JSON 요청일 때만 application/json
  if (hasBodyMethod && config.data != null) {
    config.headers["Content-Type"] = "application/json";
  } else {
    delete config.headers["Content-Type"];
    delete config.headers["content-type"];
  }

  return config;
});

/* =====================
   응답 인터셉터
===================== */
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      alert("로그인이 필요합니다.");
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
