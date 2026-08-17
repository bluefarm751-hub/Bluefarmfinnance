import { useEffect, useState } from "react";
import { GiCow, GiHorseHead } from "react-icons/gi";

// Global F5 refresh animation — works on EVERY screen (Login, Select Farm,
// Loading, and every page inside the dashboard), not just once logged in.
// Shows a small cow (Blue Farm) or horse (Blue Remounts) for a moment, then
// calls onRefresh() — a SOFT refresh (remounts the current page so it
// re-fetches its data) rather than a real browser reload, so the page never
// actually unloads/goes blank; you stay on the exact same screen throughout.
export default function F5RefreshAnimation({ onRefresh }) {
  const [f5Icons, setF5Icons] = useState([]);

  useEffect(() => {
    let refreshing = false;
    const handleKeyDown = (e) => {
      if ((e.key === "F5" || e.keyCode === 116) && !refreshing) {
        e.preventDefault();
        refreshing = true;
        const farm = localStorage.getItem("farm") || "Blue Farm";
        const id = Date.now();
        setF5Icons((prev) => [...prev, { id, isRemounts: farm === "Blue Remounts" }]);
        setTimeout(() => {
          setF5Icons((prev) => prev.filter((c) => c.id !== id));
          onRefresh();
          refreshing = false;
        }, 950);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onRefresh]);

  return (
    <>
      {f5Icons.map(({ id, isRemounts }) => (
        <div key={id} className="f5-overlay">
          {isRemounts ? (
            <GiHorseHead className="f5-icon-spin" color="#D4AF37" />
          ) : (
            <GiCow className="f5-icon-spin" color="#D4AF37" />
          )}
        </div>
      ))}
    </>
  );
}
