import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useUserStore } from "../store/store";
import axiosInstance from "../api/axios";
import "./Header.css";

function Header() {
  const navigate = useNavigate();

  const isLogin = useUserStore((state) => state.isLogin);
  const logout = useUserStore((state) => state.logout);
  const grade = useUserStore((state) => state.grade);

  const [categories, setCategories] = useState([]);
  const [hoverCate, setHoverCate] = useState(null);

  /* ===============================
     로그아웃
  =============================== */
  const handleLogout = () => {
    logout(); // ✅ 여기서만 처리
    navigate("/");
  };

  /* ===============================
     카테고리 로딩
  =============================== */
  useEffect(() => {
    axiosInstance
      .get("/cate/find_all")
      .then((res) => {
        setCategories(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => setCategories([]));
  }, []);

  /* ===============================
     카테고리 구조 정리 (게시판 카테고리)
  =============================== */
  const validCategories = Array.isArray(categories) ? categories : [];
  const parents = validCategories.filter((c) => c.name === "--");

  const menuData = parents.map((parent) => ({
    ...parent,
    subCategories: validCategories.filter(
      (c) => c.grp === parent.grp && c.name !== "--"
    ),
  }));

  const userNo = localStorage.getItem("userNo");

  return (
    <header className="header">
      {/* ===============================
         로고
      =============================== */}
      <div className="logo">
        <Link to="/">TRAVLE_LEAF</Link>
      </div>

      {/* ===============================
         중앙 메뉴 (2번째 파일 스타일)
      =============================== */}
      <nav className="nav">
        {/* ✅ 여행 드롭다운 */}
        <div
          className="cate-menu"
          onMouseEnter={() => setHoverCate("TRAVEL_MENU")}
          onMouseLeave={() => setHoverCate(null)}
        >
          <span>여행 ▼</span>

          {hoverCate === "TRAVEL_MENU" && (
            <ul className="cate-dropdown">
              <li>
                <Link to="/schedule">일정</Link>
              </li>
              <li>
                <Link to="/places">여행지</Link>
              </li>
              <li>
                <Link to="/bike_routes">자전거 길</Link>
              </li>
              <li>
                <Link to="/checklist/list">여행 취향</Link>
              </li>
              <li>
                <Link to="/ai/place">AI장소추정</Link>
              </li>
            </ul>
          )}
        </div>

        {/* ✅ 공지사항 (단독) */}
        <Link to="/notice">공지사항</Link>

        

        {/* ✅ 기존 게시판 카테고리 드롭다운들 (menuData) */}
        {menuData.map((parent) => {
          const isCommunityGrp = parent.grp === "커뮤니티";

          return (
            <div key={parent.cateno} style={{ display: "flex", alignItems: "center" }}>
              
              {/* 🔥 커뮤니티 왼쪽에 AI 추천 버튼 */}
                {isCommunityGrp && (
                  <div className="cate-menu" style={{ marginRight: "14px" }}>
                    <Link to="/ai/recommend">🤖 AI 글추천</Link>
                  </div>
                )}

              {/* 원래 커뮤니티(또는 다른 그룹) 메뉴 */}
              <div
                className="cate-menu"
                onMouseEnter={() => setHoverCate(parent.grp)}
                onMouseLeave={() => setHoverCate(null)}
              >
                <span>{parent.grp} ▼</span>

                {hoverCate === parent.grp && (
                  <ul className="cate-dropdown">
                    {isCommunityGrp && (
                      <>
                        <li>
                          <Link to="/review">지역별 리뷰</Link>
                        </li>
                        <li className="dropdown-divider" />
                      </>
                    )}

                    {parent.subCategories?.length > 0 ? (
                      parent.subCategories.map((sub) => (
                        <li key={sub.cateno}>
                          <Link to={`/posts/list/${sub.cateno}`}>{sub.name}</Link>
                        </li>
                      ))
                    ) : (
                      <li style={{ padding: "6px 8px", color: "#9ca3af" }}>
                        하위 없음
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          );
        })}

        {/* ✅ 게임/리워드 드롭다운 */}
        <div
          className="cate-menu"
          onMouseEnter={() => setHoverCate("GAME_MENU")}
          onMouseLeave={() => setHoverCate(null)}
        >
          <span>🎮 게임/리워드 ▼</span>

          {hoverCate === "GAME_MENU" && (
            <ul className="cate-dropdown">
              <li>
                <Link to="/quiz">퀴즈풀기</Link>
              </li>
              <li>
                <Link to="/my/reward-status">🎁 보상</Link>
              </li>
              <li>
                <Link to="/survey">설문조사</Link>
              </li>
            </ul>
          )}
        </div>

         
        <div
          className="cate-menu"
          onMouseEnter={() => setHoverCate("GAME_MENU")}
          onMouseLeave={() => setHoverCate(null)}
        >
          <span>자전거 ▼</span>

          {hoverCate === "GAME_MENU" && (
            <ul className="cate-dropdown">
              <li>
                <Link to="/map/repair">수리점</Link>
              </li>
              <li>
                <Link to="/map/rental">대여소</Link>
              </li>
            </ul>
          )}
        </div>


      </nav>

      

      {/* ===============================
         오른쪽 메뉴 (1번째 파일 그대로)
      =============================== */}
      <nav className="nav right">
        {isLogin && <Link to="/mypage">마이페이지</Link>}

        {isLogin ? (
          <>
            <Link to="/" onClick={handleLogout}>
              로그아웃
            </Link>

            <Link to="/friends">친구</Link>

            {/* 🔥 관리자 신고 드롭다운 */}
            {grade === 2 && (
              <div
                className="cate-menu"
                onMouseEnter={() => setHoverCate("REPORT_ADMIN")}
                onMouseLeave={() => setHoverCate(null)}
              >
                <span> 관리자기능 ▼</span>

                {hoverCate === "REPORT_ADMIN" && (
                  <ul className="cate-dropdown">
                    <li>
                      <Link to="/admin/reports/posts">📌 게시글 신고 관리</Link>
                    </li>
                    <li>
                      <Link to="/admin/reports/comments">💬 댓글 신고 관리</Link>
                    </li>
                    <li>
                      <Link to="/admin/reports/reviews">🧾 리뷰 신고 관리</Link>
                    </li>
                    <li>
                      <Link to="/my-reports/comment">🧾 리뷰 댓글 신고 관리</Link>
                    </li>
                    <li>
                      <Link to="/user/list">👤 회원 관리</Link>
                    </li>
                    <li>
                      <Link to="/cate/list">🖇️ 카테고리</Link>
                    </li>
                    <li>
                      <Link to="/admin/login_list">📍 로그인 내역 관리</Link>
                    </li>
                    <li>
                      <Link to="/admin/notification_list">📑 메일 기록 관리</Link>
                    </li>
                    <li>
                      <Link to="/admin/schedule_share_log">📅 스케줄 공유 기록 관리</Link>
                    </li>

                    <li>
                      <Link to="/admin/repair">👨🏻‍🔧 수리점 관리</Link>
                    </li>
                    <li>
                      <Link to="/admin/rental">🚲 대여소 관리</Link>
                    </li>
                    <li>
                      <Link to="/ai_log/list">🤖 AI 로그 조회</Link>
                    </li>
                  </ul>
                )}
              </div>
            )}

            {/* 채팅 목록 */}
            <Link
              to={`/chatlist/${localStorage.getItem("userNo")}`}
              className="chatlist-btn"
            >
              채팅목록
            </Link>
          </>
        ) : (
          <>
            <Link to="/login">로그인</Link>
            <Link to="/signup">회원가입</Link>
          </>
        )}
      </nav>
    </header>
  );
}

export default Header;
