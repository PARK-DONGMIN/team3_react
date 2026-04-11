import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getMessages } from "../../api/chatroomAPI";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";

import SockJS from "sockjs-client/dist/sockjs";
import { Client } from "@stomp/stompjs";

import "./ChatRoom.css";
import "./ChatMessage.css";
import "./ChatInput.css";

// 🔥 env 기반 BASE URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const HotelChatRoom = ({
  roomId: propRoomId,
  hotelExtId,
  hotelName,
  onClose,
  onNewMessage,
}) => {
  const params = useParams();
  const roomId = propRoomId ?? params.roomId;

  const senderNo = localStorage.getItem("userNo");

  const [messages, setMessages] = useState([]);
  const [stompClient, setStompClient] = useState(null);

  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef(null);

  // ✅ onNewMessage는 ref로 고정 (effect 재실행 방지)
  const onNewMessageRef = useRef(onNewMessage);
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  // 드래그
  const [position, setPosition] = useState({ x: 120, y: 120 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!roomId) return;

    // ===============================
    // 1️⃣ 기존 메시지 조회 (REST)
    // ===============================
    getMessages(roomId)
      .then((res) => setMessages(res.data))
      .catch(console.error);

    // ===============================
    // 2️⃣ WebSocket 연결 (SockJS)
    // ===============================
    const socket = new SockJS(`${API_BASE_URL}/ws-chat`);
    const client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
    });

    client.onConnect = () => {
      // ✅ effect 외부 이벤트에서 set
      setStompClient(client);

      client.subscribe(`/topic/hotelroom/${roomId}`, (frame) => {
        const payload = JSON.parse(frame.body);

        // typing 이벤트
        if (payload?.event === "TYPING_START") {
          setIsTyping(true);
          return;
        }
        if (payload?.event === "TYPING_END") {
          setIsTyping(false);
          return;
        }

        // 일반 메시지
        const m = payload;
        if (!m.sentAt) m.sentAt = new Date().toISOString();

        if (m.senderType === "HOTEL") {
          setIsTyping(false);
        }

        setMessages((prev) => [...prev, m]);
        onNewMessageRef.current?.(roomId, m);
      });
    };

    client.activate();

    return () => {
      client.deactivate();
      setStompClient(null);
    };
  }, [roomId]);

  // ===============================
  // 스크롤 하단 고정
  // ===============================
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ===============================
  // 드래그 로직
  // ===============================
  const onMouseDown = (e) => {
    setDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const onMouseMove = (e) => {
    if (!dragging) return;
    setPosition({
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y,
    });
  };

  const onMouseUp = () => setDragging(false);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  });

  if (!roomId) {
    return <div style={{ padding: 20 }}>채팅방 정보를 불러올 수 없습니다.</div>;
  }

  return (
    <div className="chat-popup" style={{ top: position.y, left: position.x }}>
      <div
        className="chat-popup-header"
        onMouseDown={onMouseDown}
        style={{ cursor: "move" }}
      >
        <span className="chat-title">{hotelName || "호텔 채팅"}</span>

        {onClose && (
          <button className="chat-close-btn" onClick={onClose}>
            ×
          </button>
        )}
      </div>

      <div className="chat-popup-body">
        {messages.map((msg, idx) => {
          const prev = messages[idx - 1];
          const showDate =
            !prev ||
            new Date(prev.sentAt).toDateString() !==
              new Date(msg.sentAt).toDateString();

          return (
            <ChatMessage
              key={msg.msgId || idx}
              message={msg}
              currentUser={senderNo}
              showDate={showDate}
            />
          );
        })}

        {isTyping && (
          <div className="typing-indicator">채팅을 입력 중입니다…</div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-popup-footer">
        {stompClient && (
          <ChatInput
            roomId={roomId}
            hotelExtId={hotelExtId}
            stompClient={stompClient}
            senderNo={senderNo}
            senderType="USER"
          />
        )}
      </div>
    </div>
  );
};

export default HotelChatRoom;
