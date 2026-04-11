import React, { useEffect, useState } from "react";
import axiosInstance from "../../api/axios";
import "./Rental_List.css";

const KAKAO_KEY = "1dbb3887ce41f8af281d237765a2f55f"; // 자신의 카카오 REST API 키

const Rental_List = () => {
  const [sendLabel, setSendLabel] = useState("등록");

  const [input, setInput] = useState({
    rentalId: "",
    name: "",
    address: "",
    phone: "",
  });

  const [data, setData] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(0);

  // ========================= 목록 로드 =========================
  const loadData = (pageNo = 0) => {
    axiosInstance
      .get("/admin/rentals", { params: { keyword, page: pageNo, size } })
      .then((res) => {
        setData(res.data.content);
        setPage(res.data.number);
        setTotalPages(res.data.totalPages);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadData(0);
  }, []);

  // ========================= 입력 처리 =========================
  const onChange = (e) => {
    const { id, value } = e.target;
    setInput({ ...input, [id]: value });
  };

  // ========================= 주소 → 위도/경도 변환 =========================
  const getLatLngFromAddress = async (address) => {
    try {
      const res = await fetch(
        `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(
          address
        )}`,
        {
          headers: {
            Authorization: `KakaoAK ${KAKAO_KEY}`,
          },
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

  // ========================= 등록 / 수정 =========================
  const send = async (e) => {
    e.preventDefault();

    // 등록일 때
    if (sendLabel === "등록") {
      // 주소 → 위도/경도
      const coords = await getLatLngFromAddress(input.address);
      if (!coords) return; // 주소 변환 실패 시 중단

      // 랜덤 자전거 수 40~60
      const randomBikeCount = 40 + Math.floor(Math.random() * 21);

      axiosInstance
        .post("/admin/rentals", {
          ...input,
          lat: coords.lat,
          lng: coords.lng,
          bikeCount: randomBikeCount,
          openTime: "24시간",
          source: "MANUAL",
        })
        .then(() => {
          loadData(page);
          cancel();
          alert("등록되었습니다.");
        })
        .catch((err) => {
          console.error(err);
          alert("등록에 실패했습니다.");
        });
    }
    // 수정일 때
    else if (sendLabel === "수정") {
      axiosInstance
        .put(`/admin/rentals/${input.rentalId}`, input)
        .then(() => {
          loadData(page);
          cancel();
          alert("수정되었습니다.");
        })
        .catch(() => {
          alert("수정에 실패했습니다.");
        });
    }
  };

  // ========================= 수정 선택 =========================
  const readForUpdate = (item) => {
    setInput({
      rentalId: item.rentalId,
      name: item.name,
      address: item.address,
      phone: item.phone,
    });
    setSendLabel("수정");
  };

  // ========================= 삭제 =========================
  const handleDelete = (item) => {
    const ok = window.confirm("정말 삭제하시겠습니까?");
    if (!ok) return;

    axiosInstance
      .delete(`/admin/rentals/${item.rentalId}`)
      .then(() => {
        window.alert("삭제되었습니다.");
        loadData(page);
      })
      .catch(() => {
        window.alert("삭제에 실패했습니다.");
      });
  };

  // ========================= 취소 =========================
  const cancel = () => {
    setSendLabel("등록");
    setInput({
      rentalId: "",
      name: "",
      address: "",
      phone: "",
    });
  };

  return (
    <div className="rental-container">
      <h2>대여소 관리</h2>

      {/* 검색 */}
      <form
        className="rental-search"
        onSubmit={(e) => {
          e.preventDefault();
          loadData(0);
        }}
      >
        <input
          type="text"
          placeholder="대여소명 / 주소 / 전화번호 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button type="submit">검색</button>
      </form>

      {/* 등록 / 수정 폼 */}
      <form className="rental-form" onSubmit={send}>
        <input
          id="name"
          value={input.name}
          onChange={onChange}
          placeholder="대여소명"
        />
        <input
          id="address"
          value={input.address}
          onChange={onChange}
          placeholder="주소"
        />
        <input
          id="phone"
          value={input.phone}
          onChange={onChange}
          placeholder="전화번호"
        />
        <button type="submit">{sendLabel}</button>
        <button type="button" onClick={cancel}>
          취소
        </button>
      </form>

      {/* 테이블 */}
      <table className="rental-table">
        <thead>
          <tr>
            <th>#</th>
            <th>대여소명</th>
            <th>주소</th>
            <th>전화번호</th>
            <th>액션</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan="5" className="rental-empty">
                데이터 없음
              </td>
            </tr>
          ) : (
            data.map((item, idx) => (
              <tr key={item.rentalId}>
                <td>{page * size + idx + 1}</td>
                <td>{item.name}</td>
                <td>{item.address}</td>
                <td>{item.phone}</td>
                <td>
                  <button onClick={() => readForUpdate(item)}>수정</button>
                  <button
                    className="delete"
                    onClick={() => handleDelete(item)}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* 페이징 */}
      <div className="rental-pagination">
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

export default Rental_List;
