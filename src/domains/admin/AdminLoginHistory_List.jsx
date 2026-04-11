import React, { useEffect, useState } from "react";
import axiosInstance from "../../api/axios";
import "./User_List.css";

const AdminLoginHistory_List = () => {
  const [histories, setHistories] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(0);
  const [size] = useState(10); // 한 페이지에 표시할 행 수
  const [totalPages, setTotalPages] = useState(1); // 최소 1페이지
  const [deleteDate, setDeleteDate] = useState(""); // 날짜 선택

  /* =========================
     로그인 내역 로드 (검색 + 페이징)
  ========================= */
  const loadHistories = (pageNo = 0, keywordParam = keyword) => {
    axiosInstance
      .get("/login-history/search", {
        params: {
          keyword: keywordParam || "",
          page: pageNo,
          size,
        },
      })
      .then((res) => {
        const content = res.data.content || [];
        setHistories(content);
        setPage(res.data.number || 0);
        // 데이터가 없어도 최소 1페이지
        setTotalPages(Math.max(1, res.data.totalPages || 1));
      })
      .catch((err) => {
        console.error(err);
        setHistories([]);
        setPage(0);
        setTotalPages(1); // 오류 시에도 1페이지
      });
  };

  useEffect(() => {
    // 초기 로딩 시 전체 기록 표시
    loadHistories(0, "");
  }, []);

  /* =========================
     검색
  ========================= */
  const onSearch = (e) => {
    e.preventDefault();
    loadHistories(0, keyword); // 검색 시 0페이지부터
  };

  /* =========================
     페이지 이동
  ========================= */
  const changePage = (pageNo) => {
    loadHistories(pageNo, keyword);
  };

  /* =========================
     개별 로그인 기록 삭제
  ========================= */
  const onDelete = (loginHistoryNo) => {
    if (!window.confirm("정말로 이 로그인 기록을 삭제하시겠습니까?")) return;

    axiosInstance
      .delete(`/login-history/${loginHistoryNo}`)
      .then(() => {
        alert("로그인 기록이 삭제되었습니다.");
        loadHistories(page, keyword); // 현재 페이지 유지
      })
      .catch((err) => {
        console.error(err);
        alert("삭제 중 오류가 발생했습니다.");
      });
  };

  /* =========================
     날짜 선택 삭제
  ========================= */
  const onDeleteByDate = () => {
    if (!deleteDate) {
      alert("삭제할 날짜를 선택해주세요.");
      return;
    }
    if (!window.confirm(`${deleteDate} 이전 로그인 기록을 모두 삭제하시겠습니까?`))
      return;

    axiosInstance
      .delete("/login-history/delete-before", { params: { date: deleteDate } })
      .then(() => {
        alert(`${deleteDate} 이전 로그인 기록이 모두 삭제되었습니다.`);
        setDeleteDate("");
        loadHistories(0, keyword); // 삭제 후 전체 갱신
      })
      .catch((err) => {
        console.error(err);
        alert("삭제 중 오류가 발생했습니다.");
      });
  };

  return (
    <div className="cate-container">
      <h2>로그인 내역 관리</h2>

      {/* 🔍 검색 */}
      <form className="cate-form" onSubmit={onSearch}>
        <input
          type="text"
          placeholder="아이디 / 닉네임 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button type="submit">검색</button>
      </form>

      {/* 📆 날짜 선택 삭제 */}
      <div className="cate-form">
        <input
          type="date"
          value={deleteDate}
          onChange={(e) => setDeleteDate(e.target.value)}
        />
        <button type="button" onClick={onDeleteByDate}>
          선택 날짜 이전 삭제
        </button>
      </div>

      {/* 📋 테이블 */}
      <table className="cate-table">
        <thead>
          <tr>
            <th>#</th>
            <th>아이디</th>
            <th>닉네임</th>
            <th>이름</th>
            <th>로그인 일시</th>
            <th>IP</th>
            <th>User Agent</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          {histories.length === 0 ? (
            <tr>
              <td colSpan="8" className="cate-empty">
                검색된 로그인 내역이 없습니다.
              </td>
            </tr>
          ) : (
            histories.map((h, idx) => (
              <tr key={h.loginHistoryNo}>
                <td>{page * size + idx + 1}</td>
                <td>{h.userid || "-"}</td>
                <td>{h.nickname || "-"}</td>
                <td>{h.name || "-"}</td>
                <td>{h.loginAt ? new Date(h.loginAt).toLocaleString() : "-"}</td>
                <td>{h.ipAddress || "-"}</td>
                <td>{h.userAgent || "-"}</td>
                <td>
                  <button
                    className="cate-delete-btn"
                    onClick={() => onDelete(h.loginHistoryNo)}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* 🔢 페이징 */}
      {totalPages >= 1 && (
        <div className="cate-pagination">
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              className={page === i ? "active" : ""}
              onClick={() => changePage(i)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminLoginHistory_List;
