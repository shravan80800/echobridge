"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FolderGit2, ChevronDown, Check, Plus } from "lucide-react";
import { useRole } from "./RoleContext";

export function ProjectSwitcherBar() {
  const { activeProjectId, activeProjectName, projects, setActiveProject } =
    useRole();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const isDemo = activeProjectId === "CampusConnect";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 min-h-[34px] rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-300 text-xs font-sans text-slate-800 shadow-sm cursor-pointer transition-colors select-none focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-1"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title={`Active Project Workspace: ${activeProjectName}`}
      >
        <span aria-hidden="true" className="text-xs leading-none">
          📁
        </span>
        <span className="font-semibold text-slate-900 max-w-[95px] sm:max-w-[140px] truncate">
          {activeProjectName}
        </span>
        <span
          className={`hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border leading-none ${
            isDemo
              ? "bg-slate-100 text-slate-600 border-slate-200"
              : "bg-teal-50 text-teal-800 border-teal-200"
          }`}
        >
          {isDemo ? "Demo" : "Live Import"}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl bg-white border border-slate-200 shadow-lg p-2 z-50">
          <div className="px-2.5 py-2 border-b border-slate-100 mb-1.5">
            <span className="text-xs font-semibold text-slate-900 block">
              Project Workspace
            </span>
            <span className="text-xs text-slate-500">
              Switch between demo &amp; live imported repositories
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1">
            {projects.map((proj) => {
              const isActive = proj.id === activeProjectId;
              const isCampusConnect = proj.id === "CampusConnect";
              const displayLabel = isCampusConnect
                ? "CampusConnect (Synthetic Demo)"
                : proj.name;

              return (
                <button
                  key={proj.id}
                  type="button"
                  onClick={() => {
                    setActiveProject(proj.id, proj.name);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-lg border transition-colors cursor-pointer flex flex-col gap-1 ${
                    isActive
                      ? "bg-teal-50/70 border-teal-200"
                      : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 w-full">
                    <div className="flex items-center gap-2 min-w-0">
                      <FolderGit2
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? "text-teal-700" : "text-slate-500"
                        }`}
                      />
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {displayLabel}
                      </span>
                      {isActive && (
                        <Check className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                      )}
                    </div>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                        isCampusConnect
                          ? "bg-slate-100 text-slate-700 border-slate-200"
                          : "bg-teal-50 text-teal-800 border-teal-200"
                      }`}
                    >
                      {isCampusConnect ? "Demo" : "Live"}
                    </span>
                  </div>

                  {proj.description && (
                    <p className="text-[11px] text-slate-500 pl-6 truncate w-full">
                      {proj.description}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push("/connect#live-import");
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Import New GitHub Repo / Google Doc →</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
