import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaCog, FaUserCircle, FaCalendarAlt, FaSignOutAlt, FaClock } from "react-icons/fa";
import { brand, gradients } from "../theme";
import { logout } from "../api/authApi";
import SettingsDialog from "./SettingsDialog";

export default function Header() {
  const navigate = useNavigate();
  const auth = JSON.parse(localStorage.getItem("auth") || "null");
  const farm = localStorage.getItem("farm") || "Blue Farm";
  const userName = auth?.name || "User";
  const isAdmin = auth?.role === "admin";
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t=setInterval(()=>setNow(new Date()),1000); return ()=>clearInterval(t); }, []);
  const today = now.toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" });
  const time = now.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:true });
  const handleLogout = () => { logout(); localStorage.removeItem("auth"); localStorage.removeItem("farm"); localStorage.removeItem("token"); delete axios.defaults.headers.common.Authorization; navigate("/"); };
  return <>
    <header style={{height:"78px",background:gradients.topbar,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0 30px",borderBottom:`2px solid ${brand.gold}55`,boxShadow:"0 6px 22px rgba(8,33,63,0.25)"}}>
      <div><h2 style={{margin:0,color:"#fff",fontSize:"22px",fontWeight:800}}>{farm} Management System</h2><div style={{color:"rgba(255,255,255,.8)",fontSize:"12.5px",marginTop:2}}>Human Resource &amp; Finance Management</div></div>
      <div style={{display:"flex",alignItems:"center",gap:18}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,fontSize:12.5,background:"rgba(255,255,255,.18)",border:"1px solid rgba(255,255,255,.3)",padding:"5px 15px",borderRadius:20,minWidth:135}}>
          <span style={{color:"#fff",fontWeight:800,letterSpacing:1,display:"flex",alignItems:"center",gap:6}}><FaClock size={12}/>{time}</span>
          <span style={{color:"#fff",fontWeight:600,display:"flex",alignItems:"center",gap:6}}><FaCalendarAlt size={12}/>{today}</span>
        </div>
        <IconBtn title="Notifications"><FaBell size={18} color="#fff"/></IconBtn>
        <IconBtn title="Settings" onClick={()=>setSettingsOpen(true)}><FaCog size={18} color="#fff"/></IconBtn>
        <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:44,height:44,borderRadius:"50%",background:`linear-gradient(135deg,${brand.blueDeep},${brand.blueBright})`,display:"flex",alignItems:"center",justifyContent:"center",border:`2px solid ${brand.gold}`}}><FaUserCircle size={26} color="#fff"/></div><div><div style={{fontWeight:700,color:"#fff",fontSize:14}}>{userName}</div><div style={{fontSize:11.5,color:"rgba(255,255,255,.75)"}}>{isAdmin?"Administrator":"Farm Office"}</div></div></div>
        <div onClick={handleLogout} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 16px",borderRadius:10,cursor:"pointer",color:"#fff",background:"linear-gradient(135deg,#C0392B,#E74C3C)",fontWeight:600,fontSize:13}}><FaSignOutAlt size={14}/>Logout</div>
      </div>
    </header>
    <SettingsDialog open={settingsOpen} onClose={()=>setSettingsOpen(false)} isAdmin={isAdmin}/>
  </>;
}
function IconBtn({children,title,onClick}) { return <div title={title} onClick={onClick} style={{width:38,height:38,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,255,255,.16)",cursor:"pointer",transition:".2s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.28)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.16)"}>{children}</div>; }
