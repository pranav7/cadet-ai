import { createClient } from "@/utils/supabase/server";

async function useCurrentSession() {
  const supabase = await createClient();
  const { data: authUser } = await supabase.auth.getUser();
  const { data: currentUser } = await supabase.rpc('get_current_user');
  const { data: currentApp } = await supabase.rpc('get_current_app');

  return {
    authUser,
    currentUser,
    currentApp,
  };
}

export default useCurrentSession;
