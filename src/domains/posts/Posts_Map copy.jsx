import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axiosInstance from "../../api/axios";
import SimpleModal from "../SimpleModal";

const Posts_Map copy = () => {
  const navigate = useNavigate();
  const { postId } = useParams();

  /* =========================
      Modal
  ========================= */
  const [modal, setModal] = useState({
    show: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  const openModal = (payload) =>
    setModal({
      show: true,
      title: payload.title,
      message: payload.message,
      onConfirm: payload.onConfirm || null,
    });

  const closeModal = () => setModal((m) => ({ ...m, show: false }));

  /* ========================= */

  const [cate, setCate] = useState({});
  const [input, setInput] = useState({
    postId: 0,
    title: "",
    password: "",
    map: "",
  });

  const [mapArray, setMapArray] = useState([]);

  const splitKakaoMapString = (map) => (!map ? [] : map.split("/"));
  const extractKakaoMapInfo = (map) => map;

  /* =========================
      게시글 로드
  ========================= */
  useEffect(() => {
    axiosInstance
      .get(`/posts/read/${postId}`)
      .then((res) => {
        const d = res.data;

        setInput({
          postId: d.postId,
          title: d.title ?? "",
          password: "",
          map: d.map ?? "",
        });

        setMapArray(splitKakaoMapString(d.map));

        return axiosInstance.get(`/cate/${d.cateno}`);
      })
      .then((res) => setCate(res.data))
      .catch(console.error);
  }, [postId]);

  const onChange = (e) => {
    const { id, value } = e.target;
    setInput((prev) => ({ ...prev, [id]: value }));
  };

  /* =========================
      지도 수정
  ========================= */
  const sendUpdateMap = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("postId", input.postId);
    formData.append("password", input.password);
    formData.append("map", extractKakaoMapInfo(input.map));

    try {
      const res = await axiosInstance.post("/posts/map", formData);

      if (Number(res.data) === 1) {
        openModal({
          title: "성공",
          message: "지도 수정 완료",
          onConfirm: () => navigate(`/posts/read/${input.postId}`),
        });
      } else {
        openModal({
          title: "실패",
          message: "지도 수정 실패",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  /* =========================
      지도 삭제
  ========================= */
  const sendDeleteMap = async () => {
    const formData = new FormData();
    formData.append("postId", input.postId);
    formData.append("password", input.password);
    formData.append("map", "");

    try {
      const res = await axiosInstance.post("/posts/map", formData);

      if (Number(res.data) === 1) {
        openModal({
          title: "삭제 완료",
          message: "지도 삭제 완료",
          onConfirm: () => navigate(`/posts/read/${input.postId}`),
        });
      } else {
        openModal({
          title: "실패",
          message: "지도 삭제 실패",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (mapArray.length === 0) return null;

  return (
    <div className="content">

      {/* ================= CSS UI 통일 ================= */}
      <style>{`
        .map-box {
          max-width: 760px;
          margin: 15px auto;
          background:white;
          border-radius:20px;
          border:1px solid #eee;
          padding:20px;
          box-shadow:0 12px 26px rgba(0,0,0,0.06);
        }
        .soft-btn {
          padding:10px 16px;
          border-radius:12px;
          border:1px solid #ddd;
          background:white;
          margin:0 4px;
          transition:.2s;
        }
        .soft-btn:hover {
          background:#eef2ff;
        }
        .danger {
          background:#ff6b6b;
          color:white;
          border:none;
        }
        .primary {
          background:#4c6ef5;
          color:white;
          border:none;
        }
      `}</style>

      <div className="title_line_left">
        {cate.grp} &gt; {cate.name}
      </div>

      <aside className="aside_right">
        <Link to={`/posts/read/${input.postId}`}>조회</Link>
      </aside>

      <div className="map-box">
        <h3>{input.title}</h3>

        <textarea
          id="map"
          value={input.map}
          onChange={onChange}
          rows={6}
          className="form-control"
          placeholder="카카오맵 iframe 코드 붙여넣기"
        />

        <label style={{ marginTop: 10 }}>비밀번호</label>
        <input
          type="password"
          id="password"
          value={input.password}
          onChange={onChange}
          className="form-control"
        />

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button className="soft-btn primary" onClick={sendUpdateMap}>
            지도 수정
          </button>

          <button className="soft-btn danger" onClick={sendDeleteMap}>
            지도 삭제
          </button>

          <button
            className="soft-btn"
            onClick={() => navigate(`/posts/read/${input.postId}`)}
          >
            취소
          </button>
        </div>
      </div>

      <SimpleModal
        show={modal.show}
        title={modal.title}
        message={modal.message}
        onConfirm={modal.onConfirm || closeModal}
        onClose={closeModal}
      />
    </div>
  );
};

export default Posts_Map copy;
