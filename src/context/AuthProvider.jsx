import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { authAPI } from '../services/api';
import { AuthContext } from './AuthContext';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('user');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);
        setUserRole(session.user.user_metadata?.role || 'user');
      }

      setLoading(false);
    };

    initSession();

    // Listen auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setUserRole(session?.user?.user_metadata?.role || 'user');
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // LOGIN
  const login = async (email, password) => {
    const data = await authAPI.login(email, password);

    setUser(data.user);
    setUserRole(data.user?.user_metadata?.role || 'user');

    return data;
  };

  // LOGOUT
  const logout = async () => {
    await authAPI.logout();
    setUser(null);
    setUserRole('user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        loading,
        login,
        logout,
        isAdmin: userRole === 'admin',
        isUser: userRole === 'user',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};  