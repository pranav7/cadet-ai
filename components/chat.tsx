"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { usePipeline } from "@/lib/hooks/use-pipeline";
import { useChat } from "@ai-sdk/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function Chat() {
  const supabase = createClientComponentClient();
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/chat`,
    });
  const generateEmbedding = usePipeline(
    "feature-extraction",
    "Supabase/gte-small",
  );

  const isReady = !!generateEmbedding;

  if (isLoading || !isReady) {
    return (
      <div className="border rounded-md p-4 bg-background w-full">
        <div className="flex flex-row gap-2 w-full">
          <div className="animate-pulse h-4 w-full bg-gray-200 rounded-full"></div>
          <div className="animate-pulse h-4 w-4 bg-gray-200 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-md p-4 bg-background w-full">
      <div className="flex flex-row gap-2 w-full">
        <Input
          type="text"
          autoFocus
          placeholder="Send a message"
          value={input}
          onChange={handleInputChange}
      />
      <Button disabled={!isReady} onClick={handleSubmit}>
          Send
        </Button>
      </div>
    </div>
  );
}
