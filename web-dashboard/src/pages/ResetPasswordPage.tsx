import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { authApi } from "../api/services";
import { apiErrorMessage } from "../api/http";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { FormError } from "../components/ui/FormError";
import { AuthLayout } from "../components/layout/AuthLayout";
import { passwordProblem } from "../utils/validation";

// Target of the emailed reset link: /reset-password?token=...
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = passwordProblem(password) ?? (password !== confirm ? "Passwords don't match." : null);
    if (problem) return setError(problem);
    setError(null);
    setIsSubmitting(true);
    try {
      await authApi.resetPassword(token, password);
      toast.success("Password updated. Sign in with your new password.");
      navigate("/login", { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err).detail);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Reset link missing">
        <p className="text-sm text-slate-600 dark:text-slate-300">Open the link from your email again, or request a new one.</p>
        <p className="mt-4 text-sm">
          <Link to="/forgot-password" className="text-indigo-600 hover:underline dark:text-indigo-400">
            Request a new link
          </Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
        />
        <Input label="Confirm password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        <FormError message={error} />
        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}
