import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/feedback/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/features/auth/store";
import {
  useBookcases,
  useCreateBookcase,
  useCreateRoom,
  useCreateSection,
  useCreateShelf,
  useDeleteBookcase,
  useDeleteRoom,
  useDeleteSection,
  useDeleteShelf,
  useRooms,
  useSections,
  useShelves,
  useUpdateBookcase,
  useUpdateRoom,
  useUpdateSection,
  useUpdateShelf,
} from "@/features/locations/hooks";

export function LocationsPage() {
  const { t } = useTranslation();
  const rooms = useRooms();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === "admin" || role === "editor";
  const createRoom = useCreateRoom();
  const toast = useToast();
  const [roomModal, setRoomModal] = useState(false);

  return (
    <>
      <PageHeader
        title={t("locations.title")}
        description={t("locations.description")}
        actions={
          canEdit && (
            <Button size="sm" onClick={() => setRoomModal(true)}>
              {t("locations.addRoomButton")}
            </Button>
          )
        }
      />

      {rooms.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : (rooms.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon="🏠"
          title={t("locations.emptyTitle")}
          description={t("locations.emptyDescription")}
          action={canEdit && <Button onClick={() => setRoomModal(true)}>{t("locations.emptyAction")}</Button>}
        />
      ) : (
        <div className="space-y-3">
          {rooms.data!.map((room) => (
            <RoomNode key={room.id} room={room} canEdit={canEdit} />
          ))}
        </div>
      )}

      {roomModal && (
        <EntityModal
          title={t("locations.addRoomModalTitle")}
          fields={[{ name: "name", label: t("common.name"), required: true }, { name: "description", label: t("common.description") }]}
          submitting={createRoom.isPending}
          onClose={() => setRoomModal(false)}
          onSubmit={async (v) => {
            await createRoom.mutateAsync({ name: v.name!, description: v.description || null });
            toast.success(t("locations.roomAdded"));
            setRoomModal(false);
          }}
        />
      )}
    </>
  );
}

// ---- Room ----
function RoomNode({ room, canEdit }: { room: { id: string; name: string; description: string | null }; canEdit: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const bookcases = useBookcases(open ? room.id : undefined);
  const update = useUpdateRoom();
  const del = useDeleteRoom();
  const create = useCreateBookcase();
  const [addOpen, setAddOpen] = useState(false);
  const toast = useToast();

  return (
    <Card className="overflow-hidden">
      <Row
        title={room.name}
        subtitle={room.description ?? undefined}
        open={open}
        onToggle={() => setOpen((o) => !o)}
        canEdit={canEdit}
        onEdit={() => setEdit(true)}
        onDelete={() => setConfirm(true)}
      />
      {open && (
        <div className="space-y-2 border-t border-line bg-paper/40 px-4 py-3 pl-8">
          {bookcases.isLoading ? (
            <Skeleton className="h-10" />
          ) : (bookcases.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-ink-soft">{t("locations.noBookcases")}</p>
          ) : (
            bookcases.data!.map((bc) => <BookcaseNode key={bc.id} bookcase={bc} canEdit={canEdit} />)
          )}
          {canEdit && (
            <Button size="sm" variant="ghost" onClick={() => setAddOpen(true)}>
              {t("locations.addBookcaseButton")}
            </Button>
          )}
        </div>
      )}

      {edit && (
        <EntityModal
          title={t("locations.editRoomTitle")}
          initial={{ name: room.name, description: room.description ?? "" }}
          fields={[{ name: "name", label: t("common.name"), required: true }, { name: "description", label: t("common.description") }]}
          submitting={update.isPending}
          onClose={() => setEdit(false)}
          onSubmit={async (v) => {
            await update.mutateAsync({ id: room.id, body: { name: v.name, description: v.description || null } });
            toast.success(t("common.saved"));
            setEdit(false);
          }}
        />
      )}
      {addOpen && (
        <EntityModal
          title={t("locations.addBookcaseModalTitle")}
          fields={[{ name: "name", label: t("common.name"), required: true }, { name: "type", label: t("locations.bookcaseType") }]}
          submitting={create.isPending}
          onClose={() => setAddOpen(false)}
          onSubmit={async (v) => {
            await create.mutateAsync({ room_id: room.id, name: v.name!, type: v.type || null });
            toast.success(t("locations.bookcaseAdded"));
            setAddOpen(false);
          }}
        />
      )}
      <ConfirmDialog
        open={confirm}
        title={t("locations.deleteRoomTitle")}
        message={t("locations.deleteRoomMessage")}
        destructive
        confirmLabel={t("common.delete")}
        loading={del.isPending}
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          try {
            await del.mutateAsync(room.id);
            toast.success(t("locations.roomDeleted"));
          } catch {
            toast.error(t("locations.deleteRoomFailed"));
          }
          setConfirm(false);
        }}
      />
    </Card>
  );
}

