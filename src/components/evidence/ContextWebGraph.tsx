"use client";

import React, { useState, useMemo } from "react";
import { Layers, Info, CheckCircle2 } from "lucide-react";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import type {
  AudienceRole,
  ContextGraphData,
  ContextNode,
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
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    "CLM-TRAP-2"
  );
  const [filterType, setFilterType] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"graph" | "table">("graph");

  const graphData = useMemo(() => {
    return propData || getContextGraphData(audienceRole);
  }, [propData, audienceRole]);

  const nodePositions = useMemo<Record<string, NodePosition>>(() => {
    return {
      // Column 1: Sources
      "SRC-01": { x: 120, y: 70 },
      "SRC-02": { x: 120, y: 170 },
      "SRC-03": { x: 120, y: 270 },
      "SRC-04": { x: 120, y: 370 },
      "SRC-05": { x: 120, y: 470 },

      // Column 2: Decisions & Claims
      "CLM-01": { x: 430, y: 60 },
      "CLM-TRAP-1A": { x: 430, y: 150 },
      "CLM-TRAP-1B": { x: 430, y: 230 },
      "CLM-TRAP-2": { x: 430, y: 310 },
      "CLM-TRAP-3": { x: 430, y: 390 },
      "CLM-TRAP-7": { x: 430, y: 470 },
      "CLM-TRAP-5": { x: 430, y: 550 },

      // Column 3: People & Quarantine
      "USR-01": { x: 740, y: 120 },
      "USR-02": { x: 740, y: 250 },
      "USR-03": { x: 740, y: 380 },
      "SEC-01": { x: 740, y: 490 },
    };
  }, []);

  const selectedNode = useMemo(() => {
    return graphData.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [graphData.nodes, selectedNodeId]);

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
      return true;
    });
  }, [graphData.nodes, filterType]);

  const handleNodeClick = (node: ContextNode) => {
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
    onSelectNode?.(node);
  };

  const getNodeStyle = (type: ContextNodeType, state?: EvidenceState) => {
    if (state === "restricted") return "fill-slate-100 stroke-slate-400";
    if (state === "conflicting") return "fill-purple-50 stroke-purple-500";
    if (state === "unsupported") return "fill-rose-50 stroke-rose-500";
    if (state === "stale") return "fill-orange-50 stroke-orange-500";
    if (state === "attested") return "fill-blue-50 stroke-blue-500";
    if (state === "corroborated") return "fill-emerald-50 stroke-emerald-500";

    switch (type) {
      case "source":
        return "fill-teal-50 stroke-teal-600";
      case "person":
        return "fill-amber-50 stroke-amber-500";
      case "secret":
        return "fill-rose-50 stroke-rose-500";
      default:
        return "fill-emerald-50 stroke-emerald-600";
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
              <Layers className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Project Knowledge Connections
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 cursor-default select-none">
              {graphData.nodes.length} Items &bull; {graphData.edges.length}{" "}
              Links
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            See how project files connect to handover claims, contributors, and
            protected information.
          </p>
        </div>

        {/* Filter & View Switcher */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                filterType === "all"
                  ? "bg-teal-700 text-white border-teal-700 font-semibold"
                  : "bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-medium"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterType("source")}
              className={`px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                filterType === "source"
                  ? "bg-teal-700 text-white border-teal-700 font-semibold"
                  : "bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-medium"
              }`}
            >
              Files
            </button>
            <button
              type="button"
              onClick={() => setFilterType("claim")}
              className={`px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                filterType === "claim"
                  ? "bg-teal-700 text-white border-teal-700 font-semibold"
                  : "bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-medium"
              }`}
            >
              Claims
            </button>
            <button
              type="button"
              onClick={() => setFilterType("person")}
              className={`px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                filterType === "person"
                  ? "bg-teal-700 text-white border-teal-700 font-semibold"
                  : "bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-medium"
              }`}
            >
              People
            </button>
          </div>

          <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
            <button
              type="button"
              onClick={() => setViewMode("graph")}
              className={`px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                viewMode === "graph"
                  ? "bg-slate-900 text-white font-semibold"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Diagram
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                viewMode === "table"
                  ? "bg-slate-900 text-white font-semibold"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Main Graph & Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* SVG Canvas / List Area */}
        <div className="lg:col-span-8 rounded-xl bg-slate-50 border border-slate-200 p-3 overflow-hidden shadow-sm flex flex-col">
          {viewMode === "graph" ? (
            <div className="relative w-full overflow-x-auto min-h-[540px] flex items-center justify-center">
              <svg
                viewBox="0 0 880 620"
                className="w-full max-w-[880px] h-[560px] select-none"
              >
                <defs>
                  <marker
                    id="arrow-solid"
                    viewBox="0 0 10 10"
                    refX="22"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#0F766E" />
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
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#9333EA" />
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
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563EB" />
                  </marker>
                </defs>

                {/* Render Edges */}
                <g className="edges">
                  {graphData.edges.map((edge) => {
                    const from = nodePositions[edge.source];
                    const to = nodePositions[edge.target];
                    if (!from || !to) return null;

                    const isHighlighted =
                      connectedEdges.some((e) => e.id === edge.id) ||
                      !selectedNodeId;
                    const isDimmed = selectedNodeId && !isHighlighted;

                    const midX = (from.x + to.x) / 2;
                    const d = `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;

                    let strokeColor = "#CBD5E1";
                    let markerEnd = "url(#arrow-solid)";
                    let strokeDasharray = "none";

                    if (edge.style === "conflict") {
                      strokeColor = "#9333EA";
                      markerEnd = "url(#arrow-conflict)";
                    } else if (edge.style === "dashed") {
                      strokeColor = "#3B82F6";
                      strokeDasharray = "4,4";
                      markerEnd = "url(#arrow-dashed)";
                    }

                    if (isHighlighted && selectedNodeId) {
                      strokeColor =
                        edge.style === "conflict" ? "#9333EA" : "#0F766E";
                    }

                    return (
                      <g key={edge.id}>
                        <path
                          d={d}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth={isHighlighted && selectedNodeId ? 2.5 : 1.5}
                          strokeDasharray={strokeDasharray}
                          opacity={isDimmed ? 0.2 : 0.9}
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
                    const isDimmed =
                      selectedNodeId && !isSelected && !isConnected;

                    const nodeClasses = getNodeStyle(
                      node.type,
                      node.evidenceState
                    );

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${pos.x}, ${pos.y})`}
                        onClick={() => handleNodeClick(node)}
                        className="cursor-pointer group"
                        opacity={isDimmed ? 0.3 : 1}
                      >
                        {isSelected && (
                          <circle
                            r="26"
                            className="fill-teal-500/15 stroke-teal-600 stroke-2"
                          />
                        )}

                        <circle
                          r="18"
                          className={`${nodeClasses} stroke-2 transition-transform group-hover:scale-105`}
                        />

                        <text
                          textAnchor="middle"
                          dy=".3em"
                          className="text-[9px] font-sans font-bold fill-slate-800 pointer-events-none"
                        >
                          {node.type === "source"
                            ? "FILE"
                            : node.type === "person"
                            ? "TEAM"
                            : node.type === "secret"
                            ? "SAFE"
                            : "CLAIM"}
                        </text>

                        <text
                          textAnchor={
                            pos.x < 300
                              ? "end"
                              : pos.x > 600
                              ? "start"
                              : "middle"
                          }
                          dx={pos.x < 300 ? -24 : pos.x > 600 ? 24 : 0}
                          dy={pos.x >= 300 && pos.x <= 600 ? 32 : 4}
                          className={`text-[11px] font-sans font-semibold pointer-events-none ${
                            isSelected
                              ? "fill-slate-950"
                              : isConnected
                              ? "fill-teal-900"
                              : "fill-slate-600"
                          }`}
                        >
                          {node.label.length > 26
                            ? node.label.slice(0, 24) + "..."
                            : node.label}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-200">
              {filteredNodes.map((node) => (
                <div
                  key={node.id}
                  onClick={() => handleNodeClick(node)}
                  className={`p-3 cursor-pointer transition-colors flex flex-wrap items-center justify-between gap-2 text-xs ${
                    selectedNodeId === node.id
                      ? "bg-teal-50 font-semibold text-slate-900"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 capitalize border border-slate-200">
                      {node.type}
                    </span>
                    <span className="truncate">{node.label}</span>
                  </div>
                  {node.evidenceState && (
                    <EvidenceBadge state={node.evidenceState} size="sm" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="mt-auto pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                <span>File</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span>Claim</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Team Member</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Quarantine Vault</span>
              </span>
            </div>
          </div>
        </div>

        {/* Node Detail Inspector */}
        <div className="lg:col-span-4 rounded-xl bg-white border border-slate-200 p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-teal-700" />
              <h3 className="text-sm font-bold text-slate-900">
                Item Details
              </h3>
            </div>
          </div>

          {selectedNode ? (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 leading-snug">
                  {selectedNode.label}
                </h4>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="px-2.5 py-0.5 rounded-full capitalize text-xs font-medium bg-slate-100 border border-slate-200 text-slate-700 cursor-default select-none">
                    {selectedNode.type}
                  </span>
                  {selectedNode.evidenceState && (
                    <EvidenceBadge state={selectedNode.evidenceState} size="sm" />
                  )}
                </div>
              </div>

              {/* Connected Items */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-600 block">
                  Connected Items ({connectedEdges.length})
                </span>
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {connectedEdges.map((edge) => {
                    const isOutgoing = edge.source === selectedNode.id;
                    const neighborId = isOutgoing ? edge.target : edge.source;
                    const neighborNode = graphData.nodes.find(
                      (n) => n.id === neighborId
                    );

                    return (
                      <button
                        key={edge.id}
                        type="button"
                        onClick={() => neighborNode && handleNodeClick(neighborNode)}
                        className="w-full text-left p-2.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-teal-50 hover:border-teal-200 transition-colors flex items-center justify-between text-xs cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={
                              edge.style === "conflict"
                                ? "text-purple-700 font-semibold shrink-0"
                                : "text-teal-700 font-semibold shrink-0"
                            }
                          >
                            {edge.label}:
                          </span>
                          <span className="text-slate-900 truncate">
                            {neighborNode?.label || neighborId}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                  {connectedEdges.length === 0 && (
                    <p className="text-slate-500 text-xs">
                      No direct connections.
                    </p>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
                <span>Scoped automatically to selected role permissions.</span>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              Click any item in the diagram to inspect its sources and contributors.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
