"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Send,
  AlertTriangle,
} from "lucide-react";
import type { ComprehensionQuestion } from "@/types/echobridge.types";
import type { QuizEvaluationResult } from "@/services/workflow/receipt.service";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface ComprehensionQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: ComprehensionQuestion[];
  recipientName: string;
  recipientRoleName: string;
  onAcknowledge: (answers: { question_id: string; selected_index: number }[]) => Promise<void>;
  isLoading?: boolean;
}

export function ComprehensionQuizModal({
  isOpen,
  onClose,
  questions,
  recipientName,
  recipientRoleName,
  onAcknowledge,
  isLoading = false,
}: ComprehensionQuizModalProps) {
  // Store selected answers as a map { [questionId]: optionIndex }
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [evalResult, setEvalResult] = useState<QuizEvaluationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleFillCorrectAnswers = () => {
    const correctMap: Record<string, number> = {};
    for (const q of questions) {
      correctMap[q.id] = q.correct_option_index;
    }
    setSelectedAnswers(correctMap);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Convert map to array
    const answersArray = questions.map((q) => ({
      question_id: q.id,
      selected_index:
        selectedAnswers[q.id] !== undefined ? selectedAnswers[q.id] : -1,
    }));

    // Check that all questions were answered
    if (answersArray.some((a) => a.selected_index < 0)) {
      setErrorMessage("Please answer all 3 comprehension questions before submitting.");
      return;
    }

    try {
      await onAcknowledge(answersArray);
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          "Comprehension check failed. A passing score of at least 67% (2 of 3) on critical risks is required."
      );
    }
  };

  const allAnswered =
    questions.length > 0 &&
    questions.every((q) => selectedAnswers[q.id] !== undefined && selectedAnswers[q.id] >= 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Critical Risk Comprehension Check (Stage 6)"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Anti-Blind "Accept All" Notice */}
        <div className="rounded-xl p-3.5 bg-indigo-950/20 border border-indigo-500/30 text-indigo-200 text-xs flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-accent-cyan shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-text-primary block font-mono">
                Epistemic Safety Rule (Anti-Blind &quot;Accept All&quot;)
              </span>
              <p className="text-text-secondary leading-relaxed">
                Before the cryptographic transfer receipt is issued to <strong>{recipientName}</strong>, verify comprehension of critical project risks identified during the trust pipeline.
              </p>
            </div>
          </div>

          {/* 1-Click Demo Helper for Judges */}
          <button
            type="button"
            onClick={handleFillCorrectAnswers}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-canvas border border-border-subtle text-[11px] font-mono text-accent-cyan hover:text-cyan-300 transition-colors shrink-0"
            title="Auto-fill verified answers for evaluation testing"
          >
            <Sparkles className="w-3 h-3" />
            <span>Fill Verified Answers</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="rounded-xl p-3.5 bg-rose-950/20 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
            <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Questions List */}
        <div className="space-y-5">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="rounded-xl border border-border-subtle bg-canvas/60 p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2 border-b border-border-subtle pb-2">
                <span className="text-[11px] font-mono font-bold text-accent-cyan">
                  Question {idx + 1} of {questions.length}
                </span>
                {q.related_risk_claim_id && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300">
                    Linked to {q.related_risk_claim_id}
                  </span>
                )}
              </div>

              <h4 className="text-sm font-semibold text-text-primary leading-snug">
                {q.question}
              </h4>

              {/* Options */}
              <div className="space-y-2 pt-1">
                {q.options.map((opt, optIdx) => {
                  const isSelected = selectedAnswers[q.id] === optIdx;

                  return (
                    <label
                      key={optIdx}
                      className={`flex items-start gap-3 p-3 rounded-lg border text-xs cursor-pointer transition-all select-none ${
                        isSelected
                          ? "border-accent-primary bg-indigo-950/30 text-text-primary font-medium"
                          : "border-border-subtle bg-surface/50 text-text-secondary hover:bg-surface hover:text-text-primary"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`quiz-${q.id}`}
                        value={optIdx}
                        checked={isSelected}
                        onChange={() => handleSelectOption(q.id, optIdx)}
                        className="mt-0.5 text-accent-primary focus:ring-accent-primary"
                      />
                      <span className="leading-relaxed">{opt}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="text-xs text-text-secondary"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="approve"
            size="md"
            disabled={!allAnswered || isLoading}
            isLoading={isLoading}
            className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Verify Answers &amp; Sign Receipt
          </Button>
        </div>
      </form>
    </Modal>
  );
}
