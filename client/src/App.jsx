import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { api } from "./api.js";
import HomePage from "./pages/HomePage.jsx";
import ProjectPage from "./pages/ProjectPage.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminPage from "./pages/AdminPage.jsx";

function AdminRoute() {
  const [authenticated, setAuthenticated] = useState(null);

  useEffect(() => {
    let active = true;
    api.session()
      .then(() => {
        if (active) setAuthenticated(true);
      })
      .catch(() => {
        if (active) setAuthenticated(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (authenticated === null) {
    return <main className="admin-loading"><span className="loading-state">جارٍ التحقق من صلاحية الدخول...</span></main>;
  }
  return authenticated ? <AdminPage /> : <Navigate to="/admin/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/project/:slug" element={<ProjectPage />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
