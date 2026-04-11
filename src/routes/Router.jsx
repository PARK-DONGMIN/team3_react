import { BrowserRouter, Routes, Route, Navigate, useParams, } from "react-router-dom";
import Layout from "../layouts/Layout";

import Home from "../domains/home/Home";

// 일정
import ScheduleList from "../domains/schedule/ScheduleList";
import ScheduleDetail from "../domains/schedule/ScheduleDetail";
import ScheduleCreate from "../domains/schedule/ScheduleCreate";
import ScheduleShare from "../domains/schedule/ScheduleShared";


import ScheduleCourse from "../domains/schedule/ScheduleCourse"
import PopularPlanDetail from "../domains/schedule/PopularPlanDetail";

// ai 날씨 정보
import AiWeather from "../domains/weather/AiWeather";

// ✅ 일차 코스 편집(일정 만든 후에도 수정 가능)
import RouteDayEditor from "../domains/route/RouteDayEditor";

// 여행지
import PlacesList from "../domains/places/PlacesList";
import PlacesDetail from "../domains/places/PlacesDetail";
import PlaceSearch from "../domains/places/PlaceSearch";
import DomesticExplore from "../domains/places/DomesticExplore";
import PlacesRegion from "../domains/places/PlacesRegion";

// 공유 코드
import AdminNotificationList from "../domains/admin/AdminNotificationList";
import AdminScheduleShareLog from "../domains/admin/AdminScheduleShareLog";


// 호텔 상세정보
import HotelDetail from "../domains/places/HotelDetail";

// 유저
import Login from "../domains/user/Login";
import Signup from "../domains/user/Signup";
import MyPage from "../domains/user/MyPage";
import EditPage from "../domains/user/Mypage_Edit";
import ChangePasswordPage from "../domains/user/ChangePasswordPage";
import FindId from "../domains/user/FindId";
import FindPassword from "../domains/user/FindPassword";
import LoginHistoryList from "../domains/user/LoginHistoryList";
import AiImagePage from "../domains/user/AiImagePage";


// 게시글
import Posts_List_all_paging_search from "../domains/posts/Posts_List_all_paging_search";
import Posts_List_all_paging_search_gallery from "../domains/posts/Posts_List_all_paging_search_gallery";
import Posts_Map from "../domains/posts/Posts_Map";
import Posts_Update_file1 from "../domains/posts/Posts_Update_file1";
import Posts_Update_text from "../domains/posts/Posts_Update_text";
import Posts_Youtube from "../domains/posts/Posts_Youtube";
import Posts_Delete from "../domains/posts/Posts_Delete";
import Posts_Create from "../domains/posts/Posts_Create";
import Posts_Read from "../domains/posts/Posts_Read";

// 보상
import RewardPage from "../domains/reward/RewardPage";
import RewardStatusPage from "../domains/reward/RewardStatusPage";

// 설문
import SurveyList from "../domains/survey/SurveyList";
import SurveyDetail from "../domains/survey/SurveyDetail";
import SurveyResultAnalytics from "../domains/survey/SurveyResultAnalytics";

// 신고
import PostsReportsAdmin from "../domains/reports/PostsReportsAdmin";
import CommentsReportsAdmin from "../domains/reports/CommentsReportsAdmin";

// 좋아요/즐겨찾기
import ReactionLikesPage from "../domains/reaction/ReactionLikesPage";
import ReactionFavoritePage from "../domains/reaction/ReactionFavoritePage";

// 추천
import AiRecommend from "../domains/recommend/AiRecommend";


// 친구
import FriendsPage from "../domains/friends/FriendsPage";
import FriendDetail from "../domains/friends/FriendDetail";

// Tags
import TagPostsList from "../domains/tags/TagPostsList";

// 기타
import Cate_List from "../domains/admin/Cate_List";
import User_List from "../domains/admin/User_List";
import AdminLoginHistory_List from "../domains/admin/AdminLoginHistory_List";
import RequireAuth from "../domains/auth/RequireAuth";

// 체크리스트
import ChecklistTest from "../domains/checklist/ChecklistTest";
import ChecklistResult from "../domains/checklist/ChecklistResult";
import ChecklistAI from "../domains/checklist/ChecklistAI";
import Checklist from "../domains/checklist/Checklist";
import ChecklistDetail from "../domains/checklist/ChecklistDetail";

