import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import SimpleModal from '../SimpleModal';
import { useUserStore } from '../../store/store';

/* =========================
   유튜브 ID 추출
========================= */
const extractYoutubeId = (value = '') => {
  if (!value) return '';
  if (value.includes('/shorts/')) return value.split('/shorts/')[1].split('?')[0];
  if (value.includes('watch?v=')) return value.split('watch?v=')[1].split('&')[0];
  if (value.includes('youtu.be/')) return value.split('youtu.be/')[1].split('?')[0];
  return value;
};

const Posts_Youtube = () => {
  const navigate = useNavigate();
  const { postId } = useParams();

  const grade = useUserStore(s => s.grade);
  const userId = useUserStore(s => s.userid);

  const [cate, setCate] = useState({});
  const [input, setInput] = useState({
    postId: 0,
    title: '',
    youtube: '',
    password: '',
  });

  const [modal, setModal] = useState({
    show: false, title: '', message: '', onConfirm: null
  });

  const openModal = (p) => setModal({ show: true, ...p });
  const closeModal = () => setModal(m => ({ ...m, show: false }));

  /* =========================
     게시글 조회
  ========================= */
  useEffect(() => {
    axiosInstance.get(`/posts/read/${postId}`)
      .then(res => res.data)
      .then(data => {
        setInput({
          postId: data.postId,
          title: data.title ?? '',
          youtube: extractYoutubeId(data.youtube),
          password: '',
        });
        return axiosInstance.get(`/cate/${data.cateno}`);
      })
      .then(res => setCate(res.data))
      .catch(console.error);
  }, [postId]);

  const onChange = (e) => {
    const { id, value } = e.target;
    setInput(prev => ({ ...prev, [id]: value }));
  };

  /* =========================
      Youtube 수정 (JSON)
  ========================= */
  const sendUpdateYoutube = async () => {
    const yt = extractYoutubeId(input.youtube.trim());
    const pw = input.password.trim();

    if (grade !== 2 && !pw) {
      openModal({ title: '입력 오류', message: '비밀번호를 입력하세요.' });
      return;
    }

    try {
      const res = await axiosInstance.post('/posts/youtube', {
        postId: Number(postId),
        youtube: yt,
        password: grade === 2 ? '' : pw,
        requestUserId: grade === 2 ? userId : null
      });

      const r = Number(res.data);

      if (r === 1) {
        openModal({
          title: '수정 성공',
          message: '유튜브가 수정되었습니다.',
          onConfirm: () => navigate(`/posts/read/${postId}`)
        });
      } else if (r === 2) {
        openModal({ title: '비밀번호 오류', message: '비밀번호가 일치하지 않습니다.' });
      } else {
        openModal({ title: '수정 실패', message: '유튜브 수정 실패' });
      }

    } catch (e) {
      console.error(e);
      openModal({ title: '서버 오류', message: '잠시 후 다시 시도하세요.' });
    }
  };

  /* =========================
      Youtube 삭제 (youtube="")
  ========================= */
  const sendDeleteYoutube = async () => {
    const pw = input.password.trim();

    if (grade !== 2 && !pw) {
      openModal({ title: '입력 오류', message: '비밀번호를 입력하세요.' });
      return;
    }

    try {
      const res = await axiosInstance.post('/posts/youtube', {
        postId: Number(postId),
        youtube: '',
        password: grade === 2 ? '' : pw,
        requestUserId: grade === 2 ? userId : null
      });

      const r = Number(res.data);

      if (r === 1) {
        openModal({
          title: '삭제 성공',
          message: '유튜브가 삭제되었습니다.',
          onConfirm: () => navigate(`/posts/read/${postId}`)
        });
      } else if (r === 2) {
        openModal({ title: '비밀번호 오류', message: '비밀번호가 일치하지 않습니다.' });
      } else {
        openModal({ title: '삭제 실패', message: '유튜브 삭제 실패' });
      }

    } catch (e) {
      console.error(e);
      openModal({ title: '서버 오류', message: '잠시 후 다시 시도하세요.' });
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

      {input.youtube && (
        <div style={{ width: 560, margin: '20px auto' }}>
          <iframe
            width="100%"
            height="315"
            src={`https://www.youtube.com/embed/${input.youtube}`}
            title="youtube"
            frameBorder="0"
            allowFullScreen
          />
        </div>
      )}

      <div className="soft-box" style={{ width: 560, margin: '0 auto' }}>
        <h4>{input.title}</h4>

        <label>Youtube 주소 or ID</label>
        <input
          id="youtube"
          value={input.youtube}
          onChange={onChange}
          className="form-control"
          placeholder="링크 전체 붙여넣어도 자동 처리됨"
        />

        {grade !== 2 && (
          <>
            <label>비밀번호</label>
            <input
              id="password"
              type="password"
              value={input.password}
              onChange={onChange}
              className="form-control"
            />
          </>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 10 }}>
        <button className="btn btn-outline-secondary btn-sm" onClick={sendUpdateYoutube}>
          Youtube 수정
        </button>{' '}
        <button className="btn btn-outline-secondary btn-sm" onClick={sendDeleteYoutube}>
          Youtube 삭제
        </button>{' '}
        <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate(-1)}>
          취소
        </button>
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

export default Posts_Youtube;
