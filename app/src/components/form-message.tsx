import type { Message } from "@/types/message";

export function FormMessage({ message }: { message: Message }) {
  return (
    <div className="flex flex-col gap-2 w-full max-w-md text-sm">
      {message.success && (
        <div className="text-foreground border-l-2 border-foreground px-4">
          {message.success}
        </div>
      )}
      {message.error && (
        <div className="text-destructive border-l-2 border-destructive px-4">
          {message.error}
        </div>
      )}
      {message.message && (
        <div className="text-foreground border-l-2 px-4">{message.message}</div>
      )}
    </div>
  );
}
