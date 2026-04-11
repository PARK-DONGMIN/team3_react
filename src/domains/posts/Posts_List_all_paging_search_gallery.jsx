// ⭐ 갤러리형 — AI 유사글 (목록형 동일 UI + 정렬 개선 + 카드안 보기버튼 완성)
// ✅ AI 품질 점수(aiScore) / 스팸 가능성(spamScore) / 등급(qualityGrade) 표시 포함

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import axiosInstance from '../../api/axios';

function range(start, end) { const arr=[]; for(let i=start;i<=end;i++) arr.push(i); return arr; }

function getPageNumbers(totalPages,current){
  if(totalPages===0) return [];
  const WIN=4;
  let start=Math.max(1,current-WIN);
  let end=Math.min(totalPages,current+WIN);
  while(end-start<8){
    if(start>1) start--;
    else if(end<totalPages) end++;
    else break;
  }
  return range(start,end);
}

const pillStyle=color=>({
  display:"inline-block",
  padding:"5px 12px",
  borderRadius:"999px",
  fontSize:"12px",
  fontWeight:600,
  background:"rgba(0,0,0,.03)",
  color,
  border:`1px solid ${color}`,
  marginRight:"6px"
});

const getPreview=(t,l=80)=>!t?"":t.length>l?t.substring(0,l)+"…":t;


