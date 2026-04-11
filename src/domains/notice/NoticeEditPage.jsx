import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import "./NoticeGlobalStyles.css";

const API = "http://121.160.42.28:9100/notice";

export default function NoticeEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // 로그인 정보 (나중에 store 연결 가능)
  const loginUserId = "user1";
  const loginUserGrade = 2;

  // 입력값
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [isFixed, setIsFixed] = useState("N");

  // 파일 관련
  const [currentFileUrl, setCurrentFileUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  // 카테고리 메뉴
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
      기존 공지 로딩
  =============================== */
  const loadNotice = async () => {
    try {
      const res = await axios.get(`${API}/${id}`);
      const n = res.data;

      setTitle(n.title || "");
      setContent(n.content || "");
      setCategory(n.category || "");
      setIsFixed(n.isFixed || "N");
      setCurrentFileUrl(n.fileUrl || "");
      setSelectedFile(null);
    } catch {
      alert("공지 정보를 불러오지 못했습니다.");
      navigate("/notice");
    }
  };

  useEffect(() => {
    loadNotice();
  }, [id]);

  /* ===============================
      파일 선택
  =============================== */
  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  /* ===============================
      수정 처리
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

      await axios.put(`${API}/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("공지사항이 수정되었습니다.");
      navigate("/notice");
    } catch {
      alert("수정 실패 (서버 로그 확인)");
    }
  };

  /* =============================== RENDER =============================== */
  return (
    <div className="notice-create-container">

      {/* ================= 상단 헤더 카드 ================= */}
      <div className="section-card">
        <h2 style={{ marginBottom: "6px" }}>공지사항 수정</h2>
        <div style={{ fontSize: "13px", color: "#777" }}>
          제목 / 내용 / 카테고리 / 파일을 수정할 수 있습니다.
        </div>
      </div>

      {/* ================= 폼 섹션 ================= */}
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

        {/* 카테고리 + 고정 */}
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

        {/* 파일 섹션 */}
        <div className="section-card">
          <div className="section-title">📎 첨부파일</div>

          <input type="file" onChange={handleFileChange} />

          {currentFileUrl && !selectedFile && (
            <p className="current-file-info">
              현재 파일:{" "}
              <a
                href={`http://121.160.42.28:9100${currentFileUrl}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {currentFileUrl.split("/").pop()}
              </a>
            </p>
          )}

          {selectedFile && (
            <p className="selected-file-name">
              새 파일: {selectedFile.name}
            </p>
          )}

          {!currentFileUrl && !selectedFile && (
            <p className="no-file-info">첨부된 파일 없음</p>
          )}
        </div>

        {/* 버튼 */}
        <div className="button-area">
          <button type="submit">수정</button>
          <button type="button" onClick={() => navigate("/notice")}>
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
