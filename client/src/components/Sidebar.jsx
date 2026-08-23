import { useEffect, useState } from "react";
import {
  FaUsers,
  FaUserPlus,
  FaAddressCard,
  FaMoneyCheckAlt,
  FaFileInvoiceDollar,
  FaUndoAlt,
  FaFileAlt,
  FaInfoCircle,
  FaChevronDown,
  FaChevronRight,
  FaWallet,
  FaBook,
  FaBalanceScale,
  FaLandmark,
  FaMoneyBillWave,
  FaEdit,
  FaReceipt,
  FaCoins,
  FaUniversity,
  FaExchangeAlt,
  FaFileContract,
} from "react-icons/fa";
import { GiPadlock } from "react-icons/gi";

import { NavLink, useLocation } from "react-router-dom";
import { brand, gradients } from "../theme";
import LockedDialog from "./LockedDialog";
import blueFarmLogo from "../assets/blue-farm-logo.png";
import blueRemountsLogo from "../assets/blue-remounts-logo.png";

export default function Sidebar() {
  const [lockedTab, setLockedTab] = useState(null);
  const location = useLocation();

  const farm = localStorage.getItem("farm") || "Blue Farm";
  const auth = JSON.parse(localStorage.getItem("auth") || "null");
  const isAdmin = auth?.role === "admin";
  const isRemounts = farm === "Blue Remounts";
  const farmLogo = isRemounts ? blueRemountsLogo : blueFarmLogo;

  // ---- Main tabs (collapsible groups) ----
  const payrollLinks = [
    { to: "/employees", icon: <FaUsers />, text: "Employees", locked: false },
    { to: "/employees/add", icon: <FaUserPlus />, text: "Add Employee", locked: false },
    { to: "/employees/list", icon: <FaAddressCard />, text: "View Employee", locked: false },
    { to: "/salary/update", icon: <FaMoneyCheckAlt />, text: "Update Salary", locked: !isAdmin },
    { to: "/salary/generate", icon: <FaFileInvoiceDollar />, text: "Generate Salary", locked: !isAdmin },
    { to: "/salary/undo", icon: <FaUndoAlt />, text: "Undo Salary", locked: !isAdmin },
    { to: "/salary/report", icon: <FaFileAlt />, text: "Report Salary", locked: !isAdmin },
    { to: "/reports/info", icon: <FaFileAlt />, text: "Report Info", locked: false },
  ];

  const financeLinks = [
    { to: "/finance/add-allocation", icon: <FaCoins />, text: "Add Head & Allocation", locked: !isAdmin },
    { to: "/finance/edit-head", icon: <FaEdit />, text: "Edit Head & Allocation", locked: !isAdmin },
    { to: "/finance/add-income", icon: <FaMoneyBillWave />, text: "Add Income", locked: !isAdmin },
    { to: "/finance/add-bill", icon: <FaReceipt />, text: "Add Bill", locked: !isAdmin },
    { to: "/finance/edit-bill", icon: <FaEdit />, text: "Edit Bill", locked: !isAdmin },
    { to: "/finance/add-contingent-bill", icon: <FaFileContract />, text: "Add Contingent Bill", locked: !isAdmin },
    { to: "/finance/add-contingent-bill-from-existing", icon: <FaExchangeAlt />, text: "Add Contingent Bill (From Existing)", locked: !isAdmin },
    { to: "/finance/temporary-receipt", icon: <FaReceipt />, text: "Temporary Receipt", locked: !isAdmin },
    { to: "/finance/bill-report", icon: <FaFileAlt />, text: "Bill Report", locked: !isAdmin },
    { to: "/finance/contingent-bill-report", icon: <FaFileAlt />, text: "Report Contingent Bill", locked: !isAdmin },
    { to: "/finance/report-allocation", icon: <FaFileInvoiceDollar />, text: "Report Allocation", locked: !isAdmin },
  ];

  const cashBookLinks = [
    { to: "/cashbook", state: { tab: 0 }, icon: <FaReceipt />, text: "Receipt Side", locked: !isAdmin },
    { to: "/cashbook", state: { tab: 1 }, icon: <FaMoneyBillWave />, text: "Payment Side", locked: !isAdmin },
    { to: "/cashbook", state: { tab: 2 }, icon: <FaLandmark />, text: "Cash Withdrawal", locked: !isAdmin },
    { to: "/cashbook", state: { tab: 3 }, icon: <FaExchangeAlt />, text: "Bank Deposit", locked: !isAdmin },
    { to: "/cashbook", state: { tab: 4 }, icon: <FaUniversity />, text: "HQ Remittance", locked: !isAdmin },
    { to: "/cashbook", state: { tab: 5 }, icon: <FaBalanceScale />, text: "Daily Closing", locked: !isAdmin },
    { to: "/cashbook", state: { tab: 6 }, icon: <FaBook />, text: "Cash Reports", locked: !isAdmin },
  ];

  const ledgerLinks = [
    { to: "/ledger/general", icon: <FaBook />, text: "General Ledger", locked: !isAdmin },
    { to: "/ledger/party", icon: <FaBalanceScale />, text: "Party Ledger", locked: !isAdmin },
    { to: "/ledger/add-entry", icon: <FaEdit />, text: "Add Ledger Entry", locked: !isAdmin },
    { to: "/ledger/parties", icon: <FaUsers />, text: "Manage Parties", locked: !isAdmin },
  ];

  const groups = [
    { key: "payroll", title: "Payroll", icon: <FaMoneyCheckAlt />, links: payrollLinks },
    { key: "finance", title: "Finance", icon: <FaMoneyBillWave />, to: isAdmin ? "/finance" : null, links: financeLinks },
    { key: "cashbook", title: "Cash Book", icon: <FaWallet />, to: isAdmin ? "/cashbook" : null, links: cashBookLinks },
    { key: "ledger", title: "Ledger", icon: <FaBalanceScale />, to: isAdmin ? "/ledger" : null, links: ledgerLinks },
  ];

  const [open, setOpen] = useState({ payroll: true });

  const toggle = (key) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  // Whenever the route changes (including clicking a group's own title,
  // like "Ledger" or "Cash Book", which navigates but previously did NOT
  // expand its sub-menu), auto-expand whichever group matches the new
  // route. This is only additive — it never force-closes a group the user
  // has manually opened/closed for a route that doesn't match any group.
  useEffect(() => {
    const matchedGroup = groups.find(
      (g) =>
        (g.to && location.pathname.startsWith(g.to)) ||
        g.links.some((l) => l.to && location.pathname.startsWith(l.to))
    );
    if (matchedGroup) {
      setOpen((prev) => (prev[matchedGroup.key] ? prev : { ...prev, [matchedGroup.key]: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <div
      style={{
        width: "250px",
        height: "100%",
        background: gradients.sidebar,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        color: "#fff",
        boxShadow: "6px 0 28px rgba(4, 18, 36, 0.35)",
        borderRight: "1px solid rgba(212,175,55,0.18)",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "24px 20px 20px",
          textAlign: "center",
          borderBottom: `1px solid rgba(212,175,55,0.22)`,
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            margin: "0 auto 10px",
            background: "rgba(255,255,255,0.1)",
            border: `2px solid ${brand.gold}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 22px rgba(212,175,55,0.35)",
            overflow: "hidden",
          }}
        >
          <img src={farmLogo} alt={farm} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>

        <h2
          style={{
            marginBottom: "4px",
            fontSize: "20px",
            fontWeight: 800,
            letterSpacing: "1.2px",
          }}
        >
          {farm.toUpperCase()}
        </h2>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: "10px",
            letterSpacing: 1.6,
            fontWeight: 700,
            color: brand.goldLight,
            opacity: 0.9,
          }}
        >
          {isAdmin ? "ADMIN ACCESS" : "FINANCE MANAGEMENT"}
        </div>
      </div>

      {/* Menu */}
      <div style={{ flex: 1, minHeight: 0, padding: "14px 12px", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        {groups.map((group) => (
          <div key={group.key} style={{ marginBottom: 8 }}>
            <GroupHeader
              icon={group.icon}
              title={group.title}
              to={group.to}
              open={!!open[group.key]}
              onToggle={() => toggle(group.key)}
            />

            {open[group.key] && (
              <div
                style={{
                  marginTop: 4,
                  marginLeft: 10,
                  paddingLeft: 8,
                  borderLeft: "1px solid rgba(212,175,55,0.22)",
                }}
              >
                {group.links.map((link) => (
                  <MenuLink
                    key={link.text}
                    to={link.to}
                    state={link.state}
                    icon={link.icon}
                    text={link.text}
                    locked={link.locked}
                    onLockedClick={() => setLockedTab(link.text)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* About is a main tab and uses the same styling as the other main tabs */}
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <MainTabLink to="/about" icon={<FaInfoCircle />} title="About" />
        </div>
      </div>

      <LockedDialog open={!!lockedTab} onClose={() => setLockedTab(null)} tabName={lockedTab} />
    </div>
  );
}

function GroupHeader({ icon, title, to, open, onToggle }) {
  const [hover, setHover] = useState(false);
  const location = useLocation();
  const isActive = !!to && location.pathname.startsWith(to);

  const wrapperStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "12px 14px",
    borderRadius: 12,
    color: "#fff",
    fontSize: 13.5,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    background: isActive
      ? "linear-gradient(90deg, #d9b64a 0%, #b8912c 100%)"
      : open
        ? "linear-gradient(90deg, #16608f 0%, #12507a 100%)"
        : hover
          ? "rgba(255,255,255,0.14)"
          : "rgba(6,26,48,0.45)",
    border: `1px solid ${isActive ? "rgba(212,175,55,0.8)" : open ? "rgba(212,175,55,0.55)" : "rgba(255,255,255,0.10)"}`,
    boxShadow: open ? "0 4px 14px rgba(0,0,0,0.28)" : "none",
    transition: "0.22s",
  };

  const titleContent = (
    <span style={{ display: "flex", alignItems: "center", gap: 12, cursor: to ? "pointer" : "default" }}>
      <span style={{ fontSize: 16, color: isActive ? "#12283f" : brand.goldLight }}>{icon}</span>
      <span style={{ color: isActive ? "#12283f" : "#fff" }}>{title}</span>
    </span>
  );

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={wrapperStyle}
    >
      {to ? (
        <NavLink to={to} style={{ textDecoration: "none", flex: 1 }}>
          {titleContent}
        </NavLink>
      ) : (
        <div onClick={onToggle} style={{ flex: 1, cursor: "pointer" }}>
          {titleContent}
        </div>
      )}

      <span
        onClick={onToggle}
        style={{ display: "flex", alignItems: "center", cursor: "pointer", padding: 4 }}
        aria-label="toggle group"
      >
        {open ? <FaChevronDown size={11} /> : <FaChevronRight size={11} />}
      </span>
    </div>
  );
}

function MenuLink({ to, icon, text, locked, state, onLockedClick }) {
  const [hover, setHover] = useState(false);
  const loc = useLocation();
  // Cash Book tabs all share /cashbook, so match on the tab index too.
  // IMPORTANT: don't default a missing loc.state.tab to 0 — landing on the
  // plain "Cash Book" group link carries no tab in state, and defaulting to
  // 0 made "Receipt Side" light up as if it were the active tab even though
  // nothing was actually selected.
  const tabActive =
    state && typeof state.tab === "number"
      ? loc.pathname === to && loc.state?.tab === state.tab
      : null;

  if (locked || !to) {
    return (
      <div
        onClick={onLockedClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          padding: "10px 14px",
          marginBottom: "6px",
          borderRadius: "10px",
          fontSize: 13.5,
          color: "rgba(255,255,255,0.55)",
          cursor: "pointer",
          background: hover ? "rgba(0,0,0,0.28)" : "rgba(0,0,0,0.14)",
          transition: "0.25s",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "15px" }}>{icon}</span>
          {text}
        </span>
        <GiPadlock size={13} color={hover ? brand.goldLight : "rgba(255,255,255,0.45)"} />
      </div>
    );
  }

  return (
    <NavLink
      to={to}
      state={state}
      style={({ isActive: navActive }) => {
        const isActive = tabActive === null ? navActive : tabActive;
        return {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px 14px",
        marginBottom: "6px",
        borderRadius: "10px",
        fontSize: 13.5,
        textDecoration: "none",
        background: isActive
          ? "linear-gradient(90deg, #d9b64a 0%, #b8912c 100%)"
          : "rgba(255,255,255,0.07)",
        color: isActive ? "#12283f" : "#e8eef7",
        borderLeft: isActive ? `3px solid ${brand.gold}` : "3px solid transparent",
        fontWeight: isActive ? 700 : 500,
        transition: "0.25s",
        };
      }}
    >
      <span style={{ fontSize: "15px" }}>{icon}</span>
      {text}
    </NavLink>
  );
}

function MainTabLink({ to, icon, title }) {
  const [hover, setHover] = useState(false);
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);

  return (
    <NavLink
      to={to}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 12,
        textDecoration: "none",
        fontSize: 13.5,
        fontWeight: 700,
        letterSpacing: 0.4,
        textTransform: "uppercase",
        background: isActive
          ? "linear-gradient(90deg, #d9b64a 0%, #b8912c 100%)"
          : hover
            ? "rgba(255,255,255,0.14)"
            : "rgba(6,26,48,0.45)",
        border: `1px solid ${isActive ? "rgba(212,175,55,0.8)" : "rgba(255,255,255,0.10)"}`,
        color: isActive ? "#12283f" : "#fff",
        transition: "0.22s",
      }}
    >
      <span style={{ fontSize: 16, color: isActive ? "#12283f" : brand.goldLight }}>{icon}</span>
      <span>{title}</span>
    </NavLink>
  );
}
