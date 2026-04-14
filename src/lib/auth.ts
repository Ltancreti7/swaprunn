import { api } from './api';

export type UserRole = 'dealer' | 'sales' | 'driver';

type RoleMissingHandler = (message: string) => void;

export async function signUp(email: string, password: string, role: UserRole) {
  return api.auth.register(email, password, role);
}

export async function signIn(email: string, password: string) {
  return api.auth.login(email, password);
}

export async function signOut() {
  return api.auth.logout();
}

export async function getCurrentUser() {
  const response = await api.auth.me();
  return response.user;
}

export async function getUserRole(options?: {
  onRoleMissing?: RoleMissingHandler;
}): Promise<UserRole | null> {
  try {
    const response = await api.auth.me();
    if (!response.user) {
      return null;
    }
    return response.user.role as UserRole;
  } catch (err) {
    const message = 'Unable to determine account role';
    console.error(message, err);
    if (options?.onRoleMissing) {
      options.onRoleMissing(`${message}. Please log in again.`);
    }
    return null;
  }
}
