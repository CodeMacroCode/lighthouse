"use client";

import React from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import {
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Audit, CriticalSection, SectionWiseScore } from "@/interface/modal";
import {
    ClipboardCheck, Calendar, School, Building2, User,
    AlertTriangle, CheckCircle2, Info, ChevronRight,
    Trophy, BarChart3, ShieldAlert, FileText, Download,
    Printer, ArrowRightCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

interface ViewAuditDetailsProps {
    isOpen: boolean;
    onClose: () => void;
    audit: Audit | null;
}

export function ViewAuditDetails({ isOpen, onClose, audit }: ViewAuditDetailsProps) {
    if (!audit) return null;

    const getScoreColor = (score: number) => {
        switch (score) {
            case 2: return "bg-emerald-100 text-emerald-700 border-emerald-200";
            case 1: return "bg-amber-100 text-amber-700 border-amber-200";
            case 0: return "bg-red-100 text-red-700 border-red-200";
            default: return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    const getStatusLabel = (score: number) => {
        switch (score) {
            case 2: return "Fully Complied";
            case 1: return "Needs Improvement";
            case 0: return "Not Available";
            default: return "Pending";
        }
    };

    const isPass = audit.result?.toUpperCase() === "PASS";

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="sm:max-w-3xl w-full p-0 flex flex-col gap-0 border-l-0 shadow-2xl h-full overflow-hidden">
                <SheetHeader className="p-6 bg-[#0c235c] text-white shrink-0 relative overflow-hidden">
                    <div className="absolute right-[-20px] top-[-20px] opacity-10">
                        <ClipboardCheck className="h-40 w-40" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 text-blue-200 font-bold text-[10px] uppercase tracking-widest mb-2">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            Safety Inspection Report
                        </div>
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <SheetTitle className="text-2xl font-black text-white leading-tight">
                                    {audit.schoolName || "Inspection Report"}
                                </SheetTitle>
                                <SheetDescription className="text-blue-100/70 font-medium">
                                    Audit ID: <span className="font-mono text-xs">{audit._id}</span>
                                </SheetDescription>
                            </div>
                            <div className={cn(
                                "p-3 rounded-2xl shadow-lg border-2 flex flex-col items-center justify-center min-w-[100px]",
                                isPass ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "bg-red-500/20 border-red-500 text-red-400"
                            )}>
                                <span className="text-[10px] font-black uppercase tracking-tighter mb-0.5">Final Result</span>
                                <span className="text-xl font-black tracking-widest">{audit.result || "FAILED"}</span>
                            </div>
                        </div>
                    </div>
                </SheetHeader>

                <Tabs defaultValue="summary" className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 py-2 border-b border-gray-100 bg-white">
                        <TabsList className="grid w-full grid-cols-2 h-11 rounded-xl bg-gray-50 p-1">
                            <TabsTrigger value="summary" className="rounded-lg font-black text-[10px] uppercase tracking-wider gap-2">
                                <BarChart3 className="h-3.5 w-3.5" />
                                Summary Report
                            </TabsTrigger>
                            <TabsTrigger value="detailed" className="rounded-lg font-black text-[10px] uppercase tracking-wider gap-2">
                                <FileText className="h-3.5 w-3.5" />
                                Detailed Findings
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <ScrollArea className="flex-1 min-h-0 bg-gray-50/30">
                        <TabsContent value="summary" className="p-6 m-0 space-y-8 animate-in fade-in slide-in-from-bottom-2">
                            {/* Summary Core Info */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { label: "Score", value: `${audit.finalScore}%`, icon: Trophy, color: "text-amber-600", bg: "bg-amber-50" },
                                    { label: "Region", value: audit.schoolName, icon: School, color: "text-blue-600", bg: "bg-blue-50" },
                                    { label: "School", value: audit.branchName, icon: Building2, color: "text-purple-600", bg: "bg-purple-50" },
                                    { label: "Date", value: new Date(audit.completedAt || audit.createdAt).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }), icon: Calendar, color: "text-emerald-600", bg: "bg-emerald-50" },
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
                                        <div className={cn("p-2 rounded-xl mb-2", stat.bg)}>
                                            <stat.icon className={cn("h-4 w-4", stat.color)} />
                                        </div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">{stat.label}</p>
                                        <p className="text-xs font-bold text-gray-900 truncate w-full px-1">{stat.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Section-wise Breakdown */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Section Score Breakdown</h3>
                                </div>
                                <div className="grid gap-3">
                                    {audit.sectionWiseScore?.map((s: SectionWiseScore, i: number) => (
                                        <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="bg-[#0c235c] text-white h-5 w-5 flex items-center justify-center rounded-md text-[9px] font-bold">
                                                        {i + 1}
                                                    </div>
                                                    <span className="font-bold text-xs text-gray-800">{s.section}</span>
                                                </div>
                                                <span className="text-[10px] font-black text-[#0c235c] bg-blue-50 px-2 py-0.5 rounded-md">
                                                    {s.obtained} / {s.max}
                                                </span>
                                            </div>
                                            <div className="space-y-1">
                                                <Progress value={parseFloat(s.percentage)} className="h-1.5 bg-gray-100" />
                                                <div className="flex justify-end">
                                                    <span className="text-[9px] font-bold text-gray-500">{s.percentage}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Critical Issues */}
                            {audit.criticalIssues && audit.criticalIssues.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 px-1">
                                        <AlertTriangle className="h-4 w-4 text-red-500" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">Critical Failure points</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {audit.criticalIssues.map((section: CriticalSection) => (
                                            <div key={section._id} className="border border-red-100 rounded-2xl overflow-hidden bg-red-50/30">
                                                <div className="bg-red-50 px-4 py-2 border-b border-red-100">
                                                    <p className="text-[10px] font-black text-red-800 uppercase tracking-tighter">
                                                        {section.section}
                                                    </p>
                                                </div>
                                                <div className="p-4 space-y-3">
                                                    {section.issues.map((issue) => (
                                                        <div key={issue._id} className="flex gap-3">
                                                            <ArrowRightCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                                                            <div className="space-y-1">
                                                                <p className="text-[11px] font-bold text-gray-800 leading-tight">
                                                                    {issue.parameter}
                                                                </p>
                                                                <div className="flex items-center gap-4">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[9px] font-black text-gray-400 uppercase">Obtained</span>
                                                                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none font-black text-[9px] h-4">
                                                                            {issue.actual}
                                                                        </Badge>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[9px] font-black text-gray-400 uppercase">Target</span>
                                                                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none font-black text-[9px] h-4">
                                                                            {issue.expected}
                                                                        </Badge>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="detailed" className="p-6 m-0 animate-in fade-in slide-in-from-bottom-2">
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Comprehensive Inspection Findings</h3>
                                <Accordion type="multiple" className="space-y-3">
                                    {audit.sections?.map((section, idx) => (
                                        <AccordionItem
                                            key={section._id || idx}
                                            value={`item-${idx}`}
                                            className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm"
                                        >
                                            <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-gray-50 transition-all [&[data-state=open]]:bg-gray-50">
                                                <div className="flex items-center justify-between w-full pr-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "h-7 w-7 flex items-center justify-center rounded-lg text-xs font-black shadow-lg",
                                                            section.isCriticalFailed ? "bg-red-600 text-white" : "bg-[#0c235c] text-white"
                                                        )}>
                                                            {String.fromCharCode(65 + idx)}
                                                        </div>
                                                        <span className="font-bold text-gray-900 text-xs md:text-sm text-left">{section.sectionName}</span>
                                                    </div>
                                                    <Badge className={cn(
                                                        "border-none font-black text-[9px] md:text-[10px] rounded-md px-2",
                                                        section.isCriticalFailed ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
                                                    )}>
                                                        {section.isCriticalFailed ? "FAILED" : `SCORE: ${section.sectionScore}`}
                                                    </Badge>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="p-0 border-t border-gray-50">
                                                <div className="divide-y divide-gray-50">
                                                    {section.parameters?.map((param, pIdx) => (
                                                        <div key={param._id || pIdx} className="p-4 md:p-5 space-y-3">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="text-xs md:text-sm font-bold text-gray-800 leading-snug">{param.name}</p>
                                                                        {param.isCritical && (
                                                                            <Badge className="bg-red-50 text-red-600 hover:bg-red-50 border-none text-[8px] font-black uppercase tracking-tighter shrink-0 h-4">
                                                                                <AlertTriangle className="h-2 w-2 mr-1" />
                                                                                Critical
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <Badge className={cn("shrink-0 font-black text-[9px] md:text-[10px] border px-2.5 py-0.5 rounded-lg", getScoreColor(param.score))}>
                                                                    {param.score} / {param.maxScore || 2}
                                                                </Badge>
                                                            </div>

                                                            {param.remark && (
                                                                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                                                                    <div className="flex items-start gap-2">
                                                                        <Info className="h-3 w-3 text-blue-500 mt-0.5 shrink-0" />
                                                                        <p className="text-[11px] text-blue-800/80 font-medium leading-relaxed italic">
                                                                            "{param.remark}"
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </div>
                        </TabsContent>
                    </ScrollArea>
                </Tabs>

                <div className="p-4 md:p-6 border-t border-gray-100 bg-white grid grid-cols-2 gap-4 shrink-0">
                    <button
                        onClick={onClose}
                        className="bg-[#0c235c] text-white font-black py-3.5 rounded-2xl shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                        <CheckCircle2 className="h-4 w-4" />
                        Close Report
                    </button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
