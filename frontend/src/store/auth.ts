import { create } from 'zustand';
import type { AuthResponse, RefreshResponse, User } from '../types';

const ACCESS_TOKEN_KEY = 'plantdiary.access_token';
const REFRESH_TOKEN_KEY = 'plantdiary.refresh_token';
const USER_KEY = 'plantdiary.user';

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  /** Store a full auth payload (login/register). */
  setAuth: (auth: AuthResponse) => void;
  /** Store rotated tokens (refresh). */
  setTokens: (tokens: RefreshResponse) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Hydrate from localStorage on load.
  accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
  refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
  user: readStoredUser(),
  isAuthenticated: localStorage.getItem(ACCESS_TOKEN_KEY) !== null,

  setAuth: (auth) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, auth.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, auth.refresh_token);
    localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
    set({
      accessToken: auth.access_token,
      refreshToken: auth.refresh_token,
      user: auth.user,
      isAuthenticated: true,
    });
  },

  setTokens: (tokens) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
    set({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      isAuthenticated: true,
    });
  },

  setUser: (user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ user });
  },

  clearAuth: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false });
  },
}));
