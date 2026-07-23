import { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import Footer from "./Footer";

function AppLayout({ title, subtitle, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="app-shell__main">
        <Navbar
          title={title}
          subtitle={subtitle}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />

        <main className="app-content">{children}</main>

        <Footer />
      </div>
    </div>
  );
}

export default AppLayout;