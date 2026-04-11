import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import SimpleModal from '../SimpleModal';
import { useUserStore } from '../../store/store';

const Posts_Update_text = () => {
  const navigate = useNavigate();
  const { postId } = useParams();

  const grade = useUserStore(s => s.grade);
  const userId = useUserStore(s => s.userid);

  const [modal, setModal] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  const openModal = (p) => setModal({ show: true, ...p });
  const closeModal = () => setModal(m => ({ ...m, show: false }));

  const [cate, setCate] = useState({});
  const [input, setInput] = useState({
    postId: 0,
    title: '',
    content: '',
    word: '',
    password: '',
    tagsText: '',
  });

  /* =========================
     게시글 + 태그 + 카테고리 조회
  ========================= */
  useEffect(() => {
    axiosInstance
      .get(`/posts/read/${postId}`)
      .then(res => res.data)
      .then(async d => {
        setInput(prev => ({
          ...prev,
          postId: d.postId,
          title: d.title ?? '',
          content: d.content ?? '',
          word: d.word ?? '',
          password: '',
        }));

        const tagRes = await axiosInstance.get(`/api/post-tags/post/${d.postId}`);
        const tagText = tagRes.data.map(t => `#${t.name}`).join(' ');
        setInput(prev => ({ ...prev, tagsText: tagText }));

        return axiosInstance.get(`/cate/${d.cateno}`);
      })
      .then(res => setCate(res.data))
      .catch(console.error);
  }, [postId]);

  const onChange = (e) => {
    const { id, value } = e.target;
    setInput(prev => ({ ...prev, [id]: value }));
  };

  /* =========================
     업데이트 (JSON 전송)
  ========================= */
  const send = async (e) => {
    e.preventDefault();

    if (grade !== 2 && !input.password.trim()) {
      openModal({ title: "입력 오류", message: "비밀번호를 입력하세요." });
      return;
    }

    const tags = input.tagsText
      .split(/[\s,#]+/)
      .map(t => t.trim())
      .filter(Boolean);

    // ✅ JSON BODY
    const body = {
      postId: input.postId,
      title: input.title,
      content: input.content,
      word: input.word,
      tags,
    };

    if (grade === 2) {
      body.requestUserId = userId;
    } else {
      body.password = input.password;
    }

    try {
      const res = await axiosInstance.post("/posts/update_text", body);
      const r = Number(res.data);

      if (r === 1) {
        openModal({
          title: "수정 완료",
          message: "글이 수정되었습니다.",
          onConfirm: () => navigate(`/posts/read/${input.postId}`)
        });
      } else if (r === 2) {
        openModal({ title: "비밀번호 오류", message: "비밀번호가 일치하지 않습니다." });
      } else {
        openModal({ title: "수정 실패", message: "글 수정 실패" });
      }
    } catch {
      openModal({ title: "네트워크 오류", message: "잠시 후 다시 시도해주세요." });
    }
  };

  return (
    <div className="content">

      <style>{`
        .soft-box{
          background:white;
          border-radius:22px;
          border:1px solid #eee;
          padding:18px;
          box-shadow:0 10px 24px rgba(0,0,0,.06);
          margin-top:10px;
        }
      `}</style>

      <div className="title_line_left">
        {cate.grp} &gt; {cate.name}
      </div>

      <aside className="aside_right">
        <Link to={`/posts/read/${input.postId}`}>조회</Link>
        <span className="aside_menu_divide">|</span>
        <Link to={`/posts/create/${cate.cateno}`}>등록</Link>
      </aside>

      <div className="aside_menu_line" />

      <form onSubmit={send} className="soft-box">

        <div className="input_div">
          <label>제목</label>
          <input
            id="title"
            value={input.title}
            onChange={onChange}
            className="form-control"
            required
          />
        </div>

        <div className="input_div">
          <label>내용</label>
          <textarea
            id="content"
            rows={7}
            value={input.content}
            onChange={onChange}
            className="form-control"
            required
          />
        </div>

        <div className="input_div">
          <label>태그</label>
          <input
            id="tagsText"
            value={input.tagsText}
            onChange={onChange}
            className="form-control"
            placeholder="#서울 #맛집 #여행"
          />
        </div>

        <div className="input_div">
          <label>검색어</label>
          <input
            id="word"
            value={input.word}
            onChange={onChange}
            className="form-control"
            placeholder="(선택) 검색어"
          />
        </div>

        {grade !== 2 && (
          <div className="input_div">
            <label>비밀번호</label>
            <input
              id="password"
              type="password"
              value={input.password}
              onChange={onChange}
              className="form-control"
              required
            />
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 12 }}>
          <button className="btn btn-outline-secondary btn-sm">
            저장
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            style={{ marginLeft: 8 }}
            onClick={() => navigate(`/posts/read/${input.postId}`)}
          >
            취소
          </button>
        </div>

      </form>

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

export default Posts_Update_text;
