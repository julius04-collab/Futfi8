import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      setSession(sess);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        if (event !== "SIGNED_OUT") qc.invalidateQueries();
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [qc]);

  return { session, user: session?.user ?? null as User | null, loading };
}

export async function signOut() {
  await supabase.auth.signOut();
}
