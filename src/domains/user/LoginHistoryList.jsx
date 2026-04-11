import { useEffect, useState } from "react";
import axiosInstance from "../../api/axios";
import { useUserStore } from "../../store/store";
import "./LoginHistoryList.css"; // 스타일 적용

function LoginHistoryList() {
  const [histories, setHistories] = useState([]);
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(1); // 최소 1페이지

  const userno = useUserStore((state) => state.userno);

  const loadHistories = (pageNo = 0) => {
    if (!userno) return;

    axiosInstance
      .get(`/login-history/${userno}`, { params: { page: pageNo, size } })
      .then((res) => {
        const data = res.data;
        setHistories(data.content || []);
        setPage(data.number || 0);
        setTotalPages(Math.max(1, data.totalPages || 1)); // 최소 1페이지
      })
      .catch((err) => {
        console.error("로그인 내역 불러오기 실패:", err);
        setHistories([]);
        setPage(0);
        setTotalPages(1); // 오류 시에도 1페이지
      });
  };

  useEffect(() => {
    loadHistories(0);
  }, [userno]);

  return (
    <div className="login-history">
      <h2 className="login-history-title">최근 로그인 내역</h2>

      <div className="login-history-list">
        {histories.length === 0 ? (
          <div className="empty">로그인 내역이 없습니다.</div>
        ) : (
          histories.map((item) => (
            <div key={item.loginHistoryNo} className="login-history-item">
              <span>{new Date(item.loginAt).toLocaleString()}</span>
              <strong>{item.ipAddress}</strong>
              <span>{item.userid} / {item.nickname}</span>
            </div>
          ))
        )}
      </div>

      <div className="login-history-pagination">
        {[...Array(totalPages)].map((_, i) => (
          <button
            key={i}
            className={i === page ? "active" : ""}
            onClick={() => loadHistories(i)}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

export default LoginHistoryList;
