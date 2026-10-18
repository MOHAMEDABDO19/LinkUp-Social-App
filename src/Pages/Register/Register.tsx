import { useState } from "react";
import { useForm } from "react-hook-form";
import * as zod from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { api, errMsg } from "./../../../Api";
import {
  AddUserIcon,
  AuthShell,
  CalendarIcon,
  ChevronIcon,
  EyeIcon,
  EyeOffIcon,
  Field,
  LoadingOverlay,
  LockIcon,
  MailIcon,
  UserIcon,
  UsersIcon,
  inputClass,
  submitClass,
  toggleClass,
} from "../Auth/AuthParts";

interface userData {
  name: string;
  email: string;
  dateOfBirth: string;
  gender: "male" | "female" | "";
  password: string;
  rePassword: string;
}

const schema = zod
  .object({
    name: zod
      .string()
      .min(3, "Name must be at least 3 characters")
      .max(20, "Name cannot exceed 20 characters"),
    email: zod
      .string()
      .min(1, "Email is required")
      .regex(/^\S+@\S+\.\S+$/, "Please enter a valid email address"),
    dateOfBirth: zod
      .string()
      .min(1, "Date of birth is required")
      .refine((value) => {
        const birthYear = new Date(value).getUTCFullYear();
        return new Date().getUTCFullYear() - birthYear > 10;
      }, "Please enter a valid date of birth"),
    gender: zod
      .union([zod.enum(["male", "female"]), zod.literal("")])
      .refine((gender) => gender !== "", "Please select a gender"),
    password: zod
      .string()
      .min(1, "Password is required")
      .regex(
        /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,15}$/,
        "Password must be 6-15 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character",
      ),
    rePassword: zod.string().min(1, "Please re-enter your password"),
  })
  .refine((obj) => obj.password === obj.rePassword, {
    message: "Passwords do not match",
    path: ["rePassword"],
  });

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showRePassword, setShowRePassword] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<userData>({
    defaultValues: {
      name: "",
      email: "",
      dateOfBirth: "",
      gender: "",
      password: "",
      rePassword: "",
    },
    resolver: zodResolver(schema),
  });

  async function handleRegister(values: userData) {
    try {
      const { data } = await api.post("/users/signup", values);
      toast.success(data?.message || "Registration successful!");
      reset();
      navigate("/login");
    } catch (error) {
      toast.error(errMsg(error));
    }
  }

  const eyeToggle = (shown: boolean, flip: () => void) => (
    <button
      type="button"
      onClick={flip}
      aria-label={shown ? "Hide password" : "Show password"}
      className={toggleClass}
    >
      {shown ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  );

  return (
    <>
      {isSubmitting && <LoadingOverlay />}

      <AuthShell
        title="Register"
        icon={<AddUserIcon />}
        wide
        footer={
          <>
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-blue-400 transition-colors hover:text-blue-300 hover:underline"
            >
              Login
            </Link>
          </>
        }
      >
        <form
          onSubmit={handleSubmit(handleRegister, () =>
            toast.error("Please check your information and try again."),
          )}
          noValidate
          className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2"
        >
          <Field id="name" label="Full Name" icon={<UserIcon />} error={errors.name?.message}>
            <input
              {...register("name")}
              type="text"
              id="name"
              autoComplete="name"
              placeholder="Your name"
              className={inputClass(!!errors.name)}
            />
          </Field>

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
            id="dateOfBirth"
            label="Date of Birth"
            icon={<CalendarIcon />}
            error={errors.dateOfBirth?.message}
          >
            <input
              {...register("dateOfBirth")}
              type="date"
              id="dateOfBirth"
              autoComplete="bday"
              className={inputClass(!!errors.dateOfBirth, "pr-3 text-slate-300 [color-scheme:dark]")}
            />
          </Field>

          <Field
            id="gender"
            label="Gender"
            icon={<UsersIcon />}
            error={errors.gender?.message}
            trailing={
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                <ChevronIcon />
              </span>
            }
          >
            <select
              {...register("gender")}
              id="gender"
              className={inputClass(!!errors.gender, "pr-9 text-slate-300 appearance-none cursor-pointer")}
            >
              <option value="" disabled className="bg-slate-900">
                Select gender
              </option>
              <option value="male" className="bg-slate-900">
                Male
              </option>
              <option value="female" className="bg-slate-900">
                Female
              </option>
            </select>
          </Field>

          <Field
            id="password"
            label="Password"
            icon={<LockIcon />}
            error={errors.password?.message}
            trailing={eyeToggle(showPassword, () => setShowPassword((v) => !v))}
          >
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              id="password"
              autoComplete="new-password"
              placeholder="Enter password"
              className={inputClass(!!errors.password, "pr-12")}
            />
          </Field>

          <Field
            id="rePassword"
            label="Re-enter Password"
            icon={<LockIcon />}
            error={errors.rePassword?.message}
            trailing={eyeToggle(showRePassword, () => setShowRePassword((v) => !v))}
          >
            <input
              {...register("rePassword")}
              type={showRePassword ? "text" : "password"}
              id="rePassword"
              autoComplete="new-password"
              placeholder="Re-enter password"
              className={inputClass(!!errors.rePassword, "pr-12")}
            />
          </Field>

          <button type="submit" disabled={isSubmitting} className={`${submitClass} sm:col-span-2`}>
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Registering...
              </>
            ) : (
              "Register"
            )}
          </button>
        </form>
      </AuthShell>
    </>
  );
}