import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

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

export function UsersPage() {
  const { t } = useTranslation();
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
        title={t("users.title")}
        description={t("users.description")}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            {t("users.inviteButton")}
          </Button>
        }
      />

      {users.isError ? (
        <ErrorState message={t("users.loadError")} onRetry={users.refetch} />
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
                  {u.id === me?.id && <span className="ml-2 text-xs text-ink-soft">{t("users.youLabel")}</span>}
                </p>
                <p className="truncate text-sm text-ink-soft">{u.email}</p>
              </div>
              <Badge tone="bg-brand/10 text-brand">{u.role}</Badge>
              {!u.is_active && <Badge tone="bg-stone/20 text-stone">{t("users.inactiveLabel")}</Badge>}
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(u)}>
                  {t("common.edit")}
                </Button>
                {u.id !== me?.id && (
                  <Button size="sm" variant="ghost" onClick={() => setDeleting(u)}>
                    {t("common.delete")}
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
        title={t("users.removeConfirmTitle")}
        message={`${deleting?.full_name} ${t("users.removeConfirmMessage")}`}
        destructive
        confirmLabel={t("users.removeButton")}
        loading={del.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await del.mutateAsync(deleting.id);
            toast.success(t("users.removed"));
          } catch {
            toast.error(t("users.removeFailed"));
          }
          setDeleting(null);
        }}
      />
    </>
  );
}

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const create = useCreateUser();
  const toast = useToast();
  const { register, handleSubmit, formState } = useForm<{
    email: string;
    password: string;
    full_name: string;
    role: Role;
  }>({ defaultValues: { role: "viewer" } });

  const roleOptions = [
    { value: "admin", label: t("enums.role.admin") },
    { value: "editor", label: t("enums.role.editor") },
    { value: "viewer", label: t("enums.role.viewer") },
  ];

  const submit = handleSubmit(async (values) => {
    try {
      await create.mutateAsync(values);
      toast.success(t("users.invited"));
      onClose();
    } catch {
      toast.error(t("users.inviteFailed"));
    }
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={t("users.inviteModalTitle")}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button size="sm" loading={create.isPending} onClick={submit}>
            {t("users.inviteModalButton")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Input label={t("common.fullName")} error={formState.errors.full_name && t("validation.required")} {...register("full_name", { required: true })} />
        <Input label={t("common.email")} type="email" error={formState.errors.email && t("validation.required")} {...register("email", { required: true })} />
        <Input
          label={t("common.password")}
          type="password"
          hint={t("auth.register.passwordHint")}
          error={formState.errors.password && t("auth.register.passwordHint")}
          {...register("password", { required: true, minLength: 8 })}
        />
        <Select label={t("users.roleLabel")} options={roleOptions} {...register("role")} />
      </div>
    </Modal>
  );
}

function EditUserModal({ user, onClose }: { user: User; onClose: () => void }) {
  const { t } = useTranslation();
  const update = useUpdateUser();
  const me = useAuthStore((s) => s.user);
  const toast = useToast();
  const isSelf = user.id === me?.id;
  const { register, handleSubmit } = useForm<{ full_name: string; role: Role; is_active: boolean }>({
    defaultValues: { full_name: user.full_name, role: user.role, is_active: user.is_active },
  });

  const roleOptions = [
    { value: "admin", label: t("enums.role.admin") },
    { value: "editor", label: t("enums.role.editor") },
    { value: "viewer", label: t("enums.role.viewer") },
  ];

  const submit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync({ id: user.id, body: values });
      toast.success(t("common.saved"));
      onClose();
    } catch {
      toast.error(t("common.saveFailed"));
    }
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={t("users.editModalTitle")}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button size="sm" loading={update.isPending} onClick={submit}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Input label={t("common.fullName")} {...register("full_name")} />
        <Select label={t("users.roleLabel")} options={roleOptions} disabled={isSelf} {...register("role")} />
        {!isSelf && (
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" className="h-4 w-4 rounded border-line text-brand" {...register("is_active")} />
            {t("users.activeLabel")}
          </label>
        )}
        {isSelf && <p className="text-xs text-ink-soft">{t("users.editSelfNote")}</p>}
      </div>
    </Modal>
  );
}
