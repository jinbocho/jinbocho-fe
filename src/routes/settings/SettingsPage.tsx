import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { ExportMenu } from "@/components/books/ExportMenu";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { useLogout } from "@/features/auth/hooks";
import { useAuthStore } from "@/features/auth/store";
import { useFamily, useUpdateFamily } from "@/features/family/hooks";
import { type ThemePref, useThemeStore } from "@/features/theme/store";
import { useCurrentUser, useUpdateUser } from "@/features/users/hooks";

export function SettingsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const logout = useLogout();

  return (
    <>
      <PageHeader title="Settings" />
      <div className="space-y-6">
        <FamilySection canEdit={role === "admin"} />
        <ProfileSection />
        <AppearanceSection />
        <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h2 className="font-display text-lg font-semibold">Export library</h2>
            <p className="text-sm text-ink-soft">Download your full catalog.</p>
          </div>
          <ExportMenu />
        </Card>
        <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h2 className="font-display text-lg font-semibold">Sign out</h2>
            <p className="text-sm text-ink-soft">End your session on this device.</p>
          </div>
          <Button variant="secondary" onClick={() => logout.mutate()}>
            Log out
          </Button>
        </Card>
      </div>
    </>
  );
}

const THEME_OPTIONS: { value: ThemePref; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "☀️" },
  { value: "dark", label: "Dark", icon: "🌙" },
  { value: "system", label: "System", icon: "🖥️" },
];

function AppearanceSection() {
  const pref = useThemeStore((s) => s.pref);
  const setPref = useThemeStore((s) => s.setPref);

  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold">Appearance</h2>
      <p className="mb-3 text-sm text-ink-soft">Choose a light or dark theme.</p>
      <div className="inline-flex rounded-md border border-line bg-paper p-1">
        {THEME_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setPref(o.value)}
            aria-pressed={pref === o.value}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              pref === o.value ? "bg-surface text-ink shadow-card" : "text-ink-soft hover:text-ink"
            }`}
          >
            <span aria-hidden="true">{o.icon}</span>
            {o.label}
          </button>
        ))}
      </div>
    </Card>
  );
}

function FamilySection({ canEdit }: { canEdit: boolean }) {
  const family = useFamily();
  const update = useUpdateFamily();
  const toast = useToast();
  const { register, handleSubmit, reset } = useForm<{ name: string; description: string }>();

  useEffect(() => {
    if (family.data) reset({ name: family.data.name, description: family.data.description ?? "" });
  }, [family.data, reset]);

  const submit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync({ name: values.name, description: values.description || undefined });
      toast.success("Family updated.");
    } catch {
      toast.error("Couldn't save.");
    }
  });

  return (
    <Card className="p-5">
      <h2 className="mb-4 font-display text-lg font-semibold">Family</h2>
      {family.isLoading ? (
        <Skeleton className="h-24" />
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <Input label="Family name" disabled={!canEdit} {...register("name")} />
          <Textarea label="Description" disabled={!canEdit} {...register("description")} />
          {canEdit && (
            <Button type="submit" size="sm" loading={update.isPending}>
              Save
            </Button>
          )}
          {!canEdit && <p className="text-xs text-ink-soft">Only admins can edit family details.</p>}
        </form>
      )}
    </Card>
  );
}

function ProfileSection() {
  const me = useCurrentUser();
  const update = useUpdateUser();
  const toast = useToast();
  const { register, handleSubmit, reset } = useForm<{ full_name: string }>();

  useEffect(() => {
    if (me.data) reset({ full_name: me.data.full_name });
  }, [me.data, reset]);

  const submit = handleSubmit(async (values) => {
    if (!me.data) return;
    try {
      await update.mutateAsync({ id: me.data.id, body: { full_name: values.full_name } });
      toast.success("Profile updated.");
    } catch {
      toast.error("Couldn't save.");
    }
  });

  return (
    <Card className="p-5">
      <h2 className="mb-4 font-display text-lg font-semibold">Your profile</h2>
      {me.isLoading ? (
        <Skeleton className="h-20" />
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <Input label="Full name" {...register("full_name")} />
          <Input label="Email" value={me.data?.email ?? ""} disabled readOnly />
          <Button type="submit" size="sm" loading={update.isPending}>
            Save
          </Button>
        </form>
      )}
    </Card>
  );
}
