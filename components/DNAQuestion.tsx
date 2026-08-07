"use client";

import { DNAQuestion } from "@/types/travel";
import { OptionCard } from "./OptionCard";

interface DNAQuestionProps {
  question: DNAQuestion;
  selected: string[];
  onToggle: (optionLabel: string) => void;
}

export function DNAQuestionCard({ question, selected, onToggle }: DNAQuestionProps) {
  const handleClick = (label: string) => {
    if (question.type === "single") {
      onToggle(label);
    } else {
      onToggle(label);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <h2 className="text-2xl font-bold text-center mb-2">{question.question}</h2>
      {question.subtitle && (
        <p className="text-sm text-muted-foreground text-center mb-6">{question.subtitle}</p>
      )}
      <div className={question.subtitle ? "space-y-3" : "space-y-3 mt-8"}>
        {question.options.map((opt) => (
          <OptionCard
            key={opt.label}
            label={opt.label}
            icon={opt.icon}
            desc={opt.desc}
            selected={selected.includes(opt.label)}
            onClick={() => handleClick(opt.label)}
            variant={question.type === "multi" ? "multi" : "single"}
          />
        ))}
      </div>
    </div>
  );
}
