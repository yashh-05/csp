import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  role: 'resident' | 'admin';
  name: string;
  phone?: string;
  house_number?: string;
  block?: string;
  floor?: number;
  residential_name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Reads tokens and profiles from localStorage on load.
   */
  const loadStoredAuth = () => {
    try {
      const storedToken = localStorage.getItem('mac_token');
      const storedUser = localStorage.getItem('mac_user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } else {
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('[AuthContext] Error loading credentials from storage:', error);
      localStorage.removeItem('mac_token');
      localStorage.removeItem('mac_user');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStoredAuth();

    // Event listener handles token changes from API client (e.g. 401 unauthorized logout)
    const handleAuthChange = () => {
      loadStoredAuth();
    };

    window.addEventListener('auth_change', handleAuthChange);
    // Storage listener syncs session across browser tabs
    window.addEventListener('storage', handleAuthChange);

    return () => {
      window.removeEventListener('auth_change', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  /**
   * Save session info to localStorage and update context state
   */
  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('mac_token', newToken);
    localStorage.setItem('mac_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  /**
   * Purge session details
   */
  const logout = () => {
    localStorage.removeItem('mac_token');
    localStorage.removeItem('mac_user');
    setToken(null);
    setUser(null);
  };

  /**
   * Update locally stored user profile details
   */
  const updateUser = (updatedUser: User) => {
    localStorage.setItem('mac_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
