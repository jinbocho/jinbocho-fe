import { useMemo, useState } from "react";
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
import { useAllBooks, useUpdateBook } from "@/features/books/hooks";
import {
  useCreateUser,
  useDeleteUser,
  useResendInvite,
  useUpdateUser,
  useUsers,
} from "@/features/users/hooks";
import type { OwnedBook, Role, User } from "@/types/api";

export function UsersPage() {
  const { t } = useTranslation();
  const users = useUsers();
  const books = useAllBooks();
  const me = useAuthStore((s) => s.user);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const del = useDeleteUser();
  const reactivate = useUpdateUser();
  const resend = useResendInvite();
  const toast = useToast();

  const activeAdminCount = useMemo(
    () => users.data?.filter((u) => u.role === "admin" && u.is_active).length ?? 0,
    [users.data],
  );
  const isSoleActiveAdmin = (u: User) => u.role === "admin" && u.is_active && activeAdminCount <= 1;

  const booksByOwner = useMemo(() => {
    const map = new Map<string, OwnedBook[]>();
    for (const b of books.data ?? []) {
      if (!b.owner_id) continue;
      map.set(b.owner_id, [...(map.get(b.owner_id) ?? []), b]);
    }
    return map;
  }, [books.data]);

  const deletingBooks = deleting ? booksByOwner.get(deleting.id) ?? [] : [];

  async function handleResend(u: User) {
    try {
      await resend.mutateAsync(u.id);
      toast.success(t("users.resendInviteSent"));
    } catch {
      toast.error(t("users.resendInviteFailed"));
    }
  }

  async function handleReactivate(u: User) {
    try {
      await reactivate.mutateAsync({ id: u.id, body: { is_active: true } });
      toast.success(t("users.reactivated"));
    } catch {
      toast.error(t("users.reactivateFailed"));
    }
  }

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
          {users.data!.map((u) => {
            const lastAdmin = isSoleActiveAdmin(u);
            const bookCount = booksByOwner.get(u.id)?.length ?? 0;
            return (
              <Card key={u.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-center gap-3 sm:flex-1">
                  <Avatar name={u.full_name} src={u.avatar_url} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">
                      {u.full_name}
                      {u.id === me?.id && <span className="ml-2 text-xs text-ink-soft">{t("users.youLabel")}</span>}
                    </p>
                    <p className="truncate text-sm text-ink-soft">{u.email}</p>
                    <p className="text-xs text-ink-soft">{t("users.bookCount", { count: bookCount })}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pl-12 sm:flex-none sm:pl-0">
                  <Badge tone="bg-brand/10 text-brand">{u.role}</Badge>
                  {!u.is_active && <Badge tone="bg-stone/20 text-stone">{t("users.inactiveLabel")}</Badge>}
                  {!u.password_set_at && <Badge tone="bg-amber/20 text-amber">{t("users.pendingInviteLabel")}</Badge>}
                </div>
                <div className="flex flex-wrap items-center gap-1 pl-12 sm:flex-none sm:pl-0">
                  {!u.password_set_at && (
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={resend.isPending && resend.variables === u.id}
                      onClick={() => handleResend(u)}
                    >
                      {t("users.resendInviteButton")}
                    </Button>
                  )}
                  {!u.is_active && (
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={reactivate.isPending && reactivate.variables?.id === u.id}
                      onClick={() => handleReactivate(u)}
                    >
                      {t("users.reactivateButton")}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setEditing(u)}>
                    {t("common.edit")}
                  </Button>
                  {u.id !== me?.id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={lastAdmin}
                      title={lastAdmin ? t("users.lastAdminTooltip") : undefined}
                      onClick={() => setDeleting(u)}
                    >
                      {t("common.delete")}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {createOpen && <CreateUserModal onClose={() => setCreateOpen(false)} />}
      {editing && (
        <EditUserModal user={editing} isSoleActiveAdmin={isSoleActiveAdmin(editing)} onClose={() => setEditing(null)} />
      )}

      {deleting && deletingBooks.length > 0 && (
        <ReassignAndDeleteModal
          user={deleting}
          books={deletingBooks}
          otherUsers={users.data!.filter((u) => u.id !== deleting.id && u.is_active)}
          onClose={() => setDeleting(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting) && deletingBooks.length === 0}
        title={t("users.removeConfirmTitle")}
        message={`${deleting?.full_name} ${t("users.removeConfirmMessage")}`}
        destructive
        confirmLabel={t("users.removeButton")}
        loading={del.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await del.mutateAsync(deleting);
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

function ReassignAndDeleteModal({
  user,
  books,
  otherUsers,
  onClose,
}: {
  user: User;
  books: OwnedBook[];
  otherUsers: User[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const updateBook = useUpdateBook();
  const del = useDeleteUser();
  const [target, setTarget] = useState("");

  const options = [
    { value: "", label: t("users.deleteReassignNoOwner") },
    ...otherUsers.map((u) => ({ value: u.id, label: u.full_name })),
  ];

  async function confirm() {
    try {
      for (const book of books) {
        await updateBook.mutateAsync({ id: book.id, body: { owner_id: target || null } });
      }
      await del.mutateAsync(user);
      toast.success(t("users.removed"));
    } catch {
      toast.error(t("users.removeFailed"));
    }
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t("users.deleteReassignTitle")}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button variant="danger" size="sm" loading={updateBook.isPending || del.isPending} onClick={confirm}>
            {t("users.deleteReassignButton")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-ink-soft">
          {t("users.deleteReassignMessage", { name: user.full_name, count: books.length })}
        </p>
        <Select
          label={t("users.deleteReassignSelectLabel")}
          options={options}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
      </div>
    </Modal>
  );
}

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const create = useCreateUser();
  const toast = useToast();
  const { register, handleSubmit, formState } = useForm<{
    email: string;
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
        <Select label={t("users.roleLabel")} options={roleOptions} {...register("role")} />
        <p className="text-xs text-ink-soft">{t("users.inviteHint")}</p>
      </div>
    </Modal>
  );
}

function EditUserModal({
  user,
  isSoleActiveAdmin,
  onClose,
}: {
  user: User;
  isSoleActiveAdmin: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const update = useUpdateUser();
  const me = useAuthStore((s) => s.user);
  const toast = useToast();
  const isSelf = user.id === me?.id;
  const lockRoleAndStatus = isSelf || isSoleActiveAdmin;
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
        <Select label={t("users.roleLabel")} options={roleOptions} disabled={lockRoleAndStatus} {...register("role")} />
        {!lockRoleAndStatus && (
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" className="h-4 w-4 rounded border-line text-brand" {...register("is_active")} />
            {t("users.activeLabel")}
          </label>
        )}
        {isSelf && <p className="text-xs text-ink-soft">{t("users.editSelfNote")}</p>}
        {!isSelf && isSoleActiveAdmin && <p className="text-xs text-ink-soft">{t("users.lastAdminTooltip")}</p>}
      </div>
    </Modal>
  );
}
