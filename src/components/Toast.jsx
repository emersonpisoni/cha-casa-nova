import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [msg, setMsg] = useState('');
  const timer = useRef(0);
  const show = useCallback(text => {
    setMsg(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(''), 2600);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast" role="status" hidden={!msg}>{msg}</div>
    </ToastContext.Provider>
  );
}
