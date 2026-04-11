import { useEffect, useState } from "react";
import axiosInstance from "../../api/axios";
import { useUserStore } from "../../store/store";
import { Link } from "react-router-dom";

export default function AiRecommend() {
  const userId = useUserStore((s) => s.userid);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      try {
        setLoading(true);

        const rec = await axiosInstance.get(`/ai/recommend/${userId}`);
        const ids = rec.data.slice(0, 5);   // 상위 5개만 사용


        if (!Array.isArray(ids) || ids.length === 0) {
          setPosts([]);
          return;
        }

        const res = await axiosInstance.get("/posts/list_by_ids", {
          params: { ids }
        });

        setPosts(res.data || []);
        setSelected(res.data?.[0] || null); // 첫 번째 글 자동 선택
      } catch (e) {
        console.error("AI 추천 불러오기 실패", e);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId]);

  if (!userId) {
    return <div style={{ padding: 40, textAlign: "center" }}>로그인하면 AI 추천 글을 볼 수 있습니다.</div>;
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center" }}>🤖 AI가 취향을 분석 중입니다...</div>;
  }

  return (
    <div style={{ maxWidth: 1200, margin: "30px auto" }}>
      <h2 style={{ marginBottom: 8 }}>🤖 AI 추천</h2>
      <p style={{ color: "#6b7280", marginBottom: 20 }}>
        당신의 활동 기록을 기반으로 AI가 골랐습니다.
      </p>

      <div style={{ display: "flex", gap: 20 }}>
        {/* ================= 왼쪽 추천 리스트 ================= */}
        <div style={{ width: 380 }}>
          {posts.map((p) => (
            <div
              key={p.postId}
              onClick={() => setSelected(p)}
              style={{
                cursor: "pointer",
                padding: 16,
                borderRadius: 12,
                marginBottom: 12,
                background: selected?.postId === p.postId ? "#eef2ff" : "#fff",
                border: "1px solid #e5e7eb",
                boxShadow: "0 1px 3px rgba(0,0,0,.04)"
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{p.title}</div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                {p.content?.substring(0, 60)}…
              </div>
            </div>
          ))}
        </div>

        {/* ================= 오른쪽 상세 영역 ================= */}
        <div
          style={{
            flex: 1,
            background: "#fff",
            borderRadius: 16,
            border: "1px solid #e5e7eb",
            padding: 30,
            minHeight: 400
          }}
        >
          {!selected && (
            <div style={{ color: "#9ca3af", textAlign: "center", marginTop: 80 }}>
              👉 추천 글을 선택하세요
            </div>
          )}

          {selected && (
            <>
              <h2 style={{ marginBottom: 12 }}>{selected.title}</h2>
              <div style={{ color: "#6b7280", marginBottom: 20 }}>
                조회수 {selected.cnt} · 좋아요 {selected.recom}
              </div>

              <div
                style={{
                  lineHeight: 1.7,
                  color: "#111",
                  marginBottom: 30,
                  whiteSpace: "pre-wrap"
                }}
              >
                {selected.content}
              </div>

              <Link
                to={`/posts/read/${selected.postId}`}
                style={{
                  display: "inline-block",
                  background: "#4f46e5",
                  color: "#fff",
                  padding: "10px 20px",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontWeight: 600
                }}
              >
                글 보러가기 →
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