// ---- Bookcase ----
function BookcaseNode({
  bookcase,
  canEdit,
}: {
  bookcase: { id: string; name: string; type: string | null };
  canEdit: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const sections = useSections(open ? bookcase.id : undefined);
  const update = useUpdateBookcase();
  const del = useDeleteBookcase();
  const create = useCreateSection();
  const toast = useToast();

  return (
    <div className="rounded-md border border-line bg-surface">
      <Row
        title={bookcase.name}
        subtitle={bookcase.type ?? undefined}
        open={open}
        onToggle={() => setOpen((o) => !o)}
        canEdit={canEdit}
        onEdit={() => setEdit(true)}
        onDelete={() => setConfirm(true)}
        extra={
          <Link to={`/locations/bookcase/${bookcase.id}`} className="text-xs text-brand hover:underline">
            {t("locations.viewMapLink")}
          </Link>
        }
      />
      {open && (
        <div className="space-y-2 border-t border-line px-4 py-3 pl-8">
          {sections.isLoading ? (
            <Skeleton className="h-8" />
          ) : (sections.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-ink-soft">{t("locations.noSections")}</p>
          ) : (
            sections.data!.map((s) => <SectionNode key={s.id} section={s} canEdit={canEdit} />)
          )}
          {canEdit && (
            <Button
              size="sm"
              variant="ghost"
              loading={create.isPending}
              onClick={async () => {
                await create.mutateAsync({
                  bookcase_id: bookcase.id,
                  section_index: sections.data?.length ?? 0,
                });
                toast.success(t("locations.sectionAdded"));
              }}
            >
              {t("locations.addSectionButton")}
            </Button>
          )}
        </div>
      )}

      {edit && (
        <EntityModal
          title={t("locations.editBookcaseTitle")}
          initial={{ name: bookcase.name, type: bookcase.type ?? "" }}
          fields={[{ name: "name", label: t("common.name"), required: true }, { name: "type", label: t("common.type") }]}
          submitting={update.isPending}
          onClose={() => setEdit(false)}
          onSubmit={async (v) => {
            await update.mutateAsync({ id: bookcase.id, body: { name: v.name, type: v.type || null } });
            toast.success(t("common.saved"));
            setEdit(false);
          }}
        />
      )}
      <ConfirmDialog
        open={confirm}
        title={t("locations.deleteBookcaseTitle")}
        message={t("locations.deleteBookcaseMessage")}
        destructive
        confirmLabel={t("common.delete")}
        loading={del.isPending}
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          try {
            await del.mutateAsync(bookcase.id);
            toast.success(t("locations.bookcaseDeleted"));
          } catch {
            toast.error(t("locations.deleteBookcaseFailed"));
          }
          setConfirm(false);
        }}
      />
    </div>
  );
}

// ---- Section ----
function SectionNode({
  section,
  canEdit,
}: {
  section: { id: string; section_index: number; label: string | null };
  canEdit: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const shelves = useShelves(open ? section.id : undefined);
  const create = useCreateShelf();
  const update = useUpdateSection();
  const del = useDeleteSection();
  const toast = useToast();

  return (
    <div className="rounded-md bg-paper/60 px-3 py-2">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-sm font-medium text-ink">
          {open ? "▾" : "▸"} {section.label ?? `${t("locations.sectionLabel")} ${section.section_index + 1}`}
        </button>
        {canEdit && (
          <div className="flex shrink-0 items-center gap-1">
            <IconButton label={t("locations.renameSectionButton")} onClick={() => setEdit(true)}>✎</IconButton>
            <IconButton label={t("locations.deleteSectionButton")} onClick={() => setConfirm(true)}>🗑</IconButton>
          </div>
        )}
      </div>
      {open && (
        <div className="mt-2 space-y-1 pl-5">
          {shelves.isLoading ? (
            <Skeleton className="h-6" />
          ) : (shelves.data?.length ?? 0) === 0 ? (
            <p className="text-xs text-ink-soft">{t("locations.noShelves")}</p>
          ) : (
            shelves.data!.map((sh) => <ShelfRow key={sh.id} shelf={sh} canEdit={canEdit} />)
          )}
          {canEdit && (
            <Button
              size="sm"
              variant="ghost"
              loading={create.isPending}
              onClick={async () => {
                await create.mutateAsync({ section_id: section.id, shelf_index: shelves.data?.length ?? 0 });
                toast.success(t("locations.shelfAdded"));
              }}
            >
              {t("locations.addShelfButton")}
            </Button>
          )}
        </div>
      )}

      {edit && (
        <EntityModal
          title={t("locations.renameSectionTitle")}
          initial={{ label: section.label ?? "" }}
          fields={[{ name: "label", label: t("locations.sectionName") }]}
          submitting={update.isPending}
          onClose={() => setEdit(false)}
          onSubmit={async (v) => {
            await update.mutateAsync({ id: section.id, body: { label: v.label || null } });
            toast.success(t("common.saved"));
            setEdit(false);
          }}
        />
      )}
      <ConfirmDialog
        open={confirm}
        title={t("locations.deleteSectionTitle")}
        message={t("locations.deleteSectionMessage")}
        destructive
        confirmLabel={t("common.delete")}
        loading={del.isPending}
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          try {
            await del.mutateAsync(section.id);
            toast.success(t("locations.sectionDeleted"));
          } catch {
            toast.error(t("locations.deleteSectionFailed"));
          }
          setConfirm(false);
        }}
      />
    </div>
  );
}

