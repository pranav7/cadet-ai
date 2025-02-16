import { Tables } from "@/types/database";
import { createClient } from "@/utils/supabase/server";
import Document from "./document";

export default async function DocumentsList() {
  const supabase = await createClient();
  const { data: currentApp } = await supabase.rpc('get_current_app');
  const { data: documents } = await supabase
    .from('documents_with_tags')
    .select('*')
    .eq('app_id', currentApp?.id || '')
    .limit(50);

  if (!documents) {
    return <div>Loading...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {documents.map((document: Tables<'documents_with_tags'>) => (
        <Document key={document.id} document={document} />
      ))}
    </div>
  );
}