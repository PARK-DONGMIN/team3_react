import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./NoticeGlobalStyles.css";

function NoticeCreatePage() {
  const navigate = useNavigate();

  // 로그인 정보 (이후 store 연동도 가능)
  const loginUserId = "user1";
  const loginUserGrade = 2;

  // 입력값
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [isFixed, setIsFixed] = useState("N");
  const [selectedFile, setSelectedFile] = useState(null);

  // 카테고리 드롭다운
  const [menuData, setMenuData] = useState([]);
  const [hoverCate, setHoverCate] = useState(null);

  /* ===============================
      카테고리 로딩
  =============================== */
  useEffect(() => {
    axios
      .get("http://121.160.42.28:9100/cate/find_all")
      .then((res) => {
        const categories = Array.isArray(res.data) ? res.data : [];

        const parents = categories.filter((c) => c.name === "--");

        const menu = parents.map((parent) => ({
          ...parent,
          subCategories: categories.filter(
            (sub) => sub.grp === parent.grp && sub.name !== "--"
          ),
        }));

        setMenuData(menu);
      })
      .catch(() => setMenuData([]));
  }, []);

  /* ===============================
      파일 선택
  =============================== */
  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  /* ===============================
      등록 처리
  =============================== */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!category) {
      alert("카테고리를 선택하세요.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("userId", loginUserId);
      formData.append("grade", loginUserGrade);
      formData.append("title", title);
      formData.append("content", content);
      formData.append("category", category);
      formData.append("isFixed", isFixed);

      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      await axios.post(
        "http://121.160.42.28:9100/notice",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      alert("공지사항이 등록되었습니다.");
      navigate("/notice");
    } catch {
      alert("공지 등록 실패 (서버 로그 확인)");
    }
  };

  /* =============================== RENDER =============================== */
  return (
    <div className="notice-create-container">

      {/* ================= 상단 헤더 카드 ================= */}
      <div className="section-card">
        <h2 style={{ marginBottom: "6px" }}>공지사항 등록</h2>
        <div style={{ fontSize: "13px", color: "#777" }}>
          새로운 공지사항을 작성하세요.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="notice-create-form">

        {/* 제목 */}
        <div className="section-card">
          <div className="section-title">📌 제목</div>
          <input
            type="text"
            placeholder="제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* 내용 */}
        <div className="section-card">
          <div className="section-title">📝 내용</div>
          <textarea
            placeholder="내용을 입력하세요"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
        </div>

        {/* 카테고리 */}
        <div className="section-card">
          <div className="section-title">📂 카테고리 선택</div>

          <div className="notice-category-select">
            <div className="selected-category">
              {category
                ? `선택된 카테고리 번호 : ${category}`
                : "카테고리 선택 ▼"}
            </div>

            <div className="category-menu">
              {menuData.map((parent) => (
                <div
                  key={parent.cateno}
                  className="cate-menu"
                  onMouseEnter={() => setHoverCate(parent.grp)}
                  onMouseLeave={() => setHoverCate(null)}
                >
                  <span>{parent.grp} ▶</span>

                  {hoverCate === parent.grp &&
                    parent.subCategories.length > 0 && (
                      <ul className="cate-dropdown">
                        {parent.subCategories.map((sub) => (
                          <li
                            key={sub.cateno}
                            onClick={() => {
                              setCategory(sub.cateno);
                              setHoverCate(null);
                            }}
                          >
                            {sub.name}
                          </li>
                        ))}
                      </ul>
                    )}
                </div>
              ))}
            </div>
          </div>

          <select
            value={isFixed}
            onChange={(e) => setIsFixed(e.target.value)}
            style={{ marginTop: "10px" }}
          >
            <option value="N">일반 공지</option>
            <option value="Y">상단 고정</option>
          </select>
        </div>

        {/* 파일 */}
        <div className="section-card">
          <div className="section-title">📎 첨부파일</div>

          <input type="file" onChange={handleFileChange} />

          {selectedFile && (
            <p className="selected-file-name">
              선택된 파일: {selectedFile.name}
            </p>
          )}
        </div>

        {/* 버튼 */}
        <div className="button-area">
          <button type="submit">등록</button>
          <button type="button" onClick={() => navigate("/notice")}>
            취소
          </button>
        </div>
      </form>
    </div>
  );
}

export default NoticeCreatePage;
