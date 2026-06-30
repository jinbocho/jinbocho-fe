import { useEffect, type ReactNode } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { ExportMenu } from "@/components/books/ExportMenu";
import { DeleteAccountDialog } from "@/components/settings/DeleteAccountDialog";
import { ImportBackupDialog } from "@/components/settings/ImportBackupDialog";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { Avatar } from "@/components/ui/Avatar";
import { useLogout } from "@/features/auth/hooks";
import { useAuthStore } from "@/features/auth/store";
import { useExportFullBackup } from "@/features/export/useExport";
import { type Lang, SUPPORTED_LANGS } from "@/features/i18n/config";
import { useLangStore } from "@/features/i18n/store";
import { useFamily, useUpdateFamily } from "@/features/family/hooks";
import { type ThemeName, type ThemePref, useThemeStore } from "@/features/theme/store";
import { useCurrentUser, useDeleteAvatar, useUpdateMe, useUploadAvatar } from "@/features/users/hooks";

export function SettingsPage() {
  const { t } = useTranslation();
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === "admin";
  const logout = useLogout();
  const toast = useToast();
  const fullBackup = useExportFullBackup();

  async function handleFullBackup() {
    try {
      await fullBackup.exportFullBackup();
    } catch {
      toast.error(t("settings.backup.exportFailed"));
    }
  }

  return (
    <>
      <PageHeader title={t("settings.title")} />
      <div className="space-y-8">
        <SettingsGroup label={t("settings.groups.account")}>
          <ProfileSection />
          <FamilySection canEdit={isAdmin} />
          <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <h2 className="font-display text-lg font-semibold">{t("settings.signOut.title")}</h2>
              <p className="text-sm text-ink-soft">{t("settings.signOut.description")}</p>
            </div>
            <Button variant="secondary" loading={logout.isPending} onClick={() => logout.mutate()}>
              {t("settings.signOut.button")}
            </Button>
          </Card>
        </SettingsGroup>

        <SettingsGroup label={t("settings.groups.preferences")}>
          <AppearanceSection />
          <LanguageSection />
        </SettingsGroup>

        <SettingsGroup label={t("settings.groups.data")}>
          <Card className="space-y-4 p-5">
            {isAdmin && (
              <>
                <div>
                  <h2 className="font-display text-lg font-semibold">{t("settings.backup.title")}</h2>
                  <p className="text-sm text-ink-soft">{t("settings.backup.description")}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button loading={fullBackup.isExporting} onClick={() => void handleFullBackup()}>
                    {t("settings.backup.exportButton")}
                  </Button>
                  <ImportBackupDialog />
                </div>
              </>
            )}
            <div className={`flex flex-wrap items-center justify-between gap-3 ${isAdmin ? "border-t border-line pt-4" : ""}`}>
              <div>
                <h3 className="font-medium text-ink">{t("settings.exportLibrary.title")}</h3>
                <p className="text-sm text-ink-soft">{t("settings.exportLibrary.description")}</p>
              </div>
              <ExportMenu />
            </div>
          </Card>
          {isAdmin && <DangerZoneSection />}
        </SettingsGroup>
      </div>
    </>
  );
}

function SettingsGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function DangerZoneSection() {
  const { t } = useTranslation();
  const family = useFamily();

  if (!family.data) return null;

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 border-danger/30 bg-danger/5 p-5">
      <div>
        <h2 className="font-display text-lg font-semibold text-danger">{t("settings.dangerZone.title")}</h2>
        <p className="text-sm text-ink-soft">{t("settings.dangerZone.description")}</p>
      </div>
      <DeleteAccountDialog family={family.data} />
    </Card>
  );
}

const THEME_NAME_OPTIONS: {
  value: ThemeName;
  labelKey: string;
  descKey: string;
  swatches: [string, string, string];
}[] = [
  {
    value: "pergamena",
    labelKey: "enums.themeName.pergamena",
    descKey: "enums.themeDesc.pergamena",
    swatches: ["rgb(246,241,232)", "rgb(168,90,56)", "rgb(110,142,88)"],
  },
  {
    value: "akabeni",
    labelKey: "enums.themeName.akabeni",
    descKey: "enums.themeDesc.akabeni",
    swatches: ["rgb(248,247,244)", "rgb(188,0,45)", "rgb(46,125,50)"],
  },
  {
    value: "sumi",
    labelKey: "enums.themeName.sumi",
    descKey: "enums.themeDesc.sumi",
    swatches: ["rgb(245,243,240)", "rgb(184,134,11)", "rgb(28,35,51)"],
  },
];

