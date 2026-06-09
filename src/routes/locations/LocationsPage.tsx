import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";

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
  const rooms = useRooms();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === "admin" || role === "editor";
  const createRoom = useCreateRoom();
  const toast = useToast();
  const [roomModal, setRoomModal] = useState(false);

  return (
    <>
      <PageHeader
        title="Rooms & shelves"
        description="Organise where your books live."
        actions={
          canEdit && (
            <Button size="sm" onClick={() => setRoomModal(true)}>
              Add room
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
          title="No rooms yet"
          description="Add a room to start organising your shelves."
          action={canEdit && <Button onClick={() => setRoomModal(true)}>Add room</Button>}
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
          title="Add room"
          fields={[{ name: "name", label: "Name", required: true }, { name: "description", label: "Description" }]}
          submitting={createRoom.isPending}
          onClose={() => setRoomModal(false)}
          onSubmit={async (v) => {
            await createRoom.mutateAsync({ name: v.name!, description: v.description || null });
            toast.success("Room added.");
            setRoomModal(false);
          }}
        />
      )}
    </>
  );
}

// ---- Room ----
function RoomNode({ room, canEdit }: { room: { id: string; name: string; description: string | null }; canEdit: boolean }) {
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
            <p className="text-sm text-ink-soft">No bookcases yet.</p>
          ) : (
            bookcases.data!.map((bc) => <BookcaseNode key={bc.id} bookcase={bc} canEdit={canEdit} />)
          )}
          {canEdit && (
            <Button size="sm" variant="ghost" onClick={() => setAddOpen(true)}>
              + Add bookcase
            </Button>
          )}
        </div>
      )}

      {edit && (
        <EntityModal
          title="Edit room"
          initial={{ name: room.name, description: room.description ?? "" }}
          fields={[{ name: "name", label: "Name", required: true }, { name: "description", label: "Description" }]}
          submitting={update.isPending}
          onClose={() => setEdit(false)}
          onSubmit={async (v) => {
            await update.mutateAsync({ id: room.id, body: { name: v.name, description: v.description || null } });
            toast.success("Saved.");
            setEdit(false);
          }}
        />
      )}
      {addOpen && (
        <EntityModal
          title="Add bookcase"
          fields={[{ name: "name", label: "Name", required: true }, { name: "type", label: "Type (e.g. shelving)" }]}
          submitting={create.isPending}
          onClose={() => setAddOpen(false)}
          onSubmit={async (v) => {
            await create.mutateAsync({ room_id: room.id, name: v.name!, type: v.type || null });
            toast.success("Bookcase added.");
            setAddOpen(false);
          }}
        />
      )}
      <ConfirmDialog
        open={confirm}
        title="Delete room?"
        message="The room must be empty (no bookcases or books) first."
        destructive
        confirmLabel="Delete"
        loading={del.isPending}
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          try {
            await del.mutateAsync(room.id);
            toast.success("Room deleted.");
          } catch {
            toast.error("Couldn't delete — move or remove its contents first.");
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
            View map
          </Link>
        }
      />
      {open && (
        <div className="space-y-2 border-t border-line px-4 py-3 pl-8">
          {sections.isLoading ? (
            <Skeleton className="h-8" />
          ) : (sections.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-ink-soft">No sections yet.</p>
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
                toast.success("Section added.");
              }}
            >
              + Add section
            </Button>
          )}
        </div>
      )}

      {edit && (
        <EntityModal
          title="Edit bookcase"
          initial={{ name: bookcase.name, type: bookcase.type ?? "" }}
          fields={[{ name: "name", label: "Name", required: true }, { name: "type", label: "Type" }]}
          submitting={update.isPending}
          onClose={() => setEdit(false)}
          onSubmit={async (v) => {
            await update.mutateAsync({ id: bookcase.id, body: { name: v.name, type: v.type || null } });
            toast.success("Saved.");
            setEdit(false);
          }}
        />
      )}
      <ConfirmDialog
        open={confirm}
        title="Delete bookcase?"
        message="It must be empty first."
        destructive
        confirmLabel="Delete"
        loading={del.isPending}
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          try {
            await del.mutateAsync(bookcase.id);
            toast.success("Bookcase deleted.");
          } catch {
            toast.error("Couldn't delete — remove its contents first.");
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
          {open ? "▾" : "▸"} {section.label ?? `Section ${section.section_index + 1}`}
        </button>
        {canEdit && (
          <div className="flex shrink-0 items-center gap-1">
            <IconButton label="Rename section" onClick={() => setEdit(true)}>✎</IconButton>
            <IconButton label="Delete section" onClick={() => setConfirm(true)}>🗑</IconButton>
          </div>
        )}
      </div>
      {open && (
        <div className="mt-2 space-y-1 pl-5">
          {shelves.isLoading ? (
            <Skeleton className="h-6" />
          ) : (shelves.data?.length ?? 0) === 0 ? (
            <p className="text-xs text-ink-soft">No shelves yet.</p>
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
                toast.success("Shelf added.");
              }}
            >
              + Add shelf
            </Button>
          )}
        </div>
      )}

      {edit && (
        <EntityModal
          title="Rename section"
          initial={{ label: section.label ?? "" }}
          fields={[{ name: "label", label: "Section name" }]}
          submitting={update.isPending}
          onClose={() => setEdit(false)}
          onSubmit={async (v) => {
            await update.mutateAsync({ id: section.id, body: { label: v.label || null } });
            toast.success("Saved.");
            setEdit(false);
          }}
        />
      )}
      <ConfirmDialog
        open={confirm}
        title="Delete section?"
        message="It must be empty first."
        destructive
        confirmLabel="Delete"
        loading={del.isPending}
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          try {
            await del.mutateAsync(section.id);
            toast.success("Section deleted.");
          } catch {
            toast.error("Couldn't delete — remove its shelves first.");
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
  const [edit, setEdit] = useState(false);
  const update = useUpdateShelf();
  const del = useDeleteShelf();
  const toast = useToast();

  return (
    <div className="flex items-center justify-between gap-2 text-sm text-ink">
      <span className="min-w-0 truncate">
        Shelf {shelf.shelf_index + 1}
        {shelf.notes && <span className="text-ink-soft"> — {shelf.notes}</span>}
      </span>
      {canEdit && (
        <div className="flex shrink-0 items-center gap-1">
          <IconButton label="Rename shelf" onClick={() => setEdit(true)}>✎</IconButton>
          <IconButton
            label="Delete shelf"
            onClick={async () => {
              try {
                await del.mutateAsync(shelf.id);
                toast.success("Shelf deleted.");
              } catch {
                toast.error("Couldn't delete shelf.");
              }
            }}
          >
            ✕
          </IconButton>
        </div>
      )}

      {edit && (
        <EntityModal
          title="Rename shelf"
          initial={{ notes: shelf.notes ?? "" }}
          fields={[{ name: "notes", label: "Shelf note" }]}
          submitting={update.isPending}
          onClose={() => setEdit(false)}
          onSubmit={async (v) => {
            await update.mutateAsync({ id: shelf.id, body: { notes: v.notes || null } });
            toast.success("Saved.");
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
          <IconButton label="Edit" onClick={onEdit}>✎</IconButton>
        )}
        {canEdit && (
          <IconButton label="Delete" onClick={onDelete}>🗑</IconButton>
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
  const { register, handleSubmit, formState } = useForm<Record<string, string>>({
    defaultValues: initial as Record<string, string>,
  });
  const toast = useToast();

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch {
      toast.error("Something went wrong.");
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
            Cancel
          </Button>
          <Button size="sm" loading={submitting} onClick={submit}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {fields.map((f) => (
          <Input
            key={f.name}
            label={f.label}
            error={f.required && formState.errors[f.name] ? `${f.label} is required` : undefined}
            {...register(f.name, { required: f.required })}
          />
        ))}
      </div>
    </Modal>
  );
}
