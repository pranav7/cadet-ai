"use client";

import { createClient } from "@/utils/supabase/client";
import { usePipeline } from "@/lib/hooks/use-pipeline";
import { useChat } from "@ai-sdk/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MessageSquareIcon } from "lucide-react";
import { useEffect } from "react";
import { LoadingDots } from "./ui/loading-dots";

export function Chat() {
  const supabase = createClient();
  const { messages, input, handleInputChange, handleSubmit, isLoading: isLoadingChat } =
    useChat({
      api: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/chat`,
    });
  const generateEmbedding = usePipeline(
    "feature-extraction",
    "Supabase/gte-small",
  );

  const isReady = !!generateEmbedding;

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!generateEmbedding) {
      console.error("Unable to generate embeddings");
      throw new Error("Unable to generate embeddings");
    }

    const output = await generateEmbedding(input, {
      pooling: "mean",
      normalize: true,
    });

    const embedding = JSON.stringify(Array.from(output.data));

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      console.info("No session found", session);
      return;
    }

    handleSubmit(e, {
      headers: {
        authorization: `Bearer ${session.access_token}`,
      },
        body: {
          embedding,
        },
    });
  };

  useEffect(() => {
    console.log("messages", messages.map((m) => m.content));
  }, [messages]);

  if (!isReady) {
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
    <div className="border rounded-md p-4 bg-gray-50 w-full">
      <div className="flex flex-col gap-5 w-full">
        <div className="flex flex-col gap-2 w-full">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 flex flex-row items-center gap-2">
              <MessageSquareIcon className="w-4 h-4" />
              <p className="text-sm">Ask me a question about your customers.</p>
            </div>
          )}
          {messages.map(({ id, role, content }) => (
            <div
              key={id}
              className={cn(
                'rounded-lg px-2 py-1 max-w-lg text-sm text-black',
                role === 'user' ? 'self-end bg-blue-100' : 'self-start bg-gray-200'
              )}
            >
              {content}
            </div>
          ))}
          {isLoadingChat && (
            <div className="text-center text-gray-500 flex flex-row items-center gap-2">
              <p className="text-sm flex gap-1">
                Thinking <LoadingDots />
              </p>
            </div>
          )}
        </div>
        <form
          onSubmit={handleFormSubmit}
          className="flex flex-row gap-2 w-full"
        >
          <Input
            type="text"
            autoFocus
            placeholder="Send a message"
            value={input}
            onChange={handleInputChange}
            className="bg-white w-full"
          />
          <Button disabled={!isReady} type="submit">
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
