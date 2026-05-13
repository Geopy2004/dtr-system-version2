import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./AuthContext";
import { authAPI, profileAPI } from "../services/api";
import { supabase } from "../services/supabase";

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async (nextUser) => {
    if (!nextUser) {
      setProfile(null);
      return null;
    }

    const nextProfile = await profileAPI.ensureProfile(nextUser);
    setProfile(nextProfile);
    return nextProfile;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const hydrateSession = async () => {
      try {
        const currentSession = await authAPI.getSession();
        const currentUser = currentSession?.user ?? null;

        if (!isMounted) return;

        setSession(currentSession);
        setUser(currentUser);

        if (currentUser) {
          await refreshProfile(currentUser);
        } else {
          setProfile(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    hydrateSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);

      setTimeout(() => {
        if (nextSession?.user) {
          refreshProfile(nextSession.user).catch(() => setProfile(null));
        } else {
          setProfile(null);
        }
      }, 0);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const login = useCallback(async (email, password) => {
    const data = await authAPI.login(email, password);
    setSession(data.session);
    setUser(data.user);
    const nextProfile = await refreshProfile(data.user);
    return { ...data, profile: nextProfile };
  }, [refreshProfile]);

  const logout = useCallback(async () => {
    await authAPI.logout();
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  const isAdmin = useMemo(
    () => profile?.role === "admin" || user?.app_metadata?.role === "admin",
    [profile?.role, user?.app_metadata?.role]
  );

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      loading,
      login,
      logout,
      refreshProfile,
      isAdmin,
    }),
    [isAdmin, loading, login, logout, profile, refreshProfile, session, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
