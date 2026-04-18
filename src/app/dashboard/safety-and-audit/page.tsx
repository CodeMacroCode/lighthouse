"use client";

import React from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { auditService } from "@/services/api/auditService";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { Loader2, ClipboardCheck } from "lucide-react";

export default function SafetyAndAuditPage() {
    const { decodedToken: user } = useAuthStore();

    const mutation = useMutation({
        mutationFn: () => auditService.createAudit({
            schoolId: user?.schoolId,
        }),
        onSuccess: () => {
            toast.success("Audit started successfully!");
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || "Failed to start audit. Please try again.");
        },
    });

    return (
        <main>
            <Button
                size="lg"
                className="bg-[#0c235c] hover:bg-[#0c235c]/90 text-white font-semibold py-6 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
            >
                {mutation.isPending ? (
                    <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Initializing...
                    </>
                ) : (
                    "Start New Audit"
                )}
            </Button>
        </main>
    );
}