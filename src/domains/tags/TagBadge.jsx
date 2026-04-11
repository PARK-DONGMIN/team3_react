import { useNavigate } from "react-router-dom";

function TagBadge({ tags = [], cateno }) {
  const navigate = useNavigate();

  return (
    <div style={{ margin: "8px 0 16px 0" }}>
      {tags.map((tag) => {
        const tagName = typeof tag === "string" ? tag : tag.name;
        const tagKey = typeof tag === "string" ? tag : tag.tagId ?? tag.name;

        // ✅ '#태그' 전체를 인코딩 -> %23여행
        const wordParam = encodeURIComponent(`#${tagName}`);

        return (
          <span
            key={tagKey}
            onClick={() => navigate(`/posts/list/${cateno}?page=0&word=${wordParam}`)}
            style={{
              display: "inline-block",
              marginRight: 8,
              marginBottom: 6,
              padding: "4px 10px",
              background: "#f1f3f5",
              borderRadius: 12,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            #{tagName}
          </span>
        );
      })}
    </div>
  );
}

export default TagBadge;
