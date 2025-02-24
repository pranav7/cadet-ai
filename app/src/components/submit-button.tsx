"use client";

import { Button } from "@/components/ui/button";
import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingText,
  ...props
}: {
  children: React.ReactNode
  pendingText?: string
} & React.ComponentPropsWithoutRef<typeof Button>) {
  const { pending } = useFormStatus();

  return (
    <Button {...props} type="submit" disabled={pending}>
      {pending ? pendingText || "Please wait..." : children}
    </Button>
  );
}
