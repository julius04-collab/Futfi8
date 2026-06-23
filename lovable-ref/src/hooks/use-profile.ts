import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type Profile = {
  id: string;
  handle: string;
  club_id: string;
  avatar_url: string | null;
  bio: string | null;
  cred: number;
};

export function useProfile() {
  const { user, loading: authLoading } = useAuth();
  const q = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, handle, club_id, avatar_url, bio, cred")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
  return { ...q, authLoading, user };
}
