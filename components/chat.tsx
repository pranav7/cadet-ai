import { createClient } from "@/utils/supabase/server";
import { usePipeline } from "@/lib/hooks/use-pipeline";
import { useChat } from "@ai-sdk/react";
import { Input } from "@/components/ui/input";

export function Chat() {
  const supabase = createClient();
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/chat`,
    });
  const generateEmbedding = usePipeline(
    'feature-extraction',
    'Supabase/gte-small'
  );

  const isReady = !!generateEmbedding;

  return (
    <div className="flex flex-col gap-2">
      <Input
        type="text"
        autoFocus
        placeholder="Send a message"
        value={input}
        onChange={handleInputChange}
      />
    </div>
  );
}
