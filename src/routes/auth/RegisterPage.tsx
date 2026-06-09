import { zodResolver } from "@hookform/resolvers/zod";
import { HTTPError } from "ky";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate } from "react-router-dom";
import { z } from "zod";

import { AuthLayout } from "@/routes/auth/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useRegister } from "@/features/auth/hooks";
import { useAuthStore } from "@/features/auth/store";

const schema = z.object({
  family_name: z.string().min(1, "Family name is required"),
  admin_full_name: z.string().min(1, "Your name is required"),
  admin_email: z.string().email("Enter a valid email"),
  admin_password: z.string().min(8, "At least 8 characters"),
});
type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const status = useAuthStore((s) => s.status);
  const registerFamily = useRegister();
  const [formError, setFormError] = useState<string | null>(null);
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
        setFormError("That email is already registered.");
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    }
  });

  return (
    <AuthLayout
      title="Create your family"
      subtitle="Set up your library and admin account."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          label="Family name"
          placeholder="The Smith Family"
          error={formState.errors.family_name?.message}
          {...register("family_name")}
        />
        <Input
          label="Your name"
          autoComplete="name"
          error={formState.errors.admin_full_name?.message}
          {...register("admin_full_name")}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          error={formState.errors.admin_email?.message}
          {...register("admin_email")}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters"
          error={formState.errors.admin_password?.message}
          {...register("admin_password")}
        />
        {formError && <p className="text-sm text-danger">{formError}</p>}
        <Button type="submit" loading={registerFamily.isPending} className="w-full">
          Create family
        </Button>
      </form>
    </AuthLayout>
  );
}
