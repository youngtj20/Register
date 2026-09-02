import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen bg-[#f4f7f5] grid place-items-center"><div className="flex items-center gap-3 text-[#50605a]"><span className="loader" />Securing your workspace…</div></div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}