const MODE_OPTIONS: { value: ThemePref; labelKey: string; icon: ReactNode }[] = [
  { value: "light", labelKey: "enums.theme.light", icon: <Sun size={15} /> },
  { value: "dark", labelKey: "enums.theme.dark", icon: <Moon size={15} /> },
  { value: "system", labelKey: "enums.theme.system", icon: <Monitor size={15} /> },
];

function ThemeSwatch({ colors }: { colors: [string, string, string] }) {
  return (
    <span className="flex gap-0.5" aria-hidden="true">
      {colors.map((c, i) => (
        <span key={i} className="inline-block h-3 w-3 rounded-full border border-line/60" style={{ background: c }} />
      ))}
    </span>
  );
}

function AppearanceSection() {
  const { t } = useTranslation();
  const name = useThemeStore((s) => s.name);
  const setName = useThemeStore((s) => s.setName);
  const pref = useThemeStore((s) => s.pref);
  const setPref = useThemeStore((s) => s.setPref);
  const update = useUpdateMe();

  function handleSetName(value: string) {
    setName(value as Parameters<typeof setName>[0]);
    update.mutate({ theme_name: value as "pergamena" | "akabeni" | "sumi" });
  }

  function handleSetPref(value: string) {
    setPref(value as Parameters<typeof setPref>[0]);
    update.mutate({ theme_mode: value as "light" | "dark" | "system" });
  }

  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold">{t("settings.appearance.title")}</h2>
      <p className="mb-4 text-sm text-ink-soft">{t("settings.appearance.description")}</p>

      {/* Theme picker */}
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {t("settings.appearance.themeLabel")}
      </p>
      <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {THEME_NAME_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => handleSetName(o.value)}
            disabled={update.isPending}
            aria-pressed={name === o.value}
            className={`flex items-center gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-50 ${
              name === o.value
                ? "border-brand bg-brand/10 text-ink"
                : "border-line bg-surface text-ink-soft hover:border-brand/40 hover:text-ink"
            }`}
          >
            <ThemeSwatch colors={o.swatches} />
            <span>
              <span className="block font-medium leading-tight">{t(o.labelKey)}</span>
              <span className="block text-xs text-ink-soft">{t(o.descKey)}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Mode toggle */}
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {t("settings.appearance.modeLabel")}
      </p>
      <div className="inline-flex rounded-md border border-line bg-paper p-1">
        {MODE_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => handleSetPref(o.value)}
            disabled={update.isPending}
            aria-pressed={pref === o.value}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
              pref === o.value ? "bg-surface text-ink shadow-card" : "text-ink-soft hover:text-ink"
            }`}
          >
            <span aria-hidden="true">{o.icon}</span>
            {t(o.labelKey)}
          </button>
        ))}
      </div>
    </Card>
  );
}

const LANG_OPTIONS: { value: Lang; labelKey: string }[] = SUPPORTED_LANGS.map((l) => ({
  value: l,
  labelKey: `enums.lang.${l}`,
}));

function LanguageSection() {
  const { t } = useTranslation();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const update = useUpdateMe();

  const handleChange = (l: Lang) => {
    setLang(l);
    update.mutate({ language: l });
  };

  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold">{t("settings.language.title")}</h2>
      <p className="mb-3 text-sm text-ink-soft">{t("settings.language.description")}</p>
      <div className="inline-flex rounded-md border border-line bg-paper p-1">
        {LANG_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => handleChange(o.value)}
            disabled={update.isPending}
            aria-pressed={lang === o.value}
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
              lang === o.value ? "bg-surface text-ink shadow-card" : "text-ink-soft hover:text-ink"
            }`}
          >
            {t(o.labelKey)}
          </button>
        ))}
      </div>
    </Card>
  );
}

