import React, { useEffect, useState } from 'react';
import {
  useParams, useNavigate, Link, useSearchParams
} from 'react-router-dom';
import axiosInstance from '../../api/axios';
import { useUserStore } from '../../store/store';
import TagBadge from "../tags/TagBadge";
import CommentsSection from "../comments/CommentsSection";

const extractYoutubeId = (value) => {
  if (!value) return '';
  if (value.includes('/shorts/'))
    return value.split('/shorts/')[1].split('?')[0];
  if (value.includes('watch?v='))
    return value.split('watch?v=')[1].split('&')[0];
  if (value.includes('youtu.be/'))
    return value.split('youtu.be/')[1].split('?')[0];
  return value;
};

const extractIframeSrc = (value) => {
  if (!value) return '';
  const match = value.match(/src=["']([^"']+)["']/i);
  return match ? match[1] : value;
};

const Posts_Read = () => {

  /* ================= CSS ================= */
  const style = `
    .soft-box {
      background:white;
      border-radius:22px;
      border:1px solid #eee;
      padding:22px;
      margin-top:14px;
      box-shadow:0 12px 28px rgba(0,0,0,0.08);
    }

    .reaction-btn {
      padding:8px 14px;
      border-radius:12px;
      border:1px solid #ddd;
      background:white;
      cursor:pointer;
      transition:.2s;
    }
    .reaction-btn:hover { background:#eef2ff; }

    .reaction-like { background:#ffe2e8; border:none; }
    .reaction-fav { background:#fff6c6; border:none; }

    /* 🔥 AI 요약 버튼 */
    .ai-summary-btn{
      background:#eef2ff;
      border:1px solid #4c6ef5;
      color:#4c6ef5;
      font-weight:700;
    }

    .top-pill{
      padding: 6px 14px;
      border-radius: 999px;
      border:1px solid #d0d7ff;
      background:white;
      color:#4c6ef5;
      font-size:13px;
      font-weight:600;
      cursor:pointer;
      transition:.2s;
      text-decoration:none;
    }
    .top-pill:hover{ background:#eef2ff; border-color:#4c6ef5; }

    .top-pill-warn{ border:1px solid #ff4d4f; color:#ff4d4f; }
    .top-pill-warn:hover{ background:#fff0f0; }

    .modal-bg{
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.6);
      display:flex;
      justify-content:center;
      align-items:center;
      z-index:2000;
    }

    .modal-box{
      width:440px;
      background:white;
      border-radius:18px;
      padding:18px;
      box-shadow:0 20px 40px rgba(0,0,0,.3);
    }
  `;

  const [searchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? 0);
  const word = searchParams.get('word') ?? '';

  const { postId } = useParams();
  const navigate = useNavigate();

  const userid = useUserStore(state => state.userid);
  const grade = useUserStore(state => state.grade);

  const [data, setData] = useState({
    title: '',
    content: '',
    youtube: '',
    map: '',
    cateno: 0
  });

  const [cate, setCate] = useState({});
  const [tags, setTags] = useState([]);

  /* 🔥 AI SUMMARY STATE */
  const [aiSummary, setAiSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  /* ================= Reaction ================= */
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);

  const [likeCount, setLikeCount] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState(0);

  const submitReport = async () => {
  if (!userid) {
    alert("로그인이 필요합니다.");
    return;
  }

  if (!report.reason.trim()) {
    alert("신고 사유를 입력하세요.");
    return;
  }

  try {
    await axiosInstance.post("/reports/posts", {
      reporterId: userid,                 // ⭐ DTO와 100% 일치
      postId: Number(postId),             // ⭐
      reportCategory: report.reportCategory,
      reason: report.reason,
      evidenceUrl: report.evidenceUrl || null
    });

    alert("신고가 접수되었습니다.");
    setShowReportModal(false);
    setReport({ reportCategory: "욕설", reason: "", evidenceUrl: "" });

  } catch (e) {
    console.error(e);
    if (e.response?.status === 409) {
      alert("이미 신고한 게시글입니다.");
    } else {
      alert("신고 처리 중 오류가 발생했습니다.");
    }
  }
};


  const refreshReactionStatus = async () => {
    if (!postId) return;

    try {
      const [likeRes, favRes] = await Promise.all([
        axiosInstance.get(`/reactions/post/${postId}/type/like`, {
          params: { page: 0, size: 9999 }
        }),
        axiosInstance.get(`/reactions/post/${postId}/type/favorite`, {
          params: { page: 0, size: 9999 }
        })
      ]);

      const likes = likeRes.data.content || [];
      const favs  = favRes.data.content || [];

      setLikeCount(likes.length);
      setFavoriteCount(favs.length);

      if (userid) {
        setLiked(likes.some(r => r.userId === userid));
        setFavorited(favs.some(r => r.userId === userid));
      }
    } catch (e) {
      console.error("reaction load failed", e);
    }
  };

  const toggleReaction = async (type, current, setState) => {
    if (!userid) return alert("로그인이 필요합니다.");

    try {
      if (current) {
        const res = await axiosInstance.get(
          `/reactions/user/${userid}/type/${type}`,
          { params: { page: 0, size: 9999 } }
        );

        const target = res.data.content.find(r => r.postId === Number(postId));
        if (target) await axiosInstance.delete(`/reactions/${target.reactionNo}`);

        if (type === "like") setLikeCount(c => Math.max(0, c - 1));
        if (type === "favorite") setFavoriteCount(c => Math.max(0, c - 1));
      } else {
        await axiosInstance.post("/reactions", {
          reactionId: `PR-${userid}-${postId}-${type}`,
          userId: userid,
          postId: Number(postId),
          type
        });

        if (type === "like") setLikeCount(c => c + 1);
        if (type === "favorite") setFavoriteCount(c => c + 1);
      }

      setState(!current);
      refreshReactionStatus();

    } catch {
      alert("처리 중 오류 발생");
    }
  };

  const toggleLike = () => toggleReaction("like", liked, setLiked);
  const toggleFavorite = () => toggleReaction("favorite", favorited, setFavorited);

  /* 🔥 AI 요약 */
    const loadAiSummary = async () => {
    if (!data.content) return;

    try {
      setSummaryLoading(true);

      const res = await fetch("http://139.150.91.194:11307/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: data.content })
      });

      const result = await res.json();
      setAiSummary(result.summary); // ✅ summary 키 확인

    } catch (e) {
      console.error(e);
      alert("AI 요약 실패");
    } finally {
      setSummaryLoading(false);
    }
  };


  /* ================= 신고 ================= */
  const [showReportModal, setShowReportModal] = useState(false);
  const [report, setReport] = useState({
    reportCategory: "욕설",
    reason: "",
    evidenceUrl: ""
  });

  useEffect(() => {
    if (!postId) return;

    axiosInstance.get(`/posts/read/${postId}`)
      .then(res => {
        const d = res.data;
        setData({ ...d, youtube: extractYoutubeId(d.youtube) });
        return axiosInstance.get(`/cate/${d.cateno}`);
      })
      .then(res => setCate(res.data));

    axiosInstance.get(`/api/post-tags/post/${postId}`)
      .then(res => setTags(res.data));

    refreshReactionStatus();
  }, [postId, userid]);

  return (
    <div className="content">
      <style>{style}</style>

      <div className="title_line_left">
        {cate.grp} &gt; {cate.name}
      </div>

      {/* 상단 메뉴 pill */}
      <div style={{ display: "flex", gap: "6px", marginTop: "8px", marginBottom: "14px" }}>
        <Link className="top-pill" to={`/posts/create/${cate.cateno}`}>글쓰기</Link>
        <button className="top-pill" onClick={() => window.location.reload()}>새로고침</button>
        <Link className="top-pill" to={`/posts/update/text/${postId}`}>글 수정</Link>
        <Link className="top-pill" to={`/posts/update/file1/${postId}`}>파일 수정</Link>
        <Link className="top-pill" to={`/posts/youtube/${postId}`}>Youtube 수정</Link>
        <Link className="top-pill" to={`/posts/map/${postId}`}>Map 수정</Link>
        <Link className="top-pill" to={`/posts/delete/${postId}?page=${page}&word=${word}`}>삭제</Link>
        <Link className="top-pill" to={`/posts/list/${cate.cateno}?page=${page}&word=${word}`}>목록형</Link>
        <Link className="top-pill" to={`/posts/list_gallery/${cate.cateno}?page=${page}&word=${word}`}>갤러리형</Link>
        <button className="top-pill top-pill-warn" onClick={() => setShowReportModal(true)}>🚨 신고</button>
      </div>

      <div className="aside_menu_line" />

      {/* ❤️ ⭐ 🤖 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button className={`reaction-btn ${liked ? "reaction-like" : ""}`} onClick={toggleLike}>
          {liked ? "❤️ 좋아요 취소" : "🤍 좋아요"} ({likeCount})
        </button>

        <button className={`reaction-btn ${favorited ? "reaction-fav" : ""}`} onClick={toggleFavorite}>
          {favorited ? "⭐ 즐겨찾기 취소" : "☆ 즐겨찾기"} ({favoriteCount})
        </button>

        <button className="reaction-btn ai-summary-btn" onClick={loadAiSummary}>
          {summaryLoading ? "🤖 요약 중..." : "🤖 AI 요약"}
        </button>
      </div>

      {aiSummary && (
        <div className="soft-box" style={{ background: "#f8f9ff" }}>
          <b>🤖 AI 요약</b>
          <div style={{ marginTop: 8 }}>{aiSummary}</div>
        </div>
      )}

      {/* 본문 */}
      <div className="soft-box">
        <h3>{data.title}</h3>
        {tags.length > 0 ? <TagBadge tags={tags} cateno={cate.cateno} /> :
          <div style={{ fontSize: ".85rem", color: "#aaa", marginBottom: 10 }}>태그 없음</div>}
        <div style={{ whiteSpace: "pre-wrap" }}>{data.content}</div>
      </div>

      {/* YouTube */}
      {data.youtube && (
        <div className="soft-box" style={{ width: 560, margin: "25px auto" }}>
          <iframe width="100%" height="315"
            src={`https://www.youtube.com/embed/${data.youtube}`} allowFullScreen />
        </div>
      )}

      {/* 지도 */}
      {data.map && (
        <div className="soft-box" style={{ width: 670, margin: "25px auto" }}>
          <iframe src={extractIframeSrc(data.map)} width="100%" height="360" style={{ border: 0 }} />
        </div>
      )}
      {showReportModal && (
  <div className="modal-bg">
    <div className="modal-box">
      <h3>🚨 게시글 신고</h3>

      <div style={{ marginTop: 10 }}>
        <label>분류</label>
        <select
          style={{ width: "100%", marginTop: 6 }}
          value={report.reportCategory}
          onChange={(e) =>
            setReport({ ...report, reportCategory: e.target.value })
          }
        >
          <option value="욕설">욕설</option>
          <option value="혐오">혐오</option>
          <option value="스팸">스팸</option>
          <option value="광고">광고</option>
          <option value="기타">기타</option>
        </select>
      </div>

      <div style={{ marginTop: 12 }}>
        <label>사유</label>
        <textarea
          style={{ width: "100%", height: 80, marginTop: 6 }}
          placeholder="신고 사유를 입력하세요"
          value={report.reason}
          onChange={(e) =>
            setReport({ ...report, reason: e.target.value })
          }
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <label>증거 URL (선택)</label>
        <input
          style={{ width: "100%", marginTop: 6 }}
          placeholder="https://..."
          value={report.evidenceUrl}
          onChange={(e) =>
            setReport({ ...report, evidenceUrl: e.target.value })
          }
        />
      </div>

      <div style={{ marginTop: 16, textAlign: "right" }}>
        <button
          className="reaction-btn"
          onClick={() => setShowReportModal(false)}
        >
          취소
        </button>

        <button
          className="reaction-btn top-pill-warn"
          style={{ marginLeft: 8 }}
          onClick={submitReport}
        >
          신고 접수
        </button>
      </div>
    </div>
  </div>
)}

      <CommentsSection postId={postId} />

    </div>
  );
};

export default Posts_Read;
