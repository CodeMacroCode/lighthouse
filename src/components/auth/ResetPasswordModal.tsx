"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { resetPassword } from "@/services/userService";

interface ResetPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultUsername?: string;
  onSuccess?: (username: string) => void;
}

export function ResetPasswordModal({
  open,
  onOpenChange,
  defaultUsername = "",
  onSuccess,
}: ResetPasswordModalProps) {
  const [username, setUsername] = useState(defaultUsername);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync defaultUsername when dialog opens
  React.useEffect(() => {
    if (open) {
      if (defaultUsername) {
        setUsername(defaultUsername);
      }
      setNewPassword("");
      setConfirmPassword("");
      setErrorMessage(null);
      setSuccessMessage(null);
      setIsLoading(false);
    }
  }, [open, defaultUsername]);

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
      if (onSuccess) {
        onSuccess(trimmedUsername);
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Failed to reset password. Please check your username and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-100">
        <div className="bg-brand-navy px-6 py-4 flex items-center justify-between border-b border-white/10">
          <Image
            src="/image.png"
            alt="Lighthouse Learning"
            width={150}
            height={22}
            className="h-5.5 w-auto object-contain"
            priority
          />
          <span className="text-[10px] font-medium text-amber-300/90 tracking-wide uppercase bg-white/10 px-2 py-0.5 rounded border border-white/15">
            Security
          </span>
        </div>

        <div className="p-6 sm:p-8 pt-4 space-y-4">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">
              Reset Password
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Enter your registered username and create a new secure password.
            </DialogDescription>
          </DialogHeader>

        {successMessage ? (
          <div className="py-4 space-y-5 animate-in fade-in duration-200">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-emerald-900">Password Changed!</p>
                <p className="text-xs leading-relaxed text-emerald-700">
                  {successMessage}
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleClose}
              className="w-full h-11 bg-[#0F2557] hover:bg-[#0F2557]/90 text-white font-semibold rounded-lg shadow-sm"
            >
              Back to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {errorMessage && (
              <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2.5 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="flex-1">{errorMessage}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="reset-username" className="text-xs font-semibold text-slate-700">
                Username <span className="text-red-500">*</span>
              </Label>
              <Input
                id="reset-username"
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
              <Label htmlFor="reset-newPassword" className="text-xs font-semibold text-slate-700">
                New Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="reset-newPassword"
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
              <Label htmlFor="reset-confirmPassword" className="text-xs font-semibold text-slate-700">
                Confirm New Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="reset-confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter new password"
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

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                className="h-10 px-4 text-xs font-semibold text-slate-600"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="h-10 px-5 text-xs font-semibold bg-[#0F2557] hover:bg-[#0F2557]/90 text-white shadow-sm"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Resetting...</span>
                  </div>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </div>
          </form>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
