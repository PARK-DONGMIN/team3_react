// src/domains/ai/AiPanel.jsx
import { useMemo, useState } from "react";
import { aiApi } from "../../api/aiApi";

export default function AiPanel({ scheduleId, mode = "detail", userNo = null }) {
  const scheduleIdNum = useMemo(() => Number(scheduleId), [scheduleId]);
  const valid = Number.isFinite(scheduleIdNum) && scheduleIdNum > 0;

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [summary, setSummary] = useState("");
  const [hashtags, setHashtags] = useState([]);
  const [highlights, setHighlights] = useState([]);

  const [chatQ, setChatQ] = useState("");
  const [chatLog, setChatLog] = useState([]); // {role:'user'|'ai', text:string}

  const runSummary = async (force = 0) => {
    if (!valid) return;
    try {
      setErr("");
      setBusy(true);
      const res = await aiApi.summary(scheduleIdNum, force);
      const text = res?.summary || res?.text || (typeof res === "string" ? res : "") || "";
      setSummary(text);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || "요약 실패";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  const runHashtags = async (force = 0) => {
    if (!valid) return;
    try {
      setErr("");
      setBusy(true);
      const res = await aiApi.hashtags(scheduleIdNum, force);
      const tags = Array.isArray(res?.hashtags) ? res.hashtags : [];
      setHashtags(tags);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || "해시태그 추천 실패";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  const runHighlights = async (force = 0) => {
    if (!valid) return;
    try {
      setErr("");
      setBusy(true);
      const res = await aiApi.dayHighlights(scheduleIdNum, force);
      const arr = Array.isArray(res?.days)
        ? res.days
        : Array.isArray(res?.highlights)
        ? res.highlights
        : Array.isArray(res)
        ? res
        : [];
      setHighlights(arr);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || "하이라이트 실패";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  const sendChat = async () => {
    if (!valid) return;
    const q = chatQ.trim();
    if (!q) return;

    const nextLog = [...chatLog, { role: "user", text: q }];
    setChatLog(nextLog);
    setChatQ("");

    try {
      setErr("");
      setBusy(true);
      const payload = { message: q, userNo, mode };
      const res = await aiApi.chat(scheduleIdNum, payload);
      const a = res?.answer || res?.message || res?.text || (typeof res === "string" ? res : "");
      setChatLog((p) => [...p, { role: "ai", text: a || "(응답이 비어있어요)" }]);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || "채팅 실패";
      setErr(msg);
      setChatLog((p) => [...p, { role: "ai", text: `❌ ${msg}` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        border: "1px solid rgba(15,23,42,0.08)",
        borderRadius: 18,
        padding: 12,
        background: "rgba(255,255,255,0.92)",
        boxShadow: "0 10px 22px rgba(15,23,42,0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontWeight: 1000, fontSize: 13 }}>🤖 AI 도우미</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>{valid ? `scheduleId: ${scheduleIdNum}` : "일정ID 없음"}</div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        <button className="sd-btn ghost sm" type="button" onClick={() => runSummary(0)} disabled={!valid || busy}>
          {busy ? "처리중..." : "요약"}
        </button>
        <button className="sd-btn ghost sm" type="button" onClick={() => runHashtags(0)} disabled={!valid || busy}>
          {busy ? "처리중..." : "해시태그"}
        </button>
        <button className="sd-btn ghost sm" type="button" onClick={() => runHighlights(0)} disabled={!valid || busy}>
          {busy ? "처리중..." : "일차 하이라이트"}
        </button>
      </div>

      {err ? <div style={{ marginTop: 10, color: "#d33", fontSize: 12, fontWeight: 800 }}>{err}</div> : null}

      {summary ? (
        <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
          <div style={{ fontWeight: 1000, marginBottom: 6 }}>요약</div>
          <div>{summary}</div>
        </div>
      ) : null}

      {hashtags?.length ? (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 1000, fontSize: 12, marginBottom: 6 }}>추천 해시태그</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {hashtags.map((t, i) => (
              <span
                key={i}
                style={{
                  fontSize: 12,
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(15,23,42,0.12)",
                  background: "rgba(15,23,42,0.04)",
                  fontWeight: 900,
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {highlights?.length ? (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 1000, fontSize: 12, marginBottom: 6 }}>일차별 하이라이트</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.5 }}>
            {highlights.map((x, i) => (
              <li key={i}>{typeof x === "string" ? x : JSON.stringify(x)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div style={{ marginTop: 10 }}>
        <div style={{ fontWeight: 1000, fontSize: 12, marginBottom: 6 }}>AI 채팅</div>

        <div
          style={{
            maxHeight: 160,
            overflow: "auto",
            border: "1px solid rgba(15,23,42,0.08)",
            borderRadius: 14,
            padding: 10,
            background: "rgba(15,23,42,0.02)",
          }}
        >
          {chatLog.length === 0 ? (
            <div style={{ fontSize: 12, opacity: 0.6 }}>질문을 입력해보세요.</div>
          ) : (
            chatLog.map((m, i) => (
              <div key={i} style={{ marginBottom: 8, fontSize: 12, whiteSpace: "pre-wrap" }}>
                <b style={{ marginRight: 6 }}>{m.role === "user" ? "나" : "AI"}:</b>
                {m.text}
              </div>
            ))
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            value={chatQ}
            onChange={(e) => setChatQ(e.target.value)}
            placeholder="예) 2일차 코스 더 추천해줘"
            style={{
              flex: "1 1 auto",
              minWidth: 0,
              border: "1px solid rgba(15,23,42,0.12)",
              borderRadius: 14,
              padding: "10px 12px",
              fontSize: 12,
              outline: "none",
              background: "rgba(255,255,255,0.92)",
            }}
            onKeyDown={(e) => e.key === "Enter" && sendChat()}
          />
          <button className="sd-btn primary sm" type="button" onClick={sendChat} disabled={!valid || busy}>
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
