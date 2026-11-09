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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { LoadingSkeleton, ErrorBanner } from "@/components/ui/StateViews";
import { RedactionQuarantineTable } from "@/components/review/RedactionQuarantineTable";
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

  const handleResetData = async () => {
    if (
      !window.confirm(
        "Are you sure you want to reset all ingested sources and quarantined secrets?"
      )
    ) {
      return;
    }
    try {
      setLoading(true);
      await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true, projectId: "CampusConnect" }),
      });
      setSuccessBanner("Repository store reset cleanly.");
      await fetchIngestionData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error resetting store");
    } finally {
      setLoading(false);
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
        return <FileText className="w-4 h-4 text-indigo-400" />;
      case "git_repo":
        return <GitBranch className="w-4 h-4 text-cyan-400" />;
      case "chat_export":
        return <MessageSquare className="w-4 h-4 text-emerald-400" />;
      case "task_board":
        return <Kanban className="w-4 h-4 text-amber-400" />;
      case "runbook":
        return <BookOpen className="w-4 h-4 text-purple-400" />;
      case "finance_folder":
        return <DollarSign className="w-4 h-4 text-red-400" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  const getSourcePlantedTrap = (sourceId: string) => {
    switch (sourceId) {
      case "SRC-CHAT-03":
        return {
          label: "Trap 1 & 4: Timeline Conflict & Stripe Key/Phone",
          color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
        };
      case "SRC-PLAN-04":
        return {
          label: "Trap 1: Event Timeline Conflict Side B",
          color: "text-purple-400 border-purple-500/30 bg-purple-500/10",
        };
      case "SRC-RUNBOOK-05":
        return {
          label: "Trap 3: Stale Runbook (>6mo old)",
          color: "text-orange-400 border-orange-500/30 bg-orange-500/10",
        };
      case "SRC-FIN-06":
        return {
          label: "Trap 5: Confidential Finance (Lead-Only)",
          color: "text-red-400 border-red-500/30 bg-red-500/10",
        };
      case "SRC-BACKLOG-07":
        return {
          label: "Trap 6: Prompt Injection in Doc",
          color: "text-rose-400 border-rose-500/30 bg-rose-500/10",
        };
      default:
        return null;
    }
  };

  const restrictedSourcesCount = aclScopeMap.filter(
    (s) => s.isRestrictedFromIntern
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Stage Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-subtle">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Stage 1 & 2
            </span>
            <span className="text-text-muted text-xs font-mono">
              Ingestion & Quarantine Vault
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            Source Connection & ACL Scope Map
          </h1>
          <p className="text-sm text-text-secondary mt-1 max-w-3xl">
            Authorised project sources are imported, parsed into topical
            chunks, scanned for live credentials and prompt injections, and
            mapped to strict role-based access scopes before entering the trust
            pipeline.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLoadSeed}
            isLoading={seeding}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Load CampusConnect Seed
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
          >
            <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
            Add Custom Source
          </Button>

          <Button variant="ghost" size="sm" onClick={handleResetData}>
            Reset
          </Button>

          <Link href="/draft">
            <Button variant="primary" size="sm">
              Trigger Reconstruction
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Success / Error Banners */}
      {successBanner && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
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

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">
              Connected Sources
            </span>
            <Database className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-text-primary">
            {sources.length}
          </div>
          <p className="text-[11px] text-text-muted mt-0.5">
            Docs, git, chat & finance
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">
              Indexed Chunks
            </span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-text-primary">
            {chunksCount}
          </div>
          <p className="text-[11px] text-text-muted mt-0.5">
            768-dim embeddings generated
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">
              Pre-Model RBAC
            </span>
            <Lock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-text-primary">
            {restrictedSourcesCount} Restricted
          </div>
          <p className="text-[11px] text-amber-400/80 mt-0.5">
            Withheld from Intern View
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">
              Quarantined Items
            </span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-text-primary">
            {quarantinedSecrets.length}
          </div>
          <p className="text-[11px] text-rose-400/80 mt-0.5">
            0% raw secret leakage
          </p>
        </Card>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <LoadingSkeleton
          cardCount={3}
          message="Indexing authorised project sources and compiling ACL scope map..."
        />
      ) : (
        <>
          {/* Section 1: Source Permission Scope Map */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-400" />
                  Source Permission Scope Map
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Confirming authorized folders and channels accessible to{" "}
                  <code className="text-indigo-400">Incoming Lead</code> vs.{" "}
                  <code className="text-cyan-400">Incoming Intern</code>.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-subtle bg-surface overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-subtle text-text-muted font-mono uppercase text-[10px] tracking-wider bg-canvas/40">
                      <th className="py-3 px-4">Source Title & Path</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Author</th>
                      <th className="py-3 px-4">Planted Trap Indicator</th>
                      <th className="py-3 px-4">Audience Permission Scope</th>
                      <th className="py-3 px-4 text-right">Chunks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subtle/50 font-sans">
                    {sources.map((src) => {
                      const scope = aclScopeMap.find((s) => s.sourceId === src.id);
                      const isRestricted = scope?.isRestrictedFromIntern;
                      const trap = getSourcePlantedTrap(src.id);

                      return (
                        <tr
                          key={src.id}
                          className="hover:bg-surface-hover/50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              {getSourceIcon(src.source_type)}
                              <div>
                                <span className="font-semibold text-text-primary block">
                                  {src.title}
                                </span>
                                {src.file_path && (
                                  <span className="text-[11px] font-mono text-text-muted">
                                    {src.file_path}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-mono text-text-secondary uppercase text-[11px]">
                              {src.source_type.replace("_", " ")}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-text-secondary">
                            {src.author}
                          </td>

                          <td className="py-3 px-4">
                            {trap ? (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${trap.color}`}
                              >
                                🎯 {trap.label}
                              </span>
                            ) : (
                              <span className="text-text-muted text-[11px] font-mono">
                                Standard Source
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {isRestricted ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                                <Lock className="w-3.5 h-3.5" />
                                Team Lead Only (Restricted from Intern)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <Unlock className="w-3.5 h-3.5" />
                                Lead + Intern (Unrestricted)
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right font-mono text-text-secondary">
                            {scope?.chunkCount || 1}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Section 2: Quarantined Secrets & Security Warnings Table */}
          <section className="space-y-4 pt-4">
            <RedactionQuarantineTable secrets={quarantinedSecrets} />
          </section>

          {/* Section 3: Pre-Model & Post-Generation RBAC Explainer */}
          <section className="pt-2">
            <Card className="p-5 border-indigo-500/20 bg-indigo-950/10">
              <div className="flex items-start gap-3">
                <Cpu className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">
                    Dual RBAC Guard Architecture (Pre-Model + Post-Generation)
                  </h3>
                  <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                    <strong>Pre-Model RBAC:</strong> Restricted sources (like{" "}
                    <code className="text-indigo-300">
                      SRC-FIN-06 Finance Folder
                    </code>
                    ) are filtered out via SQL before prompt assembly. They
                    never enter Google Gemini’s prompt context when synthesizing
                    the <strong>Intern Draft</strong>.
                    <br className="my-1" />
                    <strong>Post-Generation Guard:</strong> Any claim citing a
                    restricted chunk is automatically dropped from the Intern
                    view post-generation and replaced with an uninformative{" "}
                    <code className="text-indigo-300">
                      &quot;Restricted: request access&quot;
                    </code>{" "}
                    placeholder (Trap 8), ensuring zero operational context leaks.
                  </p>
                </div>
              </div>
            </Card>
          </section>

          {/* Proceed CTA */}
          <div className="pt-4 flex justify-end">
            <Link href="/draft">
              <Button variant="primary" size="lg">
                Proceed to Stage 3: The Trust Pipeline
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </>
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
              className="w-full px-3 py-2 rounded-lg bg-canvas border border-subtle text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full px-3 py-2 rounded-lg bg-canvas border border-subtle text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full px-3 py-2 rounded-lg bg-canvas border border-subtle text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="w-full px-3 py-2 rounded-lg bg-canvas border border-subtle text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-[11px]"
            />
            <p className="text-[10px] text-text-muted mt-0.5">
              Paths containing <code>finance</code> or <code>confidential</code>{" "}
              are automatically restricted to Team Lead.
            </p>
          </div>

          <div>
            <label className="block text-text-secondary font-medium mb-1">
              Raw Source Content
            </label>
            <textarea
              rows={6}
              value={customContent}
              onChange={(e) => setCustomContent(e.target.value)}
              placeholder="Paste text containing secrets (e.g. sk_live_...), phone numbers, or prompt injection instructions to test security filters..."
              className="w-full px-3 py-2 rounded-lg bg-canvas border border-subtle text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
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
              Parse & Ingest Source
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
