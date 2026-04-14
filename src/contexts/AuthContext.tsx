import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useMemo,
} from 'react';
import { api } from '../lib/api';

export type UserRole = 'dealer' | 'sales' | 'driver';

export interface User {
  id: string;
  email: string;
  role: string;
}

export interface Sales {
  id: string;
  userId: string | null;
  dealerId: string;
  name: string;
  email: string;
  phone: string;
  role?: string | null;
  status: string;
  passwordChanged: boolean;
  defaultPickupLocation?: string;
  createdAt: string;
}

export interface Driver {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  canDriveManual: boolean;
  licenseNumber?: string;
  radius: number;
  status: string;
  isAvailable: boolean;
  availableForCustomerDeliveries: boolean;
  availableForDealerSwaps: boolean;
  createdAt: string;
}

export interface Dealership {
  id: string;
  userId: string;
  name: string;
  address: string;
  email: string;
  phone: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  sales: Sales | null;
  driver: Driver | null;
  dealer: Dealership | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  sales: null,
  driver: null,
  dealer: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshAuth: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [salesProfile, setSalesProfile] = useState<Sales | null>(null);
  const [driverProfile, setDriverProfile] = useState<Driver | null>(null);
  const [dealerProfile, setDealerProfile] = useState<Dealership | null>(null);

  const loadSession = async () => {
    try {
      const response = await api.auth.me();
      if (response.user) {
        setUser(response.user);
        setRole(response.user.role as UserRole);
        
        if (response.profile) {
          if (response.user.role === 'dealer') {
            setDealerProfile(response.profile);
          } else if (response.user.role === 'sales') {
            setSalesProfile(response.profile);
          } else if (response.user.role === 'driver') {
            setDriverProfile(response.profile);
          }
        }
      } else {
        setUser(null);
        setRole(null);
        setSalesProfile(null);
        setDriverProfile(null);
        setDealerProfile(null);
      }
    } catch (err) {
      console.error('Error loading session:', err);
      setUser(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await api.auth.login(email, password);
      setUser(response.user);
      setRole(response.user.role as UserRole);
      await loadSession();
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, role: string) => {
    setLoading(true);
    try {
      const response = await api.auth.register(email, password, role);
      setUser(response.user);
      setRole(response.user.role as UserRole);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.auth.logout();
      setUser(null);
      setRole(null);
      setSalesProfile(null);
      setDriverProfile(null);
      setDealerProfile(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshAuth = async () => {
    await loadSession();
  };

  const value = useMemo(
    () => ({
      user,
      role,
      loading,
      sales: salesProfile,
      driver: driverProfile,
      dealer: dealerProfile,
      login,
      register,
      logout,
      refreshAuth,
    }),
    [user, role, loading, salesProfile, driverProfile, dealerProfile]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
