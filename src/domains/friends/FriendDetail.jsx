import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axios";
import { useUserStore } from "../../store/store";
import { createUserChatRoom } from "../../api/chatroomAPI";
import UserChatRoom from "../chat/UserChatRoom";

import "./FriendDetail.css";
import "../chat/ChatRoom.css";

function FriendDetail() {
  const { friendUserNo } = useParams();
  const navigate = useNavigate();

  const { userid } = useUserStore();
  const myUserNo = Number(localStorage.getItem("userNo"));

  const [friend, setFriend] = useState(null);
  const [isFriend, setIsFriend] = useState(false);
  const [friendRelationId, setFriendRelationId] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔹 채팅 팝업 상태 (FriendsPage와 동일)
  const [chatOpen, setChatOpen] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [activeUserName, setActiveUserName] = useState(null);

  /* ================= 데이터 로딩 ================= */
  useEffect(() => {
    if (!friendUserNo || !userid) return;
    loadData();
  }, [friendUserNo, userid]);

  const loadData = async () => {
    try {
      // 1️⃣ 유저 정보
      const userRes = await axiosInstance.get(
        `/user/read/${friendUserNo}`
      );
      setFriend(userRes.data);

      // 2️⃣ 친구 여부 확인
      const friendsRes = await axiosInstance.get(
        `/friends/list/${userid}`
      );

      const match = friendsRes.data.find(
        (f) => f.friendUserNo === Number(friendUserNo)
      );

      if (match) {
        setIsFriend(true);
        setFriendRelationId(match.friendId);
      } else {
        setIsFriend(false);
      }
    } catch (err) {
      console.error("회원 정보 조회 실패", err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= 채팅 시작 (FriendsPage 동일) ================= */
  const startChat = async () => {
    try {
      if (!friendRelationId) return;

      const res = await axiosInstance.get("/friends/chat/target-no", {
        params: {
          friendId: friendRelationId,
          myUserNo,
        },
      });

      const targetUserNo = res.data;

      const chatRes = await createUserChatRoom(
        myUserNo,
        targetUserNo
      );

      setActiveRoomId(chatRes.data.roomId);
      setActiveUserName(friend.nickname);
      setChatOpen(true);
    } catch (err) {
      console.error(err);
      alert("채팅방 생성 실패");
    }
  };

  const closeChat = () => {
    setChatOpen(false);
    setActiveRoomId(null);
    setActiveUserName(null);
  };

  /* ================= 친구 관리 ================= */
  const handleRemoveFriend = async () => {
    const ok = window.confirm("친구를 삭제하시겠습니까?");
    if (!ok) return;

    try {
      await axiosInstance.delete(`/friends/${friendRelationId}`);
      alert("친구가 삭제되었습니다.");
      setIsFriend(false);
    } catch (err) {
      console.error(err);
      alert("삭제 실패");
    }
  };

  const handleRequestFriend = async () => {
    const ok = window.confirm("친구 신청을 보내시겠습니까?");
    if (!ok) return;

    try {
      await axiosInstance.post("/friends/request", {
        requesterId: userid,
        receiverNickname: friend.nickname,
      });
      alert("친구 요청이 전송되었습니다.");
    } catch (err) {
      console.error(err);
      alert("친구 요청 실패");
    }
  };

  /* ================= 렌더 ================= */
  if (loading) return <div>로딩 중...</div>;

  if (!friend) {
    return (
      <div>
        <p>회원 정보를 불러올 수 없습니다.</p>
        <button onClick={() => navigate(-1)}>뒤로가기</button>
      </div>
    );
  }

  return (
    <>
      <div className="friend-detail-wrapper">
        <div className="friend-card">

          {/* ✅ 제목처럼 크게 */}
          <h1 className="friend-title">회원 정보 조회</h1>

          <div className="friend-info">
            <InfoRow label="닉네임" value={friend.nickname} />
            <InfoRow label="이메일" value={friend.email} />
            <InfoRow label="생년월일" value={friend.birth} />
            <InfoRow label="가입일" value={friend.createdat} />
          </div>

          <div className="friend-actions">
            {isFriend ? (
              <>
                <button className="btn-outline chat" onClick={startChat}>
                  채팅하기
                </button>
                <button
                  className="btn-outline danger"
                  onClick={handleRemoveFriend}
                >
                  친구 삭제
                </button>
              </>
            ) : (
              <button
                className="btn-outline chat"
                onClick={handleRequestFriend}
              >
                친구 신청
              </button>
            )}

            <button
              className="btn-outline"
              onClick={() => navigate(-1)}
            >
              뒤로가기
            </button>
          </div>
        </div>
      </div>

      {/* ✅ 채팅 팝업 (FriendsPage와 동일) */}
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

function InfoRow({ label, value }) {
  return (
    <div className="friend-row">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

export default FriendDetail;
