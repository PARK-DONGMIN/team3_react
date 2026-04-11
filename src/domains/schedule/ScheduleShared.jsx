import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./ScheduleShared.css";
import { scheduleApi } from "../../api/schedule";
import { getLoginUserNo } from "../../utils/auth";
import AiPanel from "../ai/AiPanel"; // ✅ 추가

function normalizeDateOnly(v) {
  if (!v) return "";
  if (typeof v === "string") return v.trim().slice(0, 10);
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return "";
  }
}

function diffTone(v) {
  if (v === "고급") return "hard";
  if (v === "중급") return "mid";
  return "easy";
}

async function copyText(text) {
  if (!text) return false;
  try {
    if (navigator?.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(String(text));
      return true;
    }
    const ta = document.createElement("textarea");
    ta.value = String(text);
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return !!ok;
  } catch {
    return false;
  }
}

export default function ScheduleShared() {
  const { code } = useParams();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  const userNo = useMemo(() => Number(getLoginUserNo() || 0), []);
  const isAuthed = userNo > 0;

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const res = await scheduleApi.getSharedSchedule(code);
        setData(res);
      } catch (e) {
        console.error(e);

        const status = e?.response?.status;
        const msg = e?.response?.data?.error || e?.response?.data?.message || "";

        if (status === 403) setErr(msg || "공유가 비활성화된 일정입니다.");
        else if (status === 404) setErr("존재하지 않는 공유 코드입니다.");
        else if (status === 410) setErr("만료된 공유 링크입니다.");
        else setErr("공유 링크를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, [code]);

  const title = data?.scheduleTitle ?? data?.schedule_title ?? "공유된 일정";
  const start = normalizeDateOnly(data?.startDate ?? data?.start_date);
  const end = normalizeDateOnly(data?.endDate ?? data?.end_date);
  const difficulty = data?.requestDifficulty ?? data?.courseType ?? "-";
  const isPublic = data?.isPublic ?? data?.is_public ?? "Y";

  const regionName = data?.regionName ?? data?.region?.regionName ?? data?.region?.name ?? "";
  const cityName = data?.cityName ?? data?.city?.cityName ?? data?.city?.name ?? "";
  const placeText = useMemo(() => {
    if (regionName || cityName)
      return `${regionName || ""}${regionName && cityName ? " · " : ""}${cityName || ""}`;
    return "지역 정보";
  }, [regionName, cityName]);

  const shareUrl = useMemo(() => window.location.href, []);
  const scheduleId = data?.scheduleId ?? data?.schedule_id ?? null;

  const onCopyLink = async () => {
    const ok = await copyText(shareUrl);
    alert(ok ? "공유 링크 복사 완료! 🔗" : "복사 실패! (HTTPS/권한 확인) 🥺");
  };

  const onCopyCode = async () => {
    const ok = await copyText(code);
    alert(ok ? "공유 코드 복사 완료! 📋" : "복사 실패! (HTTPS/권한 확인) 🥺");
  };

  const onOpenInApp = async () => {
    const sid = scheduleId;
    if (!sid) {
      alert("일정 정보를 찾지 못했어요. (scheduleId 없음)");
      return;
    }

    if (!isAuthed) {
      alert("로그인이 필요합니다! 로그인 후 다시 눌러줘 🥺");
      nav("/login", { replace: true, state: { from: `/schedule/share/${code}` } });
      return;
    }

    try {
      await scheduleApi.joinShared(code);
      nav(`/schedule/${sid}?shareCode=${encodeURIComponent(code)}`, { replace: true });
    } catch (e) {
      console.error(e);
      const status = e?.response?.status;

      if (status === 403) alert("이 일정은 참여할 수 없는 공유 상태입니다.");
      else if (status === 409) alert("이미 참여 중이거나 권한 상태가 충돌했습니다.");
      else alert("참여 처리 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="ss-wrap">
        <div className="ss-card ss-skel">
          <div className="ss-skel-title" />
          <div className="ss-skel-sub" />
          <div className="ss-skel-btn" />
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="ss-wrap">
        <div className="ss-card">
          <div className="ss-brand">TRAVEL_LEAF</div>
          <h1 className="ss-title">공유 링크를 열 수 없어요 🥺</h1>
          <p className="ss-sub">{err}</p>

          <div className="ss-actions">
            {!isAuthed && (
              <button
                className="ss-btn primary"
                onClick={() => nav("/login", { state: { from: `/schedule/share/${code}` } })}
              >
                로그인하고 다시 시도
              </button>
            )}
            <button className="ss-btn ghost" onClick={() => nav("/")}>
              홈으로
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ss-wrap">
      <div className="ss-card">
        <div className="ss-brand">TRAVEL_LEAF</div>

        <h1 className="ss-title">{title}</h1>
        <p className="ss-sub">
          {placeText} · {start && end ? `${start} ~ ${end}` : "날짜 정보 없음"}
        </p>

        <div className="ss-badges">
          <span className={`ss-badge diff ${diffTone(difficulty)}`}>{difficulty}</span>
          <span className={`ss-badge pub ${isPublic === "Y" ? "open" : "closed"}`}>
            {isPublic === "Y" ? "공개" : "비공개"}
          </span>
        </div>

        <div className="ss-codebox">
          <div className="ss-code-label">공유 코드</div>
          <div className="ss-code">{code}</div>
          <div className="ss-code-actions">
            <button className="ss-btn ghost" onClick={onCopyCode}>
              코드 복사
            </button>
            <button className="ss-btn ghost" onClick={onCopyLink}>
              링크 복사
            </button>
          </div>
        </div>

        {/* ✅ 공유 페이지에도 AI 패널
        <AiPanel
          scheduleId={Number(scheduleId) || null}
          mode="shared"
          userNo={isAuthed ? userNo : null}
        /> */}

        <div className="ss-actions">
          <button className="ss-btn primary" onClick={onOpenInApp}>
            일정 참여 후 편집
          </button>
          <button className="ss-btn ghost" onClick={() => nav("/schedule")}>
            내 일정 목록
          </button>
        </div>

        <div className="ss-foot">
          * 공동 편집은 로그인 후 “일정 참여 후 편집”을 눌러 참여(join)된 뒤 가능합니다.
        </div>
      </div>
    </div>
  );
}
