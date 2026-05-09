import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

// ✅ useAuth lives here and is exported
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};