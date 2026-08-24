import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

export default function MainLayout({ children }) {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background:
          "radial-gradient(1100px 620px at 8% -10%, #dceafc 0%, transparent 62%), radial-gradient(900px 520px at 95% 0%, #ffeede 0%, transparent 58%), radial-gradient(900px 600px at 85% 100%, #dff5ec 0%, transparent 60%), radial-gradient(700px 500px at 20% 105%, #ece3fb 0%, transparent 60%), linear-gradient(150deg, #f6f9ff 0%, #eef3fb 45%, #f3f0fa 100%)",      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: "250px",
          minWidth: "250px",
          height: "100%",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <Sidebar />
      </div>

      {/* Right Side */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minHeight: 0,
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <Header />

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            WebkitOverflowScrolling: "touch",
            padding: "6px 30px 26px",
            background: "transparent",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
