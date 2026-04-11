import { useState } from "react";
import { useNavigate } from "react-router-dom";

function TagSearchBar() {
  const [tag, setTag] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    if (!tag.trim()) return;
    const cleanTag = tag.replace("#", "");
    navigate(`/posts/list/all/paging/search?tag=${cleanTag}`);
  };

  return (
    <div style={{ marginBottom: "20px" }}>
      <input
        placeholder="#태그로 검색"
        value={tag}
        onChange={(e) => setTag(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
      />
      <button onClick={handleSearch}>검색</button>
    </div>
  );
}

export default TagSearchBar;
