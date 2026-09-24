import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage } from "../api/http";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { AuthLayout } from "../components/layout/AuthLayout";

// Independent entry point for platform admins — deliberately separate from
// the tenant LoginPage so system-admin access never depends on a shop/company
// login flow. See authController.adminLogin on the backend.
export function AdminLoginPage() {
  const { adminLogin } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await adminLogin(username, password);
      navigate("/platform");
    } catch (err) {
      setError(apiErrorMessage(err).detail);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Admin sign in" subtitle="Platform operator console — not for shop accounts.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Log in
        </Button>
      </form>

      <div className="mt-4 text-center text-sm">
        <Link to="/login" className="text-indigo-600 hover:underline dark:text-indigo-400">
          Looking for the shop dashboard? Log in here.
        </Link>
      </div>
    </AuthLayout>
  );
}
