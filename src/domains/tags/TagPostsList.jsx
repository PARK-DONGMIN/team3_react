import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axios";

const IMAGE_BASE_URL = "http://121.160.42.26:9100/storage/posts";

const TagPostsList = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [mode, setMode] = useState("OR");
  const [loading, setLoading] = useState(false);

  const tags = searchParams.getAll("tags");

  useEffect(() => {
    if (tags.length === 0) return;

    setLoading(true);

    axiosInstance
      .get("/posts/search/tags", {
        params: { tags, mode },
        paramsSerializer: (params) => {
          const qs = new URLSearchParams();
          params.tags.forEach((t) => qs.append("tags", t));
          qs.append("mode", params.mode);
          return qs.toString();
        },
      })
      .then((res) => {
        setPosts(res.data.content ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [searchParams, mode]);

  return (
    <div className="content">
      <h3>태그 검색 결과</h3>

      {/* 🔹 선택된 태그 */}
      {tags.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <strong>검색 태그:</strong>{" "}
          {tags.map((t) => (
            <span
              key={t}
              style={{
                marginRight: 6,
                padding: "2px 6px",
                background: "#f1f1f1",
                borderRadius: 4,
                fontSize: "0.85rem",
              }}
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* 🔹 OR / AND 토글 */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => setMode("OR")}
          className={`btn btn-sm ${
            mode === "OR" ? "btn-secondary" : "btn-outline-secondary"
          }`}
        >
          OR 검색
        </button>
        <button
          onClick={() => setMode("AND")}
          className={`btn btn-sm ${
            mode === "AND" ? "btn-secondary" : "btn-outline-secondary"
          }`}
          style={{ marginLeft: 6 }}
        >
          AND 검색
        </button>
        <span style={{ marginLeft: 10, color: "#666", fontSize: "0.85rem" }}>
          ({mode} 조건)
        </span>
      </div>

      {/* 🔹 상태 */}
      {loading && <p>검색 중입니다...</p>}
      {!loading && posts.length === 0 && (
        <p style={{ color: "#666" }}>검색 결과가 없습니다.</p>
      )}

      {/* 🔹 결과 리스트 */}
      {posts.map((post) => {
        const imageSrc = post.thumb1
          ? `${IMAGE_BASE_URL}/${post.thumb1}`
          : `${IMAGE_BASE_URL}/none1.png`;

        return (
          <div
            key={post.postId}
            onClick={() => navigate(`/posts/read/${post.postId}`)}
            style={{
              display: "flex",
              gap: 12,
              cursor: "pointer",
              padding: "12px 14px",
              border: "1px solid #e5e5e5",
              borderRadius: 6,
              marginBottom: 10,
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "#fafafa")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "#fff")
            }
          >
            {/* 썸네일 */}
            <img
              src={imageSrc}
              alt="thumbnail"
              style={{
                width: 90,
                height: 70,
                objectFit: "cover",
                borderRadius: 4,
                border: "1px solid #ddd",
              }}
              onError={(e) =>
                (e.currentTarget.src = `${IMAGE_BASE_URL}/none1.png`)
              }
            />

            {/* 정보 */}
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: "1rem" }}>{post.title}</strong>

              <div
                style={{
                  fontSize: "0.8rem",
                  color: "#888",
                  marginTop: 4,
                }}
              >
                {post.rdate?.substring(0, 10)} · 조회수 {post.cnt}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TagPostsList;
