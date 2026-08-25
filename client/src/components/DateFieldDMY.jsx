import { useEffect, useRef, useState } from "react";
import { TextField, InputAdornment, IconButton } from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

// The value passed in/out is always the plain ISO string (yyyy-mm-dd) so the
// backend/API keep working exactly as before. On screen the date is always
// shown/typed as dd-mm-yyyy. The user can either pick from the calendar or
// type the date manually — both produce the same ISO value.

function isoToDMY(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return "";
  return `${d}-${m}-${y}`;
}

// Accepts 1-2-2026, 01/02/2026, 01022026 etc. Returns ISO or "" if incomplete.
function dmyToIso(text) {
  const digits = String(text || "").replace(/\D/g, "");
  if (digits.length < 8) {
    // also allow d-m-yyyy style with separators already split
    const parts = String(text || "").split(/[^0-9]+/).filter(Boolean);
    if (parts.length === 3 && parts[2].length === 4) {
      const d = Number(parts[0]);
      const m = Number(parts[1]);
      const y = Number(parts[2]);
      return buildIso(d, m, y);
    }
    return "";
  }
  const d = Number(digits.slice(0, 2));
  const m = Number(digits.slice(2, 4));
  const y = Number(digits.slice(4, 8));
  return buildIso(d, m, y);
}

function buildIso(d, m, y) {
  if (!d || !m || !y || m < 1 || m > 12 || d < 1 || y < 1900) return "";
  const maxDay = new Date(y, m, 0).getDate();
  if (d > maxDay) return "";
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function DateFieldDMY({ label, name, value, onChange, fullWidth = true, size, disabled, sx }) {
  const hiddenRef = useRef(null);
  const [text, setText] = useState(isoToDMY(value));
  const [focused, setFocused] = useState(false);

  // Keep the visible text in sync when the value changes from outside
  useEffect(() => {
    if (!focused) setText(isoToDMY(value));
  }, [value, focused]);

  const openPicker = (e) => {
    if (disabled) return;
    if (e) e.preventDefault();
    const el = hiddenRef.current;
    if (!el) return;
    try {
      if (typeof el.showPicker === "function") {
        el.showPicker();
        return;
      }
    } catch (err) {
      // showPicker can throw if not user-activated, or if unsupported — fall back to click
    }
    try {
      el.focus({ preventScroll: true });
      el.click();
    } catch (err) {
      // last-resort fallback: some browsers need a fresh tick after focus
      setTimeout(() => {
        try { el.click(); } catch (e2) { /* give up silently */ }
      }, 0);
    }
  };

  const emit = (iso) => {
    if (onChange) onChange({ target: { name, value: iso } });
  };

  const handleHiddenChange = (e) => {
    setText(isoToDMY(e.target.value));
    emit(e.target.value);
  };

  const handleTyping = (e) => {
    const raw = e.target.value;
    setText(raw);
    const iso = dmyToIso(raw);
    if (iso) emit(iso);
    else if (raw.replace(/\D/g, "") === "") emit("");
  };

  const handleBlur = () => {
    setFocused(false);
    const iso = dmyToIso(text);
    if (iso) {
      setText(isoToDMY(iso));
      emit(iso);
    } else {
      setText(isoToDMY(value));
    }
  };

  return (
    <div style={{ position: "relative", width: fullWidth ? "100%" : "auto" }}>
      <TextField
        fullWidth={fullWidth}
        size={size}
        label={label}
        value={text}
        placeholder="dd-mm-yyyy"
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        onChange={handleTyping}
        onClick={openPicker}
        sx={sx}
        slotProps={{
          inputLabel: { shrink: true },
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={openPicker}
                  onMouseDown={(e) => e.preventDefault()}
                  edge="end"
                  size="small"
                  disabled={disabled}
                  aria-label="open calendar"
                  sx={{ color: "#16608f" }}
                >
                  <CalendarMonthIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
      {/* Native date input used only programmatically (via showPicker/click) to
          trigger the browser's calendar. Kept off to the side and non-interactive
          so it never intercepts clicks meant for the visible field/icon above it. */}
      <input
        ref={hiddenRef}
        type="date"
        name={name}
        value={value || ""}
        onChange={handleHiddenChange}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          height: 1,
          width: 1,
          opacity: 0,
          pointerEvents: "none",
          border: "none",
          background: "transparent",
        }}
      />
    </div>
  );
}
