import { useState } from "react";
import { useForm } from "react-hook-form";
import * as zod from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { api, errMsg } from "./../../../Api";

import {
  AuthShell,
  EyeIcon,
  EyeOffIcon,
  Field,
  LoadingOverlay,
  LockIcon,
  LoginIcon,
  MailIcon,
  inputClass,
  submitClass,
  toggleClass,
} from "../Auth/AuthParts";

interface loginData {
  email: string;
  password: string;
}

const schema = zod.object({
  email: zod
    .string()
    .min(1, "Email is required")
    .regex(/^\S+@\S+\.\S+$/, "Please enter a valid email address"),
  password: zod.string().min(1, "Password is required"),
});

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<loginData>({
    defaultValues: { email: "", password: "" },
    resolver: zodResolver(schema),
  });

  async function handleLogin(values: loginData) {
    try {
      const { data } = await api.post("/users/signin", values);
      const token = data?.data?.token ?? data?.token;
      if (token) localStorage.setItem("token", token);

      toast.success(data?.message || "Welcome back!");
      reset();
      navigate("/home");
    } catch (error) {
      toast.error(errMsg(error));
    }
  }

  return (
    <>
      {isSubmitting && <LoadingOverlay />}

      <AuthShell
        title="Login"
        icon={<LoginIcon />}
        footer={
          <>
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              className="font-semibold text-blue-400 transition-colors hover:text-blue-300 hover:underline"
            >
              Register
            </Link>
          </>
        }
      >
        <form
          onSubmit={handleSubmit(handleLogin, () =>
            toast.error("Please check your information and try again."),
          )}
          noValidate
          className="space-y-4"
        >
          <Field id="email" label="Email Address" icon={<MailIcon />} error={errors.email?.message}>
            <input
              {...register("email")}
              type="email"
              id="email"
              autoComplete="email"
              placeholder="name@company.com"
              className={inputClass(!!errors.email)}
            />
          </Field>

          <Field
            id="password"
            label="Password"
            icon={<LockIcon />}
            error={errors.password?.message}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className={toggleClass}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            }
          >
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              id="password"
              autoComplete="current-password"
              placeholder="Enter password"
              className={inputClass(!!errors.password, "pr-12")}
            />
          </Field>

          <button type="submit" disabled={isSubmitting} className={submitClass}>
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Logging in...
              </>
            ) : (
              "Login"
            )}
          </button>
        </form>
      </AuthShell>
    </>
  );
}