import { useState } from "react";
import { toast } from "sonner";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage } from "../api/http";
import { catalogApi, plansApi } from "../api/services";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Button } from "../components/ui/Button";
import { AuthLayout } from "../components/layout/AuthLayout";
import { FormError } from "../components/ui/FormError";
import { passwordProblem } from "../utils/validation";

// Trial length matches the seeded "trial" Plan's trialDays (see
// nodejs-backend/scripts/seedPlans.js) — that plan itself isn't public (it's
// auto-assigned on signup, not meant for a pricing page), so this copy is
// static rather than fetched; the limit numbers below it ARE fetched live
// from the public "starter" plan, whose limits the trial plan mirrors.
const TRIAL_DAYS = 14;

export function SignupPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [companyName, setCompanyName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [shopName, setShopName] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: plans } = useQuery({ queryKey: ["plans", "public"], queryFn: plansApi.list, enabled: step === 2 });
  const { data: catalog } = useQuery({ queryKey: ["catalog"], queryFn: catalogApi.get, enabled: step === 2 });
  const trialPlan = plans?.find((p) => p.key === "starter") ?? plans?.[0];

  function handleContinue(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!companyName.trim() || !username.trim()) {
      setError("Business name and username are required.");
      return;
    }
    const problem = passwordProblem(password);
    if (problem) {
      setError(problem);
      return;
    }
    setStep(2);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const user = await register({
        username: username.trim(),
        password,
        companyName: companyName.trim(),
        shopName: shopName.trim() || undefined,
        currency,
        email: email.trim() || undefined,
      });
      if (user.businessCode) {
        toast.success(`Welcome! Your business code is "${user.businessCode}". Staff may need it to sign in.`, { duration: 10000 });
      }
      navigate("/");
    } catch (err) {
      setError(apiErrorMessage(err).detail);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title={step === 1 ? "Start your free trial" : "Set up your shop"}
      subtitle={step === 1 ? "Step 1 of 2 — your account" : "Step 2 of 2 — almost done"}
    >
      {step === 1 ? (
        <form onSubmit={handleContinue} className="space-y-4">
          <Input label="Business name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required autoFocus />
          <Input label="Username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <Input
            label="Email (recommended)"
            type="email"
            autoComplete="email"
            hint="Used only to send you a password reset link."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />

          <FormError message={error} />

          <Button type="submit" className="w-full">
            Continue
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {trialPlan && (
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900/50 dark:bg-indigo-500/10">
              <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                Free for {TRIAL_DAYS} days — no card required
              </p>
              <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                {(catalog?.limits ?? []).map((def) => {
                  const value = trialPlan.limits[def.key];
                  if (value === undefined) return null;
                  const label = def.label.toLowerCase();
                  return (
                    <li key={def.key} className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                      {value === -1 ? "Unlimited" : value} {value === 1 && label.endsWith("s") ? label.slice(0, -1) : label}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <Input
            label="Shop name (optional)"
            placeholder={`${companyName.trim() || "Your business"} - Main Shop`}
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            autoFocus
          />

          <Select label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {(catalog?.currencies ?? [{ code: "INR", symbol: "₹", label: "Indian Rupee" }]).map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.label} ({c.symbol.trim()})
              </option>
            ))}
          </Select>

          <FormError message={error} />

          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="submit" className="flex-1" isLoading={isSubmitting}>
              Create account
            </Button>
          </div>
        </form>
      )}

      <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{" "}
        <Link to="/login" className="text-indigo-600 hover:underline dark:text-indigo-400">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
