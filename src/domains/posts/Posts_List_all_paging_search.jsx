/* ⭐ AI 유사글 → 실제 제목 / 실제 썸네일 완벽 적용 버전 */
/* ✅ + AI 품질 점수(aiScore) / 스팸 가능성(spamScore) / 등급(qualityGrade) 표시 추가 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import axiosInstance from '../../api/axios';

function range(start, end) {
  const arr = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
}

function getPageNumbers(totalPages, current) {
  if (totalPages === 0) return [];
  const WIN = 4;
  let start = Math.max(1, current - WIN);
  let end = Math.min(totalPages, current + WIN);

  while (end - start < 8) {
    if (start > 1) start--;
    else if (end < totalPages) end++;
    else break;
  }
  return range(start, end);
}

const getPreview = (text, len = 120) => {
  if (!text) return '';
  return text.length > len ? text.substring(0, len) + '…' : text;
};

const pill = (color) => ({
  display:"inline-block",
  padding:"4px 10px",
  borderRadius:"999px",
  fontSize:"11px",
  fontWeight:600,
  border:`1px solid ${color}`,
  color,
  background:"rgba(0,0,0,.02)",
  marginRight:"6px"
});

const Posts_List_all_paging_search = () => {

  const [searchParams, setSearchParams] = useSearchParams();
  const initPage = Number(searchParams.get('page')) || 0;
  const initWord = searchParams.get('word') ?? '';
  const navigate = useNavigate();
  const { cateno } = useParams();

  const [cate, setCate] = useState({});
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(initPage);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [word, setWord] = useState(initWord);
  const [sort, setSort] = useState("latest");

  const [similar, setSimilar] = useState([]);
  const [openId, setOpenId] = useState(null);

  // ✅ 추가: 게시글별 AI 품질 점수(품질등급/스팸점수 포함)
  // qualityMap[postId] = { readability, originality, usefulness, aiScore, spamScore, qualityGrade }
  const [qualityMap, setQualityMap] = useState({});


  /** 태그 분리 */
  const extractTags = (text) => {
    const tags = [];
    const words = [];
    text.split(" ").forEach(w=>{
      if(w.startsWith("#")) tags.push(w.replace("#","").trim());
      else if(w.trim()) words.push(w.trim());
    });
    return { tags, keyword: words.join(" ") };
  };

  const getQualityLabel = (aiScore, spamScore) => {
  // 스팸 점수가 명백히 높으면
  if (spamScore >= 80) {
    return { text: "🚨 스팸 가능성", color: "#d6336c" };
  }

  // AI가 거의 0점 준 경우 (쓰레기/광고 의심)
  if (aiScore !== null && aiScore < 1) {
    return { text: "🚨 스팸 가능성", color: "#d6336c" };
  }

  // 그 외에는 아무 표시도 안 함
  return null;
};



  /** ✅ 추가: qualityMap 로드 (목록에 뜬 postId들에 대해 /api/ai/quality/{postId} 호출) */
  const loadQualityForList = async (list) => {
    if (!Array.isArray(list) || list.length === 0) {
      setQualityMap({});
      return;
    }

    const map = {};
    await Promise.all(
      list.map(async (post) => {
        try {
          const res = await axiosInstance.get(`/api/ai/quality/${post.postId}`);
          map[post.postId] = res.data;
        } catch {
          map[post.postId] = {
            aiScore: 0,
            spamScore: 0,
            qualityGrade: "NOT_ANALYZED"
          };
        }
      })
    );

    setQualityMap(map);
  };


  /** ✅ 추가: 등급 표시 스타일 */
  const gradePillStyle = (grade) => {
    if (grade === "HIGH") return pill("#2f9e44");
    if (grade === "MID") return pill("#fab005");
    if (grade === "LOW") return pill("#f03e3e");
    return pill("#868e96");
  };

  /** ✅ 추가: 스팸 경고 기준 (원하면 숫자 조절 가능) */
  const isSpamLikely = (aiScore, spamScore) => {
    if (spamScore >= 80) return true;     // 명백한 스팸
    if (aiScore < 1) return true;         // AI가 거의 0점 줬으면 위험
    return false;
  };


  /** ✅ 추가: AI 점수 배지 색 */
  const scoreColor = (aiScore) => {
    if (aiScore === null || aiScore === undefined) return "#868e96";
    const v = Number(aiScore);
    if (v >= 70) return "#2f9e44";
    if (v >= 40) return "#fab005";
    return "#f03e3e";
  };


  /** 목록 로드 */
  const load = async (currentPage = page, searchWord = word, currentSort = sort) => {
    setSearchParams({ page: currentPage, word: searchWord });
    const { tags, keyword } = extractTags(searchWord);

    if(tags.length > 0){
      const res = await axiosInstance.get(`/posts/search/tags`,{
        params:{tags,mode:"OR"},
        paramsSerializer:(params)=>{
          const qs = new URLSearchParams();
          params.tags.forEach(t=>qs.append("tags",t));
          qs.append("mode",params.mode);
          return qs.toString();
        }
      });

      const list = res.data.content ?? res.data ?? [];

      const withTags = await Promise.all(
        list.map(async post=>{
          try{
            const t = await axiosInstance.get(`/api/post-tags/post/${post.postId}`);
            return {...post,tags:t.data};
          }catch{
            return {...post,tags:[]};
          }
        })
      );

      setItems(withTags);
      setTotalPages(1);
      setTotalElements(res.data.totalElements ?? res.data.length);
      setPage(0);

      // ✅ 추가: AI 품질 로드
      await loadQualityForList(withTags);

      return;
    }

    if(keyword !== ""){
      const res = await axiosInstance.get(`/posts/list_all_paging_search`,{
        params:{cateno,page:currentPage,size,word:keyword,sort:currentSort}
      });

      await applyTags(res);
      return;
    }

    const res = await axiosInstance.get(`/posts/list_all_paging`,{
      params:{cateno,page:currentPage,size,sort:currentSort}
    });

    await applyTags(res);
  };


  /** 태그 붙이기 */
  const applyTags = async(res)=>{
    const list = res.data.content;

    const withTags = await Promise.all(
      list.map(async post=>{
        try{
          const t = await axiosInstance.get(`/api/post-tags/post/${post.postId}`);
          return {...post,tags:t.data};
        }catch{
          return {...post,tags:[]};
        }
      })
    );

    setItems(withTags);
    setPage(res.data.page);
    setTotalPages(res.data.totalPages);
    setTotalElements(res.data.totalElements);

    // ✅ 추가: AI 품질 로드
    await loadQualityForList(withTags);
  };



  /** 🔥 핵심 함수 — 상세 데이터에서 안전하게 제목/썸네일 가져오기 */
  const extractTitle = (d, fallback) => {
    return (
      d?.title ||
      d?.post?.title ||
      d?.data?.title ||
      fallback ||
      "제목 없음"
    );
  };

  const extractThumb = (d) => {
    return (
      d?.file1saved ||
      d?.thumb1 ||
      d?.image ||
      d?.thumbnail ||
      (d?.files?.length ? d.files[0] : null) ||
      null
    );
  };


  /** =========================
      ⭐ AI 유사글 토글
  ========================== */
  const toggleSimilar = async(postId,e)=>{
    e.stopPropagation();

    if(openId === postId){
      setOpenId(null);
      return;
    }

    try{
      const res = await axiosInstance.get(`/posts/${postId}/similar`);
      const list = res.data ?? [];

      const enriched = await Promise.all(
        list.map(async sim=>{
          try{
            let detail;

            // 1️⃣ 실제 read API 우선
            try{
              detail = await axiosInstance.get(`/posts/read/${sim.postId}`);
              detail = detail.data;
            }catch{
              // 2️⃣ fallback
              const d2 = await axiosInstance.get(`/posts/${sim.postId}`);
              detail = d2.data;
            }

            return {
              ...sim,
              title: extractTitle(detail, `게시글 ${sim.postId}`),
              content: detail?.content ?? "",
              file1saved: extractThumb(detail)
            };
          }catch{
            return sim;
          }
        })
      );

      setSimilar(enriched);
      setOpenId(postId);

    }catch(err){
      console.error(err);
      alert("AI 유사글 로딩 실패 ");
    }
  };



  useEffect(()=>{
    axiosInstance.get(`/cate/${cateno}`).then(res=>setCate(res.data));

    const p = Number(searchParams.get("page") ?? 0);
    const w = searchParams.get("word") ?? "";
    setPage(p);
    setWord(w);
    load(p,w,sort);
  // eslint-disable-next-line
  },[cateno]);


  const current1 = page+1;
  const nums = getPageNumbers(totalPages,current1);



  return (
    <div className="content">

      {/* ====== CSS 유지 ===== */}
      <style>{`
        .paging-btn{border:1px solid #ddd;background:white;margin:0 4px;padding:7px 11px;border-radius:9px;cursor:pointer;transition:.2s;}
        .paging-btn:hover{background:#eef2ff;}
        .paging-active{background:#4c6ef5;color:white;border:none;}
        .post-row:hover{background:#f9fbff;transition:.2s;}
        .top-pill{padding:6px 14px;border-radius:999px;border:1px solid #d0d7ff;background:white;color:#4c6ef5;font-size:13px;font-weight:600;cursor:pointer;transition:.2s;text-decoration:none;}
        .top-pill:hover{background:#eef2ff;border-color:#4c6ef5;}
        .top-pill-active{background:#4c6ef5;color:white;border:1px solid #4c6ef5;}
      `}</style>


      {/* 제목 */}
      <div className="title_line_left">
        {cate.grp} &gt; {cate.name}
      </div>


      {/* 버튼 */}
      <div style={{display:"flex",justifyContent:"flex-end",gap:"6px",margin:"5px 0 10px"}}>
        <Link
        className="top-pill" to={`/posts/create/${cate.cateno}`} style={{ marginRight: "auto" }}>
        등록하기
        </Link>
        <button className="top-pill" onClick={()=>location.reload()}>새로고침</button>
        <span className="top-pill top-pill-active">목록형</span>
        <Link className="top-pill" to={`/posts/list_gallery/${cate.cateno}?page=${page}&word=${word}`}>갤러리형</Link>
      </div>


      {/* 정렬 */}
      <div style={{display:"flex",justifyContent:"flex-end",gap:"6px",margin:"10px 0"}}>
        <select
          className="form-select form-select-sm"
          value={sort}
          onChange={(e)=>{setSort(e.target.value);load(0,word,e.target.value);}}
        >
          <option value="latest">최신순</option>
          <option value="views">조회수순</option>
          <option value="likes">좋아요순</option>
        </select>
      </div>


      {/* 검색 */}
      <form
        onSubmit={(e)=>{e.preventDefault();load(0,word,sort);}}
        style={{display:"flex",justifyContent:"flex-end",margin:"5px 0"}}
      >
        <input
          value={word}
          onChange={(e)=>setWord(e.target.value)}
          placeholder="검색어 또는 #태그 입력"
          style={{width:280,marginRight:8}}
        />
        <button className="btn btn-sm btn-secondary">검색</button>
      </form>



      {/* ===================== 목록 ===================== */}
      <table className="table">
        <tbody>

          {items.map(item=>(
            <React.Fragment key={item.postId}>

              <tr
                className="post-row"
                style={{cursor:"pointer"}}
                onClick={()=>navigate(`/posts/read/${item.postId}?page=${page}&word=${word}`)}
              >
                <td width="220">
                  {item.file1saved && (
                    <img
                      src={`http://121.160.42.28:9100/posts/storage/${item.file1saved}`}
                      style={{width:200,height:130,objectFit:"cover",borderRadius:"10px"}}
                    />
                  )}
                </td>

                <td>

                  <div style={{marginBottom:4}}>
                    {item.isFixed === "Y" && <span style={pill("#ff4d4f")}>📌 고정공지</span>}
                    {cate?.name && <span style={pill("#4c6ef5")}>{cate.name}</span>}
                    {item.tags && item.tags.map(t=>(
                      <span key={t.tagId} style={pill("#845ef7")}>#{t.name}</span>
                    ))}

                    {/* ✅ 추가: AI 품질/등급/스팸 배지 */}
                    {qualityMap[item.postId] && (() => {
                    const q = qualityMap[item.postId];
                    const label = getQualityLabel(q.aiScore, q.spamScore);

                    if (!label) return null;

                    return (
                      <span style={pill(label.color)}>
                        {label.text}
                      </span>
                    );
                  })()}

                  </div>

                  <strong style={{fontSize:"1.1rem"}}>{item.title}</strong>

                  <div style={{color:"#666",margin:"6px 0"}}>
                    {getPreview(item.content)}
                  </div>

                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontSize:"0.85rem",color:"#888"}}>
                      {item.rdate?.substring(0,10)}
                      &nbsp;·&nbsp; 👁 {item.cnt ?? 0}
                      &nbsp;·&nbsp; ❤️ {item.recom ?? 0}
                      &nbsp;·&nbsp; ⭐ {item.favoriteCnt ?? 0}
                    </div>

                    <button
                      onClick={(e)=>toggleSimilar(item.postId,e)}
                      style={{padding:"6px 10px",borderRadius:"8px",border:"1px solid #aaa",background:"#fff",cursor:"pointer"}}
                    >
                      {openId === item.postId ? "접기" : "AI 유사글"}
                    </button>
                  </div>

                </td>
              </tr>



              {/* ===================== AI 유사글 ===================== */}
              {openId === item.postId && (
                <tr>
                  <td colSpan={2}>
                    <div
                      style={{
                        marginTop:"5px",
                        padding:"18px",
                        borderRadius:"12px",
                        border:"2px solid #d0d7ff",
                        background:"#f8faff"
                      }}
                      onClick={(e)=>e.stopPropagation()}
                    >

                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                        <h5 style={{margin:0,color:"#3b5bfd"}}> AI 유사글 추천</h5>

                        <button
                          onClick={()=>setOpenId(null)}
                          style={{padding:"4px 8px",borderRadius:"8px",border:"1px solid #aaa",background:"white",cursor:"pointer"}}
                        >
                          접기
                        </button>
                      </div>


                      {similar.length === 0 && (
                        <div style={{fontSize:"0.9rem",color:"#888"}}>
                          추천할만한 글이 없습니다 😥
                        </div>
                      )}


                      {similar.map(sim=>(
                        <div
                          key={sim.postId}
                          style={{
                            display:"flex",
                            gap:"14px",
                            padding:"12px",
                            margin:"10px 0",
                            borderRadius:"12px",
                            background:"white",
                            border:"1px solid #ddd",
                            boxShadow:"0 4px 10px rgba(0,0,0,.04)",
                            alignItems:"center"
                          }}
                        >

                          {/* 썸네일 */}
                          <div style={{width:120,height:85,overflow:"hidden",borderRadius:"9px",background:"#eee"}}>
                            <img
                              src={
                                sim.file1saved
                                  ? `http://121.160.42.28:9100/posts/storage/${sim.file1saved}`
                                  : "https://dummyimage.com/300x200/e0e0e0/777&text=NONE"
                              }
                              style={{width:"100%",height:"100%",objectFit:"cover"}}
                            />
                          </div>

                          {/* 내용 */}
                          <div style={{flex:1}}>
                            <div style={{fontWeight:700,fontSize:"1rem"}}>
                              {sim.title}
                            </div>

                            <div style={{fontSize:"0.85rem",color:"#666",margin:"4px 0"}}>
                              {getPreview(sim.content ?? "",80)}
                            </div>

                            <div style={{fontSize:"0.85rem",color:"#444"}}>
                              📊 유사도 {sim.score?.toFixed(2)}
                            </div>
                          </div>

                          <button
                            onClick={()=>navigate(`/posts/read/${sim.postId}`)}
                            style={{
                              padding:"7px 12px",
                              borderRadius:"8px",
                              border:"1px solid #aaa",
                              background:"#f4f4ff",
                              cursor:"pointer",
                              whiteSpace:"nowrap"
                            }}
                          >
                            🔍 보기
                          </button>

                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              )}

            </React.Fragment>
          ))}

        </tbody>
      </table>



      {/* 페이징 */}
      <div style={{marginTop:20,textAlign:"center"}}>
        <button onClick={()=>load(page-1,word,sort)} disabled={page===0} className="paging-btn">&lt;</button>

        {nums.map(n=>{
          const zero = n-1;
          return(
            <button key={n} onClick={()=>load(zero,word,sort)} className={`paging-btn ${n===current1?"paging-active":""}`}>
              {n}
            </button>
          );
        })}

        <button onClick={()=>load(page+1,word,sort)} disabled={page+1>=totalPages} className="paging-btn">&gt;</button>

        <div style={{marginTop:8,color:"#666"}}>
          page: {current1}/{totalPages} • total: {totalElements}
        </div>
      </div>

    </div>
  );
};

export default Posts_List_all_paging_search;
