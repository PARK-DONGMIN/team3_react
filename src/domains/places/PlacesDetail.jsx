// src/domains/places/PlacesDetail.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getHotelImageFromBing } from "../../api/bingImageAPI";
import { fetchPlaceDescBySourceId, fetchPlaceTagsBySourceId } from "../../api/placesMetaApi";
import { MANUAL_PLACE_META } from "./curationData";
import { ensureKakaoLoaded } from "../../utils/kakaoLoader";
import { upsertPlace } from "../../api/placesApi";
import { scheduleDetailApi } from "../../api/scheduleDetailApi";
import "./PlacesDetail.css";

function PlacesDetail() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const mapElRef = useRef(null);

  const [imageUrl, setImageUrl] = useState(null);
  const [desc, setDesc] = useState(null);
  const [tags, setTags] = useState([]);
  const [metaErr, setMetaErr] = useState("");

  const [busy, setBusy] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [scheduleId, setScheduleId] = useState("");
  const [dayNumber, setDayNumber] = useState(1);
  const [orderInDay, setOrderInDay] = useState(1);
  const [stopType, setStopType] = useState("POI");
  const [memo, setMemo] = useState("");

  const sourceId = String(state?.placeId ?? "");
  const name = state?.name ?? "";
  const addressFromState = state?.address ?? "";
  const phone = state?.phone ?? "";
  const x = state?.x ?? "";
  const y = state?.y ?? "";

  const categoryFromState =
    state?.category ||
    state?.categoryName ||
    state?.category_group_name ||
    state?.category_name ||
    null;

  const scheduleIdFromState = state?.scheduleId ?? state?.schedule_id ?? null;
  const dayFromState = state?.dayNumber ?? state?.day ?? null;

  const kakaoPlaceId = useMemo(() => {
    const n = Number(sourceId);
    return Number.isFinite(n) ? n : null;
  }, [sourceId]);

  const lat = useMemo(() => {
    const n = Number(y);
    return Number.isFinite(n) ? n : null;
  }, [y]);

  const lng = useMemo(() => {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }, [x]);

  const manual = useMemo(() => (sourceId ? MANUAL_PLACE_META?.[sourceId] : null), [sourceId]);
  const finalAddress = useMemo(
    () => (addressFromState || manual?.address || "").trim(),
    [addressFromState, manual?.address]
  );

  const mergedMood = useMemo(() => {
    const s = String(desc?.moodKeywords || manual?.moodKeywords || "");
    return s
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }, [desc?.moodKeywords, manual?.moodKeywords]);

  useEffect(() => {
    if (scheduleIdFromState != null && scheduleId === "") setScheduleId(String(scheduleIdFromState));
    if (dayFromState != null) {
      const dn = Number(dayFromState);
      if (Number.isFinite(dn) && dn > 0) setDayNumber(dn);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleIdFromState, dayFromState]);

  useEffect(() => {
    if (!sourceId) return;
    let canceled = false;

    (async () => {
      setMetaErr("");

      try {
        const t = await fetchPlaceTagsBySourceId(sourceId);
        if (!canceled) setTags(Array.isArray(t?.tags) ? t.tags : []);
      } catch {
        if (!canceled) setTags([]);
      }

      try {
        const d = await fetchPlaceDescBySourceId(sourceId);
        if (!canceled) setDesc(d || null);
      } catch {
        if (!canceled) setDesc(null);
      }
    })().catch(() => {
      if (!canceled) setMetaErr("설명/태그 불러오기 실패");
    });

    return () => {
      canceled = true;
    };
  }, [sourceId]);

  useEffect(() => {
    if (!name) return;
    let canceled = false;

    (async () => {
      if (manual?.imageUrl) {
        if (!canceled) setImageUrl(manual.imageUrl);
        return;
      }
      if (desc?.imageUrl) {
        if (!canceled) setImageUrl(desc.imageUrl);
        return;
      }

      try {
        const shortAddress = finalAddress ? finalAddress.split(" ").slice(0, 2).join(" ") : "";
        const res = await getHotelImageFromBing(name, shortAddress);
        if (canceled) return;

        const url = res?.imageUrl || res?.url || res?.data?.imageUrl || null;
        setImageUrl(url);
      } catch {
        if (!canceled) setImageUrl(null);
      }
    })();

    return () => {
      canceled = true;
    };
  }, [name, finalAddress, desc?.imageUrl, manual?.imageUrl]);

  useEffect(() => {
    let canceled = false;

    (async () => {
      if (lat == null || lng == null) return;
      await ensureKakaoLoaded({ requireServices: false });
      if (canceled) return;

      const container = mapElRef.current;
      if (!container) return;

      const pos = new window.kakao.maps.LatLng(lat, lng);
      const map = new window.kakao.maps.Map(container, { center: pos, level: 4 });
      new window.kakao.maps.Marker({ map, position: pos });

      requestAnimationFrame(() => {
        map.relayout();
        map.setCenter(pos);
      });
    })().catch((e) => {
      console.warn("kakao map init fail:", e);
    });

    return () => {
      canceled = true;
    };
  }, [lat, lng]);

  if (!state) {
    return (
      <div className="place-detail">
        <h2>잘못된 접근입니다.</h2>
        <button type="button" onClick={() => navigate(-1)}>
          뒤로가기
        </button>
      </div>
    );
  }

  const finalDescription = desc?.description || manual?.description || "";
  const finalHours = desc?.hours || manual?.hours || "";
  const finalTips = desc?.tips || manual?.tips || "";

  const resetMsgs = () => {
    setOkMsg("");
    setErrMsg("");
  };

  const saveToDb = async () => {
    resetMsgs();

    if (!kakaoPlaceId) {
      setErrMsg("카카오 placeId가 숫자가 아니어서 DB 저장 불가!");
      return null;
    }

    try {
      setBusy(true);

      const payload = {
        placeId: kakaoPlaceId,
        name,
        category: categoryFromState || null,
        address: finalAddress || null,
        lat,
        lng,
        sourceType: "KAKAO",
        sourceId: String(kakaoPlaceId),
      };

      const saved = await upsertPlace(payload);
      setOkMsg("✅ DB 저장 완료!");
      return saved;
    } catch (e) {
      console.error(e);
      setErrMsg("❌ DB 저장 실패(백엔드/콘솔 확인)");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const addToSchedule = async () => {
    resetMsgs();

    const sid = Number(scheduleId);
    if (!Number.isFinite(sid) || sid <= 0) {
      setErrMsg("scheduleId를 숫자로 입력해줘!");
      return;
    }
    if (!kakaoPlaceId) {
      setErrMsg("카카오 placeId가 숫자가 아니어서 담기 불가!");
      return;
    }

    const dn = Math.max(1, Number(dayNumber) || 1);
    const oi = Math.max(1, Number(orderInDay) || 1);

    try {
      setBusy(true);

      const saved = await saveToDb();
      if (!saved) {
        setErrMsg((prev) => prev || "❌ 장소 저장이 실패해서 일정에 담기를 중단했어!");
        return;
      }

      const req = {
        scheduleId: sid,
        dayNumber: dn,
        orderInDay: oi,
        placeId: kakaoPlaceId,

        placeName: name,
        category: categoryFromState || null,
        address: finalAddress || null,
        lat,
        lng,

        stopType: String(stopType || "POI").toUpperCase(),
        startTime: null,
        endTime: null,
        cost: null,
        memo: memo?.trim() ? memo.trim() : null,
        distanceKM: null,
      };

      await scheduleDetailApi.create(req);

      setOkMsg("✅ 일정에 담기 완료!");
      setShowAdd(false);
      setMemo("");

      navigate(`/schedule/${sid}`, { state: { openDay: dn } });
    } catch (e) {
      console.error(e);
      setErrMsg(`❌ 일정에 담기 실패: ${e?.message || "백엔드/콘솔 확인"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="place-detail">
      <div className="place-header">
        <h1 className="place-name">{name}</h1>
        {finalAddress && <p className="place-address">{finalAddress}</p>}
        {phone && <p className="place-phone">☎ {phone}</p>}

        {tags.length > 0 && (
          <div className="place-tags">
            {tags.map((t) => (
              <span key={t} className="tag-pill">
                {t}
              </span>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button type="button" className="btn-outline" onClick={saveToDb} disabled={busy}>
            {busy ? "처리중..." : "DB 저장"}
          </button>

          <button
            type="button"
            className="btn-outline"
            onClick={() => {
              resetMsgs();
              setShowAdd((v) => !v);
            }}
            disabled={busy}
          >
            {showAdd ? "닫기" : "일정에 담기"}
          </button>
        </div>

        {okMsg && <div style={{ marginTop: 10, color: "#16a34a", fontWeight: 800 }}>{okMsg}</div>}
        {errMsg && <div style={{ marginTop: 10, color: "#dc2626", fontWeight: 800 }}>{errMsg}</div>}
      </div>

      {showAdd && (
        <div style={{ marginTop: 14, padding: 14, borderRadius: 12, border: "1px solid rgba(0,0,0,.12)", background: "rgba(0,0,0,.02)" }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>일정에 담기 설정</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.75 }}>스케줄 ID를 작성해주세요</span>
              <input value={scheduleId} onChange={(e) => setScheduleId(e.target.value)} placeholder="예: 10" style={{ padding: 10, borderRadius: 10, border: "1px solid rgba(0,0,0,.18)" }} />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.75 }}>장소 유형</span>
              <select value={stopType} onChange={(e) => setStopType(e.target.value)} style={{ padding: 10, borderRadius: 10, border: "1px solid rgba(0,0,0,.18)" }}>
                <option value="POI">관심 장소</option>
                <option value="WAYPOINT">경유지</option>
                <option value="STAY">숙박 장소</option>
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.75 }}>몇 일차에 저장할까요?</span>
              <input type="number" min={1} value={dayNumber} onChange={(e) => setDayNumber(Number(e.target.value))} style={{ padding: 10, borderRadius: 10, border: "1px solid rgba(0,0,0,.18)" }} />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.75 }}>일차 안에서 몇 번째 방문/정차이신가요?</span>
              <input type="number" min={1} value={orderInDay} onChange={(e) => setOrderInDay(Number(e.target.value))} style={{ padding: 10, borderRadius: 10, border: "1px solid rgba(0,0,0,.18)" }} />
            </label>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
            <span style={{ fontSize: 12, opacity: 0.75 }}>memo (선택)</span>
            <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 야경 포토 스팟" style={{ padding: 10, borderRadius: 10, border: "1px solid rgba(0,0,0,.18)" }} />
          </label>

          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button type="button" className="btn-outline" onClick={addToSchedule} disabled={busy}>
              {busy ? "처리중..." : "확인(일정에 담기)"}
            </button>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
            * 현재 장소: placeId={sourceId} / lat={lat ?? "-"} lng={lng ?? "-"}
          </div>
        </div>
      )}

      <div className="place-image-box" style={{ backgroundImage: `url(${imageUrl || "/images/default-place.jpg"})` }}>
        <div className="image-overlay" />
        <p className="img-notice">* 이미지는 참고용이며 실제와 다를 수 있습니다.</p>
      </div>

      <div className="place-desc-section">
        <h3>설명</h3>
        {metaErr && <div className="meta-error">{metaErr}</div>}

        {finalDescription ? <p className="place-desc">{finalDescription}</p> : <p className="place-desc empty">아직 등록된 설명이 없어요.</p>}

        {(finalHours || finalTips) && (
          <div className="place-meta-box">
            {finalHours && (
              <div className="meta-row">
                <div className="meta-k">운영시간</div>
                <div className="meta-v">{finalHours}</div>
              </div>
            )}
            {finalTips && (
              <div className="meta-row">
                <div className="meta-k">팁</div>
                <div className="meta-v">{finalTips}</div>
              </div>
            )}
          </div>
        )}

        {mergedMood.length > 0 && (
          <>
            <h4 className="place-subtitle">분위기 키워드</h4>
            <div className="place-tags">
              {mergedMood.map((k) => (
                <span key={k} className="tag-pill soft">
                  {k}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="place-map-section">
        <h3>위치</h3>
        <div ref={mapElRef} className="place-map" style={{ width: "100%", height: 360 }} />
      </div>

      <div className="place-actions">
        <a
          href={`https://map.kakao.com/link/map/${encodeURIComponent(name)},${y},${x}`}
          target="_blank"
          rel="noreferrer"
          className="btn-outline"
        >
          카카오맵에서 보기
        </a>
      </div>
    </div>
  );
}

export default PlacesDetail;
