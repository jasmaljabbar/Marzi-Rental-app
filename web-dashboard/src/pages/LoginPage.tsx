import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage } from "../api/http";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { FormError } from "../components/ui/FormError";
import { AuthLayout } from "../components/layout/AuthLayout";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [businessCode, setBusinessCode] = useState("");
  // The business code is only needed when the username exists in more than
  // one business; the server says so and the field appears.
  const [needsBusinessCode, setNeedsBusinessCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(username.trim(), password, needsBusinessCode ? businessCode.trim() : undefined);
      const state = location.state as { from?: string; loggedOut?: boolean } | null;
      const from = state?.loggedOut ? undefined : state?.from;
      navigate(from && from !== "/login" ? from : "/", { replace: true });
    } catch (err) {
      const { detail, code } = apiErrorMessage(err);
      if (code === "BUSINESS_CODE_REQUIRED") {
        setNeedsBusinessCode(true);
        setError("This username is used by more than one business. Enter your business code.");
      } else if (code === "PLATFORM_ADMIN_USE_ADMIN_LOGIN") {
        setError(`${detail} Use the admin login below.`);
      } else {
        setError(detail);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Sign in" subtitle="Welcome back. Sign in to manage your rental shop.">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input label="Username" name="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {needsBusinessCode ? (
          <Input
            label="Business code"
            name="business_code"
            hint="Shown in Settings → Company, or ask your business owner."
            value={businessCode}
            onChange={(e) => setBusinessCode(e.target.value)}
            required
            autoFocus
          />
        ) : (
          <button type="button" className="text-xs text-slate-500 hover:underline dark:text-slate-400" onClick={() => setNeedsBusinessCode(true)}>
            Sign in with a business code
          </button>
        )}

        <FormError message={error} />

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Log in
        </Button>
      </form>

      <div className="mt-4 flex justify-between text-sm">
        <Link to="/forgot-password" className="text-indigo-600 hover:underline dark:text-indigo-400">
          Forgot password?
        </Link>
        <Link to="/signup" className="text-indigo-600 hover:underline dark:text-indigo-400">
          Create an account
        </Link>
      </div>

      <div className="mt-4 text-center text-sm">
        <Link to="/platform/login" className="text-slate-500 hover:underline dark:text-slate-400">
          Platform admin? Log in here.
        </Link>
      </div>
    </AuthLayout>
  );
}
