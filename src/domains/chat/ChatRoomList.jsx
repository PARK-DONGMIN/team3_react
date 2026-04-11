// src/domains/chat/ChatRoomList.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { getHotelChatRooms, getUserChatRooms } from "../../api/chatroomAPI";

import HotelChatRoom from "./HotelChatRoom";
import UserChatRoom from "./UserChatRoom";

import SockJS from "sockjs-client/dist/sockjs";
import { Client } from "@stomp/stompjs";

import "./ChatRoomList.css";
import "./ChatRoom.css";

// 🔥 env 기반 BASE URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/* ===============================
   유틸
================================ */
const sortByLastSent = (a, b) => {
  const t1 = new Date(a.lastSentAt || 0).getTime();
  const t2 = new Date(b.lastSentAt || 0).getTime();
  return t2 - t1;
};

const formatTime = (time) =>
  new Date(time).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const keyOf = (type, roomId) => `${type}-${roomId}`;

/* ===============================
   컴포넌트
================================ */
const ChatRoomList = () => {
  const userNo = Number(localStorage.getItem("userNo"));

  const [userRooms, setUserRooms] = useState([]);
  const [hotelRooms, setHotelRooms] = useState([]);

  const [activeTab, setActiveTab] = useState("ALL");

  const [chatOpen, setChatOpen] = useState(false);
  const [activeRoom, setActiveRoom] = useState(null);
  const [activeType, setActiveType] = useState(null);

  // ✅ 편집(삭제) 모드
  const [editMode, setEditMode] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState(() => new Set()); // key: "HOTEL-123" | "USER-123"

  const stompClientRef = useRef(null);

  /* ===============================
     채팅방 목록 조회
  ================================ */
  useEffect(() => {
    if (!userNo) return;

    getUserChatRooms(userNo).then((res) => {
      const list = Array.isArray(res.data) ? res.data : [];
      setUserRooms(list.sort(sortByLastSent));
    });

    getHotelChatRooms(userNo).then((res) => {
      const list = Array.isArray(res.data) ? res.data : [];
      setHotelRooms(list.sort(sortByLastSent));
    });
  }, [userNo]);

  /* ===============================
     🔥 WebSocket
     - 중복 구독 방지용으로
       "현재 목록 기준 roomId set"만 바뀔 때 다시 연결
  ================================ */
  const userRoomIdsKey = useMemo(
    () => userRooms.map((r) => r.roomId).sort((a, b) => a - b).join(","),
    [userRooms]
  );
  const hotelRoomIdsKey = useMemo(
    () => hotelRooms.map((r) => r.roomId).sort((a, b) => a - b).join(","),
    [hotelRooms]
  );

  useEffect(() => {
    if (!userNo) return;

    const socket = new SockJS(`${API_BASE_URL}/ws-chat`);
    const client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
    });

    client.onConnect = () => {
      stompClientRef.current = client;

      // 유저 채팅
      userRooms.forEach((room) => {
        client.subscribe(`/topic/userroom/${room.roomId}`, (frame) => {
          const msg = JSON.parse(frame.body);
          if (msg.senderNo === userNo) return;

          setUserRooms((prev) =>
            prev
              .map((r) =>
                r.roomId === room.roomId
                  ? {
                      ...r,
                      lastMessage: msg.content,
                      lastSentAt: msg.sentAt,
                      unreadCount:
                        activeRoom?.roomId === room.roomId && activeType === "USER"
                          ? 0
                          : (r.unreadCount || 0) + 1,
                    }
                  : r
              )
              .sort(sortByLastSent)
          );
        });
      });

      // 호텔 채팅
      hotelRooms.forEach((room) => {
        client.subscribe(`/topic/hotelroom/${room.roomId}`, (frame) => {
          const msg = JSON.parse(frame.body);
          if (msg.senderNo === userNo) return;

          setHotelRooms((prev) =>
            prev
              .map((r) =>
                r.roomId === room.roomId
                  ? {
                      ...r,
                      lastMessage: msg.content,
                      lastSentAt: msg.sentAt,
                      unreadCount:
                        activeRoom?.roomId === room.roomId && activeType === "HOTEL"
                          ? 0
                          : (r.unreadCount || 0) + 1,
                    }
                  : r
              )
              .sort(sortByLastSent)
          );
        });
      });
    };

    client.activate();

    return () => {
      client.deactivate();
      stompClientRef.current = null;
    };
    // ✅ 목록이 바뀌면 구독을 다시 잡기 위해 key를 deps에 둠
  }, [userNo, userRoomIdsKey, hotelRoomIdsKey, activeRoom, activeType]);

  /* ===============================
     채팅 열기 / 닫기
  ================================ */
  const openChat = (room, type) => {
    if (editMode) return; // ✅ 편집 모드에서는 열기 금지

    setActiveRoom(room);
    setActiveType(type);
    setChatOpen(true);

    setUserRooms((prev) =>
      prev.map((r) => (r.roomId === room.roomId ? { ...r, unreadCount: 0 } : r))
    );
    setHotelRooms((prev) =>
      prev.map((r) => (r.roomId === room.roomId ? { ...r, unreadCount: 0 } : r))
    );

    // 🔹 백엔드 읽음 처리 (유저 채팅방만 존재)
    axios
      .post(`${API_BASE_URL}/userchatroom/${room.roomId}/enter`, null, {
        params: { userNo },
      })
      .catch(() => {});
  };

  const closeChat = () => {
    setChatOpen(false);
    setActiveRoom(null);
    setActiveType(null);
  };

  /* ===============================
     편집 모드
  ================================ */
  const toggleEditMode = () => {
    setEditMode((prev) => {
      const next = !prev;
      if (!next) setSelectedRooms(new Set());
      return next;
    });
  };

  const cancelEditMode = () => {
    setEditMode(false);
    setSelectedRooms(new Set());
  };

  const toggleSelect = (room) => {
    const k = keyOf(room.type, room.roomId);
    setSelectedRooms((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  };

  const isSelected = (room) => selectedRooms.has(keyOf(room.type, room.roomId));

  const selectAllInView = (roomsInView) => {
    setSelectedRooms(() => {
      const next = new Set();
      roomsInView.forEach((r) => next.add(keyOf(r.type, r.roomId)));
      return next;
    });
  };

  const clearSelection = () => setSelectedRooms(new Set());

  /* ===============================
     🔥 선택 삭제
  ================================ */
  const deleteSelectedRooms = async () => {
    if (selectedRooms.size === 0) return;

    if (!window.confirm("선택한 채팅방을 삭제할까요?")) return;

    // 삭제 중에는 연타 방지(간단)
    const keys = Array.from(selectedRooms);

    try {
      for (const k of keys) {
        const [type, roomIdStr] = k.split("-");
        const roomId = Number(roomIdStr);

        const url =
          type === "HOTEL"
            ? `/hotelchatroom/delete/${roomId}`
            : `/userchatroom/delete/${roomId}`;

        await axios.delete(`${API_BASE_URL}${url}`);
      }

      // 프론트 목록에서 제거
      setUserRooms((prev) => prev.filter((r) => !selectedRooms.has(keyOf("USER", r.roomId))));
      setHotelRooms((prev) => prev.filter((r) => !selectedRooms.has(keyOf("HOTEL", r.roomId))));

      // 현재 열려 있는 방이 삭제됐으면 닫기
      if (activeRoom) {
        const activeKey = keyOf(activeType, activeRoom.roomId);
        if (selectedRooms.has(activeKey)) closeChat();
      }

      // 편집 종료
      setEditMode(false);
      setSelectedRooms(new Set());
    } catch (err) {
      console.error(err);
      alert("채팅방 삭제에 실패했습니다.");
    }
  };

  /* ===============================
     렌더링용 목록
  ================================ */
  const mergedRooms = useMemo(
    () => [
      ...userRooms.map((r) => ({ ...r, type: "USER" })),
      ...hotelRooms.map((r) => ({ ...r, type: "HOTEL" })),
    ].sort(sortByLastSent),
    [userRooms, hotelRooms]
  );

  const rooms = useMemo(() => {
    if (activeTab === "USER") return userRooms.map((r) => ({ ...r, type: "USER" }));
    if (activeTab === "HOTEL") return hotelRooms.map((r) => ({ ...r, type: "HOTEL" }));
    return mergedRooms;
  }, [activeTab, userRooms, hotelRooms, mergedRooms]);

  const selectedCount = selectedRooms.size;

  /* ===============================
     JSX
  ================================ */
  return (
    <>
      <div className="chat-room-list-wrapper">
        {/* ✅ 헤더: 제목 + 편집/삭제 */}
        <div className="chat-room-list-header">
          <h2>채팅</h2>

          {!editMode ? (
            <button className="chat-header-btn ghost" onClick={toggleEditMode}>
              편집
            </button>
          ) : (
            <div className="chat-header-actions">
              <button
                className="chat-header-btn ghost"
                onClick={() => (selectedCount === rooms.length ? clearSelection() : selectAllInView(rooms))}
              >
                {selectedCount === rooms.length ? "전체해제" : "전체선택"}
              </button>

              <button
                className="chat-header-btn danger"
                disabled={selectedCount === 0}
                onClick={deleteSelectedRooms}
                title={selectedCount === 0 ? "삭제할 채팅방을 선택하세요" : "선택 삭제"}
              >
                삭제 {selectedCount > 0 ? `(${selectedCount})` : ""}
              </button>

              <button className="chat-header-btn ghost" onClick={cancelEditMode}>
                취소
              </button>
            </div>
          )}
        </div>

        <div className="chat-tabs">
          {["ALL", "USER", "HOTEL"].map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? "active" : ""}
              onClick={() => {
                setActiveTab(tab);
                // ✅ 탭 바꾸면 선택 헷갈릴 수 있어서 선택 초기화(원하면 제거 가능)
                if (editMode) setSelectedRooms(new Set());
              }}
            >
              {tab === "ALL" ? "전체" : tab === "USER" ? "유저" : "호텔"}
            </button>
          ))}
        </div>

        <ul className={`chat-room-list ${editMode ? "edit-mode" : ""}`}>
          {rooms.map((room) => {
            const isUnread = (room.unreadCount ?? 0) > 0;

            return (
              <li
                key={`${room.type}-${room.roomId}`}
                className={`chat-room-item ${isUnread ? "unread" : ""} ${
                  editMode && isSelected(room) ? "selected" : ""
                }`}
                onClick={() => (editMode ? toggleSelect(room) : openChat(room, room.type))}
              >
                {/* ✅ 편집 모드 체크 */}
                {editMode && (
                  <div
                    className={`chat-select-dot ${isSelected(room) ? "on" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(room);
                    }}
                    role="button"
                    aria-label="select"
                  />
                )}

                <div className="chat-room-info">
                  <div className="chat-room-title">
                    {room.type === "USER" ? room.otherNickname || "회원" : room.hotelName}

                    {isUnread && !editMode && (
                      <span className="chat-room-new">{room.unreadCount}</span>
                    )}
                  </div>

                  <div className="chat-room-last">
                    {room.lastMessage || "대화를 시작해보세요"}
                  </div>
                </div>

                <div className="chat-room-right">
                  <div className="chat-room-time">
                    {room.lastSentAt && formatTime(room.lastSentAt)}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* 유저 채팅 */}
      {chatOpen && activeType === "USER" && (
        <>
          <div className="chat-dim" onClick={closeChat} />
          <UserChatRoom
            roomId={activeRoom.roomId}
            otherUserName={activeRoom.otherNickname}
            onClose={closeChat}
          />
        </>
      )}

      {/* 호텔 채팅 */}
      {chatOpen && activeType === "HOTEL" && (
        <>
          <div className="chat-dim" onClick={closeChat} />
          <HotelChatRoom
            roomId={activeRoom.roomId}
            hotelExtId={activeRoom.hotelExtId}
            hotelName={activeRoom.hotelName}
            onClose={closeChat}
          />
        </>
      )}
    </>
  );
};

export default ChatRoomList;
