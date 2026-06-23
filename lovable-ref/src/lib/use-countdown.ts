import { useEffect, useState } from "react";

export function useCountdown(target: string | Date | null) {
  const compute = () => {
    if (!target) return { ms: 0, label: "—", done: true };
    const ms = new Date(target).getTime() - Date.now();
    if (ms <= 0) return { ms: 0, label: "00:00", done: true };
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    return {
      ms,
      done: false,
      label: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
    };
  };
  const [state, setState] = useState(compute);
  useEffect(() => {
    setState(compute());
    const i = setInterval(() => setState(compute()), 1000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return state;
}
