"use client";

import React, { useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { incidentService } from "@/services/api/incidentService";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronLeft,
  Loader2,
  Lock,
  ShieldAlert,
  Clock,
  CalendarIcon,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PREK_ROLES, normalizePrekRole } from "@/constants/roles";

const CATEGORIES = ["Hazard & Risk", "Incident", "Near Miss"];
const SEVERITY_OPTIONS = ["Low", "Medium", "High", "Critical"];

const INCIDENT_TYPES = [
  {
    name: "POCSO",
    defaultSeverity: "Critical",
    isMandatory: true,
    description:
      "MANDATORY CRITICAL (FR-5.2): Non-downgradable by any role.",
  },
  {
    name: "Corporal Punishment",
    defaultSeverity: "Critical",
    isMandatory: true,
    description:
      "MANDATORY CRITICAL (FR-5.2): Non-downgradable by any role.",
  },
  {
    name: "Unsubstantiated Claims",
    defaultSeverity: "High",
    isMandatory: false,
    description: "User-editable according to verified investigation.",
  },
  {
    name: "Accident",
    defaultSeverity: "Medium",
    isMandatory: false,
    description: "User-editable based on injury severity.",
  },
  {
    name: "Health Problem",
    defaultSeverity: "Medium",
    isMandatory: false,
    description: "User-editable based on medical attention required.",
  },
  {
    name: "Misconduct",
    defaultSeverity: "Medium",
    isMandatory: false,
    description: "User-editable based on nature of infraction.",
  },
  {
    name: "Other",
    defaultSeverity: "Medium",
    isMandatory: false,
    description: "User-editable.",
  },
  {
    name: "Behavioural Issue",
    defaultSeverity: "Low",
    isMandatory: false,
    description: "User-editable.",
  },
  {
    name: "Near Miss",
    defaultSeverity: "Low",
    isMandatory: false,
    description: "User-editable.",
  },
  {
    name: "Theft",
    defaultSeverity: "Low",
    isMandatory: false,
    description: "User-editable.",
  },
];

const SUB_CATEGORIES = INCIDENT_TYPES.map((t) => t.name);

const STAKEHOLDERS_OPTIONS = [
  "Academic Operation Manager",
  "Area Operations Manager (AOM)",
  "Business Manager (BM)",
  "Regional Safety Officer (RSO)",
  "National Head",
  "Central Team",
];

const getStakeholderForSeverity = (severity?: string): string => {
  if (!severity) return "";
  const key = severity.trim().toLowerCase();
  if (key === "low") return "Area Operations Manager (AOM)";
  if (key === "medium") return "Business Manager (BM)";
  if (key === "high") return "Regional Safety Officer (RSO)";
  if (key === "critical") return "Central Team";
  return "";
};

const STATUS_OPTIONS = ["Open", "Closed"];
const ESCALATION_OPTIONS = ["No", "Yes"];

const ESCALATION_MATRIX_DATA: Record<
  string,
  { owner: string; title: string; sla: string; action: string }
> = {
  Low: {
    owner: "AOM",
    title: "Area Operations Manager (AOM)",
    sla: "3 working days (72 hrs)",
    action:
      "Log case, investigate locally, resolve and close. Include in weekly summary to BM.",
  },
  Medium: {
    owner: "BM",
    title: "Business Manager (BM)",
    sla: "48 hours",
    action:
      "Review with AOM, agree corrective action, keep RSO informed via weekly rollup.",
  },
  High: {
    owner: "RSO",
    title: "Regional Safety Officer (RSO)",
    sla: "24 hours",
    action:
      "Lead investigation directly, initiate parent communication, notify National Head & Central.",
  },
  Critical: {
    owner: "Central",
    title: "Central (All-Activity Admin)",
    sla: "2 hours (immediate)",
    action:
      "RSO, National Head & Central notified simultaneously. Mandatory / statutory reporting triggered.",
  },
};

