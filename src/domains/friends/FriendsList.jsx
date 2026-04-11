import { useEffect, useState } from "react";
import axiosInstance from "../../api/axios";
import { useUserStore } from "../../store/store";

function FriendsList() {
  const { userid } = useUserStore();
  const [list, setList] = useState([]);

  const load = async () => {
    const res = await axiosInstance.get(`/friends/list/${userid}`);
    setList(res.data);
  };

  const remove = async (id) => {
    await axiosInstance.delete(`/friends/${id}`);
    load();
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="friends-box">
      <h3>내 친구 목록</h3>

      {list.length === 0 && <p>친구가 없습니다.</p>}

      {list.map((f) => {
        const friendsId =
          f.requesterId === userid ? f.receiverId : f.requesterId;

        return (
          <div key={f.friendId} className="friends-item">
            <span>{friendsId}</span>
            <button onClick={() => remove(f.friendsId)}>삭제</button>
          </div>
        );
      })}
    </div>
  );
}

export default FriendsList;
