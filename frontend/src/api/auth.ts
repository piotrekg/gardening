import { api } from './client';
import type {
  AuthResponse,
  LoginRequest,
  LogoutRequest,
  RegisterRequest,
  User,
} from '../types';

export async function register(body: RegisterRequest): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/register', body);
  return res.data;
}

export async function login(body: LoginRequest): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/login', body);
  return res.data;
}

export async function logout(body: LogoutRequest): Promise<void> {
  await api.post('/auth/logout', body);
}

export async function getMe(): Promise<User> {
  const res = await api.get<User>('/auth/me');
  return res.data;
}
