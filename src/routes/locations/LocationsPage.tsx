import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/features/auth/store";
import { useBookViews } from "@/features/books/hooks";
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
import type { BookView, OwnedBook } from "@/types/api";

// Direct id equality is enough here: every placed book carries room_id,
// bookcase_id, section_id and shelf_id together (see PositionValidationService
// on the backend), so counting by any single field already reflects the
// whole subtree under that node.
function countByLocation(views: BookView[], key: keyof OwnedBook): Map<string, number> {
  const map = new Map<string, number>();
  for (const { book } of views) {
    const id = book[key];
    if (!id || typeof id !== "string") continue;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

// Builds the "N books here will lose their position" suffix appended to
// delete-confirmation messages — empty string when nothing is at stake.
function bookCountWarning(t: (key: string) => string, count: number): string {
  if (count === 0) return "";
  const label = count === 1 ? t("loans.bookLabel") : t("loans.booksLabel");
  return ` ${t("locations.deleteBooksWarningPrefix")} ${count} ${label} ${t("locations.deleteBooksWarningSuffix")}`;
}

// Builds a "/books?..." link that both filters (room is a real filter the
// Filtri panel understands; loc/locType/locName is the deeper-than-room
// filter) and carries the full breadcrumb for display on the books page.
function booksLink(opts: { room: string; loc: string; locType: string; locName: string }): string {
  const qs = new URLSearchParams({ room: opts.room, loc: opts.loc, locType: opts.locType, locName: opts.locName });
  return `/books?${qs.toString()}`;
}

// Plain text action link. "Mostra libri qui" stays brand-coloured (the
// primary action on a row); "Visualizza mappa" uses `muted` so the two don't
// read as one undifferentiated cluster when they sit side by side.
function ActionLink({ to, muted = false, children }: { to: string; muted?: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={`shrink-0 whitespace-nowrap text-xs hover:underline ${
        muted ? "text-ink-soft hover:text-ink" : "text-brand"
      }`}
    >
      {children}
    </Link>
  );
}

export function LocationsPage() {
  const { t } = useTranslation();
  const rooms = useRooms();
  const books = useBookViews();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === "admin" || role === "editor";
  const createRoom = useCreateRoom();
  const toast = useToast();
  const [roomModal, setRoomModal] = useState(false);

  const countsByRoom = useMemo(() => countByLocation(books.data, "room_id"), [books.data]);
  const countsByBookcase = useMemo(() => countByLocation(books.data, "bookcase_id"), [books.data]);
  const countsBySection = useMemo(() => countByLocation(books.data, "section_id"), [books.data]);
  const countsByShelf = useMemo(() => countByLocation(books.data, "shelf_id"), [books.data]);

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
            <RoomNode
              key={room.id}
              room={room}
              canEdit={canEdit}
              bookCount={countsByRoom.get(room.id) ?? 0}
              countsByBookcase={countsByBookcase}
              countsBySection={countsBySection}
              countsByShelf={countsByShelf}
            />
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
function RoomNode({
  room,
  canEdit,
  bookCount,
  countsByBookcase,
  countsBySection,
  countsByShelf,
}: {
  room: { id: string; name: string; description: string | null };
  canEdit: boolean;
  bookCount: number;
  countsByBookcase: Map<string, number>;
  countsBySection: Map<string, number>;
  countsByShelf: Map<string, number>;
}) {
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
        count={bookCount}
        open={open}
        onToggle={() => setOpen((o) => !o)}
        canEdit={canEdit}
        onEdit={() => setEdit(true)}
        onDelete={() => setConfirm(true)}
        extra={
          <ActionLink to={booksLink({ room: room.id, loc: room.id, locType: "room", locName: room.name })}>
            {t("locations.viewBooksLink")}
          </ActionLink>
        }
      />
      {open && (
        <div className="space-y-2 border-t border-line bg-paper/40 px-4 py-3 pl-8">
          {bookcases.isLoading ? (
            <Skeleton className="h-10" />
          ) : (bookcases.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-ink-soft">{t("locations.noBookcases")}</p>
          ) : (
            bookcases.data!.map((bc) => (
              <BookcaseNode
                key={bc.id}
                bookcase={bc}
                canEdit={canEdit}
                bookCount={countsByBookcase.get(bc.id) ?? 0}
                countsBySection={countsBySection}
                countsByShelf={countsByShelf}
                roomId={room.id}
                roomName={room.name}
              />
            ))
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
        message={`${t("locations.deleteRoomMessage")}${bookCountWarning(t, bookCount)}`}
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
  bookCount,
  countsBySection,
  countsByShelf,
  roomId,
  roomName,
}: {
  bookcase: { id: string; name: string; type: string | null };
  canEdit: boolean;
  bookCount: number;
  countsBySection: Map<string, number>;
  countsByShelf: Map<string, number>;
  roomId: string;
  roomName: string;
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

  async function onAddSections(count: number) {
    const startIndex = sections.data?.length ?? 0;
    try {
      for (let i = 0; i < count; i++) {
        await create.mutateAsync({ bookcase_id: bookcase.id, section_index: startIndex + i });
      }
      toast.success(t("locations.sectionAdded"));
    } catch {
      toast.error(t("common.defaultErrorMessage"));
    }
  }

  return (
    <div className="rounded-md border border-line bg-surface">
      <Row
        title={bookcase.name}
        subtitle={bookcase.type ?? undefined}
        count={bookCount}
        open={open}
        onToggle={() => setOpen((o) => !o)}
        canEdit={canEdit}
        onEdit={() => setEdit(true)}
        onDelete={() => setConfirm(true)}
        extra={
          <div className="flex items-center gap-2">
            <ActionLink
              to={booksLink({
                room: roomId,
                loc: bookcase.id,
                locType: "bookcase",
                locName: `${roomName} › ${bookcase.name}`,
              })}
            >
              {t("locations.viewBooksLink")}
            </ActionLink>
            <span aria-hidden="true" className="text-line">·</span>
            <ActionLink to={`/locations/bookcase/${bookcase.id}`} muted>
              {t("locations.viewMapLink")}
            </ActionLink>
          </div>
        }
      />
      {open && (
        <div className="space-y-2 border-t border-line px-4 py-3 pl-8">
          {sections.isLoading ? (
            <Skeleton className="h-8" />
          ) : (sections.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-ink-soft">{t("locations.noSections")}</p>
          ) : (
            sections.data!.map((s) => (
              <SectionNode
                key={s.id}
                section={s}
                canEdit={canEdit}
                bookCount={countsBySection.get(s.id) ?? 0}
                countsByShelf={countsByShelf}
                roomId={roomId}
                roomName={roomName}
                bookcaseName={bookcase.name}
              />
            ))
          )}
          {canEdit && (
            <BulkAddControl
              quantityLabel={t("locations.sectionCountLabel")}
              buttonLabel={t("locations.addSectionButton")}
              onAdd={onAddSections}
            />
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
        message={`${t("locations.deleteBookcaseMessage")}${bookCountWarning(t, bookCount)}`}
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
  bookCount,
  countsByShelf,
  roomId,
  roomName,
  bookcaseName,
}: {
  section: { id: string; section_index: number; label: string | null };
  canEdit: boolean;
  bookCount: number;
  countsByShelf: Map<string, number>;
  roomId: string;
  roomName: string;
  bookcaseName: string;
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

  const sectionName = section.label ?? `${t("locations.sectionLabel")} ${section.section_index + 1}`;

  async function onAddShelves(count: number) {
    const startIndex = shelves.data?.length ?? 0;
    try {
      for (let i = 0; i < count; i++) {
        await create.mutateAsync({ section_id: section.id, shelf_index: startIndex + i });
      }
      toast.success(t("locations.shelfAdded"));
    } catch {
      toast.error(t("common.defaultErrorMessage"));
    }
  }

  return (
    <div className="rounded-md bg-paper/60 px-3 py-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex min-w-0 items-center gap-2 text-left text-sm font-medium text-ink">
          <Icon name={open ? "expand_more" : "chevron_right"} className="shrink-0 text-[18px]" />
          <span className="truncate">{sectionName}</span>
          {bookCount > 0 && <Badge tone="bg-line text-ink-soft" className="shrink-0">{bookCount}</Badge>}
        </button>
        <div className="flex flex-wrap items-center gap-3 pl-5 sm:shrink-0 sm:pl-0">
          <ActionLink
            to={booksLink({
              room: roomId,
              loc: section.id,
              locType: "section",
              locName: `${roomName} › ${bookcaseName} › ${sectionName}`,
            })}
          >
            {t("locations.viewBooksLink")}
          </ActionLink>
          {canEdit && (
            <div className="flex shrink-0 items-center gap-1">
              <IconButton label={t("locations.renameSectionButton")} onClick={() => setEdit(true)}>
                <Icon name="edit" className="text-[18px]" />
              </IconButton>
              <IconButton label={t("locations.deleteSectionButton")} onClick={() => setConfirm(true)}>
                <Icon name="delete" className="text-[18px]" />
              </IconButton>
            </div>
          )}
        </div>
      </div>
      {open && (
        <div className="mt-2 space-y-1 pl-5">
          {shelves.isLoading ? (
            <Skeleton className="h-6" />
          ) : (shelves.data?.length ?? 0) === 0 ? (
            <p className="text-xs text-ink-soft">{t("locations.noShelves")}</p>
          ) : (
            shelves.data!.map((sh) => (
              <ShelfRow
                key={sh.id}
                shelf={sh}
                canEdit={canEdit}
                bookCount={countsByShelf.get(sh.id) ?? 0}
                roomId={roomId}
                roomName={roomName}
                bookcaseName={bookcaseName}
                sectionName={sectionName}
              />
            ))
          )}
          {canEdit && (
            <BulkAddControl
              quantityLabel={t("locations.shelfCountLabel")}
              buttonLabel={t("locations.addShelfButton")}
              onAdd={onAddShelves}
            />
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
        message={`${t("locations.deleteSectionMessage")}${bookCountWarning(t, bookCount)}`}
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
  bookCount,
  roomId,
  roomName,
  bookcaseName,
  sectionName,
}: {
  shelf: { id: string; shelf_index: number; notes: string | null };
  canEdit: boolean;
  bookCount: number;
  roomId: string;
  roomName: string;
  bookcaseName: string;
  sectionName: string;
}) {
  const { t } = useTranslation();
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const update = useUpdateShelf();
  const del = useDeleteShelf();
  const toast = useToast();

  const shelfName = `${t("locations.shelfLabel")} ${shelf.shelf_index + 1}`;

  return (
    <div className="flex flex-col gap-2 text-sm text-ink sm:flex-row sm:items-center sm:justify-between">
      <span className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 truncate">
          {shelfName}
          {shelf.notes && <span className="text-ink-soft"> — {shelf.notes}</span>}
        </span>
        {bookCount > 0 && <Badge tone="bg-line text-ink-soft" className="shrink-0">{bookCount}</Badge>}
      </span>
      <div className="flex flex-wrap items-center gap-3 pl-0 sm:shrink-0">
        <ActionLink
          to={booksLink({
            room: roomId,
            loc: shelf.id,
            locType: "shelf",
            locName: `${roomName} › ${bookcaseName} › ${sectionName} › ${shelfName}`,
          })}
        >
          {t("locations.viewBooksLink")}
        </ActionLink>
        {canEdit && (
          <div className="flex shrink-0 items-center gap-1">
            <IconButton label={t("locations.renameShelfButton")} onClick={() => setEdit(true)}>
              <Icon name="edit" className="text-[18px]" />
            </IconButton>
            <IconButton label={t("locations.deleteShelfButton")} onClick={() => setConfirm(true)}>
              <Icon name="delete" className="text-[18px]" />
            </IconButton>
          </div>
        )}
      </div>

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
      <ConfirmDialog
        open={confirm}
        title={t("locations.deleteShelfTitle")}
        message={`${t("locations.deleteShelfMessage")}${bookCountWarning(t, bookCount)}`}
        destructive
        confirmLabel={t("common.delete")}
        loading={del.isPending}
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          try {
            await del.mutateAsync(shelf.id);
            toast.success(t("locations.shelfDeleted"));
          } catch {
            toast.error(t("locations.deleteShelfFailed"));
          }
          setConfirm(false);
        }}
      />
    </div>
  );
}

// ---- Shared bulk-add control ----
function BulkAddControl({
  quantityLabel,
  buttonLabel,
  onAdd,
}: {
  quantityLabel: string;
  buttonLabel: string;
  onAdd: (count: number) => Promise<void>;
}) {
  const [count, setCount] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  async function handleClick() {
    setSubmitting(true);
    try {
      await onAdd(count);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={1}
        max={20}
        value={count}
        disabled={submitting}
        onChange={(e) => setCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
        aria-label={quantityLabel}
        className="h-9 w-14 rounded-md border border-line bg-paper px-2 text-center text-sm text-ink disabled:opacity-60"
      />
      <Button size="sm" variant="ghost" loading={submitting} onClick={() => void handleClick()}>
        {buttonLabel}
      </Button>
    </div>
  );
}

// ---- Shared row + entity modal ----
function Row({
  title,
  subtitle,
  count,
  open,
  onToggle,
  canEdit,
  onEdit,
  onDelete,
  extra,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  canEdit: boolean;
  onEdit?: () => void;
  onDelete: () => void;
  extra?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <button type="button" onClick={onToggle} className="flex min-w-0 items-center gap-2 text-left sm:flex-1">
        <Icon name={open ? "expand_more" : "chevron_right"} className="shrink-0 text-ink-soft text-[20px]" />
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="min-w-0 truncate font-medium text-ink">{title}</span>
            {Boolean(count) && <Badge tone="bg-line text-ink-soft" className="shrink-0">{count}</Badge>}
          </span>
          {subtitle && <span className="block truncate text-sm text-ink-soft">{subtitle}</span>}
        </span>
      </button>
      <div className="flex flex-wrap items-center gap-2 pl-6 sm:shrink-0 sm:pl-0">
        {extra}
        {canEdit && onEdit && (
          <IconButton label={t("common.edit")} onClick={onEdit}>
            <Icon name="edit" className="text-[18px]" />
          </IconButton>
        )}
        {canEdit && (
          <IconButton label={t("common.delete")} onClick={onDelete}>
            <Icon name="delete" className="text-[18px]" />
          </IconButton>
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
