import { useEffect, useRef, useState } from "react";
import axiosInstance from "../../api/axios";
import "./bike.css";

const PAGE_SIZE = 10;

const RentalMap = () => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const infoWindowsRef = useRef([]);
  const openedInfoWindowRef = useRef(null);

  const [items, setItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [keyword, setKeyword] = useState("");

  /* =========================
   * 마커 제거
   ========================= */
  const clearMarkers = () => {
    if (openedInfoWindowRef.current) {
      openedInfoWindowRef.current.close();   // 🔥 열린 말풍선 닫기
    }

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    infoWindowsRef.current = [];
    openedInfoWindowRef.current = null;
  };

  /* =========================
   * 마커 그리기 (대여소 전용)
   ========================= */
  const drawMarkers = (data) => {
    const map = mapInstance.current;
    if (!map) return;

    clearMarkers();

    data.forEach((item) => {
      const position = new window.kakao.maps.LatLng(item.lat, item.lng);
      const marker = new window.kakao.maps.Marker({ map, position });
      marker._id = item.id;
      markersRef.current.push(marker);

      const content = `
        <div style="
          min-width:260px;
          max-width:340px;
          padding:12px;
          font-size:13px;
          line-height:1.6;
          box-sizing:border-box;
          word-break:break-word;
        ">
          <strong style="font-size:14px;">${item.name}</strong><br/>
          📍 주소: ${item.address ?? "정보 없음"}<br/>
          🚲 자전거 수: ${item.bikeCount ?? "정보 없음"}<br/>
          📞 전화: ${item.phone ?? "정보 없음"}<br/>
          🕒 운영시간: ${item.openTime ?? "정보 없음"}
        </div>
      `;

      const infoWindow = new window.kakao.maps.InfoWindow({ content });
      infoWindow._id = item.id;
      infoWindowsRef.current.push(infoWindow);

      // 마커 클릭 → 하나만 열리게
      window.kakao.maps.event.addListener(marker, "click", () => {
        if (openedInfoWindowRef.current) {
          openedInfoWindowRef.current.close();
        }
        infoWindow.open(map, marker);
        openedInfoWindowRef.current = infoWindow;
      });
    });
  };

  /* =========================
   * bounds 기준 대여소 조회
   ========================= */
  const fetchItemsByBounds = async (bounds) => {
    if (!bounds) return;

    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    try {
      const res = await axiosInstance.get("/api/bike/rentals/within", {
        params: {
          swLat: sw.getLat(),
          swLng: sw.getLng(),
          neLat: ne.getLat(),
          neLng: ne.getLng(),
        },
      });

      setItems(res.data);
      setCurrentPage(1);
      drawMarkers(res.data);
    } catch (err) {
      console.error("❌ 대여소 조회 실패", err);
    }
  };

  /* =========================
   * 리스트 클릭 → 지도 이동 + 말풍선 열기
   ========================= */
  const moveToItem = (item) => {
    const map = mapInstance.current;
    if (!map) return;

    const marker = markersRef.current.find((m) => m._id === item.id);
    const infoWindow = infoWindowsRef.current.find((w) => w._id === item.id);

    if (!marker || !infoWindow) return;

    map.panTo(marker.getPosition());
    map.setLevel(6);

    if (openedInfoWindowRef.current) {
      openedInfoWindowRef.current.close();
    }

    infoWindow.open(map, marker);
    openedInfoWindowRef.current = infoWindow;
  };

  /* =========================
   * 지역 검색
   ========================= */
  const handleKeywordSearch = () => {
    if (!keyword || !window.kakao.maps.services) return;

    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.addressSearch(keyword, (result, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        const { y, x } = result[0];
        const map = mapInstance.current;
        if (!map) return;

        const pos = new window.kakao.maps.LatLng(y, x);
        map.setCenter(pos);
        map.setLevel(6);
        fetchItemsByBounds(map.getBounds());
      } else {
        alert("검색 결과가 없습니다.");
      }
    });
  };

  /* =========================
   * 지도 초기화
   ========================= */
  useEffect(() => {
    if (!window.kakao || !window.kakao.maps) return;

    window.kakao.maps.load(() => {
      const map = new window.kakao.maps.Map(mapRef.current, {
        center: new window.kakao.maps.LatLng(36.5, 127.8),
        level: 13,
      });

      mapInstance.current = map;
      fetchItemsByBounds(map.getBounds());

      window.kakao.maps.event.addListener(map, "idle", () => {
        fetchItemsByBounds(map.getBounds());
      });
    });
  }, []);

  /* =========================
   * 페이징
   ========================= */
  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pagedItems = items.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div>
      <h2>자전거 대여소 지도</h2>

      <div className="map-search">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="지역명을 입력하세요 (예: 성북구)"
          onKeyDown={(e) => e.key === "Enter" && handleKeywordSearch()}
        />
        <button onClick={handleKeywordSearch}>검색</button>
      </div>

      <div ref={mapRef} className="map-container" />

      <div className="map-list">
        <h4>대여소 목록</h4>

        {items.length === 0 && <p>데이터 없음</p>}

        <ul>
          {pagedItems.map((item) => (
            <li key={item.id} onClick={() => moveToItem(item)}>
              <strong>{item.name}</strong>
              <div>
                📍 주소: {item.address ?? "정보 없음"}<br />
                🚲 자전거 수: {item.bikeCount ?? "정보 없음"}<br />
                📞 전화: {item.phone ?? "정보 없음"}<br />
                🕒 운영시간: {item.openTime ?? "정보 없음"}
              </div>
            </li>
          ))}
        </ul>

        {totalPages > 1 && (
          <div className="pagination">
            <button onClick={() => setCurrentPage((p) => p - 1)} disabled={currentPage === 1}>
              이전
            </button>
            <span>{currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage((p) => p + 1)} disabled={currentPage === totalPages}>
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RentalMap;
