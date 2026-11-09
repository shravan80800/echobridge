import {
  ShieldCheck,
  AlertCircle,
  UserCheck,
  ClockAlert,
  GitCompare,
  FileQuestion,
  Lock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { EVIDENCE_STATE_COLORS, type EvidenceStateKey } from "@/utils/theme-tokens";

const iconMap = {
  ShieldCheck,
  AlertCircle,
  UserCheck,
  ClockAlert,
  GitCompare,
  FileQuestion,
  Lock,
} as const;

export default function HomePage() {
  const states = Object.entries(EVIDENCE_STATE_COLORS) as [
    EvidenceStateKey,
    (typeof EVIDENCE_STATE_COLORS)[EvidenceStateKey]
  ][];

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-6 md:p-12 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="w-full flex items-center justify-between border-b border-border-subtle pb-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-accent-primary flex items-center justify-center text-white shadow-glow">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary">
              EchoBridge
            </h1>
            <p className="text-xs font-mono text-text-muted uppercase tracking-wider">
              Verification &amp; Handover Platform
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-surface text-accent-cyan border border-border-subtle">
            DESIGN TOKENS ACTIVE
          </span>
        </div>
      </div>

      {/* Hero Showcase Card */}
      <section className="w-full bg-glass rounded-xl p-8 border border-white/10 mb-10 shadow-glow">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-accent-primary/10 text-accent-primary border border-accent-primary/20 mb-4">
            <span>TASK-002</span>
            <span>•</span>
            <span>DARK-FIRST TECH DESIGN SYSTEM</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-text-primary mb-3">
            Every claim cited. Every access controlled. Nothing lost when people leave.
          </h2>
          <p className="text-text-secondary text-sm md:text-base leading-relaxed mb-6">
            Obsidian slate surfaces, Electric Indigo &amp; Cyber Cyan accents, and 7 accessible evidence states with triple-signal verification (Colour + Lucide Icon + Monospace Label).
          </p>
        </div>
      </section>

      {/* Evidence States Token Grid */}
      <section className="w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold tracking-tight text-text-primary">
            7 Evidence State Tokens
          </h3>
          <span className="text-xs font-mono text-text-muted">
            DESIGN.md Section 4
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {states.map(([key, item]) => {
            const IconComponent = iconMap[item.icon as keyof typeof iconMap];
            return (
              <div
                key={key}
                className="bg-surface rounded-xl p-5 border border-border-subtle hover:bg-surface-hover transition-colors"
                style={{ borderLeft: item.border }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold tracking-wider uppercase"
                    style={{
                      backgroundColor: item.bg,
                      color: item.hex,
                    }}
                  >
                    {IconComponent && <IconComponent className="w-3.5 h-3.5" />}
                    {item.label}
                  </span>
                  <span className="text-[11px] font-mono text-text-muted uppercase">
                    {item.hex}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                  {item.meaning}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Surface Tokens Inspector */}
      <section className="w-full mt-10">
        <div className="bg-surface rounded-xl p-6 border border-border-subtle">
          <h4 className="text-sm font-semibold text-text-primary mb-3">
            Configured Design Tokens
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-canvas border border-border-subtle">
              <span className="text-text-muted block text-[10px]">CANVAS</span>
              <span className="text-text-primary font-bold">#090D16</span>
            </div>
            <div className="p-3 rounded-lg bg-surface border border-border-subtle">
              <span className="text-text-muted block text-[10px]">SURFACE</span>
              <span className="text-text-primary font-bold">#111827</span>
            </div>
            <div className="p-3 rounded-lg bg-surface-hover border border-border-subtle">
              <span className="text-text-muted block text-[10px]">SURFACE-HOVER</span>
              <span className="text-text-primary font-bold">#1E293B</span>
            </div>
            <div className="p-3 rounded-lg bg-accent-primary/20 border border-accent-primary/40">
              <span className="text-accent-primary block text-[10px]">ACCENT</span>
              <span className="text-text-primary font-bold">#6366F1</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
