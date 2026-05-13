import Sidebar from "./Sidebar";

export default function AppShell({ children }) {
  return (
    <div className="app-shell">
      <div className="layout">
        <Sidebar />
        <main className="main-panel">{children}</main>
      </div>
    </div>
  );
}
