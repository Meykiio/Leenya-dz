import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "owner" | "staff" | "client" | null;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
  refreshRole: async () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [roleReady, setRoleReady] = useState(false);

  const fetchRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .rpc("get_user_role", { _user_id: userId });
      if (error) throw error;
      setRole((data as AppRole) ?? null);
    } catch {
      setRole(null);
    } finally {
      setRoleReady(true);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // setTimeout avoids Supabase client deadlock
          setTimeout(() => fetchRole(session.user.id), 0);
        } else {
          setRole(null);
          setRoleReady(true);
        }
        setSessionReady(true);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setRole(null);
          setRoleReady(true);
          setSessionReady(true);
          return;
        }
        setSession(session);
        setUser(user);
        fetchRole(user.id);
      } else {
        setSession(null);
        setUser(null);
        setRole(null);
        setRoleReady(true);
      }
      setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
  };

  const refreshRole = async () => {
    if (!user) return;
    setRoleReady(false);
    await fetchRole(user.id);
  };

  const loading = !sessionReady || !roleReady;

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signOut, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
};
