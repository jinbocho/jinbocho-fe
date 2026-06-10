import { zodResolver } from "@hookform/resolvers/zod";
import { HTTPError } from "ky";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { AuthLayout } from "@/routes/auth/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useRegister } from "@/features/auth/hooks";
import { useAuthStore } from "@/features/auth/store";

export function RegisterPage() {
  const { t } = useTranslation();
  const status = useAuthStore((s) => s.status);
  const registerFamily = useRegister();
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        family_name: z.string().min(1, t("validation.familyNameRequired")),
        admin_full_name: z.string().min(1, t("validation.yourNameRequired")),
        admin_email: z.string().email(t("validation.invalidEmail")),
        admin_password: z.string().min(8, t("auth.register.passwordHint")),
      }),
    [t],
  );
  type FormValues = z.infer<typeof schema>;

  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  if (status === "authenticated") return <Navigate to="/" replace />;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await registerFamily.mutateAsync(values);
    } catch (err) {
      if (err instanceof HTTPError && err.response.status === 409) {
        setFormError(t("auth.register.emailExists"));
      } else {
        setFormError(t("common.somethingWentWrong"));
      }
    }
  });

  return (
    <AuthLayout
      title={t("auth.register.title")}
      subtitle={t("auth.register.subtitle")}
      footer={
        <>
          {t("auth.register.haveAccount")}{" "}
          <Link to="/login" className="font-medium text-brand hover:underline">
            {t("auth.register.signInLink")}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          label={t("auth.register.familyName")}
          placeholder={t("auth.register.familyNamePlaceholder")}
          error={formState.errors.family_name?.message}
          {...register("family_name")}
        />
        <Input
          label={t("auth.register.yourName")}
          autoComplete="name"
          error={formState.errors.admin_full_name?.message}
          {...register("admin_full_name")}
        />
        <Input
          label={t("common.email")}
          type="email"
          autoComplete="email"
          error={formState.errors.admin_email?.message}
          {...register("admin_email")}
        />
        <Input
          label={t("common.password")}
          type="password"
          autoComplete="new-password"
          hint={t("auth.register.passwordHint")}
          error={formState.errors.admin_password?.message}
          {...register("admin_password")}
        />
        {formError && <p className="text-sm text-danger">{formError}</p>}
        <Button type="submit" loading={registerFamily.isPending} className="w-full">
          {t("auth.register.submitButton")}
        </Button>
      </form>
    </AuthLayout>
  );
}
