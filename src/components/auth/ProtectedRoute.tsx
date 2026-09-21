import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: ("owner" | "staff" | "client" | "superadmin")[];
}

/** @description Route guard that redirects unauthenticated users to /login, users without a role to /, and users without the required role to their appropriate area. Superadmin can access any protected route. */
const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  if (!role) {
    return <Navigate to="/" replace />;
  }

  // Superadmin can access any protected route
  if (role === "superadmin") {
    return <>{children}</>;
  }

  if (!allowedRoles.includes(role)) {
    // Redirect to the correct area based on role
    if (role === "owner") return <Navigate to="/dashboard" replace />;
    if (role === "staff") return <Navigate to="/staff" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
