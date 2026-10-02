"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export function ChipField({
  label,
  hint,
  values,
  onChange,
  placeholder,
  suggestions = [],
  inputId,
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  suggestions?: string[];
  inputId: string;
}) {
  const [draft, setDraft] = useState("");

  function add(value: string) {
    const next = value.trim().replace(/\s+/g, " ");
    if (next.length < 2) return;
    if (values.some((item) => item.toLowerCase() === next.toLowerCase())) return;
    onChange([...values, next]);
  }

  const unusedSuggestions = suggestions.filter(
    (suggestion) => !values.some((value) => value.toLowerCase() === suggestion.toLowerCase()),
  );

  return (
    <div>
      <Label htmlFor={inputId}>{label}</Label>
      {hint ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p> : null}
      {values.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {values.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange(values.filter((item) => item !== value))}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
            >
              {value}
              <span aria-hidden="true">×</span>
              <span className="sr-only">Remove {value}</span>
            </button>
          ))}
        </div>
      ) : null}
      <Input
        id={inputId}
        value={draft}
        placeholder={placeholder}
        className="mt-2 h-9 bg-card"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          add(draft);
          setDraft("");
        }}
      />
      {unusedSuggestions.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {unusedSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => add(suggestion)}
              className="rounded-full border border-border bg-card px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
            >
              + {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