// ---- Shelf ----
function ShelfRow({
  shelf,
  canEdit,
}: {
  shelf: { id: string; shelf_index: number; notes: string | null };
  canEdit: boolean;
}) {
  const { t } = useTranslation();
  const [edit, setEdit] = useState(false);
  const update = useUpdateShelf();
  const del = useDeleteShelf();
  const toast = useToast();

  return (
    <div className="flex items-center justify-between gap-2 text-sm text-ink">
      <span className="min-w-0 truncate">
        {t("locations.shelfLabel")} {shelf.shelf_index + 1}
        {shelf.notes && <span className="text-ink-soft"> — {shelf.notes}</span>}
      </span>
      {canEdit && (
        <div className="flex shrink-0 items-center gap-1">
          <IconButton label={t("locations.renameShelfButton")} onClick={() => setEdit(true)}>✎</IconButton>
          <IconButton
            label={t("locations.deleteShelfButton")}
            loading={del.isPending}
            onClick={async () => {
              try {
                await del.mutateAsync(shelf.id);
                toast.success(t("locations.shelfDeleted"));
              } catch {
                toast.error(t("locations.deleteShelfFailed"));
              }
            }}
          >
            ✕
          </IconButton>
        </div>
      )}

      {edit && (
        <EntityModal
          title={t("locations.renameShelfTitle")}
          initial={{ notes: shelf.notes ?? "" }}
          fields={[{ name: "notes", label: t("locations.shelfNote") }]}
          submitting={update.isPending}
          onClose={() => setEdit(false)}
          onSubmit={async (v) => {
            await update.mutateAsync({ id: shelf.id, body: { notes: v.notes || null } });
            toast.success(t("common.saved"));
            setEdit(false);
          }}
        />
      )}
    </div>
  );
}

// ---- Shared row + entity modal ----
function Row({
  title,
  subtitle,
  open,
  onToggle,
  canEdit,
  onEdit,
  onDelete,
  extra,
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  canEdit: boolean;
  onEdit?: () => void;
  onDelete: () => void;
  extra?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-3">
      <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <span aria-hidden="true" className="text-ink-soft">{open ? "▾" : "▸"}</span>
        <span className="min-w-0">
          <span className="block truncate font-medium text-ink">{title}</span>
          {subtitle && <span className="block truncate text-sm text-ink-soft">{subtitle}</span>}
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-1">
        {extra}
        {canEdit && onEdit && (
          <IconButton label={t("common.edit")} onClick={onEdit}>✎</IconButton>
        )}
        {canEdit && (
          <IconButton label={t("common.delete")} onClick={onDelete}>🗑</IconButton>
        )}
      </div>
    </div>
  );
}

interface FieldDef {
  name: "name" | "description" | "type" | "label" | "notes";
  label: string;
  required?: boolean;
}

function EntityModal({
  title,
  fields,
  initial,
  submitting,
  onClose,
  onSubmit,
}: {
  title: string;
  fields: FieldDef[];
  initial?: Partial<Record<FieldDef["name"], string>>;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: Partial<Record<FieldDef["name"], string>>) => Promise<void>;
}) {
  const { t } = useTranslation();
  const { register, handleSubmit, formState } = useForm<Record<string, string>>({
    defaultValues: initial as Record<string, string>,
  });
  const toast = useToast();

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch {
      toast.error(t("common.defaultErrorMessage"));
    }
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button size="sm" loading={submitting} onClick={submit}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {fields.map((f) => (
          <Input
            key={f.name}
            label={f.label}
            error={f.required && formState.errors[f.name] ? `${f.label} ${t("validation.fieldRequired")}` : undefined}
            {...register(f.name, { required: f.required })}
          />
        ))}
      </div>
    </Modal>
  );
}