function FamilySection({ canEdit }: { canEdit: boolean }) {
  const { t } = useTranslation();
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
      toast.success(t("settings.family.updated"));
    } catch {
      toast.error(t("common.saveFailed"));
    }
  });

  return (
    <Card className="p-5">
      <h2 className="mb-4 font-display text-lg font-semibold">{t("settings.family.title")}</h2>
      {family.isLoading ? (
        <Skeleton className="h-24" />
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <Input label={t("common.familyName")} disabled={!canEdit} {...register("name")} />
          <Textarea label={t("common.description")} disabled={!canEdit} {...register("description")} />
          {canEdit && (
            <Button type="submit" size="sm" loading={update.isPending}>
              {t("common.save")}
            </Button>
          )}
          {!canEdit && <p className="text-xs text-ink-soft">{t("settings.family.adminOnly")}</p>}
        </form>
      )}
    </Card>
  );
}

function ProfileSection() {
  const { t } = useTranslation();
  const me = useCurrentUser();
  const update = useUpdateMe();
  const uploadAvatar = useUploadAvatar();
  const deleteAvatar = useDeleteAvatar();
  const toast = useToast();
  const setLang = useLangStore((s) => s.setLang);
  const { register, handleSubmit, reset } = useForm<{ full_name: string; annual_reading_goal: string }>();

  useEffect(() => {
    if (me.data) {
      reset({
        full_name: me.data.full_name,
        annual_reading_goal: me.data.annual_reading_goal?.toString() ?? "",
      });
      if (me.data.language) setLang(me.data.language);
    }
  }, [me.data, reset, setLang]);

  const submit = handleSubmit(async (values) => {
    if (!me.data) return;
    try {
      await update.mutateAsync({
        full_name: values.full_name,
        annual_reading_goal: values.annual_reading_goal ? Number(values.annual_reading_goal) : null,
      });
      toast.success(t("settings.profile.updated"));
    } catch {
      toast.error(t("common.saveFailed"));
    }
  });

  function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadAvatar.mutate(file, {
      onSuccess: () => toast.success(t("settings.profile.avatarUploaded")),
      onError: () => toast.error(t("common.saveFailed")),
    });
    e.target.value = "";
  }

  function handleAvatarDelete() {
    deleteAvatar.mutate(undefined, {
      onSuccess: () => toast.success(t("settings.profile.avatarRemoved")),
      onError: () => toast.error(t("common.saveFailed")),
    });
  }

  const avatarBusy = uploadAvatar.isPending || deleteAvatar.isPending;

  return (
    <Card className="p-5">
      <h2 className="mb-4 font-display text-lg font-semibold">{t("settings.profile.title")}</h2>
      {me.isLoading ? (
        <Skeleton className="h-20" />
      ) : (
        <>
          <div className="mb-5 flex items-center gap-4">
            <Avatar
              name={me.data?.full_name ?? ""}
              src={me.data?.avatar_url}
              className="h-16 w-16 text-xl"
            />
            <div className="flex flex-wrap gap-2">
              <label
                className={`cursor-pointer rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-paper ${avatarBusy ? "pointer-events-none opacity-50" : ""}`}
              >
                {uploadAvatar.isPending ? t("common.saving") : t("settings.profile.changeAvatar")}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={handleAvatarPick}
                  disabled={avatarBusy}
                />
              </label>
              {me.data?.avatar_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  loading={deleteAvatar.isPending}
                  onClick={handleAvatarDelete}
                  disabled={avatarBusy}
                >
                  {t("settings.profile.removeAvatar")}
                </Button>
              )}
            </div>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <Input label={t("common.fullName")} {...register("full_name")} />
            <Input label={t("common.email")} value={me.data?.email ?? ""} disabled readOnly />
            <Input
              label={t("settings.profile.annualReadingGoal")}
              type="number"
              min={1}
              hint={t("settings.profile.annualReadingGoalHint")}
              {...register("annual_reading_goal")}
            />
            <Button type="submit" size="sm" loading={update.isPending}>
              {t("common.save")}
            </Button>
          </form>
        </>
      )}
    </Card>
  );
}
