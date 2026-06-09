import { useState } from "react";
import { useForm } from "react-hook-form";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/features/auth/store";
import { useCreateUser, useDeleteUser, useUpdateUser, useUsers } from "@/features/users/hooks";
import type { Role, User } from "@/types/api";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
];

export function UsersPage() {
  const users = useUsers();
  const me = useAuthStore((s) => s.user);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const del = useDeleteUser();
  const toast = useToast();

  return (
    <>
      <PageHeader
        title="Users"
        description="Manage who can access your family library."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            Invite user
          </Button>
        }
      />

      {users.isError ? (
        <ErrorState message="Couldn't load users." onRetry={users.refetch} />
      ) : users.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {users.data!.map((u) => (
            <Card key={u.id} className="flex items-center gap-3 p-4">
              <Avatar name={u.full_name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">
                  {u.full_name}
                  {u.id === me?.id && <span className="ml-2 text-xs text-ink-soft">(you)</span>}
                </p>
                <p className="truncate text-sm text-ink-soft">{u.email}</p>
              </div>
              <Badge tone="bg-brand/10 text-brand">{u.role}</Badge>
              {!u.is_active && <Badge tone="bg-stone/20 text-stone">inactive</Badge>}
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(u)}>
                  Edit
                </Button>
                {u.id !== me?.id && (
                  <Button size="sm" variant="ghost" onClick={() => setDeleting(u)}>
                    Delete
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {createOpen && <CreateUserModal onClose={() => setCreateOpen(false)} />}
      {editing && <EditUserModal user={editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Remove user?"
        message={`${deleting?.full_name} will lose access to the library.`}
        destructive
        confirmLabel="Remove"
        loading={del.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await del.mutateAsync(deleting.id);
            toast.success("User removed.");
          } catch {
            toast.error("Couldn't remove user.");
          }
          setDeleting(null);
        }}
      />
    </>
  );
}

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const create = useCreateUser();
  const toast = useToast();
  const { register, handleSubmit, formState } = useForm<{
    email: string;
    password: string;
    full_name: string;
    role: Role;
  }>({ defaultValues: { role: "viewer" } });

  const submit = handleSubmit(async (values) => {
    try {
      await create.mutateAsync(values);
      toast.success("User invited.");
      onClose();
    } catch {
      toast.error("That email may already be registered.");
    }
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Invite user"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" loading={create.isPending} onClick={submit}>
            Invite
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Input label="Full name" error={formState.errors.full_name && "Required"} {...register("full_name", { required: true })} />
        <Input label="Email" type="email" error={formState.errors.email && "Required"} {...register("email", { required: true })} />
        <Input
          label="Password"
          type="password"
          hint="At least 8 characters"
          error={formState.errors.password && "At least 8 characters"}
          {...register("password", { required: true, minLength: 8 })}
        />
        <Select label="Role" options={ROLE_OPTIONS} {...register("role")} />
      </div>
    </Modal>
  );
}

function EditUserModal({ user, onClose }: { user: User; onClose: () => void }) {
  const update = useUpdateUser();
  const me = useAuthStore((s) => s.user);
  const toast = useToast();
  const isSelf = user.id === me?.id;
  const { register, handleSubmit } = useForm<{ full_name: string; role: Role; is_active: boolean }>({
    defaultValues: { full_name: user.full_name, role: user.role, is_active: user.is_active },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync({ id: user.id, body: values });
      toast.success("Saved.");
      onClose();
    } catch {
      toast.error("Couldn't save.");
    }
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit user"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" loading={update.isPending} onClick={submit}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Input label="Full name" {...register("full_name")} />
        <Select label="Role" options={ROLE_OPTIONS} disabled={isSelf} {...register("role")} />
        {!isSelf && (
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" className="h-4 w-4 rounded border-line text-brand" {...register("is_active")} />
            Active
          </label>
        )}
        {isSelf && <p className="text-xs text-ink-soft">You can't change your own role or active status.</p>}
      </div>
    </Modal>
  );
}
