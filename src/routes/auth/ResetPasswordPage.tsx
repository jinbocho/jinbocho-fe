import { zodResolver } from "@hookform/resolvers/zod";
import { HTTPError } from "ky";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { AuthLayout } from "@/routes/auth/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useResetPassword } from "@/features/auth/hooks";

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const isInvite = searchParams.get("mode") === "invite";
  const resetPassword = useResetPassword();
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z
        .object({
          new_password: z.string().min(8, t("auth.resetPassword.passwordHint")),
          confirm_password: z.string().min(1, t("validation.confirmPasswordRequired")),
        })
        .refine((v) => v.new_password === v.confirm_password, {
          message: t("validation.passwordsMismatch"),
          path: ["confirm_password"],
        }),
    [t],
  );
  type FormValues = z.infer<typeof schema>;

  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await resetPassword.mutateAsync({ token, new_password: values.new_password });
      setDone(true);
    } catch (err) {
      if (err instanceof HTTPError && err.response.status === 400) {
        const body = await err.response.json().catch(() => ({})) as { detail?: string };
        setFormError(body.detail ?? t("auth.resetPassword.invalidLink"));
      } else {
        setFormError(t("common.somethingWentWrong"));
      }
    }
  });

  if (!token) {
    return (
      <AuthLayout
        title={t("auth.resetPassword.title")}
        subtitle=""
        footer={
          <Link to="/login" className="font-medium text-brand hover:underline">
            {t("auth.resetPassword.backToSignIn")}
          </Link>
        }
      >
        <p className="text-sm text-danger">{t("auth.resetPassword.invalidLink")}</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={isInvite ? t("auth.resetPassword.welcomeTitle") : t("auth.resetPassword.setNewTitle")}
      subtitle={isInvite ? t("auth.resetPassword.welcomeSubtitle") : t("auth.resetPassword.subtitle")}
      footer={
        <Link to="/login" className="font-medium text-brand hover:underline">
          {t("auth.resetPassword.backToSignIn")}
        </Link>
      }
    >
      {done ? (
        <div className="space-y-3">
          <p className="text-sm text-ink">{t("auth.resetPassword.success")}</p>
          <Link to="/login">
            <Button className="w-full">{t("auth.resetPassword.signInButton")}</Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Input
            label={t("auth.resetPassword.newPassword")}
            type="password"
            autoComplete="new-password"
            hint={t("auth.resetPassword.passwordHint")}
            error={formState.errors.new_password?.message}
            {...register("new_password")}
          />
          <Input
            label={t("auth.resetPassword.confirmPassword")}
            type="password"
            autoComplete="new-password"
            error={formState.errors.confirm_password?.message}
            {...register("confirm_password")}
          />
          {formError && <p className="text-sm text-danger">{formError}</p>}
          <Button type="submit" loading={resetPassword.isPending} className="w-full">
            {t("auth.resetPassword.updateButton")}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