export default function NewIncidentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { decodedToken: user } = useAuthStore();
  const prekRole = normalizePrekRole(user?.role);
  const userRole = prekRole || user?.role?.toLowerCase();
  const isCentral =
    prekRole === PREK_ROLES.CENTRAL ||
    user?.role === "superAdmin" ||
    user?.role === "superadmin" ||
    user?.role === "central" ||
    user?.role === "Central" ||
    userRole === "central" ||
    userRole === "superadmin";

  const [errorModal, setErrorModal] = React.useState<{
    open: boolean;
    title: string;
    description: string;
  }>({
    open: false,
    title: "",
    description: "",
  });

  const incidentSchema = React.useMemo(
    () =>
      z
        .object({
          region: z.string().optional(),
          otherRegion: z.string().optional(),
          category: z.string().optional(),
          severity: z.string().min(1, "Severity is required"),
          incidentType: z.string().min(1, "Incident type is required"),
          otherIncidentType: z.string().optional(),
          subCategory: z.string().optional(),
          otherSubCategory: z.string().optional(),
          date: z.string().min(1, "Date of incident is required"),
          stakeholders: z.string().min(1, "Stakeholder is required"),
          briefDescription: z
            .string()
            .min(10, "Description must be at least 10 characters"),
          immediateActionTaken: z
            .string()
            .min(1, "Immediate action is required"),
          pendingAction: z.string().optional(),
          closureDate: z.string().optional(),
          status: z.string().min(1, "Status is required"),
          escalationStatus: z.string().optional(),
          escalatedTo: z.string().optional(),
          remarks: z.string().optional(),
          branchId: z.string().optional(),
          branchName: z.string().optional(),
        })
        .superRefine((data, ctx) => {
          if (
            (data.incidentType === "Other" ||
              data.incidentType === "Other:" ||
              data.subCategory === "Other" ||
              data.subCategory === "Other:") &&
            (!data.otherIncidentType && !data.otherSubCategory)
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Please specify the other incident type",
              path: ["otherIncidentType"],
            });
          }

          if (
            data.status === "Closed" &&
            (!data.remarks || !data.remarks.trim())
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Closing remarks are mandatory when status is Closed",
              path: ["remarks"],
            });
          }
        }),
    [userRole, prekRole],
  );

  const form = useForm<z.infer<typeof incidentSchema>>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      region: "",
      otherRegion: "",
      category: "Incident",
      severity: "",
      incidentType: "",
      otherIncidentType: "",
      subCategory: "",
      otherSubCategory: "",
      date: format(new Date(), "yyyy-MM-dd"),
      stakeholders: "",
      briefDescription: "",
      immediateActionTaken: "",
      pendingAction: "",
      closureDate: "",
      status: "Open",
      escalationStatus: "No",
      escalatedTo: "",
      remarks: "",
      branchId: user?.branchId || "",
      branchName: "",
    },
  });

  const selectedRegion = form.watch("region");
  const selectedIncidentType =
    form.watch("incidentType") || form.watch("subCategory");
  const selectedSeverity = form.watch("severity");
  const isMandatoryCritical =
    selectedIncidentType === "POCSO" ||
    selectedIncidentType === "Corporal Punishment";
  const currentEscalation = selectedSeverity
    ? ESCALATION_MATRIX_DATA[selectedSeverity] || ESCALATION_MATRIX_DATA["High"]
    : null;

  useEffect(() => {
    if (selectedSeverity) {
      const autoStakeholder = getStakeholderForSeverity(selectedSeverity);
      if (autoStakeholder) {
        form.setValue("stakeholders", autoStakeholder, {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    }
  }, [selectedSeverity, form]);

  const canCloseCurrentIncident = React.useMemo(() => {
    const sev = (selectedSeverity || "Low").toLowerCase();
    const normRole = normalizePrekRole(user?.role);
    const isUserAOM = normRole === PREK_ROLES.AOM || user?.role?.toLowerCase() === "aom";
    const isUserBM = normRole === PREK_ROLES.BM || user?.role?.toLowerCase() === "bm";
    const isUserRSO = normRole === PREK_ROLES.RSO || user?.role?.toLowerCase() === "rso";
    const isUserNH = normRole === PREK_ROLES.NATIONAL_HEAD;
    const isUserCentral = normRole === PREK_ROLES.CENTRAL || isCentral;

    if (isUserCentral) return true;
    if (sev === "critical") return false;
    if (sev === "high") return isUserRSO || isUserNH;
    if (sev === "medium") return isUserBM || isUserRSO || isUserNH;
    return true;
  }, [selectedSeverity, user?.role, isCentral]);

  useEffect(() => {
    if (!canCloseCurrentIncident && form.getValues("status") !== "Open") {
      form.setValue("status", "Open", { shouldValidate: true, shouldDirty: true });
    }
  }, [canCloseCurrentIncident, form]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      // Step 1: Wait for response from the POST incident API
      const res = await incidentService.addIncident(data);

      // Step 2: From that response, extract the person who created the incident and their role
      const incidentData = res?.data || res;
      const incidentId = incidentData?._id || res?._id || incidentData?.id;

      const reportedBy =
        incidentData?.reportedBy ||
        incidentData?.reporterName ||
        res?.reportedBy ||
        res?.reporterName ||
        incidentData?.history?.[0]?.changedBy ||
        (user as any)?.name ||
        (user as any)?.username ||
        "";

      const reporterRole =
        incidentData?.reporterRole ||
        res?.reporterRole ||
        incidentData?.history?.[0]?.userRole ||
        (user as any)?.role ||
        "";

      // Step 3: Check if the incident severity is allowed for the reporter's role (5-Tier Authority Matrix)
      const normalizedRole = normalizePrekRole(reporterRole);
      const sevKey = (incidentData?.severity || data.severity || "Low").toLowerCase();

      let isRoleAllowedForSeverity = false;
      if (sevKey === "critical") {
        isRoleAllowedForSeverity = normalizedRole === PREK_ROLES.CENTRAL;
      } else if (sevKey === "high") {
        isRoleAllowedForSeverity =
          normalizedRole === PREK_ROLES.RSO ||
          normalizedRole === PREK_ROLES.NATIONAL_HEAD ||
          normalizedRole === PREK_ROLES.CENTRAL;
      } else if (sevKey === "medium") {
        isRoleAllowedForSeverity =
          normalizedRole === PREK_ROLES.BM ||
          normalizedRole === PREK_ROLES.RSO ||
          normalizedRole === PREK_ROLES.NATIONAL_HEAD ||
          normalizedRole === PREK_ROLES.CENTRAL;
      } else {
        // Low severity is allowed for all tiers (AOM, BM, RSO, National Head, Central)
        isRoleAllowedForSeverity =
          normalizedRole === PREK_ROLES.AOM ||
          normalizedRole === PREK_ROLES.BM ||
          normalizedRole === PREK_ROLES.RSO ||
          normalizedRole === PREK_ROLES.NATIONAL_HEAD ||
          normalizedRole === PREK_ROLES.CENTRAL;
      }

      // Format as "reportedBy (reporterRole)" e.g. "Central Safety Admin (Central)"
      const escalatedToValue =
        reportedBy && reporterRole
          ? `${reportedBy} (${reporterRole})`
          : reportedBy || "";

      // Step 4: Add into the escalatedTo field via updateIncident API ONLY if role is authorized for this severity
      if (incidentId && escalatedToValue && isRoleAllowedForSeverity) {
        try {
          const desc =
            incidentData?.briefDescription ||
            incidentData?.description ||
            data.briefDescription ||
            data.description ||
            "Incident reported";

          const updatePayload: any = {
            status: incidentData?.status || data.status || "Open",
            briefDescription: desc,
            description: desc,
            immediateActionTaken:
              incidentData?.immediateActionTaken ||
              data.immediateActionTaken ||
              "",
            pendingAction:
              incidentData?.pendingAction || data.pendingAction || "",
            escalatedTo: escalatedToValue,
            escalationOwner: escalatedToValue,
            escalationStatus: "Yes",
          };

          if (data.region || incidentData?.region || incidentData?.zone) {
            updatePayload.region =
              data.region || incidentData?.region || incidentData?.zone;
          }
          if (data.branchId || incidentData?.branchId) {
            updatePayload.branchId = data.branchId || incidentData?.branchId;
          }
          const branchName =
            data.branchName ||
            incidentData?.branchName ||
            incidentData?.centreName ||
            incidentData?.schoolName;
          if (branchName) {
            updatePayload.branchName = branchName;
          }

          await incidentService.updateIncident(incidentId, updatePayload);
        } catch (updateErr) {
          console.error("Failed to automatically update escalatedTo with reporter:", updateErr);
        }
      }

      return res;
    },
    onSuccess: (res: any) => {
      const caseId = res?.data?.caseId || res?.caseId;
      toast.success(
        caseId
          ? `Incident reported successfully (${caseId})`
          : "Incident reported successfully",
      );
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      router.push("/dashboard/incident");
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message || "Failed to report incident";
      setErrorModal({
        open: true,
        title:
          msg.toLowerCase().includes("permission") ||
          msg.toLowerCase().includes("authorized") ||
          msg.toLowerCase().includes("denied")
            ? "Permission Denied"
            : "Action Failed",
        description: msg,
      });
    },
  });

  const onSubmit = (values: z.infer<typeof incidentSchema>) => {
    // Resolve region
    let finalRegion = values.region;
    if (finalRegion === "Other") {
      finalRegion = values.otherRegion;
    }
    if (!finalRegion) {
      finalRegion = (user as any)?.zone || (user as any)?.region || "East";
    }

    // Resolve incident type
    let finalIncidentType =
      values.incidentType || values.subCategory || "Accident";
    if (
      (finalIncidentType === "Other" || finalIncidentType === "Other:") &&
      (values.otherIncidentType || values.otherSubCategory)
    ) {
      finalIncidentType =
        values.otherIncidentType || values.otherSubCategory || "Other";
    }

    // Build canonical request payload matching specification:
    // POST /api/add-incident
    const payload: any = {
      region: finalRegion,
      category: values.category || "Incident",
      severity: values.severity,
      subCategory: finalIncidentType,
      incidentType: finalIncidentType,
      type: finalIncidentType,
      date: values.date || new Date().toISOString().slice(0, 10),
      incidentDate: values.date || new Date().toISOString().slice(0, 10),
      stakeholders: Array.isArray(values.stakeholders)
        ? values.stakeholders
        : [values.stakeholders],
      briefDescription: values.briefDescription,
      immediateActionTaken: values.immediateActionTaken,
      pendingAction: values.pendingAction || "",
      closureDate: values.status === "Closed" && !values.closureDate
        ? new Date().toISOString().slice(0, 10)
        : values.closureDate
        ? typeof values.closureDate === "string" && values.closureDate.includes("T")
          ? values.closureDate.split("T")[0]
          : values.closureDate
        : "",
      status: values.status || "Open",
      escalationStatus: values.escalatedTo ? "Yes" : (values.escalationStatus || "No"),
      escalatedTo: values.escalatedTo || "",
      remarks: values.remarks || "",
    };

    // Forward aliases supported by API contract:
    // "Body aliases like region for zone, subCategory for incidentType, and briefDescription for description are fully supported."
    payload.zone = finalRegion;
    payload.incidentType = finalIncidentType;
    payload.type = finalIncidentType;
    payload.description = values.briefDescription;

    // Optional school association if selected
    if (values.branchId) {
      payload.branchId = values.branchId;
      if (values.branchName) {
        payload.branchName = values.branchName;
      }
    }

    // Statutory Critical verification
    if (
      finalIncidentType === "POCSO" ||
      finalIncidentType === "Corporal Punishment"
    ) {
      payload.severity = "Critical";
    }

    // Route SLA & owner per escalation matrix
    const rule = ESCALATION_MATRIX_DATA[payload.severity || "Low"];
    if (rule) {
      payload.escalationOwner = rule.owner;
      payload.sla = rule.sla;
    }

    // Role-based incident closure authorization enforcement
    if (payload.status === "Closed") {
      const sev = (payload.severity || "Low").toLowerCase();
      const normRole = normalizePrekRole(user?.role);
      const isUserAOM = normRole === PREK_ROLES.AOM || user?.role?.toLowerCase() === "aom";
      const isUserBM = normRole === PREK_ROLES.BM || user?.role?.toLowerCase() === "bm";
      const isUserRSO = normRole === PREK_ROLES.RSO || user?.role?.toLowerCase() === "rso";
      const isUserNH = normRole === PREK_ROLES.NATIONAL_HEAD;

      if (isUserAOM && sev !== "low") {
        const targetOwner =
          sev === "medium"
            ? "Business Manager (BM)"
            : sev === "high"
            ? "Regional Safety Officer (RSO)"
            : "Central Team";
        setErrorModal({
          open: true,
          title: "Permission Denied",
          description: `Permission denied: AOM is not authorized to close ${payload.severity}-severity incidents. ${payload.severity} incidents must be resolved by ${targetOwner}.`,
        });
        return;
      }

      if (isUserBM && (sev === "high" || sev === "critical")) {
        const targetOwner =
          sev === "high"
            ? "Regional Safety Officer (RSO)"
            : "Central Team";
        setErrorModal({
          open: true,
          title: "Permission Denied",
          description: `Permission denied: Business Manager (BM) is not authorized to close ${payload.severity}-severity incidents. ${payload.severity} incidents must be resolved by ${targetOwner}.`,
        });
        return;
      }

      if ((isUserRSO || isUserNH) && sev === "critical") {
        setErrorModal({
          open: true,
          title: "Permission Denied",
          description:
            "Permission denied: Only Central (All-Activity Admin) holds sole authority to close Critical incidents.",
        });
        return;
      }
    }

    mutation.mutate(payload);
  };

  const onInvalid = (errors: any) => {
    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      const firstKey = errorKeys[0];
      const message =
        errors[firstKey]?.message ||
        "Please fill in all required fields marked in red.";
      toast.error(message);

      // Auto-scroll to first invalid element
      setTimeout(() => {
        const target =
          document.querySelector(`[name="${firstKey}"]`) ||
          document.querySelector(`[data-name="${firstKey}"]`) ||
          document.querySelector(".text-destructive") ||
          document.querySelector('[aria-invalid="true"]');
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
          if ("focus" in target && typeof (target as any).focus === "function") {
            (target as any).focus();
          }
        }
      }, 50);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto p-4 animate-in fade-in duration-500">
      <header className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="hover:bg-gray-100 rounded-full"
        >
          <Link href="/dashboard/incident">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Report New Incident
          </h1>
          <p className="text-sm text-muted-foreground">
            Fill in the details to report a safety concern or incident per operational protocol.
          </p>
        </div>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
          <Card className="border-none shadow-md overflow-hidden">
            <CardContent className="p-6 space-y-8">
              {/* Section 1: Classification & Severity */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <div className="h-2 w-2 rounded-full bg-blue-600" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                    Classification & Severity
                  </h3>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="incidentType"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="flex items-center justify-between">
                          <span>Incident Type</span>
                          <span className="text-[11px] text-muted-foreground font-normal">
                            10 BRD Types
                          </span>
                        </FormLabel>
                        <Combobox
                          items={INCIDENT_TYPES.map((t) => ({
                            label: t.defaultSeverity
                              ? `${t.name} (${t.defaultSeverity})`
                              : t.name,
                            value: t.name,
                          }))}
                          value={field.value}
                          onValueChange={(val) => {
                            field.onChange(val);
                            form.setValue("subCategory", val);
                            const match = INCIDENT_TYPES.find((t) => t.name === val);
                            if (match?.defaultSeverity) {
                              const targetSev = match.isMandatory ? "Critical" : match.defaultSeverity;
                              form.setValue("severity", targetSev, { shouldValidate: true });
                              const autoStakeholder = getStakeholderForSeverity(targetSev);
                              if (autoStakeholder) {
                                form.setValue("stakeholders", autoStakeholder, { shouldValidate: true });
                              }
                            }
                          }}
                          placeholder="Select incident type"
                          width="w-full"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => {
                      const selectedDate = field.value
                        ? (() => {
                            const [y, m, d] = field.value.split("-").map(Number);
                            return y && m && d ? new Date(y, m - 1, d) : new Date(field.value);
                          })()
                        : undefined;

                      return (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date of Incident</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal h-10 justify-between",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {selectedDate && !isNaN(selectedDate.getTime()) ? (
                                    format(selectedDate, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(d) => {
                                  if (d) {
                                    field.onChange(format(d, "yyyy-MM-dd"));
                                  }
                                }}
                                disabled={(d) =>
                                  d > new Date() || d < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  {(form.watch("incidentType") === "Other" ||
                    form.watch("incidentType") === "Other:") && (
                    <FormField
                      control={form.control}
                      name="otherIncidentType"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Specify Other Incident Type</FormLabel>
                          <FormControl>
                            <Input placeholder="Type incident type..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="severity"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="flex items-center justify-between">
                          <span>Severity Level</span>
                          {isMandatoryCritical && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                              <Lock className="h-3 w-3" /> Mandatory Critical
                            </span>
                          )}
                        </FormLabel>
                        <Combobox
                          items={SEVERITY_OPTIONS.map((s) => ({
                            label: s,
                            value: s,
                          }))}
                          value={field.value}
                          onValueChange={(val) => {
                            if (!isMandatoryCritical) {
                              field.onChange(val);
                              const autoStakeholder = getStakeholderForSeverity(val);
                              if (autoStakeholder) {
                                form.setValue("stakeholders", autoStakeholder, { shouldValidate: true });
                              }
                            }
                          }}
                          placeholder="Select severity level"
                          width="w-full"
                          disabled={isMandatoryCritical}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stakeholders"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="flex items-center justify-between">
                          <span>Stakeholders</span>
                          {field.value && (
                            <span className="text-[11px] text-muted-foreground font-normal">
                              Auto-selected by severity
                            </span>
                          )}
                        </FormLabel>
                        <Combobox
                          items={STAKEHOLDERS_OPTIONS.map((s) => ({
                            label: s,
                            value: s,
                          }))}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Select primary stakeholder"
                          width="w-full"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isMandatoryCritical && (
                    <div className="md:col-span-2 rounded-lg bg-red-50 border border-red-200 p-3.5 text-red-950 flex items-start gap-2.5 text-xs shadow-2xs">
                      <Lock className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="font-bold text-red-900">
                          MANDATORY CRITICAL (Child Safety Protocol)
                        </div>
                        <p className="text-red-800 leading-relaxed">
                          Under statutory child safety regulations,{" "}
                          <strong>{selectedIncidentType || "Critical"}</strong> incidents are strictly non-downgradable.
                          This case will be escalated immediately with a mandatory 2-hour SLA window.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Dynamic Escalation Matrix & SLA Protocol Box */}
                  {selectedSeverity && currentEscalation && (
                    <div
                      className={cn(
                        "rounded-xl p-4 border transition-all duration-300 md:col-span-2 shadow-xs",
                        selectedSeverity === "Critical"
                          ? "bg-red-50/80 border-red-200 text-red-950"
                          : selectedSeverity === "High"
                            ? "bg-orange-50/80 border-orange-200 text-orange-950"
                            : selectedSeverity === "Medium"
                              ? "bg-amber-50/80 border-amber-200 text-amber-950"
                              : "bg-blue-50/80 border-blue-200 text-blue-950",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "p-2 rounded-lg shrink-0",
                            selectedSeverity === "Critical"
                              ? "bg-red-100 text-red-700"
                              : selectedSeverity === "High"
                                ? "bg-orange-100 text-orange-700"
                                : selectedSeverity === "Medium"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-blue-100 text-blue-700",
                          )}
                        >
                          {selectedSeverity === "Critical" ? (
                            <ShieldAlert className="h-5 w-5" />
                          ) : (
                            <Clock className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                              Escalation Rule & SLA Protocol
                            </span>
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[11px] font-bold border",
                                selectedSeverity === "Critical"
                                  ? "bg-red-200/80 text-red-900 border-red-300"
                                  : selectedSeverity === "High"
                                    ? "bg-orange-200/80 text-orange-900 border-orange-300"
                                    : selectedSeverity === "Medium"
                                      ? "bg-amber-200/80 text-amber-900 border-amber-300"
                                      : "bg-blue-200/80 text-blue-900 border-blue-300",
                              )}
                            >
                              {selectedSeverity} Severity
                            </span>
                            <span className="text-xs font-semibold ml-auto text-slate-700">
                              SLA:{" "}
                              <strong className="text-slate-900">
                                {currentEscalation.sla}
                              </strong>
                            </span>
                          </div>
                          <p className="text-xs text-slate-800">
                            <strong>Assigned Owner:</strong> {currentEscalation.title}
                          </p>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            <strong>Action Required:</strong> {currentEscalation.action}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Incident Details & Actions */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <div className="h-2 w-2 rounded-full bg-amber-600" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                    Incident Description & Actions
                  </h3>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="briefDescription"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Brief Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g. Broken window pane observed near junior classroom."
                            className="min-h-[110px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="immediateActionTaken"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Immediate Action Taken</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g. Area cordoned off and students relocated to library."
                            className="min-h-[90px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pendingAction"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Pending Action (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g. Facility maintenance team scheduled for replacement."
                            className="min-h-[80px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Section 3: Status & Remarks */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <div className="h-2 w-2 rounded-full bg-green-600" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                    Status & Remarks
                  </h3>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem className="flex flex-col md:col-span-2">
                        <FormLabel className="flex items-center justify-between">
                          <span>Status</span>
                          {!canCloseCurrentIncident && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md">
                              <Lock className="h-3 w-3 text-amber-700" />
                              Locked at Open
                            </span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Combobox
                            items={
                              canCloseCurrentIncident
                                ? STATUS_OPTIONS.map((s) => ({
                                    label: s,
                                    value: s,
                                  }))
                                : [
                                    {
                                      label: "Open (Locked - Closure Unauthorized)",
                                      value: "Open",
                                    },
                                  ]
                            }
                            value={field.value}
                            onValueChange={(val) => {
                              if (canCloseCurrentIncident) {
                                field.onChange(val);
                              }
                            }}
                            placeholder="Select status"
                            width="w-full"
                            disabled={!canCloseCurrentIncident}
                          />
                        </FormControl>
                        {!canCloseCurrentIncident && (
                          <p className="text-xs text-amber-700 mt-1 flex items-center gap-1 font-medium">
                            <Lock className="h-3.5 w-3.5 shrink-0" />
                            Closure restricted: {prekRole || user?.role?.toUpperCase()} is not authorized to close {selectedSeverity || "this"}-severity incidents. Requires {currentEscalation?.title || "higher authority"}.
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="remarks"
                    render={({ field }) => {
                      const isClosed = form.watch("status") === "Closed";
                      return (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              Closing Remarks{" "}
                              {isClosed ? (
                                <span className="text-destructive font-bold">*</span>
                              ) : (
                                <span className="text-xs text-muted-foreground font-normal">
                                  (Optional)
                                </span>
                              )}
                            </span>
                            {isClosed && (
                              <span className="text-[11px] font-medium text-destructive">
                                Mandatory when status is Closed
                              </span>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={
                                isClosed
                                  ? "Enter mandatory closing remarks explaining the resolution..."
                                  : "Any final notes or remarks..."
                              }
                              className={cn(
                                "min-h-[80px] resize-none",
                                isClosed && !field.value?.trim() && "border-destructive/40 focus-visible:ring-destructive/20"
                              )}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>
              </div>

              <div className="pt-6 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t">
                <Button
                  variant="outline"
                  type="button"
                  asChild
                  className="w-full sm:w-auto px-8 cursor-pointer active:scale-[0.99]"
                >
                  <Link href="/dashboard/incident">Cancel</Link>
                </Button>
                <Button
                  type="submit"
                  className="w-full sm:w-auto px-10 bg-primary hover:bg-primary/90 text-white font-semibold cursor-pointer shadow-xs active:scale-[0.99]"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Incident"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>

      <AlertDialog
        open={errorModal.open}
        onOpenChange={(open) => setErrorModal((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent className="max-w-md p-6 rounded-2xl shadow-2xl border-destructive/20 bg-white">
          <AlertDialogHeader className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-center text-lg font-bold text-foreground">
              {errorModal.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm text-foreground/80 leading-relaxed font-normal">
              {errorModal.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-3 sm:justify-center">
            <AlertDialogAction
              onClick={() => setErrorModal({ open: false, title: "", description: "" })}
              className="w-full sm:w-auto px-8 bg-destructive hover:bg-destructive/90 text-white font-semibold rounded-xl cursor-pointer shadow-sm active:scale-[0.98]"
            >
              Okay
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
