import { useCallback, useState } from "react";
import Sidebar from "./Sidebar";

export default function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);

  return (
    <div className="app-shell">
      <div className="layout">
        <Sidebar open={sidebarOpen} onClose={closeSidebar} onOpen={openSidebar} />
        <main className="main-panel">{children}</main>
      </div>
    </div>
  );
}