// 공지
import NoticePage from "../domains/notice/NoticePage";
import NoticeCreatePage from "../domains/notice/NoticeCreatePage";
import NoticeEditPage from "../domains/notice/NoticeEditPage";

// 채팅
import ChatRoomList from "../domains/chat/ChatRoomList";
import HotelChatRoom from "../domains/chat/HotelChatRoom";
import UserChatRoom from "../domains/chat/UserChatRoom";

// 📝 Review
import ReviewHome from "../domains/review/ReviewHome";
import ReviewList from "../domains/review/ReviewList";
import ReviewDetail from "../domains/review/ReviewDetail";
import ReviewCreate from "../domains/review/ReviewCreate";
import MyCommentReportList from "../domains/review/MyCommentReportList";
import ReviewReportList from "../domains/review/ReviewReportList";



// 🧠 Quiz
import QuizPage from "../domains/quiz/QuizPage";
import QuizAdmin from "../domains/quiz/QuizAdmin";
import QuizList from "../domains/quiz/QuizList";
import QuizPlay from "../domains/quiz/QuizPlay";

// ai 사진으로 장소 추천
import AiPlace from "../domains/aiplace/AiPlace";

// 대여소, 수리점
import RentalMap from "../domains/bike/Rentalmap";
import RepairShopMap from "../domains/bike/RepairShopMap";
import Rental_List from "../domains/admin/Rental_List";
import RepairShop_List from "../domains/admin/RepairShop_List";

// 자전거 길
import BikeRouteList from "../domains/bike_route/BikeRouteList";
import BikeRouteDetail from "../domains/bike_route/BikeRouteDetail";

// ai 로그 조회
import AiLogList from "../domains/ai/AiLogList";


