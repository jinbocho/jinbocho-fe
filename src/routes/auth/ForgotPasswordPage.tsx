import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { AuthLayout } from "@/routes/auth/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useRequestPasswordReset } from "@/features/auth/hooks";

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const requestReset = useRequestPasswordReset();
  const [sent, setSent] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t("validation.invalidEmail")),
      }),
    [t],
  );
  type FormValues = z.infer<typeof schema>;

  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit(async (values) => {
    await requestReset.mutateAsync(values);
    setSent(true);
  });

  return (
    <AuthLayout
      title={t("auth.forgotPassword.title")}
      subtitle={t("auth.forgotPassword.subtitle")}
      footer={
        <Link to="/login" className="font-medium text-brand hover:underline">
          {t("auth.forgotPassword.backToSignIn")}
        </Link>
      }
    >
      {sent ? (
        <p className="text-sm text-ink">
          {t("auth.forgotPassword.checkEmail")}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Input
            label={t("common.email")}
            type="email"
            autoComplete="email"
            error={formState.errors.email?.message}
            {...register("email")}
          />
          <Button type="submit" loading={requestReset.isPending} className="w-full">
            {t("auth.forgotPassword.sendButton")}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
