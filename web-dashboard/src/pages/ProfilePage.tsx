import { useState } from "react";
import type { FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, UserRound } from "lucide-react";
import { authApi } from "../api/services";
import { apiErrorMessage } from "../api/http";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { FormError } from "../components/ui/FormError";
import { PageHeader } from "../components/ui/PageHeader";
import { QueryState } from "../components/ui/QueryState";
import { passwordProblem } from "../utils/validation";

// Available to every role: who am I, which business, change my password.
export function ProfilePage() {
  const { applySession } = useAuth();
  const me = useQuery({ queryKey: ["auth", "me"], queryFn: authApi.me });
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    const problem = passwordProblem(next) ?? (next !== confirm ? "New passwords don't match." : null);
    if (problem) return setError(problem);
    setError(null);
    setSaving(true);
    try {
      applySession(await authApi.changePassword(current, next));
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success("Password changed. Other devices have been signed out.");
    } catch (err) {
      setError(apiErrorMessage(err).detail);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="My profile" description="Your login details and password." />
      <Card>
        <QueryState query={me}>
          {(data) => (
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                <UserRound className="h-5 w-5" aria-hidden="true" />
              </span>
              <dl className="grid flex-1 grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Username</dt>
                  <dd className="font-medium text-slate-900 dark:text-slate-100">{data.username}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Role</dt>
                  <dd>
                    <Badge tone="indigo">{data.role}</Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Business</dt>
                  <dd className="font-medium text-slate-900 dark:text-slate-100">{data.company_name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Business code</dt>
                  <dd className="font-mono text-slate-900 dark:text-slate-100">{data.business_code ?? "—"}</dd>
                </div>
              </dl>
            </div>
          )}
        </QueryState>
      </Card>

      <Card>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <KeyRound className="h-4 w-4" aria-hidden="true" /> Change password
        </h2>
        <form onSubmit={changePassword} className="grid gap-3 sm:max-w-sm">
          <Input label="Current password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          <Input label="New password" type="password" autoComplete="new-password" hint="At least 8 characters." value={next} onChange={(e) => setNext(e.target.value)} required />
          <Input label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          <FormError message={error} />
          <div>
            <Button type="submit" isLoading={saving}>
              Update password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
