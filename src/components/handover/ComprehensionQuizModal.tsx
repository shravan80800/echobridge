"use client";

import React, { useState } from "react";
import { ShieldAlert, XCircle, Sparkles, Send } from "lucide-react";
import type { ComprehensionQuestion } from "@/types/echobridge.types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface ComprehensionQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: ComprehensionQuestion[];
  recipientName: string;
  recipientRoleName: string;
  cleanMode?: boolean;
  onAcknowledge: (
    answers: { question_id: string; selected_index: number }[]
  ) => Promise<void>;
  isLoading?: boolean;
}

export function ComprehensionQuizModal({
  isOpen,
  onClose,
  questions,
  recipientName,
  cleanMode = false,
  onAcknowledge,
  isLoading = false,
}: ComprehensionQuizModalProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, number>
  >({});
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

    const answersArray = questions.map((q) => ({
      question_id: q.id,
      selected_index:
        selectedAnswers[q.id] !== undefined ? selectedAnswers[q.id] : -1,
    }));

    if (answersArray.some((a) => a.selected_index < 0)) {
      setErrorMessage(
        "Please answer all 3 quick checks before acknowledging the handover."
      );
      return;
    }

    try {
      await onAcknowledge(answersArray);
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Please double-check your answers on critical project risks.";
      setErrorMessage(msg);
    }
  };

  const allAnswered =
    questions.length > 0 &&
    questions.every(
      (q) =>
        selectedAnswers[q.id] !== undefined && selectedAnswers[q.id] >= 0
    );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        cleanMode
          ? "Quick Comprehension Check"
          : "Critical Risk Comprehension Check"
      }
      description={`Confirm key handover details before issuing a receipt to ${recipientName}.`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Summary Notice + Demo Fill Button */}
        <div className="rounded-xl p-4 bg-teal-50/70 border border-teal-200 text-slate-800 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Answer 3 brief questions to verify critical project decisions before signing.
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleFillCorrectAnswers}
            leftIcon={<Sparkles className="w-3.5 h-3.5 text-teal-700" />}
            className="shrink-0 self-start sm:self-center"
          >
            {cleanMode ? "Fill sample answers" : "Fill Verified Answers"}
          </Button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="rounded-xl p-3.5 bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm flex items-start gap-2.5">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Questions List */}
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <span className="text-xs font-semibold text-teal-800">
                  Question {idx + 1} of {questions.length}
                </span>
              </div>

              <h4 className="text-sm font-semibold text-slate-900 leading-snug">
                {q.question}
              </h4>

              <div className="space-y-2 pt-1">
                {q.options.map((opt, optIdx) => {
                  const isSelected = selectedAnswers[q.id] === optIdx;

                  return (
                    <label
                      key={optIdx}
                      className={`flex items-start gap-3 p-3 rounded-lg border text-xs sm:text-sm cursor-pointer transition-colors select-none ${
                        isSelected
                          ? "border-teal-600 bg-teal-50 text-slate-900 font-medium"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`quiz-${q.id}`}
                        value={optIdx}
                        checked={isSelected}
                        onChange={() => handleSelectOption(q.id, optIdx)}
                        className="mt-0.5 text-teal-700 focus:ring-teal-600"
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
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="approve"
            disabled={!allAnswered || isLoading}
            isLoading={isLoading}
            leftIcon={<Send className="w-4 h-4" />}
          >
            {cleanMode
              ? "Acknowledge & Sign Receipt"
              : "Verify Answers & Sign Receipt"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
