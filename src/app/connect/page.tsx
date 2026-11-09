"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Database,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  RefreshCw,
  UploadCloud,
  ArrowRight,
  FileText,
  GitBranch,
  MessageSquare,
  Kanban,
  BookOpen,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Layers,
  KeyRound,
  Shield,
  Eye,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { LoadingSkeleton, ErrorBanner } from "@/components/ui/StateViews";
import type {
  QuarantinedSecret,
  Source,
  SourceType,
} from "@/types/echobridge.types";
import type { AclScopeItem } from "@/services/ingestion/parser.service";

export default function ConnectPage() {
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [chunksCount, setChunksCount] = useState(0);
  const [aclScopeMap, setAclScopeMap] = useState<AclScopeItem[]>([]);
  const [quarantinedSecrets, setQuarantinedSecrets] = useState<
    QuarantinedSecret[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Tab State: Tab 1 = sources (default), Tab 2 = quarantine
  const [activeTab, setActiveTab] = useState<"sources" | "quarantine">("sources");

  // Custom Source Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customType, setCustomType] = useState<SourceType>("document");
  const [customAuthor, setCustomAuthor] = useState("Aarav Sharma");
  const [customPath, setCustomPath] = useState("docs/custom_guide.md");
  const [customContent, setCustomContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const fetchIngestionData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/ingest?projectId=CampusConnect");
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to load sources");
      }

      setSources(json.sources || []);
      setChunksCount(json.chunksCount || 0);
      setAclScopeMap(json.aclScopeMap || []);
      setQuarantinedSecrets(json.quarantinedSecrets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching sources");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIngestionData();
  }, [fetchIngestionData]);

  const handleLoadSeed = async () => {
    try {
      setSeeding(true);
      setError(null);
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useSeed: true, projectId: "CampusConnect" }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to load CampusConnect dataset");
      }

      setSuccessBanner(
        "CampusConnect benchmark sources ingested! All 8 planted traps indexed."
      );
      await fetchIngestionData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading seed data");
    } finally {
      setSeeding(false);
    }
  };

  const handleAddCustomSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim() || !customContent.trim()) {
      alert("Please provide both title and content.");
      return;
    }

    try {
      setIsUploading(true);
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: "CampusConnect",
          sources: [
            {
              title: customTitle,
              source_type: customType,
              author: customAuthor,
              file_path: customPath,
              content: customContent,
            },
          ],
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to ingest custom source");
      }

      setIsModalOpen(false);
      setCustomTitle("");
      setCustomContent("");
      setSuccessBanner("Custom source successfully parsed, redacted, and indexed!");
      await fetchIngestionData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const getSourceIcon = (type: SourceType) => {
    switch (type) {
      case "document":
        return <FileText className="w-4 h-4 text-indigo-400 shrink-0" />;
      case "git_repo":
        return <GitBranch className="w-4 h-4 text-cyan-400 shrink-0" />;
      case "chat_export":
        return <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />;
      case "task_board":
        return <Kanban className="w-4 h-4 text-amber-400 shrink-0" />;
      case "runbook":
        return <BookOpen className="w-4 h-4 text-purple-400 shrink-0" />;
      case "finance_folder":
        return <DollarSign className="w-4 h-4 text-rose-400 shrink-0" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400 shrink-0" />;
    }
  };

  const getSourcePlantedTrap = (sourceId: string) => {
    switch (sourceId) {
      case "SRC-CHAT-03":
        return {
          label: "Trap 1 & 4: Timeline Conflict & Stripe Key/Phone",
          color: "text-amber-300 border-amber-500/30 bg-amber-500/10",
        };
      case "SRC-PLAN-04":
        return {
          label: "Trap 1: Event Timeline Conflict Side B",
          color: "text-purple-300 border-purple-500/30 bg-purple-500/10",
        };
      case "SRC-RUNBOOK-05":
        return {
          label: "Trap 3: Stale Runbook (>180 days)",
          color: "text-orange-300 border-orange-500/30 bg-orange-500/10",
        };
      case "SRC-FIN-06":
        return {
          label: "Trap 5: Confidential Finance (Lead-Only)",
          color: "text-rose-300 border-rose-500/30 bg-rose-500/10",
        };
      case "SRC-BACKLOG-07":
        return {
          label: "Trap 6: Prompt Injection in Doc",
          color: "text-rose-300 border-rose-500/30 bg-rose-500/10",
        };
      default:
        return null;
    }
  };

  const getSourceDate = (sourceId: string) => {
    switch (sourceId) {
      case "SRC-ARCH-01":
        return "2026-03-01";
      case "SRC-GIT-02":
        return "2026-03-02";
      case "SRC-CHAT-03":
        return "2026-03-02";
      case "SRC-PLAN-04":
        return "2026-03-03";
      case "SRC-RUNBOOK-05":
        return "2025-06-10 (9 mo ago • Stale)";
      case "SRC-FIN-06":
        return "2026-02-15";
      case "SRC-BACKLOG-07":
        return "2026-03-05";
      case "SRC-TASK-08":
        return "2026-03-06";
      default:
        return "Recent";
    }
  };

  const credentialCount = quarantinedSecrets.filter(
    (s) => s.secret_type === "api_key" || s.secret_type === "password"
  ).length;
  const piiCount = quarantinedSecrets.filter(
    (s) => s.secret_type === "phone" || s.secret_type === "email"
  ).length;
  const injectionCount = quarantinedSecrets.filter(
    (s) => s.secret_type === "prompt_injection"
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* ==================================================================== */}
      {/* 1. CLEAN PAGE HEADER                                                 */}
      {/* ==================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-accent-primary/10 text-accent-cyan border border-accent-primary/20">
              Stage 1 &amp; 2
            </span>
            <span className="text-text-muted text-xs font-mono">
              CampusConnect Project
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            1. Connect &amp; Ingest Authorised Sources
          </h1>

          <p className="text-sm text-text-secondary mt-1 max-w-3xl">
            Confirm which project sources EchoBridge can read and inspect automatic
            secret redaction before generating the draft.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLoadSeed}
            isLoading={seeding}
            className="text-xs font-mono"
            title="Reload default CampusConnect 8-trap benchmark dataset"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Reload Seed
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="text-xs font-mono"
          >
            <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
            ➕ Add Source
          </Button>

          <Link href="/draft">
            <Button variant="primary" size="sm" className="text-xs font-mono">
              Reconstruct Draft &amp; Continue →
            </Button>
          </Link>
        </div>
      </div>

      {/* Success / Error Banners */}
      {successBanner && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-400/70 hover:text-emerald-400 font-mono text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {error && <ErrorBanner message={error} onRetry={fetchIngestionData} />}

      {/* ==================================================================== */}
      {/* 2. CLEAN 2-TAB SWITCHER                                              */}
      {/* ==================================================================== */}
      <div className="flex items-center gap-2 border-b border-border-subtle pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("sources")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all ${
            activeTab === "sources"
              ? "bg-accent-primary text-white shadow-md shadow-indigo-500/20"
              : "bg-surface hover:bg-surface-hover text-text-secondary border border-border-subtle"
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Authorised Sources &amp; Permissions</span>
          <span
            className={`px-1.5 py-0.2 rounded text-[10px] ${
              activeTab === "sources"
                ? "bg-indigo-900/60 text-indigo-200"
                : "bg-canvas text-text-muted"
            }`}
          >
            {sources.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("quarantine")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all ${
            activeTab === "quarantine"
              ? "bg-rose-600 text-white shadow-md shadow-rose-500/20"
              : "bg-surface hover:bg-surface-hover text-text-secondary border border-border-subtle"
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>Redaction &amp; Security Quarantine</span>
          <span
            className={`px-1.5 py-0.2 rounded text-[10px] ${
              activeTab === "quarantine"
                ? "bg-rose-950 text-rose-200"
                : "bg-canvas text-rose-400 font-bold"
            }`}
          >
            {quarantinedSecrets.length} Flagged
          </span>
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <LoadingSkeleton
          cardCount={3}
          message="Scanning authorised project sources and compiling ACL scope map..."
        />
      ) : activeTab === "sources" ? (
        /* ================================================================== */
        /* TAB 1: AUTHORISED SOURCES & PERMISSIONS (8)                        */
        /* ================================================================== */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                <Database className="w-4 h-4 text-accent-cyan" />
                Source Permission Scope Map
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Pre-Model RBAC ensures restricted folders never enter the Intern prompt.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-text-muted">
              <span>8 Sources Connected</span>
              <span>•</span>
              <span className="text-rose-400 font-semibold">1 Lead-Only (Trap 5)</span>
            </div>
          </div>

          {/* Clean Scannable Sources Table */}
          <div className="rounded-xl border border-border-subtle bg-surface overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border-subtle text-text-muted font-mono uppercase text-[10px] tracking-wider bg-canvas/60">
                    <th className="py-3 px-4">Source Name &amp; Path</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Last Updated</th>
                    <th className="py-3 px-4">Planted Trap</th>
                    <th className="py-3 px-4 text-right">Access Clearances</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/50 font-sans">
                  {sources.map((src) => {
                    const scope = aclScopeMap.find((s) => s.sourceId === src.id);
                    const isRestrictedFromIntern =
                      scope?.isRestrictedFromIntern ||
                      src.source_type === "finance_folder" ||
                      src.file_path?.includes("Finance");
                    const trap = getSourcePlantedTrap(src.id);
                    const lastUpdated = getSourceDate(src.id);

                    return (
                      <tr
                        key={src.id}
                        className={`transition-colors hover:bg-surface-hover/60 ${
                          isRestrictedFromIntern ? "bg-rose-950/5" : ""
                        }`}
                      >
                        {/* Source Name & Path */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-canvas border border-border-subtle">
                              {getSourceIcon(src.source_type)}
                            </div>
                            <div>
                              <span className="font-semibold text-text-primary block text-xs">
                                {src.title}
                              </span>
                              <span className="text-[11px] font-mono text-text-muted">
                                {src.file_path || src.id} • {src.author}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Type Badge */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-text-secondary uppercase">
                          <span className="px-2 py-0.5 rounded bg-canvas border border-border-subtle">
                            {src.source_type.replace("_", " ")}
                          </span>
                        </td>

                        {/* Last Updated */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-text-secondary">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-text-muted shrink-0" />
                            <span>{lastUpdated}</span>
                          </div>
                        </td>

                        {/* Planted Trap */}
                        <td className="py-3.5 px-4">
                          {trap ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${trap.color}`}
                            >
                              {trap.label}
                            </span>
                          ) : (
                            <span className="text-text-muted text-[11px] font-mono">
                              Standard Source
                            </span>
                          )}
                        </td>

                        {/* 2 Simple Access Pills */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Team Lead Pill */}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <Unlock className="w-3 h-3" />
                              <span>✓ Team Lead</span>
                            </span>

                            {/* Intern Pill */}
                            {isRestrictedFromIntern ? (
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30"
                                title="Pre-Model RBAC: Withheld from Intern prompt"
                              >
                                <Lock className="w-3 h-3 text-rose-400" />
                                <span>🔒 Restricted from Intern</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                <span>✓ Intern</span>
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Compact Dual-Barrier RBAC Explainer Box */}
          <div className="p-4 rounded-xl bg-canvas border border-border-subtle flex items-start gap-3 text-xs">
            <Cpu className="w-4 h-4 text-accent-cyan shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-text-primary block">
                Dual-Barrier RBAC Architecture (Trap 5 &amp; 8)
              </span>
              <p className="text-text-secondary text-[11px] leading-relaxed">
                <strong>Pre-Model Filter:</strong> The confidential Finance Folder (
                <code className="text-rose-300">SRC-FIN-06</code>) is completely excluded
                from prompt context when synthesizing the Intern view.
                <strong> Post-Generation Guard:</strong> Any claim citing restricted
                data is replaced with a safe{" "}
                <code className="text-text-muted">&quot;Restricted: request access&quot;</code>{" "}
                placeholder.
              </p>
            </div>
          </div>

          {/* Primary Proceed CTA */}
          <div className="pt-2 flex justify-end">
            <Link href="/draft">
              <Button variant="primary" size="md" className="font-mono text-xs">
                Reconstruct Draft &amp; Continue →
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        /* ================================================================== */
        /* TAB 2: REDACTION & SECURITY QUARANTINE (3 FLAGGED ITEMS)           */
        /* ================================================================== */
        <div className="space-y-4">
          {/* Summary Banner */}
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2.5 text-rose-300">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <span>
                <strong>Quarantine Vault:</strong> 2 secrets masked &amp; quarantined (Trap 4) · 1 prompt-injection stripped (Trap 6)
              </span>
            </div>
            <span className="text-[10px] text-text-muted px-2 py-0.5 rounded bg-black/40 border border-border-subtle">
              0% Raw Leakage
            </span>
          </div>

          {/* Flagged Items Table */}
          <div className="rounded-xl border border-border-subtle bg-surface overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border-subtle text-text-muted font-mono uppercase text-[10px] tracking-wider bg-canvas/60">
                    <th className="py-3 px-4">Item ID</th>
                    <th className="py-3 px-4">Threat / Type</th>
                    <th className="py-3 px-4">Source Detected In</th>
                    <th className="py-3 px-4">Masked Preview (Zero Leak)</th>
                    <th className="py-3 px-4 text-right">Reviewer Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/50 font-mono text-xs">
                  {quarantinedSecrets.map((secret) => {
                    const isInjection = secret.secret_type === "prompt_injection";

                    return (
                      <tr
                        key={secret.id}
                        className="hover:bg-surface-hover/50 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-bold text-text-primary">
                          {secret.id}
                        </td>

                        <td className="py-3.5 px-4">
                          {isInjection ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold">
                              Prompt Injection (Trap 6)
                            </span>
                          ) : secret.secret_type === "api_key" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                              Stripe Secret Key (Trap 4)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-bold">
                              Personal Phone (Trap 4)
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-text-secondary">
                          <span>{secret.source_id}</span>
                          <span className="text-[10px] text-text-muted block">
                            {secret.source_id === "SRC-CHAT-03"
                              ? "Team_Chat_March.txt"
                              : "Notes/Feature_Backlog.md"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <code className="px-2 py-1 rounded bg-canvas border border-border-subtle text-amber-300 text-xs">
                            {secret.masked_preview}
                          </code>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {isInjection ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              Instruction Stripped
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Masked &amp; Quarantined
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Link href="/draft">
              <Button variant="primary" size="md" className="font-mono text-xs">
                Reconstruct Draft &amp; Continue →
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Modal for Adding Custom Source */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Custom Project Source"
        description="Paste raw Markdown, chat export, or runbook to test redaction and prompt-injection detection."
      >
        <form onSubmit={handleAddCustomSource} className="space-y-4 text-xs">
          <div>
            <label className="block text-text-secondary font-medium mb-1">
              Source Title
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g. AWS Production Infrastructure Runbook"
              className="w-full px-3 py-2 rounded-lg bg-canvas border border-border-subtle text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary font-medium mb-1">
                Source Type
              </label>
              <select
                value={customType}
                onChange={(e) => setCustomType(e.target.value as SourceType)}
                className="w-full px-3 py-2 rounded-lg bg-canvas border border-border-subtle text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
              >
                <option value="document">Document (Markdown)</option>
                <option value="chat_export">Chat Export</option>
                <option value="git_repo">Git Repository Log</option>
                <option value="runbook">Runbook</option>
                <option value="task_board">Task Board</option>
                <option value="finance_folder">Finance Folder (Confidential)</option>
              </select>
            </div>

            <div>
              <label className="block text-text-secondary font-medium mb-1">
                Author
              </label>
              <input
                type="text"
                value={customAuthor}
                onChange={(e) => setCustomAuthor(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-canvas border border-border-subtle text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-text-secondary font-medium mb-1">
              File Path
            </label>
            <input
              type="text"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              placeholder="e.g. confidential/budget.md"
              className="w-full px-3 py-2 rounded-lg bg-canvas border border-border-subtle text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary font-mono text-[11px]"
            />
          </div>

          <div>
            <label className="block text-text-secondary font-medium mb-1">
              Raw Source Content
            </label>
            <textarea
              rows={5}
              value={customContent}
              onChange={(e) => setCustomContent(e.target.value)}
              placeholder="Paste text containing secrets (e.g. sk_live_...), phone numbers, or prompt injection instructions..."
              className="w-full px-3 py-2 rounded-lg bg-canvas border border-border-subtle text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary font-mono text-xs"
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isUploading}>
              Parse &amp; Ingest Source
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
