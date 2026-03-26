import { Outlet } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import "./AppLayout.css";

/**
 * AppLayout wraps every page with the collapsing sidebar on the left
 * and the page content on the right via React Router's <Outlet />.
 */
const AppLayout = () => {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-layout__main">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
