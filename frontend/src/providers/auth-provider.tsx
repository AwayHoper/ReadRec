import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AuthResponse, UserProfile } from '../types';
import * as api from '../lib/api';

interface AuthContextValue {
  user: UserProfile | null;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (email: string, password: string) => Promise<AuthResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Summary: This component provides mock authentication state and actions to the app tree. */
export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<UserProfile | null>(null);

  /** Summary: This function loads the current mock user into the provider state. */
  async function loadCurrentUser() {
    const nextUser = await api.me();
    setUser(nextUser);
  }

  /** Summary: This function performs the mock login flow and stores the authenticated user. */
  async function handleLogin(email: string, password: string) {
    const response = await api.login(email, password);
    setUser(response.user);
    return response;
  }

  /** Summary: This function performs the mock registration flow and stores the authenticated user. */
  async function handleRegister(email: string, password: string) {
    const response = await api.register(email, password);
    setUser(response.user);
    return response;
  }

  /** Summary: This function clears the current authenticated user from the provider state. */
  function handleLogout() {
    api.clearAccessToken();
    setUser(null);
  }

  useEffect(
    /** Summary: This callback boots the provider's initial authentication state on mount. */
    function bootstrapAuthenticationState() {
      void loadCurrentUser();
    },
    []
  );

  const value = useMemo<AuthContextValue>(
    /** Summary: This callback composes the stable authentication context value from the current state. */
    function createAuthContextValue() {
      return {
        user,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout
      };
    },
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Summary: This hook exposes the authentication context to child components. */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('AuthProvider is required.');
  }
  return context;
}
