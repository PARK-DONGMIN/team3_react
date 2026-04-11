import { useState } from "react";
import "./ChatInput.css";

const ChatInput = ({
  roomId,
  hotelExtId,
  stompClient,
  senderNo,
  senderType,
}) => {
  const [content, setContent] = useState("");

  const handleSend = () => {
    if (!content.trim()) return;

    if (stompClient && stompClient.connected) {
      stompClient.publish({
        destination: "/app/chat.send",
        body: JSON.stringify({
          roomId,
          hotelExtId,
          senderNo,
          senderType,
          content,
        }),
      });
    }

    setContent("");
  };

  // 엔터 키 전송
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-input-wrapper">
      <textarea
        className="chat-input"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="메시지 입력 (Shift+Enter = 줄바꿈)"
      />
      <button className="chat-send-btn" onClick={handleSend}>
        전송
      </button>
    </div>
  );
};

export default ChatInput;
