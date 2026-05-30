import React, { createContext, useContext, useEffect, useReducer, useCallback, useRef } from 'react';
import { User } from '../types';
import { authApi } from '../api/services';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; accessToken: string } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: User };

const storedToken = localStorage.getItem('accessToken');

const initialState: AuthState = {
  user: null,
  accessToken: storedToken,
  isLoading: !!storedToken,
  isAuthenticated: false,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGOUT':
      return { user: null, accessToken: null, isLoading: false, isAuthenticated: false };
    case 'UPDATE_USER':
      return { ...state, user: action.payload };
    default:
      return state;
  }
};

interface AuthContextType extends AuthState {
  login: (user: User, token: string) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const initialized = useRef(false);

  const login = useCallback((user: User, token: string) => {
    localStorage.setItem('accessToken', token);
    dispatch({ type: 'LOGIN_SUCCESS', payload: { user, accessToken: token } });
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem('accessToken');
    try { await authApi.logout(); } catch (_) {}
    dispatch({ type: 'LOGOUT' });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await authApi.getMe();
      dispatch({ type: 'UPDATE_USER', payload: data.data.user });
    } catch (err) {
      console.error('[Auth] refreshUser failed:', err);
    }
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const token = localStorage.getItem('accessToken');

    if (!token) {
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }

    authApi
      .getMe()
      .then(({ data }) => {
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user: data.data.user, accessToken: token },
        });
      })
      .catch((err) => {
        console.warn('[Auth] Session verification failed:', err?.response?.status ?? err?.message);
        localStorage.removeItem('accessToken');
        dispatch({ type: 'LOGOUT' });
      });
  }, []); // ✅ removed eslint rule reference

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};