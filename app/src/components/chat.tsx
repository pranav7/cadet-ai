"use client";

import { createClient } from "@/src/utils/supabase/client";
import { useChat } from "@ai-sdk/react";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/lib/utils";
import { MessageSquareIcon } from "lucide-react";
import { LoadingDots } from "@/src/components/ui/loading-dots";
import { Card, CardContent } from "@/src/components/ui/card";

export function Chat() {
  const supabase = createClient();
  const { messages, input, handleInputChange, handleSubmit, isLoading: isLoadingChat } =
    useChat({
      api: "/chat/api",
    });

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

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
    });
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
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
                  'rounded-lg px-2 py-1 max-w-lg text-sm text-black dark:text-white',
                  role === 'user' ? 'self-end bg-blue-100 dark:bg-blue-900' : 'self-start bg-gray-200 dark:bg-gray-800'
                )}
              >
                {content}
              </div>
            ))}
            {isLoadingChat && (
              <div className="text-center text-gray-500 dark:text-gray-400 flex flex-row items-center gap-2">
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
              className="bg-white dark:bg-gray-900 w-full"
            />
            <Button type="submit">
              Send
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
