"use client";

import { Button } from "@/components/ui/button";
import { buildGroceryList, formatGroceryText } from "@/lib/grocery";
import type { WeekPlan } from "@/lib/types";
import { useMemo, useState } from "react";

export function GroceryPanel({ plan, pantry }: { plan: WeekPlan | null; pantry: string[] }) {
  const [copied, setCopied] = useState(false);
  const list = useMemo(() => (plan ? buildGroceryList(plan, pantry) : null), [plan, pantry]);

  async function copyList() {
    if (!list) return;
    await navigator.clipboard.writeText(formatGroceryText(list));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function downloadList() {
    if (!list || !plan) return;
    const blob = new Blob([formatGroceryText(list)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `roomieplate-${plan.roommateName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-grocery.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section id="grocery" className="rounded-3xl bg-card p-4 shadow-sm ring-1 ring-foreground/10 sm:p-5" data-testid="grocery-list">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl">Grocery list</h2>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            Combined from the week. Pantry matches stay out of the shop, with the allergy note on top.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={!list} onClick={copyList}>
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button type="button" variant="outline" disabled={!list} onClick={downloadList}>
            Download
          </Button>
        </div>
      </div>

      {!list ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          The list fills in after you generate a week.
        </p>
      ) : (
        <div className="mt-4">
          <div className="rounded-2xl bg-[color-mix(in_oklch,var(--honey)_28%,white)] px-3 py-3 text-sm leading-6">
            {list.notes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {list.sections.map((section) => (
              <div key={section.aisle}>
                <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{section.label}</h3>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {section.lines.map((line) => (
                    <li key={`${section.aisle}-${line.item}`} className="flex justify-between gap-3">
                      <span>{line.item}</span>
                      <span className="text-muted-foreground">{line.amount}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {list.onHand.length > 0 ? (
            <div className="mt-4 border-t border-border pt-3">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Already on hand</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {list.onHand.map((line) => (
                  <li key={line.item} className="rounded-full bg-muted px-2.5 py-1 text-xs">
                    {line.item}
                    <span className="text-muted-foreground"> · {line.amount}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
