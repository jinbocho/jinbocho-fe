import { zodResolver } from "@hookform/resolvers/zod";
import { HTTPError } from "ky";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation } from "react-router-dom";
import { z } from "zod";

import { AuthLayout } from "@/routes/auth/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useLogin } from "@/features/auth/hooks";
import { useAuthStore } from "@/features/auth/store";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const status = useAuthStore((s) => s.status);
  const login = useLogin();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
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
        setFormError("Invalid email or password.");
      } else if (err instanceof HTTPError && err.response.status === 403) {
        setFormError("This account is inactive.");
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    }
  });

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Welcome back."
      footer={
        <>
          No account?{" "}
          <Link to="/register" className="font-medium text-brand hover:underline">
            Register a family
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          error={formState.errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          error={formState.errors.password?.message}
          {...register("password")}
        />
        {formError && <p className="text-sm text-danger">{formError}</p>}
        <Button type="submit" loading={login.isPending} className="w-full">
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
