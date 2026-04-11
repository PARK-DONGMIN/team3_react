import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { reviewApi } from "./ReviewApi";
import api from "../../api/axios";
import "./Review.css";

export default function ReviewList() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const city = params.get("city") ? decodeURIComponent(params.get("city")).trim() : "";
  const district = params.get("district") ? decodeURIComponent(params.get("district")).trim() : "";

  const canFetch = city && district;

  // ✅ 입력용(IME 조합 중에도 계속 바뀜)
  const [keywordInput, setKeywordInput] = useState("");
  // ✅ 실제 검색에 사용할 키워드(검색 버튼/엔터로만 반영)
  const [keyword, setKeyword] = useState("");

  const [sortBy, setSortBy] = useState("createdAt");
  const [direction, setDirection] = useState("desc");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ reviewId -> tags[]
  const [tagsMap, setTagsMap] = useState({}); // { [reviewId]: [{tagType, tagValue}] }

  const reviews = useMemo(() => {
    if (!pageData) return [];
    return Array.isArray(pageData.content) ? pageData.content : [];
  }, [pageData]);

  const totalPages = pageData?.totalPages ?? 0;
  const totalElements = pageData?.totalElements ?? 0;

  // ✅ 숫자 페이지 계산 (현재 페이지 기준으로 5개)
  const pageNumbers = useMemo(() => {
    if (totalPages <= 0) return [];
    const maxButtons = 5;
    const current = page;

    let start = Math.max(0, current - Math.floor(maxButtons / 2));
    let end = start + maxButtons - 1;

    if (end >= totalPages - 1) {
      end = totalPages - 1;
      start = Math.max(0, end - (maxButtons - 1));
    }

    const nums = [];
    for (let i = start; i <= end; i++) nums.push(i);
    return nums;
  }, [page, totalPages]);

  // 지역 바뀌면 초기화
  useEffect(() => {
    setPage(0);
    setKeywordInput("");
    setKeyword("");
    setTagsMap({});
  }, [city, district]);

  // ✅ keyword(확정된 검색어)로만 API 호출
  useEffect(() => {
    if (!canFetch) return;

    setLoading(true);

    reviewApi
      .search({ city, district, keyword, page, size, sortBy, direction })
      .then((data) => setPageData(data))
      .catch((err) => {
        console.error(err);
        alert("리뷰 목록을 불러오지 못했습니다.");
        setPageData(null);
      })
      .finally(() => setLoading(false));
  }, [city, district, canFetch, keyword, page, size, sortBy, direction]);

  const onSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    setKeyword(keywordInput.trim());
  };

  const onReset = () => {
    setKeywordInput("");
    setKeyword("");
    setPage(0);
  };

  // ✅ 태그 normalize
  const normalizeTagItem = (t) => {
    const type = t?.tagType ?? t?.type ?? t?.TAG_TYPE ?? "";
    const value = t?.tagValue ?? t?.value ?? t?.TAG_VALUE ?? "";
    return {
      tagType: String(type || "").trim(),
      tagValue: String(value || "").trim(),
    };
  };

  // ✅ 현재 페이지 리뷰들의 태그를 한번에 가져오기
  useEffect(() => {
    const ids = reviews.map((r) => r.reviewId).filter(Boolean);
    if (ids.length === 0) return;

    // 이미 있는 건 제외 (캐시)
    const need = ids.filter((id) => !tagsMap[id]);
    if (need.length === 0) return;

    let cancelled = false;

    (async () => {
      try {
        const results = await Promise.all(
          need.map(async (id) => {
            try {
              const res = await api.get(`/review/ai/tags/${id}`);
              const arr = Array.isArray(res.data) ? res.data : [];
              const normalized = arr.map(normalizeTagItem).filter((x) => x.tagType && x.tagValue);
              return [id, normalized];
            } catch {
              // 태그 없거나 에러면 빈 배열로 캐시
              return [id, []];
            }
          })
        );

        if (cancelled) return;

        setTagsMap((prev) => {
          const next = { ...prev };
          for (const [id, arr] of results) next[id] = arr;
          return next;
        });
      } catch (e) {
        console.warn("리스트 태그 일괄 조회 실패", e);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviews]);

  if (!canFetch) return <p className="empty-text">지역을 선택해주세요.</p>;
  if (loading) return <p className="loading-text">로딩 중...</p>;

  return (
    <div className="review-page">
      <div className="review-list-header">
        <h2>📍 {city} {district}</h2>

        <button className="btn-primary" onClick={() => navigate("/review/create")}>
          + 리뷰 추가
        </button>
      </div>

      {/* ✅ 검색/정렬 */}
      <div
        className="review-controls"
        style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}
      >
        <form onSubmit={onSearchSubmit} style={{ display: "flex", gap: 10, flex: 1 }}>
          <input
            className="review-search"
            placeholder="장소명으로 검색 (예: 카페, 공원...)"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              outline: "none",
            }}
          />

          <button className="btn-outline" type="submit">
            검색
          </button>

          <button className="btn-outline" type="button" onClick={onReset}>
            초기화
          </button>
        </form>

        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value); setPage(0); }}
          style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
        >
          <option value="createdAt">최신순</option>
          <option value="rating">평점순</option>
        </select>

        <select
          value={direction}
          onChange={(e) => { setDirection(e.target.value); setPage(0); }}
          style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
        >
          <option value="desc">내림차순</option>
          <option value="asc">오름차순</option>
        </select>

        <select
          value={size}
          onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}
          style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
        >
          <option value={10}>10개</option>
          <option value={20}>20개</option>
          <option value={30}>30개</option>
        </select>
      </div>

      <div style={{ marginBottom: 10, color: "#6b7280", fontSize: 13 }}>
        총 {totalElements}개 {keyword ? `· 검색어: "${keyword}"` : ""}
      </div>

      {reviews.length === 0 ? (
        <p className="empty-text">아직 등록된 리뷰가 없습니다.</p>
      ) : (
        <div className="review-card-list">
          {reviews.map((r) => {
            const tgs = tagsMap[r.reviewId] || [];
            const summary1 = (r.aiSummary || "").trim(); // ✅ DB에 저장된 요약이 있으면 표시

            return (
              <div
                key={r.reviewId}
                className="review-card"
                onClick={() => navigate(`/review/detail/${r.reviewId}`)}
              >
                <div className="review-card-top">
                  <span className="review-place">{r.placeName}</span>
                  <span className="review-rating">⭐ {r.rating}</span>
                </div>

                {/* ✅ 태그 표시 */}
                <div className="review-tags" style={{ marginBottom: 8 }}>
                  {tgs.length === 0 ? (
                    <span className="tag-empty" style={{ fontSize: 12 }}>태그 없음</span>
                  ) : (
                    tgs.slice(0, 6).map((t, idx) => (
                      <span
                        key={`${r.reviewId}-${t.tagType}-${t.tagValue}-${idx}`}
                        className="tag-chip"
                        style={{ fontSize: 12 }}
                      >
                        {t.tagType} · {t.tagValue}
                      </span>
                    ))
                  )}
                </div>

                {/* ✅ 저장된 요약 표시 (있을 때만) */}
                {summary1 && (
                  <p className="review-content" style={{ marginBottom: 8 }}>
                    🤖 {summary1}
                  </p>
                )}

                {/* 기존 내용은 너무 길 수 있으니 미리보기 */}
                <p className="review-content">
                  {(r.content || "").length > 90 ? `${r.content.slice(0, 90)}...` : r.content}
                </p>

                <span className="review-user">작성자 · {r.userId}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ✅ 숫자 페이징 */}
      {totalPages > 1 && (
        <div
          className="review-pagination"
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            marginTop: 18,
            flexWrap: "wrap",
          }}
        >
          <button className="btn-outline" disabled={page === 0} onClick={() => setPage(0)}>
            {"<<"}
          </button>

          <button
            className="btn-outline"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            {"<"}
          </button>

          {pageNumbers.map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                minWidth: 38,
                height: 38,
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: p === page ? "#111827" : "#fff",
                color: p === page ? "#fff" : "#111827",
                fontWeight: p === page ? 700 : 500,
                cursor: "pointer",
              }}
            >
              {p + 1}
            </button>
          ))}

          <button
            className="btn-outline"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            {">"}
          </button>

          <button
            className="btn-outline"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(totalPages - 1)}
          >
            {">>"}
          </button>
        </div>
      )}
    </div>
  );
}
