import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { reviewApi } from "./ReviewApi";
import { useUserStore } from "../../store/store";
import "./Review.css";

const REGION = {
  서울: ["강남구","강동구","강북구","강서구","관악구","광진구","구로구","금천구","노원구","도봉구",
        "동대문구","동작구","마포구","서대문구","서초구","성동구","성북구","송파구","양천구","영등포구",
        "용산구","은평구","종로구","중구","중랑구"],
  부산: ["중구","서구","동구","영도구","부산진구","동래구","남구","북구","해운대구","사하구",
        "금정구","강서구","연제구","수영구","사상구","기장군"],
  대구: ["중구","동구","서구","남구","북구","수성구","달서구","달성군"],
  인천: ["중구","동구","미추홀구","연수구","남동구","부평구","계양구","서구","강화군","옹진군"],
  광주: ["동구","서구","남구","북구","광산구"],
  대전: ["동구","중구","서구","유성구","대덕구"],
  울산: ["중구","남구","동구","북구","울주군"],
  세종: ["세종특별자치시"],
  경기: ["수원시","성남시","고양시","용인시","부천시","안산시","안양시","남양주시","화성시","평택시",
        "의정부시","시흥시","파주시","김포시","광주시","광명시","군포시","오산시","이천시","안성시",
        "의왕시","하남시","포천시","양주시","동두천시","과천시","연천군","가평군","양평군","여주시"],
  강원: ["춘천시","원주시","강릉시","동해시","태백시","속초시","삼척시","홍천군","횡성군","영월군",
        "평창군","정선군","철원군","화천군","양구군","인제군","고성군","양양군"],
  충북: ["청주시","충주시","제천시","보은군","옥천군","영동군","증평군","진천군","괴산군","음성군","단양군"],
  충남: ["천안시","공주시","보령시","아산시","서산시","논산시","계룡시","당진시","금산군","부여군",
        "서천군","청양군","홍성군","예산군","태안군"],
  전북: ["전주시","군산시","익산시","정읍시","남원시","김제시","완주군","진안군","무주군","장수군",
        "임실군","순창군","고창군","부안군"],
  전남: ["목포시","여수시","순천시","나주시","광양시","담양군","곡성군","구례군","고흥군","보성군",
        "화순군","장흥군","강진군","해남군","영암군","무안군","함평군","영광군","장성군","완도군","진도군","신안군"],
  경북: ["포항시","경주시","김천시","안동시","구미시","영주시","영천시","상주시","문경시","경산시",
        "의성군","청송군","영양군","영덕군","청도군","고령군","성주군","칠곡군","예천군","봉화군","울진군","울릉군"],
  경남: ["창원시","진주시","통영시","사천시","김해시","밀양시","거제시","양산시","의령군","함안군",
        "창녕군","고성군","남해군","하동군","산청군","함양군","거창군","합천군"],
  제주: ["제주시","서귀포시"],
};

export default function ReviewCreate() {
  const navigate = useNavigate();
  const { reviewId } = useParams(); // ✅ 수정이면 있음
  const isEditMode = Boolean(reviewId);

  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");

  const [loadingEdit, setLoadingEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ✅ 로그인(스토어 + 새로고침 대비 localStorage)
  const isLoginStore = useUserStore((s) => s.isLogin);
  const useridStore = useUserStore((s) => s.userid);
  const isLoginLS = localStorage.getItem("isLogin") === "true";
  const useridLS = localStorage.getItem("userid");

  const isLogin = Boolean(isLoginStore || isLoginLS);
  const userid = useridStore || useridLS;

  // ✅ 수정모드: 기존 리뷰 불러와서 폼에 채우기
  useEffect(() => {
    if (!isEditMode) return;

    if (!isLogin || !userid) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    setLoadingEdit(true);
    reviewApi
      .detail(reviewId)
      .then((data) => {
        if (!data) {
          alert("존재하지 않는 리뷰입니다.");
          navigate(-1);
          return;
        }
        if (userid !== data.userId) {
          alert("작성자만 수정할 수 있습니다.");
          navigate(-1);
          return;
        }

        setCity(data.city || "");
        setDistrict(data.district || "");
        setPlaceName(data.placeName || "");
        setRating(Number(data.rating || 5));
        setContent(data.content || "");
      })
      .catch((e) => {
        console.error(e);
        alert("리뷰 정보를 불러오지 못했습니다.");
        navigate(-1);
      })
      .finally(() => setLoadingEdit(false));
  }, [isEditMode, reviewId, isLogin, userid, navigate]);

  const handleApiError = (err, fallbackMsg) => {
    // ✅ 백엔드 차단 메시지(욕설 포함 etc.)
    const msg = err?.response?.data?.message;
    if (msg) {
      alert(msg);
      return;
    }
    console.error(err);
    alert(fallbackMsg);
  };

  const submit = async () => {
    if (submitting) return;

    if (!isLogin || !userid) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    if (!city || !district) return alert("지역을 선택해주세요.");
    if (!placeName.trim()) return alert("장소명을 입력해주세요.");
    if (!content.trim()) return alert("리뷰 내용을 입력해주세요.");

    setSubmitting(true);

    const payload = {
      userId: userid, // ✅ DTO의 userId로 꼭!
      city,
      district,
      placeName: placeName.trim(),
      rating,
      content: content.trim(),
    };

    try {
      if (isEditMode) {
        await reviewApi.update(reviewId, payload);
        alert("리뷰가 수정되었습니다.");
      } else {
        await reviewApi.create(payload);
        alert("리뷰가 등록되었습니다.");
      }

      // ✅ 저장 후 목록으로 이동
      navigate(`/review/list?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}`);
    } catch (err) {
      handleApiError(err, isEditMode ? "리뷰 수정에 실패했습니다." : "리뷰 등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingEdit) return <p className="loading-text">수정할 리뷰 불러오는 중...</p>;

  return (
    <div className="review-create-page">
      <h2 className="review-create-title">{isEditMode ? "리뷰 수정" : "리뷰 작성"}</h2>

      <div className="review-form">
        <div className="form-group">
          <label>시</label>
          <select
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setDistrict("");
            }}
            disabled={isEditMode} // ✅ 수정 시 지역 고정(원하면 false로)
          >
            <option value="">선택</option>
            {Object.keys(REGION).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>군/구</label>
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            disabled={!city || isEditMode} // ✅ 수정 시 고정
          >
            <option value="">선택</option>
            {city && REGION[city]?.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>장소명</label>
          <input
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            disabled={isEditMode} // ✅ 수정 시 고정
          />
        </div>

        <div className="form-group">
          <label>별점</label>
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
            {[5, 4, 3, 2, 1].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>리뷰 내용</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} />
        </div>

        <div className="form-actions">
          <button onClick={() => navigate(-1)} disabled={submitting}>취소</button>
          <button onClick={submit} disabled={submitting}>
            {submitting ? (isEditMode ? "수정 중..." : "등록 중...") : (isEditMode ? "수정" : "등록")}
          </button>
        </div>
      </div>
    </div>
  );
}
