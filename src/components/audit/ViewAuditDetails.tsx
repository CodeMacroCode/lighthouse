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
import { Audit } from "@/interface/modal";
import { 
    ClipboardCheck, Calendar, School, Building2, User, 
    AlertTriangle, CheckCircle2, Info, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

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

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="sm:max-w-2xl w-full p-0 flex flex-col gap-0 border-l-0 shadow-2xl h-full overflow-hidden">
                <SheetHeader className="p-6 bg-[#0c235c] text-white shrink-0">
                    <div className="flex items-center gap-2 text-blue-200 font-bold text-[10px] uppercase tracking-widest mb-2">
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        Audit Inspection Details
                    </div>
                    <SheetTitle className="text-2xl font-black text-white leading-tight">
                        {audit.schoolName || "School Audit"}
                    </SheetTitle>
                    <SheetDescription className="text-blue-100/70 font-medium">
                        ID: <span className="font-mono text-xs">{audit._id}</span>
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1 min-h-0">
                    <div className="p-6 space-y-8">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-start gap-3">
                                <div className="bg-blue-100 p-2 rounded-xl">
                                    <School className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Target School</p>
                                    <p className="text-sm font-bold text-gray-900">{audit.schoolName}</p>
                                </div>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-start gap-3">
                                <div className="bg-purple-100 p-2 rounded-xl">
                                    <Building2 className="h-4 w-4 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Branch</p>
                                    <p className="text-sm font-bold text-gray-900">{audit.branchName}</p>
                                </div>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-start gap-3">
                                <div className="bg-amber-100 p-2 rounded-xl">
                                    <Calendar className="h-4 w-4 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Inspection Date</p>
                                    <p className="text-sm font-bold text-gray-900">
                                        {new Date(audit.createdAt).toLocaleDateString("en-GB", {
                                            day: "2-digit",
                                            month: "long",
                                            year: "numeric"
                                        })}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-start gap-3">
                                <div className="bg-green-100 p-2 rounded-xl">
                                    <User className="h-4 w-4 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Auditor Status</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <Badge variant="outline" className={cn("rounded-md text-[10px] font-black border-none px-2 py-0", 
                                            audit.status === "completed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700")}>
                                            {audit.status?.toUpperCase()}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sections Accordion */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Inspection Findings</h3>
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
                                                    <div className="bg-[#0c235c] text-white h-7 w-7 flex items-center justify-center rounded-lg text-xs font-black shadow-lg">
                                                        {String.fromCharCode(65 + idx)}
                                                    </div>
                                                    <span className="font-bold text-gray-900 text-sm">{section.sectionName}</span>
                                                </div>
                                                <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-none font-black text-[10px] rounded-md px-2">
                                                    Score: {section.sectionScore}
                                                </Badge>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-0 border-t border-gray-50">
                                            <div className="divide-y divide-gray-50">
                                                {section.parameters?.map((param, pIdx) => (
                                                    <div key={param._id || pIdx} className="p-5 space-y-3">
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-sm font-bold text-gray-800 leading-snug">{param.name}</p>
                                                                    {param.isCritical && (
                                                                        <Badge className="bg-red-50 text-red-600 hover:bg-red-50 border-none text-[8px] font-black uppercase tracking-tighter shrink-0 h-4">
                                                                            <AlertTriangle className="h-2 w-2 mr-1" />
                                                                            Critical
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <Badge className={cn("shrink-0 font-black text-[10px] border px-2.5 py-0.5 rounded-lg", getScoreColor(param.score))}>
                                                                {param.score} - {getStatusLabel(param.score)}
                                                            </Badge>
                                                        </div>
                                                        
                                                        {param.remark && (
                                                            <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                                                                <div className="flex items-start gap-2">
                                                                    <Info className="h-3 w-3 text-blue-500 mt-0.5 shrink-0" />
                                                                    <p className="text-xs text-blue-800/80 font-medium leading-relaxed italic">
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
                    </div>
                </ScrollArea>

                <div className="p-6 border-t border-gray-100 bg-gray-50/50 shrink-0">
                    <button 
                        onClick={onClose}
                        className="w-full bg-[#0c235c] text-white font-black py-4 rounded-2xl shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all text-sm uppercase tracking-widest"
                    >
                        Close View
                    </button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
