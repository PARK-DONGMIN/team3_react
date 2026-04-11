import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../../api/axios';

const Posts_List_all = () => {
  const navigate = useNavigate();
  const { cateno } = useParams();

  const [cate, setCate] = useState({});
  const [data, setData] = useState([]);

  useEffect(() => {
    axiosInstance.get(`/cate/${cateno}`).then(res => setCate(res.data));

    axiosInstance.get(`/posts/list_all/${cateno}`).then(res => {
      setData(res.data ?? []);
    });
  }, [cateno]);

  return (
    <div className="content">

      {/* 통일 UI 스타일 */}
      <style>{`
        .card-row {
          border-radius: 18px;
          border: 1px solid #eee;
          box-shadow: 0 10px 22px rgba(0,0,0,0.06);
          padding: 14px;
          margin-bottom: 14px;
          background:white;
          display:flex;
          gap:14px;
          cursor:pointer;
          transition:.25s;
        }

        .card-row:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 28px rgba(0,0,0,0.12);
        }

        .post-thumb {
          width: 220px;
          height: 150px;
          border-radius: 12px;
          object-fit: cover;
          background:#f3f3f3;
        }

        .refresh-btn {
          padding:8px 14px;
          border-radius:10px;
          border:1px solid #ddd;
          background:white;
          transition:.2s;
          cursor:pointer;
        }

        .refresh-btn:hover {
          background:#eef2ff;
        }
      `}</style>

      <div className="title_line_left">
        {cate.grp} &gt; {cate.name}
      </div>

      <aside className="aside_right">
        <Link to={`/posts/create/${cate.cateno}`}>등록</Link>
        <span className="aside_menu_divide">|</span>
        <a href="#" onClick={() => location.reload()}>새로고침</a>
      </aside>

      <div className="aside_menu_line"></div>

      {/* ===== 🔥 카드형 전체 목록 ===== */}
      {data.map(item => (
        <div
          key={item.postId}
          className="card-row"
          onClick={() => navigate(`/posts/read/${item.postId}`)}
        >
          {item.file1saved && (
            <img
              src={`http://121.160.42.26:9100/posts/storage/${item.file1saved}`}
              className="post-thumb"
            />
          )}

          <div style={{ flex: 1 }}>
            <h4 style={{ marginBottom: 6 }}>
              {item.title}{' '}
              <span style={{ color: '#888', fontSize: '14px' }}>
                {item.rdate?.substring(0, 10)}
              </span>
            </h4>

            <p style={{ color: '#555', fontSize: '14px' }}>
              {item.content?.length > 160
                ? item.content.substring(0, 160) + '...'
                : item.content}
            </p>

            <div style={{ marginTop: 6, color: "#777", fontSize: "13px" }}>
              👁 {item.cnt ?? 0} &nbsp;&nbsp; ❤️ {item.likeCnt ?? 0}
            </div>
          </div>
        </div>
      ))}

      {/* 하단 버튼 */}
      <div style={{ textAlign: "center", marginTop: 18 }}>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="refresh-btn"
        >
          🔄 새로 고침
        </button>
      </div>
    </div>
  );
};

export default Posts_List_all;
