import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { authApi } from "../api/services";
import { apiErrorMessage } from "../api/http";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { FormError } from "../components/ui/FormError";
import { AuthLayout } from "../components/layout/AuthLayout";

// Reset links are emailed; the API never reveals whether an account exists.
// Staff without an email address are reset by their owner or admin.
export function ForgotPasswordPage() {
  const [username, setUsername] = useState("");
  const [businessCode, setBusinessCode] = useState("");
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await authApi.forgotPassword(username.trim(), businessCode.trim() || undefined);
      setSentMessage(res.message);
    } catch (err) {
      setError(apiErrorMessage(err).detail);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Reset your password" subtitle={sentMessage ? undefined : "We'll email you a link to choose a new password."}>
      {sentMessage ? (
        <div className="space-y-3 text-sm" role="status">
          <MailCheck className="h-8 w-8 text-emerald-500" aria-hidden="true" />
          <p className="text-slate-700 dark:text-slate-200">{sentMessage}</p>
          <p className="text-slate-500 dark:text-slate-400">The link expires in 15 minutes.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Username" name="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          <Input
            label="Business code (optional)"
            name="business_code"
            hint="Only needed if your username is used by more than one business."
            value={businessCode}
            onChange={(e) => setBusinessCode(e.target.value)}
          />
          <FormError message={error} />
          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Send reset link
          </Button>
        </form>
      )}

      <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
        <Link to="/login" className="text-indigo-600 hover:underline dark:text-indigo-400">
          Back to login
        </Link>
      </p>
    </AuthLayout>
  );
}
