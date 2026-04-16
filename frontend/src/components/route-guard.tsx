import { Navigate } from 'react-router-dom';
import { PropsWithChildren } from 'react';
import { useAuth } from '../providers/auth-provider';

/** Summary: This component redirects anonymous users to the login page before rendering protected routes. */
export function RouteGuard({ children }: PropsWithChildren) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}