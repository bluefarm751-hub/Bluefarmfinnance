import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaCog, FaUserCircle, FaCalendarAlt, FaSignOutAlt, FaClock, FaExclamationTriangle, FaIdCard } from "react-icons/fa";
import { brand, gradients } from "../theme";
import { logout } from "../api/authApi";
import { getTRs } from "../api/cashbookApi";
import { getEmployees } from "../api/employeeApi";
import SettingsDialog from "./SettingsDialog";

// A TR (Temporary Receipt / cash advance) is expected to be cleared within
// this many days of being issued. Once it crosses this age while still
// "Not Cleared", it shows up as an overdue alert in the topbar bell.
const TR_CLEAR_LIMIT_DAYS = 15;

// Police verification is only valid for this many months from the date it
// was done. Once that date passes, it shows up as an expired alert.
const POLICE_VERIFICATION_VALID_MONTHS = 3;

function parseIsoDate(iso) {
  if (!iso) return null;
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function daysSince(entryDate) {
  const issued = parseIsoDate(entryDate);
  if (!issued) return 0;
  return Math.floor((startOfToday() - issued) / (1000 * 60 * 60 * 24));
}

// Returns the police-verification expiry date (verification date + validity
// months), or null if there's no verification date to work from.
function policeVerificationExpiry(verificationDate) {
  const done = parseIsoDate(verificationDate);
  if (!done) return null;
  const expiry = new Date(done);
  expiry.setMonth(expiry.getMonth() + POLICE_VERIFICATION_VALID_MONTHS);
  return expiry;
}

function daysSinceExpiry(verificationDate) {
  const expiry = policeVerificationExpiry(verificationDate);
  if (!expiry) return 0;
  return Math.floor((startOfToday() - expiry) / (1000 * 60 * 60 * 24));
}

export default function Header() {
  const navigate = useNavigate();
  const auth = JSON.parse(localStorage.getItem("auth") || "null");
  const farm = localStorage.getItem("farm") || "Blue Farm";
  const userName = auth?.name || "User";
  const isAdmin = auth?.role === "admin";
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [overdueTRs, setOverdueTRs] = useState([]);
  const [expiredPoliceVerifications, setExpiredPoliceVerifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);
  useEffect(() => { const t=setInterval(()=>setNow(new Date()),1000); return ()=>clearInterval(t); }, []);

  useEffect(() => {
    let cancelled = false;
    const loadOverdueTRs = async () => {
      try {
        const res = await getTRs();
        const rows = res.data || [];
        const overdue = rows.filter(
          (r) => r.status !== "Cleared" && daysSince(r.entryDate) >= TR_CLEAR_LIMIT_DAYS
        );
        if (!cancelled) setOverdueTRs(overdue);
      } catch (e) { /* silent — notifications are best-effort */ }
    };
    const loadExpiredPoliceVerifications = async () => {
      try {
        const res = await getEmployees();
        const rows = res.data || [];
        const expired = rows.filter(
          (e) => e.status !== "Inactive" && e.policeVerificationDate && daysSinceExpiry(e.policeVerificationDate) >= 0
        );
        if (!cancelled) setExpiredPoliceVerifications(expired);
      } catch (e) { /* silent — notifications are best-effort */ }
    };
    loadOverdueTRs();
    loadExpiredPoliceVerifications();
    const poll = setInterval(() => { loadOverdueTRs(); loadExpiredPoliceVerifications(); }, 5 * 60 * 1000); // re-check every 5 min
    return () => { cancelled = true; clearInterval(poll); };
  }, []);

  useEffect(() => {
    if (!notifOpen) return;
    const onClickOutside = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false); };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [notifOpen]);

  const today = now.toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" });
  const time = now.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:true });
  const handleLogout = () => { logout(); localStorage.removeItem("auth"); localStorage.removeItem("farm"); localStorage.removeItem("token"); delete axios.defaults.headers.common.Authorization; navigate("/"); };
  const goToTRs = () => { setNotifOpen(false); navigate("/finance/temporary-receipt"); };
  const goToEmployee = (id) => { setNotifOpen(false); navigate(`/employees/view/${id}`); };
  const alertCount = overdueTRs.length + expiredPoliceVerifications.length;

  return <>
    <header style={{height:"78px",background:gradients.topbar,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0 30px",borderBottom:`2px solid ${brand.gold}55`,boxShadow:"0 6px 22px rgba(8,33,63,0.25)"}}>
      <div><h2 style={{margin:0,color:"#fff",fontSize:"22px",fontWeight:800}}>{farm} Management System</h2><div style={{color:"rgba(255,255,255,.8)",fontSize:"12.5px",marginTop:2}}>Human Resource &amp; Finance Management</div></div>
      <div style={{display:"flex",alignItems:"center",gap:18}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,fontSize:12.5,background:"rgba(255,255,255,.18)",border:"1px solid rgba(255,255,255,.3)",padding:"5px 15px",borderRadius:20,minWidth:135}}>
          <span style={{color:"#fff",fontWeight:800,letterSpacing:1,display:"flex",alignItems:"center",gap:6}}><FaClock size={12}/>{time}</span>
          <span style={{color:"#fff",fontWeight:600,display:"flex",alignItems:"center",gap:6}}><FaCalendarAlt size={12}/>{today}</span>
        </div>
        <div ref={notifRef} style={{ position: "relative" }}>
          <IconBtn title={alertCount ? `${alertCount} alert(s) need attention` : "Notifications"} onClick={() => setNotifOpen((o) => !o)}>
            <FaBell size={18} color="#fff" />
            {alertCount > 0 && (
              <span style={{
                position: "absolute", top: -2, right: -2, minWidth: 16, height: 16, padding: "0 3px",
                borderRadius: 9, background: brand.danger, color: "#fff", fontSize: 10, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #fff",
                boxShadow: "0 0 0 2px rgba(192,57,43,0.35)",
              }}>
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            )}
          </IconBtn>
          {notifOpen && (
            <div style={{
              position: "absolute", top: 48, right: 0, width: 340, maxHeight: 420, overflowY: "auto",
              background: "#fff", borderRadius: 12, boxShadow: "0 12px 34px rgba(8,33,63,0.35)",
              border: `1px solid ${brand.gold}55`, zIndex: 50,
            }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", fontWeight: 800, color: brand.navy, fontSize: 13.5 }}>
                Notifications {alertCount > 0 ? `(${alertCount})` : ""}
              </div>
              {alertCount === 0 ? (
                <div style={{ padding: "18px 16px", fontSize: 12.5, color: "#777" }}>No pending alerts.</div>
              ) : (
                <>
                  {overdueTRs.map((r) => (
                    <div key={`tr-${r.id}`} onClick={goToTRs} style={{
                      display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 16px",
                      borderBottom: "1px solid #f2f2f2", cursor: "pointer",
                    }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#fbf6ea")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <FaExclamationTriangle size={14} color={brand.danger} style={{ marginTop: 2, flexShrink: 0 }} />
                      <div style={{ fontSize: 12.5, color: brand.navy, lineHeight: 1.45 }}>
                        <div style={{ fontWeight: 700 }}>TR not cleared — {r.issuedTo || "Unknown"}</div>
                        <div style={{ color: "#666" }}>
                          Issued {daysSince(r.entryDate)} days ago (limit {TR_CLEAR_LIMIT_DAYS} days) · Rs. {Number(r.amount || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  {expiredPoliceVerifications.map((e) => (
                    <div key={`pv-${e.id}`} onClick={() => goToEmployee(e.id)} style={{
                      display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 16px",
                      borderBottom: "1px solid #f2f2f2", cursor: "pointer",
                    }}
                      onMouseEnter={(ev) => (ev.currentTarget.style.background = "#fbf6ea")}
                      onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}
                    >
                      <FaIdCard size={14} color={brand.danger} style={{ marginTop: 2, flexShrink: 0 }} />
                      <div style={{ fontSize: 12.5, color: brand.navy, lineHeight: 1.45 }}>
                        <div style={{ fontWeight: 700 }}>Police verification expired — {e.name || "Unknown"}</div>
                        <div style={{ color: "#666" }}>
                          Expired {daysSinceExpiry(e.policeVerificationDate)} day(s) ago (valid {POLICE_VERIFICATION_VALID_MONTHS} months)
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
        <IconBtn title="Settings" onClick={()=>setSettingsOpen(true)}><FaCog size={18} color="#fff"/></IconBtn>
        <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:44,height:44,borderRadius:"50%",background:`linear-gradient(135deg,${brand.blueDeep},${brand.blueBright})`,display:"flex",alignItems:"center",justifyContent:"center",border:`2px solid ${brand.gold}`}}><FaUserCircle size={26} color="#fff"/></div><div><div style={{fontWeight:700,color:"#fff",fontSize:14}}>{userName}</div><div style={{fontSize:11.5,color:"rgba(255,255,255,.75)"}}>{isAdmin?"Administrator":"Farm Office"}</div></div></div>
        <div onClick={handleLogout} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 16px",borderRadius:10,cursor:"pointer",color:"#fff",background:"linear-gradient(135deg,#C0392B,#E74C3C)",fontWeight:600,fontSize:13}}><FaSignOutAlt size={14}/>Logout</div>
      </div>
    </header>
    <SettingsDialog open={settingsOpen} onClose={()=>setSettingsOpen(false)} isAdmin={isAdmin}/>
  </>;
}
function IconBtn({children,title,onClick}) { return <div title={title} onClick={onClick} style={{position:"relative",width:38,height:38,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,255,255,.16)",cursor:"pointer",transition:".2s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.28)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.16)"}>{children}</div>; }
