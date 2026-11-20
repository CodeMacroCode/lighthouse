"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { KeyRound, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { resetPassword } from "@/services/userService";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setErrorMessage("Please enter your username.");
      return;
    }

    if (!newPassword) {
      setErrorMessage("Please enter your new password.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await resetPassword(trimmedUsername, newPassword);
      setSuccessMessage(
        res?.message ||
          "Password reset successfully. You can now login with your new password."
      );
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Failed to reset password. Please check your username and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[#f1f5f9] p-4 sm:p-6 lg:p-8 font-sans">
      {/* Background Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/background.webp"
          alt="Background Pattern"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-blue-600/20 mix-blend-multiply" />
      </div>

      <div className="relative z-10 w-full max-w-[460px] animate-in fade-in duration-300">
        <Card className="border border-white/20 shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden bg-white/95 backdrop-blur-xl">
          <div className="bg-brand-navy px-6 py-4 flex items-center justify-between border-b border-white/10">
            <Image
              src="/image.png"
              alt="Lighthouse Learning"
              width={160}
              height={24}
              className="h-6 w-auto object-contain"
              priority
            />
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Login
            </Link>
          </div>

          <div className="px-6 sm:px-8 pt-6 pb-2 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl border border-amber-200/60 flex items-center justify-center text-amber-600 shadow-2xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                Reset Password
              </h1>
              <p className="text-xs text-slate-500">
                Self-Service Password Recovery
              </p>
            </div>
          </div>

          <CardContent className="p-6 sm:p-8">
            {successMessage ? (
              <div className="py-2 space-y-6 text-center animate-in fade-in duration-200">
                <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-lg font-bold text-slate-900">Password Changed!</h2>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-[340px] mx-auto">
                    {successMessage}
                  </p>
                </div>

                <Button
                  onClick={() => router.push("/login")}
                  className="w-full h-11 bg-[#0F2557] hover:bg-[#0F2557]/90 text-white font-semibold rounded-lg shadow-sm"
                >
                  Proceed to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMessage && (
                  <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2.5 animate-in fade-in duration-150">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span className="flex-1">{errorMessage}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-xs font-semibold text-slate-700">
                    Username <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="e.g. aom_bandra"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                    required
                    className="h-10 text-sm bg-slate-50/50 border-slate-200 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="newPassword" className="text-xs font-semibold text-slate-700">
                    New Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      className="h-10 pr-10 text-sm bg-slate-50/50 border-slate-200 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-700">
                    Confirm New Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      className="h-10 pr-10 text-sm bg-slate-50/50 border-slate-200 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-[#0F2557] hover:bg-[#0F2557]/90 text-white font-semibold rounded-lg shadow-sm mt-2"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Resetting...</span>
                    </div>
                  ) : (
                    "Reset Password"
                  )}
                </Button>

                <div className="text-center pt-2">
                  <Link
                    href="/login"
                    className="text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors"
                  >
                    Remembered password? Back to Login
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
