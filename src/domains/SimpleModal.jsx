const SimpleModal = ({ show, title, message, onClose, onConfirm }) => {
  if (!show) return null;

  const handleConfirm = () => {
    onClose?.(); // onClose 함수 존재하면 실행함
    onConfirm?.(); // onConfirm 함수 존재하면 실행함
  };

  // \n 줄바꿈 처리
  const renderMessage = (msg) =>
    String(msg).split('\n').map((line, i) => <span key={i}>{line}<br/></span>);

  return (
    <>
      <div className="modal fade show" style={{ display: 'block' }} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content" style={{ borderRadius: '1rem' }}>
            <div className="modal-header">
              <h5 className="modal-title">{title || '알림'}</h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 0 }}>{renderMessage(message)}</p>
            </div>
            <div className="modal-footer" style={{ display: "flex", gap: "8px" }}>
              {/* 닫기 */}
              <button
                onClick={onClose}
                style={{
                  padding: "8px 16px",
                  borderRadius: "999px",
                  border: "1px solid #d0d7ff",
                  background: "white",
                  color: "#4c6ef5",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: ".2s"
                }}
                onMouseEnter={e => {
                  e.target.style.background = "#eef2ff";
                  e.target.style.borderColor = "#4c6ef5";
                  e.target.style.boxShadow = "0 6px 14px rgba(76,110,245,.25)";
                }}
                onMouseLeave={e => {
                  e.target.style.background = "white";
                  e.target.style.borderColor = "#d0d7ff";
                  e.target.style.boxShadow = "none";
                }}
              >
                닫기
              </button>

              {/* 확인 */}
              <button
                onClick={handleConfirm}
                style={{
                  padding: "8px 16px",
                  borderRadius: "999px",
                  border: "1px solid #4c6ef5",
                  background: "#4c6ef5",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: ".2s"
                }}
                onMouseEnter={e => {
                  e.target.style.background = "#3b5bdb";
                  e.target.style.boxShadow = "0 6px 14px rgba(76,110,245,.35)";
                  e.target.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={e => {
                  e.target.style.background = "#4c6ef5";
                  e.target.style.boxShadow = "none";
                  e.target.style.transform = "none";
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* backdrop */}
      <div className="modal-backdrop fade show"></div>
    </>
  );
};

export default SimpleModal