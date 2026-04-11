import { useEffect, useState } from "react";
import axiosInstance from "../../api/axios";
import { useUserStore } from "../../store/store";
import { useNavigate } from "react-router-dom";
import "./ReactionStyles.css";

/* 페이지 번호 범위 생성 */
function range(start, end) {
  const arr = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
}

/* 페이지 버튼 계산 */
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

export default function ReactionFavoritePage() {
  const userid = useUserStore((state) => state.userid);
  const navigate = useNavigate();

  const [list, setList] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotal] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);

  const size = 10;

  // 🔥 userid 또는 page 변경 시만 호출 (StrictMode 중복 호출 방지)
  useEffect(() => {
    if (userid) loadData();
  }, [page, userid]);

  const loadData = async () => {
    setLoading(true);

    try {
      const res = await axiosInstance.get(
        `/reactions/user/${userid}/type/favorite`,
        { params: { page, size } }
      );

      const reactions = res.data.content || [];
      const serverTotal = res.data.totalElements || 0;

      // 🔥 게시글 정보 병합 + 삭제된 게시글(404) 필터링
      const merged = await Promise.all(
        reactions.map(async (r) => {
          try {
            const p = await axiosInstance.get(`/posts/read/${r.postId}`);
            return {
              ...r,
              postTitle: p.data.title,
              postContent: p.data.content,
            };
          } catch (err) {
            if (err.response?.status === 404) {
              console.warn("삭제된 게시글:", r.postId);
              return null; // 삭제된 게시글 → 목록에서 제거
            }
            throw err; // 진짜 서버 오류만 throw
          }
        })
      );

      const valid = merged.filter((r) => r !== null);

      setList(valid);

      // 🔥 삭제된 게시글 수를 서버 total에서 차감
      const deletedCount = reactions.length - valid.length;
      const realTotal = Math.max(0, serverTotal - deletedCount);
      const realTotalPages = Math.max(1, Math.ceil(realTotal / size));

      setTotalElements(realTotal);
      setTotal(realTotalPages);

      // 현재 페이지가 범위를 벗어나면 보정
      if (page >= realTotalPages) {
        setPage(Math.max(0, realTotalPages - 1));
      }

    } catch (error) {
      console.error(error);
      alert("즐겨찾기 데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const cancelFavorite = async (reactionNo) => {
    if (!window.confirm("즐겨찾기를 취소할까요?")) return;

    try {
      await axiosInstance.delete(`/reactions/${reactionNo}`);
      loadData();
    } catch (error) {
      console.error(error);
      alert("처리 중 오류 발생");
    }
  };

  const filtered = list.filter((item) =>
    (item.postTitle + item.postContent)
      .toLowerCase()
      .includes(keyword.toLowerCase())
  );

  const current1 = page + 1;
  const nums = getPageNumbers(totalPages, current1);

  return (
    <div className="reaction-container">
      <h2 className="reaction-title">⭐ 내가 즐겨찾기한 게시글</h2>

      {/* 검색 */}
      <div className="reaction-top-bar">
        <input
          className="reaction-input"
          placeholder="게시글 검색 (제목 + 내용)"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="reaction-empty">불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="reaction-empty">
          ⭐ 즐겨찾기한 게시글이 없습니다.
        </div>
      ) : (
        <div className="reaction-list">
          {filtered.map((r) => (
            <div key={r.reactionNo} className="reaction-card">
              <div
                onClick={() => navigate(`/posts/read/${r.postId}`)}
                style={{ cursor: "pointer" }}
              >
                <div className="reaction-card-title">
                  ⭐ {r.postTitle}
                </div>

                <div className="reaction-card-info">
                  {r.createdAt?.substring(0, 10)}
                </div>
              </div>

              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => cancelFavorite(r.reactionNo)}
              >
                즐겨찾기 취소
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 페이징 */}
      <div className="reaction-pagination">
        <button
          className="reaction-page-btn"
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
        >
          &lt;
        </button>

        {nums.map((n) => {
          const zeroBase = n - 1;
          const isCurr = n === current1;

          return (
            <button
              key={n}
              onClick={() => setPage(zeroBase)}
              className={`reaction-page-btn ${isCurr ? "active" : ""}`}
            >
              {n}
            </button>
          );
        })}

        <button
          className="reaction-page-btn"
          disabled={page + 1 >= totalPages}
          onClick={() => setPage(page + 1)}
        >
          &gt;
        </button>
      </div>

      <div style={{ marginTop: 10, textAlign: "center", color: "#666" }}>
        page: {current1} / {totalPages} • total: {totalElements}
      </div>
    </div>
  );
}
