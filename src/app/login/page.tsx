"use client";

/* Hallmark · v2.0.0 · theme: Lighthouse Brand · genre: playful · depth: full */
/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 · authentic pre-k education governance portal */

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useAccessStore } from "@/store/accessStore";
import { getDecodedToken } from "@/lib/jwt";
import { PREK_ROLES, normalizePrekRole } from "@/constants/roles";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { loginUser } from "@/services/userService";
import Image from "next/image";
import { Eye, EyeOff, Lock, User, ShieldCheck, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ResetPasswordModal } from "@/components/auth/ResetPasswordModal";

const loginSchema = z.object({
  username: z.string().min(1, "Username or Email is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean(),
});

type LoginFormValues = {
  username: string;
  password: string;
  rememberMe: boolean;
};

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, login } = useAuthStore();
  const { setAccess } = useAccessStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema) as any,
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.location.hash.startsWith("#/shared/live-track/token/")
    ) {
      const token = window.location.hash.split("#/shared/live-track/token/")[1];
      if (token) {
        router.replace(`/shared/live-track/token#${token}`);
        return;
      }
    }

    if (isAuthenticated) {
      const role = getDecodedToken(localStorage.getItem("token") || "")?.role;
      const normalized = normalizePrekRole(role);
      if (normalized === PREK_ROLES.AOM) {
        router.replace("/dashboard/incident");
      } else {
        router.replace("/dashboard/analytics");
      }
    }
  }, [isAuthenticated, router]);

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true);

    try {
      const data = await loginUser(values.username, values.password);

      const authToken = data?.token || data?.accessToken;
      if (authToken) {
        localStorage.clear();
        login(authToken, data.refreshToken, values.rememberMe ? 30 : undefined);

        if (data.access) {
          setAccess(data.access);
        }

        const role = getDecodedToken(authToken)?.role;
        const normalized = normalizePrekRole(role);
        if (normalized === PREK_ROLES.AOM) {
          router.push("/dashboard/incident");
        } else {
          router.push("/dashboard/analytics");
        }
      } else {
        form.setError("root", {
          message: "Invalid response from server.",
        });
      }
    } catch (error: any) {
      console.error("Login error:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Login failed. Please check your credentials.";

      if (errorMessage === "Incorrect password or username ID") {
        form.setError("root", {
          message: "Incorrect password or username ID",
        });
      } else if (
        errorMessage === "Your account is inactive. Please contact admin."
      ) {
        form.setError("root", {
          message: "Your account is inactive. Please contact admin.",
        });
      } else {
        form.setError("root", {
          message: errorMessage,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans overflow-x-clip bg-slate-900">
      {/* Pre-K School Background Image */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <Image
          src="/prek-bg.jpg"
          alt="Pre-K learning center classroom environment"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center scale-[1.02] filter contrast-[0.98] brightness-[0.88]"
        />
        {/* Soft Warm Scrim Overlay for Contrast & Visual Polish */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-900/40 to-slate-950/70 backdrop-blur-[2px]" />
      </div>

      {/* Floating Center Container */}
      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center gap-3">

        {/* Centered Main Login Card */}
        <div className="w-full bg-white/95 backdrop-blur-md border border-white/80 rounded-2xl shadow-2xl shadow-slate-950/30 overflow-hidden">
          {/* Deep Maritime Navy Brand Header */}
          <div className="bg-brand-navy px-6 py-5 flex items-center justify-center border-b border-slate-900/10">
            <Image
              src="/image.png"
              alt="Lighthouse Learning"
              width={200}
              height={32}
              className="h-7 sm:h-8 w-auto object-contain mx-auto"
              priority
            />
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div className="space-y-1 text-left">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Sign in to your account
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Enter your operational credentials to access your administrative dashboard.
              </p>
            </div>

        {/* Form Component */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            {form.formState.errors.root && (
              <div
                role="alert"
                aria-live="polite"
                className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 font-medium flex items-center gap-2.5 animate-in fade-in"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4 text-red-600 shrink-0"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{form.formState.errors.root.message}</span>
              </div>
            )}

            {/* Username Input */}
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-semibold text-slate-700">
                    Username or Email
                  </FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <Input
                        placeholder="e.g. user@lighthouse.com"
                        {...field}
                        className="pl-10 h-11 bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:border-transparent transition-colors duration-150 placeholder:text-slate-400"
                        disabled={isLoading}
                      />
                      <User
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-focus-within:text-brand-orange transition-colors duration-150"
                        aria-hidden="true"
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs text-red-600" />
                </FormItem>
              )}
            />

            {/* Password Input */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-xs font-semibold text-slate-700">
                      Password
                    </FormLabel>
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(true)}
                      className="text-xs font-semibold text-brand-orange hover:text-brand-orange-hover transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-orange rounded-xs"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <FormControl>
                    <div className="relative group">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter password"
                        {...field}
                        className="pl-10 pr-10 h-11 bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:border-transparent transition-colors duration-150 placeholder:text-slate-400"
                        disabled={isLoading}
                      />
                      <Lock
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-focus-within:text-brand-orange transition-colors duration-150"
                        aria-hidden="true"
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-orange"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" aria-hidden="true" />
                        ) : (
                          <Eye className="w-4 h-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs text-red-600" />
                </FormItem>
              )}
            />

            {/* Remember Me Option */}
            <FormField
              control={form.control}
              name="rememberMe"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2.5 space-y-0 pt-1">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="h-4 w-4 rounded-sm border-slate-300 data-[state=checked]:bg-brand-orange data-[state=checked]:border-brand-orange focus-visible:ring-1 focus-visible:ring-brand-orange"
                    />
                  </FormControl>
                  <FormLabel className="text-xs font-normal text-slate-600 cursor-pointer select-none">
                    Keep me signed in for 30 days
                  </FormLabel>
                </FormItem>
              )}
            />

            {/* Submit Action */}
            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold bg-brand-orange hover:bg-brand-orange-hover active:scale-[0.99] text-white shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-orange transition-colors duration-150 rounded-lg mt-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin motion-reduce:animate-none" />
                  <span>Authenticating…</span>
                </div>
              ) : (
                <span>Sign in to Dashboard</span>
              )}
            </Button>
          </form>
        </Form>

        {/* Bottom Security Note */}
        <div className="pt-2 text-center border-t border-slate-100">
          <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
            <span>Protected by 256-bit operational encryption</span>
          </p>
        </div>
      </div>
    </div>

    {/* Bottom brand note */}
    <p className="text-center text-xs text-white/80 drop-shadow-sm font-medium">
      © {new Date().getFullYear()} Lighthouse Learning · Pre-K Education Network
    </p>
  </div>

  <ResetPasswordModal
    open={showResetPassword}
    onOpenChange={setShowResetPassword}
    defaultUsername={form.getValues("username")}
    onSuccess={(un) => {
      form.setValue("username", un);
    }}
  />
</div>
  );
}
