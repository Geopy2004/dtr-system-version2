import { useCallback, useState } from "react";
import Sidebar from "./sidebar";

const getInitialSidebarState = () => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("dtr-sidebar-collapsed") === "true";
};

export default function AppShell({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getInitialSidebarState);

  const handleSidebarCollapsedChange = useCallback((nextCollapsed) => {
    setSidebarCollapsed(nextCollapsed);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "dtr-sidebar-collapsed",
        String(nextCollapsed)
      );
    }
  }, []);

  return (
    <div className="app-shell">
      <div className={`layout ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={handleSidebarCollapsedChange}
        />
        <main className="main-panel">{children}</main>
      </div>
    </div>
  );
}
