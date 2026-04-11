// src/domains/admin/Cate_List.jsx
import React, { useState, useEffect } from "react";
import axiosInstance from "../../api/axios";
import "./Cate_List.css";

const Cate_List = () => {
  const [sendLabel, setSendLabel] = useState("등록");
  const [input, setInput] = useState({
    cateno: "",
    grp: "",
    name: "",
    cnt: 0,
    seqno: 1,
    visible: "Y",
    rdate: "",
  });

  const [data, setData] = useState([]);

  // 🔍 검색 + 페이징 상태
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(0);

  const [deletePanel, setDeletePanel] = useState(false);

  /* =========================
     🔍 검색 + 페이징 로드
  ========================= */
  const loadData = (pageNo = 0) => {
    axiosInstance
      .get("/cate/search", {
        params: {
          keyword,
          page: pageNo,
          size,
        },
      })
      .then((res) => {
        setData(res.data.cates);
        setPage(res.data.currentPage);
        setTotalPages(res.data.totalPages);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadData(0);
  }, []);

  /* =========================
     입력 처리
  ========================= */
  const onChange = (e) => {
    const { id, value } = e.target;
    setInput({ ...input, [id]: value });
  };

  /* =========================
     등록 / 수정 / 삭제
  ========================= */
  const send = (e) => {
    e.preventDefault();

    if (sendLabel === "등록") {
      axiosInstance.post("/cate/save", input).then(() => loadData(page));
    } else if (sendLabel === "수정") {
      axiosInstance.put("/cate/update", input).then(() => loadData(page));
    } else if (sendLabel === "삭제") {
      axiosInstance.delete(`/cate/${input.cateno}`).then(() => {
        loadData(page);
        setDeletePanel(false);
      });
    }

    cancel();
  };

  /* =========================
     수정 / 삭제
  ========================= */
  const readForUpdate = (cateno) => {
    axiosInstance.get(`/cate/${cateno}`).then((res) => {
      setInput(res.data);
      setSendLabel("수정");
    });
  };

  const readForDelete = (cateno) => {
    axiosInstance.get(`/cate/${cateno}`).then((res) => setInput(res.data));
    setSendLabel("삭제");
    setDeletePanel(true);
  };

  const cancel = () => {
    setSendLabel("등록");
    setInput({
      cateno: "",
      grp: "",
      name: "",
      cnt: 0,
      seqno: 1,
      visible: "Y",
      rdate: "",
    });
    setDeletePanel(false);
  };

  return (
    <div className="cate-container">
      <h2>카테고리 관리</h2>

      {/* 🔍 검색 영역 */}
      <div className="cate-search">
        <input
          type="text"
          placeholder="그룹명 / 카테고리명 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button onClick={() => loadData(0)}>검색</button>
      </div>

      {/* ✍️ 등록 / 수정 폼 */}
      <form className="cate-form" onSubmit={send}>
        <input id="grp" value={input.grp} onChange={onChange} placeholder="그룹" />
        <input id="name" value={input.name} onChange={onChange} placeholder="카테고리" />
        <input id="cnt" type="number" value={input.cnt} onChange={onChange} placeholder="자료수" />
        <input id="seqno" type="number" value={input.seqno} onChange={onChange} placeholder="순서" />
        <select id="visible" value={input.visible} onChange={onChange}>
          <option value="Y">Y</option>
          <option value="N">N</option>
        </select>
        <button type="submit">{sendLabel}</button>
        <button type="button" onClick={cancel}>취소</button>
      </form>

      {/* 📋 테이블 */}
      <table className="cate-table">
        <thead>
          <tr>
            <th>#</th>
            <th>그룹</th>
            <th>자료수</th>
            <th>순서</th>
            <th>카테고리</th>
            <th>등록일</th>
            <th>액션</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan="7" className="cate-empty">데이터 없음</td>
            </tr>
          ) : (
            data.map((item, idx) => (
              <tr key={item.cateno}>
                <td>{page * size + idx + 1}</td>
                <td>{item.grp}</td>
                <td>{item.cnt}</td>
                <td>{item.seqno}</td>
                <td>{item.name}</td>
                <td>{item.rdate?.substring(0, 10)}</td>
                <td>
                  <button onClick={() => readForUpdate(item.cateno)}>수정</button>
                  <button onClick={() => readForDelete(item.cateno)}>삭제</button>
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
            onClick={() => loadData(i)}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Cate_List;
