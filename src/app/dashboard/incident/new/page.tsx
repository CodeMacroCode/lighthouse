"use client";

import React from "react";
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
      date: "",
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
      toast.error(
        error?.response?.data?.message || "Failed to report incident",
      );
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
      closureDate: values.closureDate
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

    mutation.mutate(payload);
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                              if (match.isMandatory) {
                                form.setValue("severity", "Critical");
                              } else {
                                form.setValue("severity", match.defaultSeverity);
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
                        <FormLabel>Stakeholders</FormLabel>
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
                        <FormLabel>Status</FormLabel>
                        <FormControl>
                          <Combobox
                            items={STATUS_OPTIONS.map((s) => ({
                              label: s,
                              value: s,
                            }))}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select status"
                            width="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="remarks"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Closing Remarks (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any final notes or remarks..."
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

              <div className="pt-6 flex justify-end gap-3 border-t">
                <Button
                  variant="outline"
                  type="button"
                  asChild
                  className="px-8 cursor-pointer"
                >
                  <Link href="/dashboard/incident">Cancel</Link>
                </Button>
                <Button
                  type="submit"
                  className="px-10 bg-primary hover:bg-primary/90 text-white font-semibold cursor-pointer shadow-xs"
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
    </div>
  );
}
