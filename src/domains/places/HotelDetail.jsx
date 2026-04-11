import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { createHotelChatRoom } from "../../api/chatroomAPI";
import { getHotelImageFromBing } from "../../api/bingImageAPI";
import HotelChatRoom from "../chat/HotelChatRoom";
import "../chat/ChatRoom.css";
import "./HotelDetail.css";

export default function HotelDetail() {
  const { placeId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const mapRef = useRef(null);

  const userNo = localStorage.getItem("userNo");

  const [chatOpen, setChatOpen] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [activeHotelName, setActiveHotelName] = useState("");
  const [imageUrl, setImageUrl] = useState(null);

  // 🔹 state 안전 분해 (여기서 에러 안 남)
  const name = state?.name;
  const address = state?.address;
  const phone = state?.phone;
  const x = state?.x;
  const y = state?.y;

  /* =========================
   * Bing 이미지 조회
   * ========================= */
  useEffect(() => {
    if (!name) return;

    const fetchImage = async () => {
      try {
        const shortAddress = address
          ? address.split(" ").slice(0, 2).join(" ")
          : "";

        const res = await getHotelImageFromBing(name, shortAddress);

        if (res?.success && res.imageUrl) {
          setImageUrl(res.imageUrl);
        } else {
          setImageUrl(null);
        }
      } catch (e) {
        console.error("빙 이미지 조회 실패", e);
        setImageUrl(null);
      }
    };

    fetchImage();
  }, [name, address]);

  /* =========================
   * 카카오맵
   * ========================= */
  useEffect(() => {
    if (!window.kakao || !x || !y) return;

    window.kakao.maps.load(() => {
      const position = new window.kakao.maps.LatLng(y, x);
      const map = new window.kakao.maps.Map(mapRef.current, {
        center: position,
        level: 4,
      });

      new window.kakao.maps.Marker({ map, position });
    });
  }, [x, y]);

  /* =========================
   * 채팅
   * ========================= */
  const handleCreateChat = async () => {
    if (!userNo) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    try {
      const res = await createHotelChatRoom(Number(userNo), placeId, name);
      setActiveRoomId(res.data.roomId);
      setActiveHotelName(name);
      setChatOpen(true);
    } catch (e) {
      console.error(e);
      alert("채팅방 생성 중 오류가 발생했습니다.");
    }
  };

  const closeChat = () => {
    setChatOpen(false);
    setActiveRoomId(null);
  };

  /* =========================
   * ❗ 여기서 return
   * ========================= */
  if (!state) {
    return (
      <div className="hotel-detail">
        <h2>잘못된 접근입니다.</h2>
        <button onClick={() => navigate(-1)}>뒤로가기</button>
      </div>
    );
  }

  return (
    <>
      <div className="hotel-detail">
        <div className="hotel-header">
          <h1 className="hotel-name">{name}</h1>
          <p className="hotel-address">{address}</p>
          {phone && <p className="hotel-phone">☎ {phone}</p>}
        </div>

        <div
          className="hotel-image-box"
          style={{
            backgroundImage: `url(${
              imageUrl || "/images/default-hotel.jpg"
            })`,
          }}
        >
          <div className="image-overlay" />
          <p className="img-notice">
            * 이미지는 참고용이며 실제와 다를 수 있습니다.
          </p>
        </div>

        <div className="hotel-map-section">
          <h3>위치</h3>
          <div ref={mapRef} className="hotel-map" />
        </div>

        <div className="hotel-actions">
          <a
            href={`https://map.kakao.com/link/map/${name},${y},${x}`}
            target="_blank"
            rel="noreferrer"
            className="btn-outline"
          >
            카카오맵에서 보기
          </a>

          <button className="btn-primary" onClick={handleCreateChat}>
            채팅 문의하기
          </button>
        </div>
      </div>

      {chatOpen && activeRoomId && (
        <>
          <div className="chat-dim" onClick={closeChat} />
          <HotelChatRoom
            roomId={activeRoomId}
            hotelExtId={placeId}
            hotelName={activeHotelName}
            onClose={closeChat}
          />
        </>
      )}
    </>
  );
}
