import React, { useEffect, useState } from "react";
import axiosInstance from "../../api/axios";
import "./User_List.css";

const User_List = () => {
  const [data, setData] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(0);

  /* =========================
     회원 검색 + 페이징 로드
  ========================= */
  const loadData = (pageNo = 0) => {
    axiosInstance
      .get("/user/search", {
        params: {
          keyword,
          page: pageNo,
          size,
        },
      })
      .then((res) => {
        setData(res.data.users);
        setPage(res.data.currentPage);
        setTotalPages(res.data.totalPages);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadData(0);
  }, []);

  /* =========================
     검색
  ========================= */
  const onSearch = () => {
    loadData(0);
  };

  /* =========================
     페이지 이동
  ========================= */
  const changePage = (pageNo) => {
    loadData(pageNo);
  };

  /* =========================
     회원 삭제
  ========================= */
  const onDelete = (userno) => {
    if (!window.confirm("정말로 이 회원을 삭제하시겠습니까?")) return;

    axiosInstance
      .delete(`/user/delete/${userno}`)
      .then(() => {
        alert("회원이 삭제되었습니다.");
        loadData(page); // 현재 페이지 유지
      })
      .catch((err) => {
        console.error(err);
        alert("회원 삭제 중 오류가 발생했습니다.");
      });
  };

  return (
    <div className="cate-container">
      <h2>회원 관리</h2>

      {/* 🔍 검색 */}
      <form
        className="cate-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSearch();
        }}
      >
        <input
          type="text"
          placeholder="아이디 / 이름 / 이메일 / 닉네임 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button type="submit">검색</button>
      </form>

      {/* 📋 테이블 */}
      <table className="cate-table">
        <thead>
          <tr>
            <th>#</th>
            <th>아이디</th>
            <th>이름</th>
            <th>이메일</th>
            <th>닉네임</th>
            <th>전화번호</th>
            <th>성별</th>
            <th>등급</th>
            <th>가입일</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan="10" className="cate-empty">
                회원 정보가 없습니다.
              </td>
            </tr>
          ) : (
            data.map((user, idx) => (
              <tr key={user.userno}>
                <td>{page * size + idx + 1}</td>
                <td>{user.userid}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.nickname}</td>
                <td>{user.phone}</td>
                <td>{user.gender}</td>
                <td>{user.grade}</td>
                <td>{user.createdat?.substring(0, 10)}</td>
                <td>
                  <button
                    className="cate-delete-btn"
                    onClick={() => onDelete(user.userno)}
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
    </div>
  );
};

export default User_List;
