import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function NotFoundPage() {
  const { role } = useAuth();

  // Role-aware home link
  const homeRoute = {
    admin: "/admin",
    coach: "/sessions",
    player: "/sessions",
    parent: "/sessions"
  }[role] || "/";

  const handleNavigate = (e) => {
    e.preventDefault();
    window.location.href = homeRoute;
  };

  return (
    <div style={{ padding: "60px", textAlign: "center" }}>
      <div style={{ fontSize: "48px", marginBottom: "16px" }}>
        404
      </div>
      <div style={{ fontSize: "20px", fontWeight: "bold",
        marginBottom: "8px" }}>
        Lehte ei leitud
      </div>
      <div style={{ color: "#6b7280", marginBottom: "24px" }}>
        Otsitud leht ei eksisteeri.
      </div>
      <a href={homeRoute}
        onClick={handleNavigate}
        style={{ color: "#3b82f6", textDecoration: "underline" }}>
        Tagasi avalehele
      </a>
    </div>
  );
}
