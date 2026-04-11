import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axiosInstance from "../../api/axios";
import { useUserStore } from "../../store/store.js";
import "./PostsStyles.css";

const Posts_Create = () => {
  const navigate = useNavigate();
  const { cateno } = useParams();

  const userid = useUserStore((state) => state.userid);

  const [cate, setCate] = useState({});

  useEffect(() => {
    axiosInstance
      .get(`/cate/${cateno}`)
      .then((res) => setCate(res.data))
      .catch(console.error);
  }, [cateno]);

  const [input, setInput] = useState({
    title: "",
    content: "",
    word: "",
    password: "",
    youtube: "",
    map: "",
    tagsText: "",
  });

  const onChange = (e) => {
    const { id, value } = e.target;
    setInput((prev) => ({ ...prev, [id]: value }));
  };

  const [file, setFile] = useState(null);

  /* =========================
     🔹 태그 유틸
  ========================= */

  // "#서울 #맛집" → ["서울", "맛집"]
  const parseTags = (text) => {
    return text
      .split(/[\s,#]+/)
      .map((t) => t.trim())
      .filter(Boolean);
  };

  // ["서울","맛집"] → "#서울 #맛집"
  const formatTags = (tags) => {
    return Array.from(tags).map((t) => `#${t}`).join(" ");
  };

  /* =========================
     🔥 AI 태그 생성
     (기존 태그 + AI 태그 병합)
  ========================= */

  const [aiLoading, setAiLoading] = useState(false);

  const generateAiTags = async () => {
    if (!input.title.trim() || !input.content.trim()) {
      alert("제목과 내용을 먼저 입력하세요.");
      return;
    }

    try {
      setAiLoading(true);

      // 🔹 기존 수동 태그
      const manualTags = parseTags(input.tagsText);

      const res = await axiosInstance.post("/ai/tags", {
        title: input.title,
        content: input.content,
        tags: manualTags, // ✅ 반드시 포함
      });

      const aiTags = res.data?.tags ?? [];

      if (aiTags.length === 0) {
        alert("AI가 태그를 생성하지 못했습니다.");
        return;
      }

      // 🔹 병합 + 중복 제거
      const mergedTags = new Set([
        ...manualTags,
        ...aiTags,
      ]);

      setInput((prev) => ({
        ...prev,
        tagsText: formatTags(mergedTags),
      }));
    } catch (err) {
      console.error(err);
      alert("AI 태그 생성 중 오류가 발생했습니다.");
    } finally {
      setAiLoading(false);
    }
  };

  /* =========================
     게시글 등록
  ========================= */

  const send = async (e) => {
    e.preventDefault();

    if (!userid) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    if (!input.title.trim()) {
      alert("제목을 입력하세요.");
      return;
    }

    if (!input.content.trim()) {
      alert("내용을 입력하세요.");
      return;
    }

    const formData = new FormData();
    formData.append("userId", userid);
    formData.append("cateno", cateno);
    formData.append("title", input.title);
    formData.append("content", input.content);
    formData.append("word", input.word);
    formData.append("password", input.password);
    formData.append("youtube", input.youtube);
    formData.append("map", input.map);

    const tags = parseTags(input.tagsText);
    tags.forEach((tag) => formData.append("tags", tag));

    if (file) formData.append("file1MF", file);

    try {
      const res = await axiosInstance.post("/posts/create", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.status === 200) {
        alert("등록 완료");
        navigate(`/posts/list/${cateno}`);
      } else {
        alert("글 등록 실패");
      }
    } catch (err) {
      console.error(err);
      alert("네트워크 오류");
    }
  };

  return (
    <div className="content">
      <div className="title_line_left">
        {cate.grp} &gt; {cate.name}
      </div>

      <aside className="aside_right">
        <Link to={`/posts/list/${cateno}`}>목록</Link>
        <span className="aside_menu_divide">|</span>
        <a href="#!" onClick={() => location.reload()}>새로고침</a>
      </aside>

      <div className="aside_menu_line"></div>

      <form onSubmit={send} encType="multipart/form-data" className="soft-box">

        <div className="input_div">
          <label>제목</label>
          <input
            type="text"
            id="title"
            value={input.title}
            onChange={onChange}
            required
            className="form-control"
          />
        </div>

        <div className="input_div">
          <label>내용</label>
          <textarea
            id="content"
            value={input.content}
            onChange={onChange}
            required
            rows={6}
            className="form-control"
          />
        </div>

        <div className="input_div">
          <label>태그</label>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="text"
              id="tagsText"
              value={input.tagsText}
              onChange={onChange}
              className="form-control"
              placeholder="#자전거여행 #국내여행 #라이딩코스"
            />
            <button
              type="button"
              onClick={generateAiTags}
              disabled={aiLoading}
              className="btn btn-outline-secondary btn-sm"
              style={{ whiteSpace: "nowrap" }}
            >
              {aiLoading ? "생성중..." : "AI 태그"}
            </button>
          </div>
          <small style={{ color: "#666" }}>
            # 또는 공백으로 구분합니다.
          </small>
        </div>

        <div className="input_div">
          <label>검색어</label>
          <input
            type="text"
            id="word"
            value={input.word}
            onChange={onChange}
            className="form-control"
          />
        </div>

        <div className="input_div">
          <label>Youtube</label>
          <textarea
            id="youtube"
            value={input.youtube}
            onChange={onChange}
            rows={3}
            className="form-control"
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>

        <div className="input_div">
          <label>지도 (카카오맵)</label>
          <textarea
            id="map"
            value={input.map}
            onChange={onChange}
            rows={3}
            className="form-control"
            placeholder="카카오맵 공유 HTML"
          />
        </div>

        <div className="input_div">
          <label>파일</label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="form-control"
          />
        </div>

        <div className="input_div">
          <label>비밀번호</label>
          <input
            type="password"
            id="password"
            value={input.password}
            onChange={onChange}
            required
            className="form-control"
          />
        </div>

        <div style={{ textAlign: "center", marginTop: 10 }}>
          <button type="submit" className="btn btn-outline-secondary btn-sm">
            등록
          </button>{" "}
          <button
            type="button"
            onClick={() => navigate(`/posts/list/${cateno}`)}
            className="btn btn-outline-secondary btn-sm"
          >
            목록
          </button>
        </div>

      </form>
    </div>
  );
};

export default Posts_Create;
