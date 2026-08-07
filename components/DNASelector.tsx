"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface DNASelectorProps {
  categories: { id: string; label: string; options: string[] }[];
  selected: Record<string, string[]>;
  onChange: (categoryId: string, values: string[]) => void;
}

export function DNASelector({ categories, selected, onChange }: DNASelectorProps) {
  const toggleOption = (categoryId: string, option: string) => {
    const current = selected[categoryId] || [];
    const updated = current.includes(option)
      ? current.filter((o) => o !== option)
      : [...current, option];
    onChange(categoryId, updated);
  };

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {categories.map((category) => (
        <Card key={category.id} className="border-dashed">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-3">{category.label}</h3>
            <div className="flex flex-wrap gap-2">
              {category.options.map((option) => {
                const isSelected = (selected[category.id] || []).includes(option);
                return (
                  <button
                    key={option}
                    onClick={() => toggleOption(category.id, option)}
                    className={cn(
                      "px-3 py-1.5 text-sm rounded-full border transition-all duration-200",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                    )}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
