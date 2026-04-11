import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import SimpleModal from '../SimpleModal';
import { useUserStore } from '../../store/store';

const getIP = () => "121.160.42.26";

const Posts_Update_file1 = () => {
  const navigate = useNavigate();
  const { postId } = useParams();

  const grade = useUserStore((s) => s.grade);
  const userId = useUserStore((s) => s.userid);

  const [modal, setModal] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  const openModal = (p) => setModal({ show: true, ...p });
  const closeModal = () => setModal((m) => ({ ...m, show: false }));

  const [cate, setCate] = useState({});
  const [input, setInput] = useState({
    postId: 0,
    title: '',
    password: '',
    file1: '',
    file1saved: '',
  });

  const [file, setFile] = useState(null);

  useEffect(() => {
    if (!postId) return;

    axiosInstance.get(`/posts/read/${postId}`)
      .then(res => res.data)
      .then(data => {
        setInput({
          postId: data.postId,
          title: data.title || '',
          file1: data.file1,
          file1saved: data.file1saved,
          password: '',
        });

        return axiosInstance.get(`/cate/${data.cateno}`);
      })
      .then(res => setCate(res.data))
      .catch(console.error);
  }, [postId]);

  const send_update_file1 = async () => {
    if (grade !== 2 && !input.password.trim()) {
      openModal({ title: "입력 오류", message: "비밀번호를 입력하세요." });
      return;
    }

    if (!file) {
      openModal({ title: "입력 오류", message: "수정할 파일을 선택하세요." });
      return;
    }

    const formData = new FormData();
    formData.append("postId", String(input.postId));
    formData.append("file1MF", file);

    if (grade === 2) {
      formData.append("requestUserId", userId);
    } else {
      formData.append("password", input.password);
    }

    try {
      const res = await axiosInstance.post(
        "/posts/update_file1",
        formData,
        {
          // ✅ 여기서 Content-Type을 굳이 지정하지 않는 게 정석
          // 만약 axiosInstance가 json을 강제로 박는다면(네 상황), 1번 axios.js interceptor가 해결한다.
        }
      );

      const r = Number(res.data);

      if (r === 1)
        openModal({
          title: "성공",
          message: "파일이 수정되었습니다.",
          onConfirm: () => navigate(`/posts/read/${input.postId}`)
        });
      else if (r === 2)
        openModal({ title: "비밀번호 오류", message: "비밀번호가 일치하지 않습니다." });
      else if (r === 3)
        openModal({ title: "실패", message: "파일이 전달되지 않았습니다." });
      else
        openModal({ title: "실패", message: "파일 수정 실패" });

    } catch (e) {
      openModal({ title: "네트워크 오류", message: "잠시 후 다시 시도해주세요." });
    }
  };

  const send_delete_file1 = async () => {
    if (grade !== 2 && !input.password.trim()) {
      openModal({ title: "입력 오류", message: "비밀번호를 입력하세요." });
      return;
    }

    // ✅ 백엔드가 @RequestBody(FileDeleteRequest) 이면 JSON으로 보내는 게 정석
    const body = {
      postId: input.postId,
      password: grade === 2 ? null : input.password,
      requestUserId: grade === 2 ? userId : null,
    };

    try {
      const res = await axiosInstance.post("/posts/delete_file1", body);
      const r = Number(res.data);

      if (r === 1)
        openModal({
          title: "삭제 완료",
          message: "파일이 삭제되었습니다.",
          onConfirm: () => navigate(`/posts/read/${input.postId}`)
        });
      else if (r === 2)
        openModal({ title: "비밀번호 오류", message: "비밀번호가 일치하지 않습니다." });
      else if (r === 3)
        openModal({ title: "삭제 불가", message: "기본 이미지는 삭제 불가" });
      else
        openModal({ title: "삭제 실패", message: "삭제 실패" });

    } catch {
      openModal({ title: "네트워크 오류", message: "잠시 후 다시 시도해주세요." });
    }
  };

  const isImage = (f = '') =>
    ['jpg', 'jpeg', 'png', 'gif'].some(ext => f.toLowerCase().endsWith(ext));

  return (
    <div className="content">

      <style>{`
        .soft-box{
          background:white;
          border-radius:22px;
          border:1px solid #eee;
          padding:18px;
          box-shadow:0 10px 24px rgba(0,0,0,.06);
        }
      `}</style>

      <div className="title_line_left">
        {cate.grp} &gt; {cate.name}
      </div>

      <aside className="aside_right">
        <Link to={`/posts/read/${input.postId}`}>조회</Link>
        <span className="aside_menu_divide">|</span>
        <Link to={`/posts/create/${cate.cateno}`}>등록</Link>
        <span className="aside_menu_divide">|</span>
        <a href="#!" onClick={() => window.location.reload()}>새로고침</a>
      </aside>

      <div className="aside_menu_line" />

      <div className="soft-box">

        {isImage(input.file1) && (
          <img
            src={`http://${getIP()}:9100/posts/storage/${input.file1saved}`}
            alt=""
            style={{ width: "48%", borderRadius: 10, marginRight: "2%" }}
          />
        )}

        <div style={{ display: "inline-block", width: "48%", verticalAlign: "top" }}>
          <h3>{input.title}</h3>

          <input
            type="file"
            className="form-control"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          {grade !== 2 && (
            <>
              <label style={{ marginTop: 10 }}>비밀번호</label>
              <input
                type="password"
                value={input.password}
                onChange={(e) => setInput({ ...input, password: e.target.value })}
                className="form-control"
              />
            </>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button className="btn btn-outline-secondary btn-sm" onClick={send_update_file1}>
            파일 변경
          </button>{' '}
          <button className="btn btn-outline-secondary btn-sm" onClick={send_delete_file1}>
            파일 삭제
          </button>{' '}
          <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate(-1)}>
            취소
          </button>
        </div>

      </div>

      <SimpleModal
        show={modal.show}
        title={modal.title}
        message={modal.message}
        onConfirm={modal.onConfirm || closeModal}
        onClose={modal.onConfirm || closeModal}
      />
    </div>
  );
};

export default Posts_Update_file1;
