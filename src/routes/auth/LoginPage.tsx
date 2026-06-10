import { zodResolver } from "@hookform/resolvers/zod";
import { HTTPError } from "ky";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { AuthLayout } from "@/routes/auth/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useLogin } from "@/features/auth/hooks";
import { useAuthStore } from "@/features/auth/store";

export function LoginPage() {
  const { t } = useTranslation();
  const status = useAuthStore((s) => s.status);
  const login = useLogin();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t("validation.invalidEmail")),
        password: z.string().min(1, t("validation.passwordRequired")),
      }),
    [t],
  );
  type FormValues = z.infer<typeof schema>;

  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  if (status === "authenticated") {
    const from = (location.state as { from?: Location } | null)?.from?.pathname ?? "/";
    return <Navigate to={from} replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login.mutateAsync(values);
    } catch (err) {
      if (err instanceof HTTPError && err.response.status === 401) {
        setFormError(t("auth.login.invalidCredentials"));
      } else if (err instanceof HTTPError && err.response.status === 403) {
        setFormError(t("auth.login.inactiveAccount"));
      } else {
        setFormError(t("common.somethingWentWrong"));
      }
    }
  });

  return (
    <AuthLayout
      title={t("auth.login.title")}
      subtitle={t("auth.login.subtitle")}
      footer={
        <>
          <Link to="/forgot-password" className="font-medium text-brand hover:underline">
            {t("auth.login.forgotPassword")}
          </Link>
          {" · "}
          {t("auth.login.noAccount")}{" "}
          <Link to="/register" className="font-medium text-brand hover:underline">
            {t("auth.login.registerLink")}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          label={t("common.email")}
          type="email"
          autoComplete="email"
          error={formState.errors.email?.message}
          {...register("email")}
        />
        <Input
          label={t("common.password")}
          type="password"
          autoComplete="current-password"
          error={formState.errors.password?.message}
          {...register("password")}
        />
        {formError && <p className="text-sm text-danger">{formError}</p>}
        <Button type="submit" loading={login.isPending} className="w-full">
          {t("auth.login.title")}
        </Button>
      </form>
    </AuthLayout>
  );
}