function AppRouter() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />

          {/* 일정 */}
          <Route path="/schedule" element={<ScheduleList />} />
          <Route path="/schedule/:scheduleId" element={<ScheduleDetail />} />
          <Route
            path="/schedule/new"
            element={
              <RequireAuth>
                <ScheduleCreate />
              </RequireAuth>
            }
          />
          <Route
            path="/schedule/:scheduleId/route"
            element={
              <RequireAuth>
                <RouteDayEditor />
              </RequireAuth>
            }
          />
          
          {/* ai 날씨 정보 */}
          <Route path="/weather/:scheduleId" element={<AiWeather />}/>

          <Route path="/schedule/:scheduleId/course" element={<RequireAuth><ScheduleCourse /></RequireAuth>}/>
          {/* 공유코드 */}
          <Route path="/schedule/share/:code" element={<ScheduleShare />} />


          {/* 여행지 */}
          <Route path="/places" element={<PlacesList />} />
          <Route path="/places/search" element={<PlaceSearch />} />
          <Route path="/places/:placeId" element={<PlacesDetail />} />
          <Route path="/places/domestic" element={<DomesticExplore />} />
          <Route path="/places/region/:regionKey" element={<PlacesRegion />} />
          <Route path="/schedule/popular/:id" element={<PopularPlanDetail />} />

          {/* 공유코드 */}
          

          {/* 유저 */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/mypage/edit" element={<EditPage />} />
          <Route path="/mypage/change-password" element={<ChangePasswordPage />} />
          <Route path="/find-id" element={<FindId />} />
          <Route path="/find-password" element={<FindPassword />} />
          <Route path="/LoginHistoryList" element={<LoginHistoryList />} />
          <Route path="/user/ai" element={<AiImagePage />} />



          <Route
            path="/mypage"
            element={
              <RequireAuth>
                <MyPage />
              </RequireAuth>
            }
          />

          {/* Posts */}
          <Route path="/posts/list/:cateno" element={<Posts_List_all_paging_search />} />
          <Route path="/posts/list_gallery/:cateno" element={<Posts_List_all_paging_search_gallery />} />       
          <Route path="/posts/map/:postId" element={<Posts_Map />} />
          <Route path="/posts/update/file1/:postId" element={<Posts_Update_file1 />} />
          <Route path="/posts/update/text/:postId" element={<Posts_Update_text />} />
          <Route path="/posts/youtube/:postId" element={<Posts_Youtube />} />
          <Route path="/posts/delete/:postId" element={<Posts_Delete />} />
          <Route path="/posts/create/:cateno" element={<Posts_Create />} />
          <Route path="/posts/read/:postId" element={<Posts_Read />} />

          {/* 신고 */}
          <Route path="/admin/reports/posts" element={<PostsReportsAdmin/>} />
          <Route path="/admin/reports/comments" element={<CommentsReportsAdmin />} />
          
          {/* 좋아요/즐겨찾기 */}

          <Route path="/mypage/likes" element={<ReactionLikesPage />} />
          <Route path="/mypage/favorites" element={<ReactionFavoritePage />} />

          {/* 추천 */}
          <Route path="/ai/recommend" element={<AiRecommend />} />


          {/* Tags */}
          <Route path="/tags/posts" element={<TagPostsList />} />

          {/* 관리자 */}
          <Route path="/cate/list" element={<Cate_List />} />
          <Route path="/user/list" element={<User_List />} />
          <Route path="/admin/login_list" element={< AdminLoginHistory_List />} />
          <Route path="/admin/rental" element={<Rental_List />} />
          <Route path="/admin/repair" element={<RepairShop_List />} />

          {/* 체크리스트 */}
          <Route path="/checklist" element={<Checklist />} />
          <Route path="/checklist/list" element={<Checklist />} />
          <Route path="/checklist/test" element={<ChecklistTest />} />
          <Route path="/checklist/result" element={<ChecklistResult />} />
          <Route path="/checklist/ai" element={<ChecklistAI />} />
          <Route path="/checklist/detail" element={<ChecklistDetail />} />

          {/* 친구 */}
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/friends/detail/:friendUserNo" element={<FriendDetail />} />

          {/* 공지 */}
          <Route path="/notice" element={<NoticePage />} />
          <Route path="/notice/new" element={<NoticeCreatePage />} />
          <Route path="/notice/edit/:id" element={<NoticeEditPage />} />

          {/* 채팅 */}
          <Route path="/chatlist/:userNo" element={<ChatRoomList />} />
          <Route path="/hotelchatroom/:roomId" element={<HotelChatRoom />} />
          <Route path="/userchatroom/:roomId" element={<UserChatRoom />} />

          {/* fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />

          {/* 리뷰 페이지*/ }
            <Route path="/review" element={<ReviewHome />} />
            <Route path="/review/list" element={<ReviewList />} />
            <Route path="/review/detail/:reviewId" element={<ReviewDetail />} />
            <Route path="/review/create" element={<ReviewCreate />} />
            <Route path="/review/update/:reviewId" element={<ReviewCreate />} />
            <Route path="/my-reports/comment" element={<MyCommentReportList />} />
            <Route path="/admin/reports/reviews" element={<ReviewReportList />} />


          {/* 🧠 퀴즈 페이지 */}
            <Route path="/quiz" element={<QuizPage />} />
            <Route path="/quiz/admin" element={<QuizAdmin />} />
            <Route path="/quiz/admin/list" element={<QuizList />} />
            <Route path="/quiz/day/:dayNo" element={<QuizPlay />} />
          
          {/* 🎁 보상 */}
            <Route path="/reward" element={<RewardPage />} />
            <Route path="/my/reward-status" element={<RewardStatusPage />} />

            {/*설문조사 */}
            <Route path="/survey" element={<SurveyList />} />
            <Route path="/survey/:surveyId" element={<SurveyDetail />} />
            <Route path="/admin/survey/:surveyId/result" element={<SurveyResultAnalyticsWrapper />} />

            {/* 메일 , 스케줄 공유 기록 */}
            <Route path="/admin/notification_list" element={<AdminNotificationList />} />
            <Route path="/admin/schedule_share_log" element={<AdminScheduleShareLog />} />



          {/* ai를 활용한 사진으로 장소 추정 */}
            <Route path="/ai/place" element={<AiPlace />} />  

           {/* 호텔 상세 정보 */}
           <Route path="/hotel/:placeId" element={<HotelDetail />} />

           {/* 대여소, 수리점 */}
            <Route path="/map/rental" element={<RentalMap />} />
            <Route path="/map/repair" element={<RepairShopMap />} />
          
          {/* 자전거 길 */}
          <Route path="/bike_routes" element={<BikeRouteList />} />
          <Route path="/bike_routes/:routeId" element={<BikeRouteDetail />} />
          
          {/* ai 로그 조회 */}
          <Route path="/ai_log/list" element={<AiLogList />} />

         </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default AppRouter;

/* =========================
   🔥 설문 결과 Wrapper
========================= */
function SurveyResultAnalyticsWrapper() {
  const { surveyId } = useParams();
  return <SurveyResultAnalytics surveyId={Number(surveyId)} />;
}