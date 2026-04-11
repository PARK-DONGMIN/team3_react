import axiosInstance from "../../api/axios";

/**
 * 📸 AI 장소 추정
 * @param {FormData} formData
 */
export const analyzePlace = (formData) => {
  return axiosInstance.post(
    "/api/ai/place/analyze",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
};
