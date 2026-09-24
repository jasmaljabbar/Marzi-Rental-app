import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, Plus, Trash2, UserPlus } from "lucide-react";
import { authApi } from "../../api/services";
import { apiErrorMessage } from "../../api/http";
import { useInvalidate } from "../../hooks/useInvalidate";
import { useAuth } from "../../context/AuthContext";
import { useShop } from "../../context/ShopContext";
import { formatDateTime } from "../../utils/format";
import { passwordProblem } from "../../utils/validation";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { FormError } from "../../components/ui/FormError";
import { QueryState } from "../../components/ui/QueryState";
import { EmptyState } from "../../components/ui/EmptyState";
import type { StaffUser } from "../../types/models";

type TeamRole = "admin" | "staff";

// Team management. Usernames only need to be unique inside this business;
// staff can be pinned to one shop. Owners/admins reset staff passwords here
// (there's no self-service reset without an email address).
export function StaffSettings() {
  const { user: currentUser } = useAuth();
  const { shops } = useShop();
  const { invalidate, afterStaffChange } = useInvalidate();
  const staff = useQuery({ queryKey: ["staff"], queryFn: authApi.listUsers });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<StaffUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffUser | null>(null);

  function refresh() {
    invalidate("staff");
    afterStaffChange();
  }

  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: { id: string; role?: TeamRole; shop_id?: string | null }) => authApi.updateUser(id, input),
    onSuccess: () => {
      toast.success("Team member updated. Their current sessions were signed out.");
      refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => authApi.deleteUser(id),
    onSuccess: () => {
      toast.success("Removed.");
      setDeleteTarget(null);
      refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  const shopName = (id: string | null) => shops.find((s) => s.id === id)?.name;

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Team members</h2>
          {currentUser?.businessCode && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Business code for sign-in: <span className="font-mono font-medium text-slate-700 dark:text-slate-200">{currentUser.businessCode}</span>
            </p>
          )}
        </div>
        <Button size="sm" onClick={() => setInviteOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add team member
        </Button>
      </div>

      <QueryState
        query={staff}
        isEmpty={(rows) => rows.length === 0}
        empty={<EmptyState icon={UserPlus} title="No team members yet" description="Add staff so they can take rentals and returns." />}
      >
        {(rows) => (
          <ul className="space-y-2">
            {rows.map((member) => {
              const isSelf = member.username === currentUser?.username;
              const editable = member.role !== "owner" && !isSelf;
              return (
                <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800 dark:text-slate-100">{member.username}</span>
                      {isSelf && <Badge tone="indigo">You</Badge>}
                      {member.role === "owner" && <Badge tone="neutral">Owner</Badge>}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {member.email ?? "No email"} · last sign-in {member.last_login_at ? formatDateTime(member.last_login_at) : "never"}
                    </p>
                  </div>
                  {editable && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        aria-label={`Role for ${member.username}`}
                        value={member.role}
                        onChange={(e) => updateMutation.mutate({ id: member.id, role: e.target.value as TeamRole })}
                        className="w-28 py-1 text-xs"
                      >
                        <option value="admin">Admin</option>
                        <option value="staff">Staff</option>
                      </Select>
                      {member.role === "staff" && shops.length > 1 && (
                        <Select
                          aria-label={`Shop for ${member.username}`}
                          value={member.shop_id ?? ""}
                          onChange={(e) => updateMutation.mutate({ id: member.id, shop_id: e.target.value || null })}
                          className="w-36 py-1 text-xs"
                        >
                          <option value="">All shops</option>
                          {shops
                            .filter((s) => s.is_active)
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                        </Select>
                      )}
                      {member.role === "staff" && shops.length <= 1 && member.shop_id && <Badge tone="neutral">{shopName(member.shop_id) ?? "Pinned"}</Badge>}
                      <Button variant="ghost" size="sm" onClick={() => setResetTarget(member)} aria-label={`Reset password for ${member.username}`}>
                        <KeyRound className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(member)} aria-label={`Remove ${member.username}`}>
                        <Trash2 className="h-4 w-4 text-red-500" aria-hidden="true" />
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </QueryState>

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} onCreated={refresh} />
      <ResetPasswordModal target={resetTarget} onClose={() => setResetTarget(null)} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Remove team member"
        description={`Remove "${deleteTarget?.username}"? They will lose access immediately.`}
        confirmLabel="Remove"
        danger
        isLoading={deleteMutation.isPending}
      />
    </Card>
  );
}

function InviteModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { shops } = useShop();
  const activeShops = shops.filter((s) => s.is_active);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("staff");
  const [shopId, setShopId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => authApi.createUser({ username: username.trim(), password, role, email: email.trim() || null, shop_id: role === "staff" && shopId ? shopId : null }),
    onSuccess: () => {
      toast.success(`${username.trim()} added. Share the username and password with them.`);
      setUsername("");
      setPassword("");
      setEmail("");
      setShopId("");
      setRole("staff");
      onCreated();
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err).detail),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const problem = passwordProblem(password, username);
    if (problem) return setError(problem);
    setError(null);
    mutation.mutate();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add team member" size="sm">
      <form onSubmit={submit} className="space-y-3">
        <Input label="Username" autoComplete="off" hint="Letters, numbers and . _ @ + -" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
        <Input label="Temporary password" type="password" autoComplete="new-password" hint="At least 8 characters. They can change it in My profile." value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Input label="Email (optional)" type="email" hint="Lets them reset a forgotten password themselves." value={email} onChange={(e) => setEmail(e.target.value)} />
        <Select label="Role" value={role} onChange={(e) => setRole(e.target.value as TeamRole)}>
          <option value="staff">Staff — rentals, returns, customers</option>
          <option value="admin">Admin — everything except billing ownership</option>
        </Select>
        {role === "staff" && activeShops.length > 1 && (
          <Select label="Shop" value={shopId} onChange={(e) => setShopId(e.target.value)}>
            <option value="">All shops</option>
            {activeShops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        )}
        <FormError message={error} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            Add
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ target, onClose }: { target: StaffUser | null; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => authApi.setUserPassword(target!.id, password),
    onSuccess: () => {
      toast.success(`Password reset for ${target?.username}. They've been signed out everywhere.`);
      setPassword("");
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err).detail),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const problem = passwordProblem(password, target?.username);
    if (problem) return setError(problem);
    setError(null);
    mutation.mutate();
  }

  return (
    <Modal open={Boolean(target)} onClose={onClose} title="Reset password" description={target ? `New password for ${target.username}` : undefined} size="sm">
      <form onSubmit={submit} className="space-y-3">
        <Input label="New password" type="password" autoComplete="new-password" hint="At least 8 characters." value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
        <FormError message={error} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            Reset password
          </Button>
        </div>
      </form>
    </Modal>
  );
}
