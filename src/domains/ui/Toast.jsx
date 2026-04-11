import { useEffect, useState } from "react";
import "./toast.css";

export default function Toast({ message = "알림", duration = 2000 }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShow(false), duration);
    return () => clearTimeout(t);
  }, [duration]);

  if (!show) return null;

  return (
    <div className="toast-wrap">
      <div className="toast">{message}</div>
    </div>
  );
}
