import { useEffect, useRef, useState } from "react";
import axios from "axios";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";

import SockJS from "sockjs-client/dist/sockjs";
import { Client } from "@stomp/stompjs";

import "./ChatRoom.css";
import "./ChatMessage.css";
import "./ChatInput.css";

// 🔥 env 기반 BASE URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const UserChatRoom = ({
  roomId,
  otherUserName,
  onClose,
  onNewMessage,
}) => {
  const senderNo = Number(localStorage.getItem("userNo"));

  const [messages, setMessages] = useState([]);
  const [stompClient, setStompClient] = useState(null);

  const messagesEndRef = useRef(null);

  // 드래그
  const [position, setPosition] = useState({ x: 140, y: 140 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!roomId || !senderNo) return;

    // ===============================
    // 0️⃣ 채팅방 입장 (읽음 처리)
    // ===============================
    axios
      .post(
        `${API_BASE_URL}/userchatroom/${roomId}/enter`,
        null,
        { params: { userNo: senderNo } }
      )
      .catch(console.error);

    // ===============================
    // 1️⃣ 기존 메시지 조회
    // ===============================
    axios
      .get(`${API_BASE_URL}/userchatmessage/room/${roomId}`)
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
      setStompClient(client);

      client.subscribe(`/topic/userroom/${roomId}`, (frame) => {
        const msg = JSON.parse(frame.body);

        if (!msg.sentAt) {
          msg.sentAt = new Date().toISOString();
        }

        setMessages((prev) => [...prev, msg]);
        onNewMessage?.(roomId, msg);
      });
    };

    client.activate();

    return () => {
      client.deactivate();
      setStompClient(null);
    };
  }, [roomId, senderNo, onNewMessage]);

  // ===============================
  // 스크롤 하단 고정
  // ===============================
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        <span className="chat-title">
          {otherUserName || "회원 채팅"}
        </span>

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

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-popup-footer">
        {stompClient && (
          <ChatInput
            roomId={roomId}
            stompClient={stompClient}
            senderNo={senderNo}
            senderType="USER"
          />
        )}
      </div>
    </div>
  );
};

export default UserChatRoom;
