import { useEffect, useState } from "react";

// The app's screens (Sidebar 250px, Header 78px, card paddings, etc.) were
// all built with fixed pixel sizes and no responsive breakpoints. That looks
// fine on a large PC monitor, but on a smaller laptop screen the same fixed
// pixels take up a much bigger share of the display, so everything appears
// oversized and cramped — no amount of browser zoom fixes that, because the
// real issue is screen size, not zoom level.
//
// This wrapper measures the actual window and, on smaller screens, scales
// the whole app down uniformly (sidebar, header, cards, fonts, spacing —
// everything at once) so the layout that was designed for a big monitor
// fits comfortably on a laptop screen too. On screens at or above the
// design size, scale stays at 1 and nothing changes — the PC view is
// untouched.

const DESIGN_WIDTH = 1600; // baseline width the app was visually designed for
const DESIGN_HEIGHT = 900; // baseline height the app was visually designed for
// Previously 0.72. That floor was too high: on a laptop window narrower than
// ~1150px CSS pixels (e.g. a half-screen-snapped window, or a smaller 13-14"
// laptop panel at 100% browser zoom), the ideal fit scale is below 0.72, but
// the old floor forced it back UP to 0.72 anyway — so the layout rendered
// bigger than the actual window and got cut off (looked like "half the
// screen"). Zooming the browser out to ~67% masked this by making the window
// *report* more CSS pixels, which pushed the calculated scale back above the
// floor. Lowering the floor lets the app shrink to whatever scale it truly
// needs to fit the window, so 100% browser zoom now fits correctly on its own.
const MIN_SCALE = 0.45; // never shrink further than this — stays readable

function computeScale() {
  const wScale = window.innerWidth / DESIGN_WIDTH;
  const hScale = window.innerHeight / DESIGN_HEIGHT;
  const scale = Math.min(1, wScale, hScale);
  return Math.max(MIN_SCALE, scale);
}

export default function ResponsiveScaler({ children }) {
  const [scale, setScale] = useState(computeScale);

  useEffect(() => {
    let frame = null;
    const handleResize = () => {
      // rAF-throttle so we don't recompute layout on every resize tick
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setScale(computeScale()));
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      style={{
        width: `${100 / scale}%`,
        height: `${100 / scale}%`,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      }}
    >
      {children}
    </div>
  );
}
