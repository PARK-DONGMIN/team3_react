import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "../../store/store";
import axiosInstance from "../../api/axios";
import "./NoticeGlobalStyles.css";

// ===== 페이지 번호 범위 생성 =====
function range(start, end) {
  const arr = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
}

// ===== 페이지 버튼 계산 =====
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

export default function NoticePage() {
  const navigate = useNavigate();

  const isLogin = useUserStore((state) => state.isLogin);
  const grade = useUserStore((state) => state.grade);

  const [notices, setNotices] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState(null);

  const [categories, setCategories] = useState([]);

  // ⭐ 페이징 상태
  const [page, setPage] = useState(0);        // 0-base
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);   // ⭐ 추가

  /* =====================
      카테고리 로딩
  ===================== */
  useEffect(() => {
    axiosInstance
      .get("/cate/find_all")
      .then((res) => setCategories(Array.isArray(res.data) ? res.data : []))
      .catch(() => setCategories([]));
  }, []);

  /* =====================
      공지 목록 조회
  ===================== */
  const loadNotices = async () => {
    try {
      const res = await axiosInstance.get("/notice", {
        params: { page, size: 10 },
      });

      const list = res.data.content ?? [];

      list.sort((a, b) => {
        if (a.isFixed === b.isFixed) return b.noticeId - a.noticeId;
        return a.isFixed === "Y" ? -1 : 1;
      });

      setNotices(list);
      setTotalPages(res.data.totalPages);
      setTotalElements(res.data.totalElements);   // ⭐ 추가
      setSelected(null);
    } catch {
      alert("공지 목록 조회 실패");
    }
  };

  /* =====================
      검색
  ===================== */
  const searchNotices = async () => {
    if (!keyword.trim()) {
      setPage(0);
      loadNotices();
      return;
    }

    try {
      const res = await axiosInstance.get("/notice/search", {
        params: { keyword, page, size: 10 },
      });

      const list = res.data.content ?? [];

      list.sort((a, b) => {
        if (a.isFixed === b.isFixed) return b.noticeId - a.noticeId;
        return a.isFixed === "Y" ? -1 : 1;
      });

      setNotices(list);
      setTotalPages(res.data.totalPages);
      setTotalElements(res.data.totalElements);   // ⭐ 추가
      setSelected(null);
    } catch {
      alert("검색 실패");
    }
  };

  /* =====================
      삭제
  ===================== */
  const handleDelete = async () => {
    if (!selected) return;
    if (!window.confirm("정말 삭제하시겠습니까?")) return;

    try {
      await axiosInstance.delete(`/notice/${selected.noticeId}`, {
        params: { grade },
      });

      alert("삭제되었습니다.");
      loadNotices();
    } catch {
      alert("삭제 실패");
    }
  };

  /* =====================
      카테고리 경로 계산
  ===================== */
  const getCategoryPath = () => {
    if (!selected || !categories.length) return "";

    const sub = categories.find(
      (c) => String(c.cateno) === String(selected.category)
    );
    if (!sub) return selected.category;

    const parent = categories.find(
      (c) => c.grp === sub.grp && c.name === "--"
    );

    return parent ? `${parent.grp} > ${sub.name}` : sub.name;
  };

  // page 바뀔 때마다 로딩
  useEffect(() => {
    loadNotices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const current1 = page + 1;
  const nums = getPageNumbers(totalPages, current1);

  return (
    <div className="notice-container">
      <h2 className="notice-title">📢 공지사항</h2>

      {/* ================= 상단 검색 ================= */}
      <div className="notice-top-bar">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="검색어를 입력하세요"
          className="notice-input"
        />

        <button
          onClick={() => {
            setPage(0);
            searchNotices();
          }}
          className="notice-btn primary"
        >
          검색
        </button>

        {isLogin && Number(grade) === 2 && (
          <button
            onClick={() => navigate("/notice/new")}
            className="notice-btn primary"
          >
            등록
          </button>
        )}
      </div>

      {/* ================= 메인 ================= */}
      <div className="notice-layout">
        {/* ===== 리스트 ===== */}
        <ul className="notice-list">
          {notices.map((n) => (
            <li
              key={n.noticeId}
              onClick={() => setSelected(n)}
              className={`notice-item ${
                selected?.noticeId === n.noticeId ? "active" : ""
              }`}
            >
              {n.isFixed === "Y" && (
                <div className="notice-badge">📌 고정공지</div>
              )}

              <div className="notice-badge">
                {n.category || "공지"}
              </div>

              <strong className="notice-title-text">{n.title}</strong>

              <div className="notice-date">
                {(n.createdAt || n.created)?.substring(0, 10)}
              </div>
            </li>
          ))}

          {notices.length === 0 && (
            <li className="notice-item">공지사항이 없습니다.</li>
          )}
        </ul>

        {/* ===== 상세 ===== */}
        <div className="notice-detail">
          {selected ? (
            <>
              <h3>
                {selected.isFixed === "Y" && "📌 "}
                {selected.title}
              </h3>

              <div className="notice-detail-category">
                📂 {getCategoryPath()}
              </div>

              <p className="notice-content">{selected.content}</p>

              {selected.fileUrl && (
                <img
                  src={`${import.meta.env.VITE_API_BASE_URL}${selected.fileUrl}`}
                  className="notice-img"
                  alt="공지 이미지"
                />
              )}

              {isLogin && Number(grade) === 2 && (
                <div className="notice-admin">
                  <button
                    className="notice-btn primary"
                    onClick={() =>
                      navigate(`/notice/edit/${selected.noticeId}`)
                    }
                  >
                    수정
                  </button>

                  <button
                    className="notice-btn danger"
                    onClick={handleDelete}
                  >
                    삭제
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="notice-placeholder">
              👈 공지사항을 선택하세요
            </div>
          )}
        </div>
      </div>

      {/* ⭐ 페이징 ⭐ */}
      <div className="admin-pagination" style={{ marginTop: 20 }}>
        <button
          className="admin-page-btn"
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
              className={`admin-page-btn ${isCurr ? "btn-secondary" : ""}`}
            >
              {n}
            </button>
          );
        })}

        <button
          className="admin-page-btn"
          disabled={page + 1 >= totalPages}
          onClick={() => setPage(page + 1)}
        >
          &gt;
        </button>
      </div>

      {/* ⭐ 여기서 total 표시 ⭐ */}
      <div style={{ marginTop: 8, textAlign: "center", color: "#666" }}>
        page: {current1} / {totalPages} • total: {totalElements}
      </div>
    </div>
  );
}
