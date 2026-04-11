import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import SimpleModal from '../SimpleModal';
import { useUserStore } from '../../store/store';

/* =========================
   카카오 지도 URL 검증
   - URL만 허용 (iframe ❌)
   - kko.to 포함
========================= */
const validateKakaoMapUrl = (raw = '') => {
  const v = raw.trim();
  if (!v) return { ok: false, value: '' };

  try {
    const url = new URL(v);

    const allowedHosts = [
      'map.kakao.com',
      'm.map.kakao.com',
      'place.map.kakao.com',
      'kko.to',
    ];

    if (!allowedHosts.includes(url.host)) {
      return { ok: false, value: '' };
    }

    return { ok: true, value: url.toString() };
  } catch {
    return { ok: false, value: '' };
  }
};

const Posts_Map = () => {
  const navigate = useNavigate();
  const { postId } = useParams();

  const grade = useUserStore((s) => s.grade);
  const userId = useUserStore((s) => s.userid);

  const [modal, setModal] = useState({
    show: false, title: '', message: '', onConfirm: null
  });

  const openModal = (p) => setModal({ show: true, ...p });
  const closeModal = () => setModal(m => ({ ...m, show: false }));

  const [cate, setCate] = useState({});
  const [input, setInput] = useState({
    postId: 0,
    title: '',
    map: '',
    password: '',
  });

  /* =========================
     게시글 로드
  ========================= */
  useEffect(() => {
    if (!postId) return;

    axiosInstance.get(`/posts/read/${postId}`)
      .then(res => res.data)
      .then(d => {
        setInput({
          postId: d.postId,
          title: d.title ?? '',
          map: d.map ?? '',
          password: '',
        });
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
      지도 수정 (URL만)
  ========================= */
  const sendUpdateMap = async () => {
    const pid = Number(postId);
    const pw = input.password.trim();

    const parsed = validateKakaoMapUrl(input.map);
    if (!parsed.ok) {
      openModal({
        title: '잘못된 지도 URL',
        message: '카카오 지도 공유 URL(kko.to 포함)만 입력할 수 있습니다.',
      });
      return;
    }

    if (grade !== 2 && !pw) {
      openModal({ title: '입력 오류', message: '비밀번호를 입력하세요.' });
      return;
    }

    const body = {
      postId: pid,
      map: parsed.value,
      ...(grade === 2 ? { requestUserId: userId } : { password: pw }),
    };

    try {
      const res = await axiosInstance.post('/posts/map', body);
      const r = Number(res.data);

      if (r === 1) {
        openModal({
          title: '지도 수정 완료',
          message: '지도가 수정되었습니다.',
          onConfirm: () => navigate(`/posts/read/${pid}`),
        });
      } else if (r === 2) {
        openModal({ title: '비밀번호 오류', message: '비밀번호가 일치하지 않습니다.' });
      } else {
        openModal({ title: '수정 실패', message: '지도 수정 실패' });
      }
    } catch {
      openModal({ title: '서버 오류', message: '잠시 후 다시 시도하세요.' });
    }
  };

  /* =========================
      지도 삭제
  ========================= */
  const sendDeleteMap = async () => {
    const pid = Number(postId);
    const pw = input.password.trim();

    if (grade !== 2 && !pw) {
      openModal({ title: '입력 오류', message: '비밀번호를 입력하세요.' });
      return;
    }

    const body = {
      postId: pid,
      map: '',
      ...(grade === 2 ? { requestUserId: userId } : { password: pw }),
    };

    try {
      const res = await axiosInstance.post('/posts/map', body);
      const r = Number(res.data);

      if (r === 1) {
        openModal({
          title: '지도 삭제 완료',
          message: '지도가 삭제되었습니다.',
          onConfirm: () => navigate(`/posts/read/${pid}`),
        });
      } else if (r === 2) {
        openModal({ title: '비밀번호 오류', message: '비밀번호가 일치하지 않습니다.' });
      } else {
        openModal({ title: '삭제 실패', message: '지도 삭제 실패' });
      }
    } catch {
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
        }
      `}</style>

      <div className="title_line_left">
        {cate.grp} &gt; {cate.name}
      </div>

      <aside className="aside_right">
        <Link to={`/posts/read/${input.postId}`}>조회</Link>
      </aside>

      <div className="aside_menu_line" />

      {/* 지도 링크 미리보기 */}
      {input.map && (
        <div style={{ textAlign: 'center', margin: 20 }}>
          <a
            href={input.map}
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline-secondary btn-sm"
          >
            지도 열기
          </a>
        </div>
      )}

      <div className="soft-box">
        <h3>{input.title}</h3>

        <p style={{ fontSize: 12, color: '#888' }}>
          카카오 지도에서 <b>공유한 URL</b>을 그대로 붙여넣어 주세요.<br />
          (예: <code>https://kko.to/...</code>)
        </p>

        <textarea
          id="map"
          value={input.map}
          onChange={onChange}
          rows={4}
          className="form-control"
          placeholder="https://kko.to/..."
        />

        {grade !== 2 && (
          <>
            <label style={{ marginTop: 10 }}>비밀번호</label>
            <input
              id="password"
              type="password"
              value={input.password}
              onChange={onChange}
              className="form-control"
            />
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button className="btn btn-outline-secondary btn-sm" onClick={sendUpdateMap}>
            지도 수정
          </button>{' '}
          <button className="btn btn-outline-secondary btn-sm" onClick={sendDeleteMap}>
            지도 삭제
          </button>{' '}
          <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate(-1)}>
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

export default Posts_Map;
