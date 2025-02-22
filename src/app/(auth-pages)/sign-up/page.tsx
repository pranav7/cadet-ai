import { signUpAction } from "@/app/(auth-pages)/sign-up/action";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { SmtpMessage } from "../smtp-message";

export default async function Signup(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
  if ("message" in searchParams) {
    return (
      <div className="w-full flex-1 flex items-center h-screen sm:max-w-md justify-center gap-2 p-4">
        <FormMessage message={searchParams} />
      </div>
    );
  }

  return (
    <>
      <form className="flex flex-col min-w-72 max-w-72 mx-auto">
        <h1 className="text-2xl font-medium">Sign up</h1>
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link className="text-primary font-medium underline" href="/sign-in">
            Sign in
          </Link>
        </p>
        <div className="flex flex-col gap-2 [&>input]:mb-3 mt-8">
          <Label htmlFor="app-name">App Name</Label>
          <Input
            name="app-name"
            placeholder="My App"
            required
          />
          <div className="flex flex-row gap-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="first-name">First Name</Label>
            <Input
              name="first-name"
              placeholder="First Name"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="last-name">Last Name</Label>
            <Input
              name="last-name"
              placeholder="Last Name"
              required
            />
            </div>
          </div>
          <Label htmlFor="email">Email</Label>
          <Input name="email" placeholder="you@example.com" required />
          <Label htmlFor="password">Password</Label>
          <Input
            type="password"
            name="password"
            placeholder="Your password"
            minLength={6}
            required
          />
          <SubmitButton formAction={signUpAction} pendingText="Signing up...">
            Sign up
          </SubmitButton>
          <FormMessage message={searchParams} />
        </div>
      </form>
      <SmtpMessage />
    </>
  );
}
