import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

export default function AppLayout() {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="min-h-screen px-4 pb-8 pt-4 lg:ml-[22rem] lg:px-8 lg:pt-6">
        <div className="space-y-6">
          <Header />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
