import React, { useEffect, useState } from "react";
import axiosInstance from "../../api/axios";
import { useUserStore } from "../../store/store";
import { createUserChatRoom } from "../../api/chatroomAPI";
import UserChatRoom from "../chat/UserChatRoom";
import { useNavigate } from "react-router-dom";

import "./Friends.css";
import "../chat/ChatRoom.css";

function FriendsPage() {
  const { userid } = useUserStore();
  const navigate = useNavigate();

  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);      // 받은 요청
  const [sentRequests, setSentRequests] = useState([]); // 보낸 요청
  const [nickname, setNickname] = useState("");

  const [chatOpen, setChatOpen] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [activeUserName, setActiveUserName] = useState(null);

  useEffect(() => {
    if (!userid) return;
    loadFriends();
    loadRequests();
    loadSentRequests();
  }, [userid]);

  // 내 친구
  const loadFriends = async () => {
    const res = await axiosInstance.get(`/friends/list/${userid}`);
    setFriends(res.data);
  };

  // 받은 친구 요청
  const loadRequests = async () => {
    const res = await axiosInstance.get(`/friends/received/${userid}`);
    setRequests(res.data);
  };

  // 보낸 친구 요청
  const loadSentRequests = async () => {
    const res = await axiosInstance.get(`/friends/sent/${userid}`);
    setSentRequests(res.data);
  };

  // 친구 요청 보내기
  const sendFriendRequest = async () => {
  if (!nickname.trim()) {
    alert("닉네임을 입력하세요.");
    return;
  }

  try {
    await axiosInstance.post("/friends/request", {
      requesterId: userid,
      receiverNickname: nickname,
    });

    alert("친구 요청을 보냈습니다.");   // ⭐ 이 줄 추가
    setNickname("");
    loadSentRequests();
  } catch (err) {
    if (err.response?.status === 409) {
      alert("이미 친구 요청을 보냈거나 친구입니다.");
    } else if (err.response?.status === 404) {
      alert("해당 닉네임의 사용자를 찾을 수 없습니다.");
    } else {
      alert("친구 요청 중 오류가 발생했습니다.");
    }
  }
};


  // 받은 요청 수락
  const acceptFriend = async (friendId) => {
    await axiosInstance.put(`/friends/accept/${friendId}`);
    loadFriends();
    loadRequests();
    loadSentRequests();
  };

  // 받은 요청 거절
  const rejectFriend = async (friendId) => {
    await axiosInstance.put(`/friends/reject/${friendId}`);
    loadRequests();
  };

  // 🔥 보낸 요청 취소 (중요 수정)
  const cancelSentRequest = async (friendId) => {
    if (!window.confirm("보낸 요청을 취소하시겠습니까?")) return;
    await axiosInstance.delete(`/friends/${friendId}`); // ← 서버 구조에 맞게 수정
    loadSentRequests();
  };

  // 친구 삭제
  const removeFriend = async (friendId) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    await axiosInstance.delete(`/friends/${friendId}`);
    loadFriends();
  };

  // 채팅 시작
  const startChat = async (friendId, friendNickname) => {
    const myUserNo = Number(localStorage.getItem("userNo"));
    const res = await axiosInstance.get("/friends/chat/target-no", {
      params: { friendId, myUserNo },
    });
    const chatRes = await createUserChatRoom(myUserNo, res.data);
    setActiveRoomId(chatRes.data.roomId);
    setActiveUserName(friendNickname);
    setChatOpen(true);
  };

  const closeChat = () => {
    setChatOpen(false);
    setActiveRoomId(null);
    setActiveUserName(null);
  };

  return (
    <>
      <div className="friends-top-row">
        {/* 친구 요청 보내기 */}
        <div className="friends-box">
          <h2>친구 요청 보내기</h2>
          <input
            type="text"
            placeholder="닉네임 입력"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <button className="btn-add" onClick={sendFriendRequest}>
            요청 보내기
          </button>
        </div>

        {/* 받은 요청 */}
        <div className="friends-box">
          <h2>받은 친구 요청</h2>
          {requests.length === 0 ? (
            <p className="empty-text">받은 친구 요청이 없습니다.</p>
          ) : (
            requests.map((r) => (
              <div className="friends-item" key={r.friendId}>
                <span className="friends-name">{r.nickname}</span>
                <div className="friends-buttons">
                  <button
                    className="btn-accept"
                    onClick={() => acceptFriend(r.friendId)}
                  >
                    수락
                  </button>
                  <button
                    className="btn-reject"
                    onClick={() => rejectFriend(r.friendId)}
                  >
                    거절
                  </button>
                </div>
              </div>
            ))
          )}

          {/* 보낸 요청 */}
          <h2 style={{ marginTop: "16px" }}>보낸 친구 요청</h2>
          {sentRequests.length === 0 ? (
            <p className="empty-text">보낸 친구 요청이 없습니다.</p>
          ) : (
            sentRequests.map((s) => (
              <div className="friends-item" key={s.friendId}>
                <span className="friends-name">{s.nickname}</span>
                <div className="friends-buttons">
                  <button
                    className="btn-reject"
                    onClick={() => cancelSentRequest(s.friendId)}
                  >
                    취소
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 내 친구 */}
      <div className="friends-bottom-row">
        <div className="friends-box friends-my">
          <h2>내 친구</h2>
          {friends.length === 0 ? (
            <p className="empty-text">친구가 없습니다.</p>
          ) : (
            <div className="friends-grid">
              {friends.map((f) => (
                <div
                  className="friends-item friends-item-vertical"
                  key={f.friendId}
                >
                  <span
                    className="friends-name"
                    onClick={() =>
                      navigate(`/friends/detail/${f.friendUserNo}`)
                    }
                  >
                    {f.nickname}
                  </span>
                  <div className="friends-buttons friends-buttons-bottom">
                    <button
                      className="btn-chat"
                      onClick={() => startChat(f.friendId, f.nickname)}
                    >
                      채팅
                    </button>
                    <button
                      className="btn-remove"
                      onClick={() => removeFriend(f.friendId)}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {chatOpen && activeRoomId && (
        <>
          <div className="chat-dim" onClick={closeChat} />
          <UserChatRoom
            roomId={activeRoomId}
            otherUserName={activeUserName}
            onClose={closeChat}
          />
        </>
      )}
    </>
  );
}

export default FriendsPage;
