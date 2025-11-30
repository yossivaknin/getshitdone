
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { login, signup } from "./actions";

export default function LoginPage({ searchParams }: { searchParams: { message: string } }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <form className="w-full max-w-md space-y-6 p-8 border rounded-md shadow-sm bg-white">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Welcome Back</h1>
          <p className="text-muted-foreground text-sm">Enter your email to sign in to your account</p>
        </div>
        
        {searchParams?.message && (
          <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md text-center text-red-500 bg-red-50">
            {searchParams.message}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="m@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Button formAction={login} className="w-full bg-black text-white hover:bg-gray-800">Log in</Button>
          <Button formAction={signup} variant="outline" className="w-full border border-gray-200 hover:bg-gray-50">Sign up</Button>
        </div>
      </form>
    </div>
  );
}
