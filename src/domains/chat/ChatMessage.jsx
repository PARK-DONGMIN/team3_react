const ChatMessage = ({ message, currentUser, showDate }) => {
  const isMine = message.senderNo == currentUser;

  const time = new Date(message.sentAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      {showDate && (
        <div className="chat-date-divider">
          {new Date(message.sentAt).toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long",
          })}
        </div>
      )}

      <div className={`chat-msg ${isMine ? "mine" : "other"}`}>
        {/* 내 메시지면: 시간 -> 말풍선 (시간이 말풍선 왼쪽) */}
        {isMine ? (
          <>
            <div className="time">{time}</div>
            <div className="bubble">{message.content}</div>
          </>
        ) : (
          <>
            <div className="bubble">{message.content}</div>
            <div className="time">{time}</div>
          </>
        )}
      </div>
    </>
  );
};

export default ChatMessage;
