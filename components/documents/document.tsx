import { Tables } from "@/types/database";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import ReactMarkdown from "react-markdown";
import { ChevronsUpDown } from "lucide-react";
import { createClient } from "@/utils/supabase/server";

export default async function Document({
  document,
}: {
  document: Tables<'documents_with_tags'>;
}) {
  const supabase = await createClient();

  const endUsers = await supabase
    .from('end_user_documents')
    .select(`
      end_users!inner (
        id,
        email,
        first_name,
        last_name,
        type
      )
    `)
    .eq('document_id', document.id)
    .then(result => result.data?.flatMap(record => record.end_users));

  return (
    <Card key={document.id} className="p-4">
    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
      {format(new Date(document.created_at || ''), 'd MMM, yyyy h:mm a')}
    </div>
    <div className="flex flex-col gap-2 text-sm overflow-auto max-h-[400px]">
      <div className="mb-2">
        {document.summary}
      </div>
      {endUsers && endUsers?.map((endUser) => (
        <div key={endUser.id}>
          {endUser.first_name} {endUser.last_name}
        </div>
      ))}
      {document.tags && (
        <div className="flex flex-row items-start flex-wrap gap-1">
          {document.tags?.map((documentTag: string) => (
            <span key={documentTag} className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md text-gray-500 dark:text-gray-400">
              {documentTag}
            </span>
          ))}
        </div>
      )}
      <Collapsible>
        <CollapsibleTrigger className="text-xs text-gray-500 dark:text-gray-400 flex flex-row items-center gap-1">
          Show full conversation
          <ChevronsUpDown className="w-3 h-3" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ReactMarkdown>
            {document.content}
          </ReactMarkdown>
        </CollapsibleContent>
      </Collapsible>
    </div>
  </Card>
  );
}