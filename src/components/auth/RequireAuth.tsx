// src/components/auth/RequireAuth.tsx
import { Navigate } from "react-router-dom";

function getSession() {
  const raw = localStorage.getItem("session");
  return raw ? JSON.parse(raw) : null;
}

export function RequireAuth({ children }: { children: JSX.Element }) {
  const session = getSession();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
