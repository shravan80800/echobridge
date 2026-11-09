"use client";

import React, { useState, useMemo } from "react";
import {
  Layers,
  FileText,
  User,
  ShieldAlert,
  HelpCircle,
  Lock,
  Search,
  Filter,
  Maximize2,
  RefreshCw,
  Info,
  CheckCircle2,
  GitBranch,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import type {
  AudienceRole,
  ContextGraphData,
  ContextNode,
  ContextEdge,
  ContextNodeType,
  EvidenceState,
} from "@/types/echobridge.types";
import { getContextGraphData } from "@/services/evidence/timeline.service";

export interface ContextWebGraphProps {
  audienceRole: AudienceRole;
  data?: ContextGraphData;
  className?: string;
  onSelectNode?: (node: ContextNode) => void;
}

interface NodePosition {
  x: number;
  y: number;
}

export function ContextWebGraph({
  audienceRole,
  data: propData,
  className = "",
  onSelectNode,
}: ContextWebGraphProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("CLM-TRAP-2"); // Default highlight Trap 2
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"graph" | "table">("graph");

  const graphData = useMemo(() => {
    return propData || getContextGraphData(audienceRole);
  }, [propData, audienceRole]);

  // Compute fixed 2D layout positions for clean SVG rendering
  // Column 1: Sources (X: 130)
  // Column 2: Claims & Decisions (X: 430)
  // Column 3: People & Quarantine (X: 730)
  const nodePositions = useMemo<Record<string, NodePosition>>(() => {
    return {
      // Sources
      "SRC-01": { x: 120, y: 70 },
      "SRC-02": { x: 120, y: 170 },
      "SRC-03": { x: 120, y: 270 },
      "SRC-04": { x: 120, y: 370 },
      "SRC-05": { x: 120, y: 470 },

      // Decisions & Claims
      "CLM-01": { x: 430, y: 60 },
      "CLM-TRAP-1A": { x: 430, y: 150 },
      "CLM-TRAP-1B": { x: 430, y: 230 },
      "CLM-TRAP-2": { x: 430, y: 310 },
      "CLM-TRAP-3": { x: 430, y: 390 },
      "CLM-TRAP-7": { x: 430, y: 470 },
      "CLM-TRAP-5": { x: 430, y: 550 },

      // People & Quarantine
      "USR-01": { x: 740, y: 120 },
      "USR-02": { x: 740, y: 250 },
      "USR-03": { x: 740, y: 380 },
      "SEC-01": { x: 740, y: 490 },
    };
  }, []);

  const selectedNode = useMemo(() => {
    return graphData.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [graphData.nodes, selectedNodeId]);

  // Connected node IDs and edges for the currently selected node
  const { connectedNodeIds, connectedEdges } = useMemo(() => {
    if (!selectedNodeId) {
      return { connectedNodeIds: new Set<string>(), connectedEdges: [] };
    }
    const nodes = new Set<string>([selectedNodeId]);
    const edges = graphData.edges.filter((e) => {
      if (e.source === selectedNodeId) {
        nodes.add(e.target);
        return true;
      }
      if (e.target === selectedNodeId) {
        nodes.add(e.source);
        return true;
      }
      return false;
    });
    return { connectedNodeIds: nodes, connectedEdges: edges };
  }, [graphData.edges, selectedNodeId]);

  const filteredNodes = useMemo(() => {
    return graphData.nodes.filter((node) => {
      if (filterType !== "all" && node.type !== filterType) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        node.id.toLowerCase().includes(q) ||
        node.label.toLowerCase().includes(q) ||
        (node.evidenceState && node.evidenceState.toLowerCase().includes(q))
      );
    });
  }, [graphData.nodes, filterType, searchQuery]);

  const handleNodeClick = (node: ContextNode) => {
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
    onSelectNode?.(node);
  };

  const getNodeColor = (type: ContextNodeType, state?: EvidenceState) => {
    if (state === "restricted") return "fill-slate-800 stroke-slate-600 text-slate-400";
    if (state === "conflicting") return "fill-purple-950 stroke-purple-500 text-purple-300";
    if (state === "unsupported") return "fill-red-950 stroke-red-500 text-red-300";
    if (state === "stale") return "fill-orange-950 stroke-orange-500 text-orange-300";
    if (state === "attested") return "fill-cyan-950 stroke-cyan-500 text-cyan-300";

    switch (type) {
      case "source":
        return "fill-blue-950 stroke-blue-500 text-blue-200";
      case "person":
        return "fill-amber-950 stroke-amber-500 text-amber-300";
      case "secret":
        return "fill-rose-950 stroke-rose-500 text-rose-300";
      case "decision":
      case "claim":
      default:
        return "fill-indigo-950 stroke-indigo-500 text-indigo-200";
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-surface border border-border-subtle shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-indigo-500/10 text-accent-primary">
              <Layers className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-text-primary tracking-tight">
              Interactive Context Web Graph
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {graphData.nodes.length} Nodes &bull; {graphData.edges.length} Edges
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Visual topology linking sources, atomic claims, people, and quarantine security vaults.
          </p>
        </div>

        {/* View Switcher & Category Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 font-mono text-xs">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterType === "all"
                  ? "bg-indigo-600 text-white font-bold"
                  : "bg-canvas text-text-secondary hover:text-text-primary border border-border-subtle"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterType("source")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterType === "source"
                  ? "bg-blue-600 text-white font-bold"
                  : "bg-canvas text-text-secondary hover:text-text-primary border border-border-subtle"
              }`}
            >
              Sources
            </button>
            <button
              type="button"
              onClick={() => setFilterType("claim")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterType === "claim"
                  ? "bg-indigo-600 text-white font-bold"
                  : "bg-canvas text-text-secondary hover:text-text-primary border border-border-subtle"
              }`}
            >
              Claims
            </button>
            <button
              type="button"
              onClick={() => setFilterType("person")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterType === "person"
                  ? "bg-amber-600 text-white font-bold"
                  : "bg-canvas text-text-secondary hover:text-text-primary border border-border-subtle"
              }`}
            >
              People
            </button>
          </div>

          {/* Graph vs Table Mode Toggle */}
          <div className="flex items-center gap-1 border-l border-border-subtle pl-2 font-mono text-xs">
            <button
              type="button"
              onClick={() => setViewMode("graph")}
              className={`px-2 py-1 rounded-md ${
                viewMode === "graph"
                  ? "bg-accent-primary text-white font-bold"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Graph View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-2 py-1 rounded-md ${
                viewMode === "table"
                  ? "bg-accent-primary text-white font-bold"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              List View
            </button>
          </div>
        </div>
      </div>

      {/* Main Graph Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* SVG Graph Canvas / Table Area */}
        <div className="lg:col-span-8 rounded-xl bg-canvas border border-border-subtle p-3 overflow-hidden shadow-inner flex flex-col">
          {viewMode === "graph" ? (
            <div className="relative w-full overflow-x-auto min-h-[580px] flex items-center justify-center">
              <svg
                viewBox="0 0 880 620"
                className="w-full max-w-[880px] h-[600px] select-none"
              >
                <defs>
                  {/* Arrowhead marker for citations */}
                  <marker
                    id="arrow-solid"
                    viewBox="0 0 10 10"
                    refX="22"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366F1" />
                  </marker>
                  <marker
                    id="arrow-conflict"
                    viewBox="0 0 10 10"
                    refX="22"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#A855F7" />
                  </marker>
                  <marker
                    id="arrow-dashed"
                    viewBox="0 0 10 10"
                    refX="22"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#06B6D4" />
                  </marker>
                </defs>

                {/* Render Edges */}
                <g className="edges">
                  {graphData.edges.map((edge) => {
                    const from = nodePositions[edge.source];
                    const to = nodePositions[edge.target];
                    if (!from || !to) return null;

                    const isHighlighted =
                      connectedEdges.some((e) => e.id === edge.id) || !selectedNodeId;
                    const isDimmed = selectedNodeId && !isHighlighted;

                    // Compute smooth curved Bezier connector
                    const midX = (from.x + to.x) / 2;
                    const d = `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;

                    let strokeColor = "#334155";
                    let markerEnd = "url(#arrow-solid)";
                    let strokeDasharray = "none";

                    if (edge.style === "conflict") {
                      strokeColor = "#A855F7";
                      markerEnd = "url(#arrow-conflict)";
                    } else if (edge.style === "dashed") {
                      strokeColor = "#06B6D4";
                      strokeDasharray = "4,4";
                      markerEnd = "url(#arrow-dashed)";
                    }

                    if (isHighlighted && selectedNodeId) {
                      strokeColor = edge.style === "conflict" ? "#C084FC" : "#818CF8";
                    }

                    return (
                      <g key={edge.id} className="transition-opacity duration-200">
                        <path
                          d={d}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth={isHighlighted && selectedNodeId ? 2.5 : 1.5}
                          strokeDasharray={strokeDasharray}
                          opacity={isDimmed ? 0.15 : 0.85}
                          markerEnd={markerEnd}
                        />
                      </g>
                    );
                  })}
                </g>

                {/* Render Nodes */}
                <g className="nodes">
                  {graphData.nodes.map((node) => {
                    const pos = nodePositions[node.id];
                    if (!pos) return null;

                    const isSelected = selectedNodeId === node.id;
                    const isConnected = connectedNodeIds.has(node.id);
                    const isDimmed = selectedNodeId && !isSelected && !isConnected;

                    const nodeColorClasses = getNodeColor(node.type, node.evidenceState);

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${pos.x}, ${pos.y})`}
                        onClick={() => handleNodeClick(node)}
                        className="cursor-pointer group"
                        opacity={isDimmed ? 0.25 : 1}
                      >
                        {/* Glow on Selected */}
                        {isSelected && (
                          <circle
                            r="28"
                            className="fill-indigo-500/20 stroke-indigo-400 stroke-2 animate-pulse"
                          />
                        )}

                        {/* Node Bubble */}
                        <circle
                          r="18"
                          className={`${nodeColorClasses} stroke-2 transition-all group-hover:scale-110 shadow-lg`}
                        />

                        {/* Node Center Icon / Symbol */}
                        <text
                          textAnchor="middle"
                          dy=".3em"
                          className="text-[9px] font-mono font-bold fill-white pointer-events-none"
                        >
                          {node.type === "source"
                            ? "SRC"
                            : node.type === "person"
                            ? "USR"
                            : node.type === "secret"
                            ? "SEC"
                            : "CLM"}
                        </text>

                        {/* Node Label Text */}
                        <text
                          textAnchor={pos.x < 300 ? "end" : pos.x > 600 ? "start" : "middle"}
                          dx={pos.x < 300 ? -24 : pos.x > 600 ? 24 : 0}
                          dy={pos.x >= 300 && pos.x <= 600 ? 32 : 4}
                          className={`text-[10px] font-mono font-bold transition-all pointer-events-none ${
                            isSelected
                              ? "fill-white"
                              : isConnected
                              ? "fill-indigo-300"
                              : "fill-slate-400"
                          }`}
                        >
                          {node.label.length > 28
                            ? node.label.slice(0, 26) + "..."
                            : node.label}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>
          ) : (
            // Accessible List / Table View
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-border-subtle text-text-muted uppercase text-[10px]">
                    <th className="py-2.5 px-3">ID</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Label</th>
                    <th className="py-2.5 px-3">Evidence State</th>
                    <th className="py-2.5 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/50">
                  {filteredNodes.map((node) => (
                    <tr
                      key={node.id}
                      onClick={() => handleNodeClick(node)}
                      className={`cursor-pointer transition-colors ${
                        selectedNodeId === node.id
                          ? "bg-indigo-950/30 text-white font-bold"
                          : "hover:bg-surface/50 text-text-secondary"
                      }`}
                    >
                      <td className="py-2 px-3 text-accent-cyan">{node.id}</td>
                      <td className="py-2 px-3 uppercase text-[10px] text-text-muted">
                        {node.type}
                      </td>
                      <td className="py-2 px-3 text-text-primary font-sans">{node.label}</td>
                      <td className="py-2 px-3">
                        {node.evidenceState ? (
                          <EvidenceBadge state={node.evidenceState} size="sm" />
                        ) : (
                          <span className="text-text-muted">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <button
                          type="button"
                          className="text-[11px] text-accent-primary hover:underline"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Graph Legend Footnote */}
          <div className="mt-auto pt-3 border-t border-border-subtle flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono text-text-muted">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>Source</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span>Claim / Decision</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Author / Mentor</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Quarantine Vault</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-indigo-400">Solid: Citation</span>
              <span className="text-cyan-400">Dashed: Attribution</span>
              <span className="text-purple-400">Purple: Contradiction</span>
            </div>
          </div>
        </div>

        {/* Node Detail Inspector Sheet */}
        <div className="lg:col-span-4 rounded-xl bg-surface border border-border-subtle p-4 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-accent-cyan" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-text-primary">
                Node Inspector
              </h3>
            </div>
            {selectedNode && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-canvas text-accent-cyan border border-border-subtle">
                {selectedNode.id}
              </span>
            )}
          </div>

          {selectedNode ? (
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-mono uppercase text-text-muted block">
                  Node Title &amp; Category
                </span>
                <h4 className="text-sm font-bold text-text-primary mt-0.5 leading-snug">
                  {selectedNode.label}
                </h4>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded uppercase text-[10px] font-mono font-bold bg-canvas border border-border-subtle text-text-secondary">
                    {selectedNode.type}
                  </span>
                  {selectedNode.evidenceState && (
                    <EvidenceBadge state={selectedNode.evidenceState} size="sm" />
                  )}
                </div>
              </div>

              {/* Planted Trap or Metadata Callout */}
              {selectedNode.metadata && (
                <div className="p-3 rounded-lg bg-canvas border border-border-subtle space-y-2 text-xs">
                  <span className="text-[10px] font-mono uppercase text-text-muted block">
                    Properties &amp; Attribution:
                  </span>
                  {Object.entries(selectedNode.metadata).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between font-mono text-[11px]"
                    >
                      <span className="text-text-muted capitalize">{key}:</span>
                      <span className="text-text-primary font-bold">{String(val)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Connected Relationships */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase text-text-muted block">
                  Connected Graph Relationships ({connectedEdges.length}):
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {connectedEdges.map((edge) => {
                    const isOutgoing = edge.source === selectedNode.id;
                    const neighborId = isOutgoing ? edge.target : edge.source;
                    const neighborNode = graphData.nodes.find((n) => n.id === neighborId);

                    return (
                      <button
                        key={edge.id}
                        type="button"
                        onClick={() => neighborNode && handleNodeClick(neighborNode)}
                        className="w-full text-left p-2 rounded-lg bg-canvas/70 border border-border-subtle hover:border-border-hover transition-all flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span
                            className={
                              edge.style === "conflict"
                                ? "text-purple-400 font-bold"
                                : "text-accent-cyan"
                            }
                          >
                            {isOutgoing ? `──► ${edge.label}` : `◄── ${edge.label}`}
                          </span>
                          <span className="text-text-primary truncate max-w-[140px]">
                            {neighborNode?.label || neighborId}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-text-muted">
                          {neighborId}
                        </span>
                      </button>
                    );
                  })}
                  {connectedEdges.length === 0 && (
                    <p className="text-text-muted text-xs font-mono">
                      No direct graph edges connected.
                    </p>
                  )}
                </div>
              </div>

              {/* Zero-Leak Security Check */}
              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className="font-sans text-[11px]">
                  Audience Scoped: Validated against Pre-Model and Post-Generation RBAC.
                </span>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-text-muted text-xs font-mono">
              Click any node in the Context Web to inspect connected citations, authorship, and evidence states.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