const Posts_List_all_paging_search_gallery = () => {

  const [searchParams,setSearchParams]=useSearchParams();
  const initPage=Number(searchParams.get('page'))||0;
  const initWord=searchParams.get('word')??'';

  const navigate=useNavigate();
  const { cateno } = useParams();

  const [cate,setCate]=useState({});
  const [items,setItems]=useState([]);
  const [page,setPage]=useState(initPage);
  const [size]=useState(10);
  const [totalPages,setTotalPages]=useState(0);
  const [totalElements,setTotalElements] = useState(0);
  const [word,setWord]=useState(initWord);
  const [sort,setSort]=useState("latest");

  const [similar,setSimilar]=useState([]);
  const [openCardId,setOpenCardId]=useState(null);

  // ⭐ AI 품질 데이터
  const [qualityMap,setQualityMap]=useState({});

  /* ============================
      AI 품질 / 스팸 판단
  ============================ */
  const getQualityLabel=(aiScore,spamScore)=>{
    if(spamScore>=80) return {text:"🚨 스팸 가능성",color:"#d6336c"};
    if(aiScore!==null && aiScore<1) return {text:"🚨 스팸 가능성",color:"#d6336c"};
    return null;
  };

  const loadQualityForList=async(list)=>{
    if(!Array.isArray(list)||list.length===0){
      setQualityMap({});
      return;
    }
    const map={};
    await Promise.all(
      list.map(async(post)=>{
        try{
          const r=await axiosInstance.get(`/api/ai/quality/${post.postId}`);
          map[post.postId]=r.data;
        }catch{
          map[post.postId]={aiScore:0,spamScore:0,qualityGrade:"NOT_ANALYZED"};
        }
      })
    );
    setQualityMap(map);
  };

  /* ============================
      🔥 정렬 정상 작동 핵심 수정
  ============================ */
  const load = async (currentPage=page, searchWord=word, currentSort=sort)=>{
    setSearchParams({page:currentPage,word:searchWord});

    let res;

    if(searchWord && searchWord.trim() !== ""){
      // 🔍 검색 + 정렬
      res = await axiosInstance.get("/posts/list_all_paging_search",{
        params:{cateno,page:currentPage,size,word:searchWord,sort:currentSort},
      });
    } else {
      // 📄 일반 목록 + 정렬
      res = await axiosInstance.get("/posts/list_all_paging",{
        params:{cateno,page:currentPage,size,sort:currentSort},
      });
    }

    const list=res.data.content;

    const withTags=await Promise.all(
      list.map(async post=>{
        try{
          const t=await axiosInstance.get(`/api/post-tags/post/${post.postId}`);
          return {...post,tags:t.data};
        }catch{return {...post,tags:[]}}
      })
    );

    setItems(withTags);
    setPage(res.data.page);
    setTotalPages(res.data.totalPages);
    setTotalElements(res.data.totalElements);

    await loadQualityForList(withTags);
  };


  useEffect(()=>{
    axiosInstance.get(`/cate/${cateno}`).then(res=>setCate(res.data));
    load(initPage,initWord,sort);
  // eslint-disable-next-line
  },[cateno]);


  const current1=page+1;
  const nums=getPageNumbers(totalPages,current1);


  const toggleSimilar=async (postId,e)=>{
    e.stopPropagation();

    if(openCardId===postId){
      setOpenCardId(null);
      return;
    }

    try{
      const res=await axiosInstance.get(`/posts/${postId}/similar`);
      const list=res.data??[];

      const enriched=await Promise.all(
        list.map(async sim=>{
          try{
            let detail;

            try{
              const r=await axiosInstance.get(`/posts/read/${sim.postId}`);
              detail=r.data;
            }catch{
              const r=await axiosInstance.get(`/posts/${sim.postId}`);
              detail=r.data;
            }

            return {
              ...sim,
              title:detail?.title ?? `게시글 ${sim.postId}`,
              content:detail?.content ?? "",
              file1saved:
                detail?.file1saved ||
                detail?.thumb1 ||
                detail?.image ||
                detail?.thumbnail ||
                null
            };

          }catch{return sim;}
        })
      );

      setSimilar(enriched);
      setOpenCardId(postId);

    }catch{
      alert("AI 유사글을 불러오지 못했습니다.");
    }
  };

  return (
    <div className="content">

      <style>{`
        .gallery-card:hover{
          transform:translateY(-3px);
          box-shadow:0 10px 20px rgba(0,0,0,.12);
          transition:.2s;
        }
        
        .gallery-card{
        cursor:pointer;
        }

        .similar-box{
          margin-top:8px;
          padding:10px;
          border-radius:14px;
          border:2px solid #d0d7ff;
          background:#f8faff;
        }

        .similar-item{
          display:flex;
          flex-direction:column;
          gap:10px;
          padding:12px 14px;
          margin-top:10px;
          border-radius:14px;
          background:white;
          border:1px solid #ddd;
          box-shadow:0 4px 10px rgba(0,0,0,.04);
        }

        .similar-thumb{
          width:120px;
          height:85px;
          border-radius:9px;
          background:#eee;
          object-fit:cover;
          border:1px solid #ccc;
        }

        .similar-info-row{
          display:flex;
          align-items:center;
          justify-content:space-between;
          width:100%;
        }

        .similar-text-row{
          display:flex;
          gap:12px;
          align-items:center;
          flex-wrap:wrap;
        }

        .similar-view-btn{
          padding:7px 12px;
          border-radius:8px;
          border:1px solid #aaa;
          background:#f4f4ff;
          cursor:pointer;
          white-space:nowrap;
        }

        .ai-btn{
          padding:7px 12px;
          border-radius:8px;
          border:1px solid #aaa;
          background:#f4f4ff;
          cursor:pointer;
          white-space:nowrap;
        }

        .paging-btn{border:1px solid #ddd;background:white;margin:0 4px;padding:7px 11px;border-radius:9px;cursor:pointer;}
        .paging-active{background:#4c6ef5;color:white;border:none;}
        .top-pill{padding:6px 14px;border-radius:999px;border:1px solid #d0d7ff;background:white;color:#4c6ef5;font-size:13px;font-weight:600;}
        .top-pill-active{background:#4c6ef5;color:white;}
      `}</style>

      <div className="title_line_left">
        {cate.grp} &gt; {cate.name}
      </div>

      <div style={{display:"flex",justifyContent:"flex-end",gap:"6px",margin:"10px 0"}}>
        <Link
        className="top-pill" to={`/posts/create/${cate.cateno}`} style={{ marginRight: "auto" }}>
        등록하기
        </Link>
        <button className="top-pill" onClick={()=>location.reload()}>새로고침</button>
        <Link className="top-pill" to={`/posts/list/${cate.cateno}?page=${page}&word=${word}`}>목록형</Link>
        <span className="top-pill top-pill-active">갤러리형</span>
      </div>

      <div style={{display:"flex",justifyContent:"flex-end",gap:"6px"}}>
        <select className="form-select form-select-sm" value={sort}
          onChange={(e)=>{setSort(e.target.value);load(0,word,e.target.value);}}>
          <option value="latest">최신순</option>
          <option value="views">조회수순</option>
          <option value="likes">좋아요순</option>
        </select>
      </div>

      <form onSubmit={(e)=>{e.preventDefault();load(0,word,sort);}}
        style={{margin:"10px 0",display:"flex",justifyContent:"flex-end"}}>
        <input value={word} onChange={(e)=>setWord(e.target.value)}
          placeholder="검색어 또는 #태그 입력" style={{width:280,marginRight:8}}/>
        <button className="btn btn-sm btn-secondary">검색</button>
      </form>

      {/* 카드 리스트 */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(260px,1fr))",gap:"18px",marginTop:"18px"}}>
        {items.map(item=>{
          const q=qualityMap[item.postId];
          const label=q?getQualityLabel(q.aiScore,q.spamScore):null;

          return(
            <div key={item.postId} className="gallery-card"
              style={{borderRadius:"16px",background:"#fff",padding:"12px"}}
              onClick={()=>navigate(`/posts/read/${item.postId}?page=${page}&word=${word}`)}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8
                }}
              >
                {/* 왼쪽: 카테고리 + 태그 (한 줄 제한) */}
                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    flexWrap: "nowrap",
                    maxWidth: "100%"
                  }}
                >
                  {cate?.name && (
                    <span style={pillStyle("#4c6ef5")}>{cate.name}</span>
                  )}

                  {item.tags?.map(t => (
                    <span
                      key={t.tagId}
                      style={{
                        ...pillStyle("#845ef7"),
                        flexShrink: 0
                      }}
                    >
                      #{t.name}
                    </span>
                  ))}
                </div>

              </div>

              <div style={{ position: "relative" }}>
                <img
                  src={`http://121.160.42.28:9100/posts/storage/${item.file1saved}`}
                  style={{width:"100%",height:"170px",objectFit:"cover",borderRadius:"10px"}}
                />

                {/* 🚨 스팸 배지 오버레이 */}
                {label && (
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      background: "white",
                      border: `1px solid ${label.color}`,
                      color: label.color,
                      padding: "4px 10px",
                      borderRadius: "999px",
                      fontSize: "11px",
                      fontWeight: 600,
                      boxShadow: "0 4px 10px rgba(0,0,0,.15)",
                      zIndex: 2
                    }}
                  >
                    {label.text}
                  </div>
                )}
              </div>


              <h4 style={{marginTop:10,fontWeight:700}}>{item.title}</h4>
              <small style={{color:"#666"}}>{item.rdate?.substring(0,10)}</small>

              <p style={{color:"#555",fontSize:"14px",marginTop:4}}>
                {getPreview(item.content,75)}
              </p>

              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:12,color:"#777"}}>
                  👁 {item.cnt} ❤️ {item.recom ?? 0} ⭐ {item.favoriteCnt ?? 0}
                </span>

                <button onClick={(e)=>toggleSimilar(item.postId,e)}
                  className="ai-btn">
                  {openCardId===item.postId?"접기":"AI 유사글"}
                </button>
              </div>

              {openCardId===item.postId && (
                <div className="similar-box" onClick={e=>e.stopPropagation()}>
                  {similar.map(sim=>(
                    <div key={sim.postId} className="similar-item">
                      <img className="similar-thumb"
                        src={sim.file1saved?`http://121.160.42.28:9100/posts/storage/${sim.file1saved}`:"https://dummyimage.com/300x200/e0e0e0/777&text=NONE"}/>
                      <div className="similar-info-row">
                        <div className="similar-text-row">
                          <strong>{sim.title}</strong>
                          <span>{getPreview(sim.content??"",60)}</span>
                          <span>📊 {sim.score?.toFixed(2)}</span>
                        </div>
                        <button className="similar-view-btn"
                          onClick={()=>navigate(`/posts/read/${sim.postId}`)}>
                          🔍 보기
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          );
        })}
      </div>

      <div style={{marginTop:25,textAlign:"center"}}>
        <button onClick={()=>load(page-1)} disabled={page===0} className="paging-btn">&lt;</button>
        {nums.map(n=>{
          const zero=n-1;
          return(
            <button key={n} onClick={()=>load(zero)} className={`paging-btn ${n===current1?"paging-active":""}`}>
              {n}
            </button>
          );
        })}
        <button onClick={()=>load(page+1)} disabled={page+1>=totalPages} className="paging-btn">&gt;</button>
        <div style={{marginTop:8,color:"#666"}}>
          page: {current1} / {totalPages} • total: {totalElements}
        </div>
      </div>

    </div>
  );
};

export default Posts_List_all_paging_search_gallery;
