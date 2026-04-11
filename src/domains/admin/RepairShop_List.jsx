import React, { useEffect, useState } from "react";
import axiosInstance from "../../api/axios";
import "./RepairShop_List.css";

const KAKAO_KEY = "1dbb3887ce41f8af281d237765a2f55f"; // 자신의 카카오 REST API 키

const RepairShop_List = () => {
  const [data, setData] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(0);

  const [mode, setMode] = useState("등록"); // 등록 | 수정
  const [input, setInput] = useState({
    repairId: "",
    name: "",
    address: "",
    phone: "",
    openTime: "",
    isOnsiteService: false,
    lat: null,
    lng: null,
  });

  /* ========================= 목록 조회 ========================= */
  const loadData = (pageNo = 0) => {
    axiosInstance
      .get("/admin/repairs", { params: { keyword, page: pageNo, size } })
      .then((res) => {
        setData(res.data.content);
        setPage(res.data.number);
        setTotalPages(res.data.totalPages);
      })
      .catch(() => alert("목록 조회 실패"));
  };

  useEffect(() => {
    loadData(0);
  }, []);

  /* ========================= 입력 처리 ========================= */
  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setInput({ ...input, [name]: type === "checkbox" ? checked : value });
  };

  /* ========================= 주소 → 위도/경도 변환 ========================= */
  const getLatLngFromAddress = async (address) => {
    try {
      const res = await fetch(
        `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
        {
          headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
        }
      );
      const data = await res.json();
      if (data.documents && data.documents.length > 0) {
        return {
          lat: parseFloat(data.documents[0].y),
          lng: parseFloat(data.documents[0].x),
        };
      } else {
        alert("주소를 찾을 수 없습니다.");
        return null;
      }
    } catch (err) {
      console.error(err);
      alert("주소 변환 중 오류가 발생했습니다.");
      return null;
    }
  };

  /* ========================= 등록 / 수정 ========================= */
  const submit = async (e) => {
    e.preventDefault();

    if (mode === "등록") {
      // 주소 → 위도/경도 변환
      const coords = await getLatLngFromAddress(input.address);
      if (!coords) return;

      axiosInstance
        .post("/admin/repairs", {
          ...input,
          lat: coords.lat,
          lng: coords.lng,
          source: "KAKAO_MAP", // 무조건 카카오맵
        })
        .then(() => {
          alert("등록되었습니다.");
          loadData(page);
          reset();
        })
        .catch(() => alert("등록 실패"));
    } else {
      axiosInstance
        .put(`/admin/repairs/${input.repairId}`, input)
        .then(() => {
          alert("수정되었습니다.");
          loadData(page);
          reset();
        })
        .catch(() => alert("수정 실패"));
    }
  };

  /* ========================= 수정 / 삭제 ========================= */
  const edit = (shop) => {
    setInput(shop);
    setMode("수정");
  };

  const remove = (id) => {
    if (!window.confirm("삭제하시겠습니까?")) return;

    axiosInstance
      .delete(`/admin/repairs/${id}`)
      .then(() => {
        alert("삭제되었습니다.");
        loadData(page);
      })
      .catch(() => alert("삭제 실패"));
  };

  const reset = () => {
    setMode("등록");
    setInput({
      repairId: "",
      name: "",
      address: "",
      phone: "",
      openTime: "",
      isOnsiteService: false,
      lat: null,
      lng: null,
    });
  };

  return (
    <div className="admin-container">
      <h2>자전거 수리점 관리</h2>

      {/* 검색 */}
      <form
        className="admin-search"
        onSubmit={(e) => {
          e.preventDefault();
          loadData(0);
        }}
      >
        <input
          placeholder="이름 / 주소 / 전화 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button type="submit">검색</button>
      </form>

      {/* 폼 */}
      <form onSubmit={submit} className="admin-form">
        <input name="name" value={input.name} onChange={onChange} placeholder="이름" />
        <input name="address" value={input.address} onChange={onChange} placeholder="주소" />
        <input name="phone" value={input.phone} onChange={onChange} placeholder="전화번호" />
        <input name="openTime" value={input.openTime} onChange={onChange} placeholder="영업시간" />
        <label>
          출장 가능
          <input
            type="checkbox"
            name="isOnsiteService"
            checked={input.isOnsiteService}
            onChange={onChange}
          />
        </label>
        <button type="submit">{mode}</button>
        <button type="button" onClick={reset}>취소</button>
      </form>

      {/* 테이블 */}
      <table className="admin-table">
        <thead>
          <tr>
            <th>#</th>
            <th>이름</th>
            <th>주소</th>
            <th>전화</th>
            <th>출장</th>
            <th>액션</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan="6">데이터 없음</td></tr>
          ) : (
            data.map((shop, idx) => (
              <tr key={shop.repairId}>
                <td>{page * size + idx + 1}</td>
                <td>{shop.name}</td>
                <td>{shop.address}</td>
                <td>{shop.phone}</td>
                <td>{shop.isOnsiteService ? "가능" : "불가"}</td>
                <td>
                  <button onClick={() => edit(shop)}>수정</button>
                  <button onClick={() => remove(shop.repairId)}>삭제</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* 페이징 */}
      <div className="admin-pagination">
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

export default RepairShop_List;
