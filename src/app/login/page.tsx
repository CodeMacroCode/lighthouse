"use client";

/* Hallmark · v2.0.0 · theme: Where Knowledge Comes Alive · genre: editorial · depth: full */
/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 · editorial split-card with pointillist landscape window */

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
import { Eye, EyeOff } from "lucide-react";
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
    <div className="relative min-h-screen w-full flex items-center justify-center p-3 sm:p-6 lg:p-8 overflow-x-clip bg-brand-cream">
      {/* Fullscreen Impressionist Landscape Canvas with Soft Focus */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <Image
          src="/lighthouse-minimalist.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center scale-105 filter blur-lg contrast-[0.98] opacity-85"
        />
        <div className="absolute inset-0 bg-stone-900/10" />
      </div>

      {/* Floating Center Card Container */}
      <div className="relative z-10 w-full max-w-4xl mx-auto">
        <main className="w-full bg-white text-foreground rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
          {/* Left Column: Crisp Art Window */}
          <div className="relative min-h-[260px] md:min-h-[580px] w-full overflow-hidden bg-brand-cream">
            <Image
              src="/lighthouse-minimalist.jpg"
              alt="Where Knowledge Comes Alive minimalist graphic lighthouse"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover object-[center_bottom] md:object-[20%_bottom] scale-[1.01]"
            />
          </div>

          {/* Right Column: High-Contrast Editorial Sign-in Form */}
          <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-between space-y-6 bg-white">
            <div>
              {/* Header with Term Indicator (Back button removed) */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-brand-orange uppercase tracking-wide">
                  Staff &amp; Faculty Portal
                </span>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Sign in to
                </p>
                <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-serif font-bold text-foreground leading-[1.15] tracking-tight">
                  Where Knowledge Comes Alive
                </h1>
                <p className="text-xs text-muted-foreground pt-1">
                  Enter your operational credentials to access your administrative dashboard.
                </p>
              </div>

              {/* Form Component */}
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4 mt-6"
                >
                  {form.formState.errors.root && (
                    <div
                      role="alert"
                      aria-live="polite"
                      className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium flex items-center gap-2 animate-in fade-in"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-4 h-4 shrink-0 text-destructive"
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

                  {/* Username / Email Input */}
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-xs font-semibold text-foreground">
                          Username or Email
                        </FormLabel>
                        <FormControl>
                          <div className="bg-card rounded-xl px-3.5 py-1 border-2 border-border focus-within:border-brand-orange focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-orange/15 transition-colors duration-150 shadow-xs">
                            <Input
                              placeholder="e.g. name@lighthouse-learning.com"
                              autoComplete="username"
                              {...field}
                              className="h-10 bg-transparent border-0 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-0 placeholder:text-muted-foreground shadow-none p-0"
                              disabled={isLoading}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs text-destructive pt-0.5" />
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
                          <FormLabel className="text-xs font-semibold text-foreground">
                            Password
                          </FormLabel>
                        </div>
                        <FormControl>
                          <div className="bg-card rounded-xl px-3.5 py-1 border-2 border-border focus-within:border-brand-orange focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-orange/15 transition-colors duration-150 shadow-xs flex items-center justify-between">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your password"
                              autoComplete="current-password"
                              {...field}
                              className="h-10 bg-transparent border-0 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-0 placeholder:text-muted-foreground shadow-none p-0 pr-2"
                              disabled={isLoading}
                            />
                            <button
                              type="button"
                              aria-label={
                                showPassword ? "Hide password" : "Show password"
                              }
                              onClick={() => setShowPassword(!showPassword)}
                              className="text-muted-foreground hover:text-foreground active:opacity-75 p-1 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-orange shrink-0 cursor-pointer"
                            >
                              {showPassword ? (
                                <EyeOff className="w-4 h-4" aria-hidden="true" />
                              ) : (
                                <Eye className="w-4 h-4" aria-hidden="true" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs text-destructive pt-0.5" />
                      </FormItem>
                    )}
                  />

                  {/* Controls: Remember Me */}
                  <div className="flex items-center justify-between pt-0.5">
                    <FormField
                      control={form.control}
                      name="rememberMe"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="h-4 w-4 rounded-sm border-border data-[state=checked]:bg-brand-orange data-[state=checked]:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
                            />
                          </FormControl>
                          <FormLabel className="text-xs font-medium text-foreground/80 cursor-pointer select-none">
                            Keep me signed in for 30 days
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* High-Contrast Bold Submit Button */}
                  <button
                    type="submit"
                    className="w-full h-12 text-sm font-bold bg-brand-orange hover:bg-brand-orange-hover active:scale-[0.99] text-white rounded-xl transition-colors duration-150 mt-4 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-orange flex items-center justify-center whitespace-nowrap"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin motion-reduce:animate-none" />
                        <span>Signing in…</span>
                      </div>
                    ) : (
                      <span>Sign in</span>
                    )}
                  </button>
                </form>
              </Form>
            </div>

            {/* Bottom Institutional Brand Footer with High-Contrast Navy Pill */}
            <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="bg-brand-navy rounded-lg px-3 py-2 flex items-center shrink-0 shadow-xs">
                  <Image
                    src="/image.png"
                    alt="Lighthouse Learning"
                    width={120}
                    height={20}
                    className="h-5 w-auto object-contain"
                    priority
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-foreground leading-tight">
                    Lighthouse Learning
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-tight">
                    Where Knowledge Comes Alive
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>
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
