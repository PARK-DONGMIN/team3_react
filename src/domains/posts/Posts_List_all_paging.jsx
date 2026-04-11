import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../../api/axios';

// 페이지 번호 배열
function range(start, end) {
  const arr = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
}

// 페이지바 생성
function getPageNumbers(totalPages, current) {
  if (totalPages === 0) return [];

  const WIN = 4;
  let start = Math.max(1, current - WIN);
  let end = Math.min(totalPages, current + WIN);

  while (end - start < 8) {
    if (start > 1) start--;
    else if (end < totalPages) end++;
    else break;
  }
  return range(start, end);
}

const Posts_List_all_paging = () => {
  const navigate = useNavigate();
  const { cateno } = useParams();

  // ★ 세션 유지
  const savedPage = Number(sessionStorage.getItem('posts_page') ?? 0);
  const savedSort = sessionStorage.getItem('posts_sort') ?? "latest";

  const [cate, setCate] = useState({});
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(savedPage);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [sort, setSort] = useState(savedSort);

  // 목록 로드
  const load = async (p, s = sort) => {
    sessionStorage.setItem('posts_page', p);
    sessionStorage.setItem('posts_sort', s);

    const res = await axiosInstance.get('/posts/list_all_paging', {
      params: { page: p, size, cateno, sort: s }
    });

    setItems(res.data.content);
    setPage(res.data.page);
    setTotalPages(res.data.totalPages);
    setTotalElements(res.data.totalElements);
  };

  // 최초 로드
  useEffect(() => {
    axiosInstance.get(`/cate/${cateno}`).then(res => setCate(res.data));
    load(page, sort);
  }, [cateno]);

  const current1 = page + 1;
  const nums = getPageNumbers(totalPages, current1);

  return (
    <div className="content">

      {/* ⭐ 통일된 UI CSS */}
      <style>{`
        .paging-btn {
          border: 1px solid #ddd;
          background: white;
          margin: 0 4px;
          padding: 7px 11px;
          border-radius: 9px;
          cursor: pointer;
          transition: .2s;
        }

        .paging-btn:hover {
          background:#eef2ff;
        }

        .paging-active {
          background:#4c6ef5;
          color:white;
          border:none;
        }

        .sort-btn {
          border:1px solid #ddd;
          padding:6px 10px;
          border-radius:10px;
          background:white;
          cursor:pointer;
          transition:.2s;
        }

        .sort-btn:hover {
          background:#eef2ff;
        }

        .sort-active {
          background:#4c6ef5;
          color:white;
          border:none;
        }
      `}</style>

      <div className="title_line_left">
        {cate.grp} &gt; {cate.name}
      </div>

      {/* 우측 상단 */}
      <aside className="aside_right">
        <Link to={`/posts/create/${cate.cateno}`}>등록</Link>
        <span className="aside_menu_divide">|</span>
        <a href="#" onClick={() => location.reload()}>새로고침</a>
      </aside>

      <div className="aside_menu_line"></div>

      {/* 🔥 정렬 버튼 */}
      <div style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: "6px",
        margin: "10px 0 15px 0"
      }}>
        <button
          className={`sort-btn ${sort === "latest" ? "sort-active" : ""}`}
          onClick={() => { setSort("latest"); load(0, "latest"); }}
        >
          최신순
        </button>

        <button
          className={`sort-btn ${sort === "views" ? "sort-active" : ""}`}
          onClick={() => { setSort("views"); load(0, "views"); }}
        >
          조회수순
        </button>

        <button
          className={`sort-btn ${sort === "likes" ? "sort-active" : ""}`}
          onClick={() => { setSort("likes"); load(0, "likes"); }}
        >
          좋아요순
        </button>
      </div>

      {/* 목록 */}
      <table className="table table-striped">
        <thead>
          <tr>
            <th>파일</th>
            <th>제목</th>
          </tr>
        </thead>

        <tbody>
          {items.map(item => (
            <tr
              key={item.postId}
              onClick={() => navigate(`/posts/read/${item.postId}`)}
              style={{ cursor: 'pointer' }}
            >
              <td>
                {item.file1saved && (
                  <img
                    src={`http://121.160.42.26:9100/posts/storage/${item.file1saved}`}
                    style={{ width: 200, height: 150, objectFit: 'cover', borderRadius: "10px" }}
                  />
                )}
              </td>

              <td>
                <strong>
                  {item.title}{' '}
                  <span style={{ color: '#888' }}>
                    {item.rdate?.substring(0, 10)}
                  </span>
                </strong>

                <br />

                {item.content?.length > 160
                  ? item.content.substring(0, 160) + '...'
                  : item.content}

                <div style={{ marginTop: 5, color: "#888" }}>
                  👁 {item.cnt ?? 0} &nbsp;&nbsp; ❤️ {item.likeCnt ?? 0}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ⭐ 통일된 페이지바 */}
      <div style={{ textAlign: "center", marginTop: 10 }}>
        <button
          disabled={page === 0}
          onClick={() => load(page - 1)}
          className="paging-btn"
        >
          ◀
        </button>

        {nums.map(n => {
          const zero = n - 1;
          return (
            <button
              key={n}
              onClick={() => load(zero)}
              className={`paging-btn ${n === current1 ? "paging-active" : ""}`}
            >
              {n}
            </button>
          );
        })}

        <button
          disabled={page + 1 >= totalPages}
          onClick={() => load(page + 1)}
          className="paging-btn"
        >
          ▶
        </button>

        <div style={{ marginTop: 8, color: "#666" }}>
          page: {current1}/{totalPages} • total: {totalElements}
        </div>
      </div>
    </div>
  );
};

export default Posts_List_all_paging;
