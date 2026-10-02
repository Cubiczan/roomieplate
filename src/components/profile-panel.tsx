"use client";

import { ChipField } from "@/components/chip-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ALLERGEN_CATALOG } from "@/lib/allergens";
import { PANTRY_SUGGESTIONS } from "@/lib/defaults";
import { CUISINES, type RoommateProfile } from "@/lib/types";

export function ProfilePanel({
  profile,
  pantry,
  generating,
  onProfile,
  onPantry,
  onLoadAlex,
  onGenerate,
}: {
  profile: RoommateProfile;
  pantry: string[];
  generating: boolean;
  onProfile: (profile: RoommateProfile) => void;
  onPantry: (pantry: string[]) => void;
  onLoadAlex: () => void;
  onGenerate: () => void;
}) {
  function patch(partial: Partial<RoommateProfile>) {
    onProfile({ ...profile, ...partial });
  }

  function toggleAllergy(id: string) {
    const allergies = profile.allergies.includes(id)
      ? profile.allergies.filter((item) => item !== id)
      : [...profile.allergies, id];
    patch({ allergies });
  }

  function toggleCuisine(cuisine: string) {
    const cuisines = profile.cuisines.includes(cuisine)
      ? profile.cuisines.filter((item) => item !== cuisine)
      : [...profile.cuisines, cuisine];
    patch({ cuisines });
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onGenerate();
      }}
    >
      <section className="rounded-3xl bg-card p-4 shadow-sm ring-1 ring-foreground/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-xl text-foreground">Roommate</h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              The plan is for the person you cook beside. Allergies are a hard stop.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onLoadAlex} data-testid="load-alex">
            Load Alex
          </Button>
        </div>

        <div className="mt-4 grid gap-3">
          <div>
            <Label htmlFor="roommate-name">Name</Label>
            <Input
              id="roommate-name"
              value={profile.name}
              onChange={(event) => patch({ name: event.target.value })}
              className="mt-1.5 h-9 bg-background"
              placeholder="Alex"
              required
            />
          </div>

          <div>
            <p className="text-sm font-medium">Allergies</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              These ingredients, and the sauces made from them, stay out of every meal.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ALLERGEN_CATALOG.map((allergen) => {
                const selected = profile.allergies.includes(allergen.id);
                return (
                  <button
                    key={allergen.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleAllergy(allergen.id)}
                    className={
                      selected
                        ? "rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
                        : "rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
                    }
                  >
                    {allergen.label}
                  </button>
                );
              })}
            </div>
          </div>

          <ChipField
            label="Other allergies"
            hint="Type a food and press Enter. Custom names are excluded as whole words."
            values={profile.customAllergies}
            onChange={(customAllergies) => patch({ customAllergies })}
            placeholder="Kiwi, mustard…"
            inputId="custom-allergies"
          />

          <ChipField
            label="Dislikes"
            hint="Skipped when another safe dish is available."
            values={profile.dislikes}
            onChange={(dislikes) => patch({ dislikes })}
            placeholder="Olives"
            suggestions={["olives", "mushrooms", "cilantro"]}
            inputId="dislikes"
          />

          <div>
            <p className="text-sm font-medium">Cuisines</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CUISINES.map((cuisine) => {
                const selected = profile.cuisines.includes(cuisine);
                return (
                  <button
                    key={cuisine}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleCuisine(cuisine)}
                    className={
                      selected
                        ? "rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground ring-1 ring-sage/30"
                        : "rounded-full bg-muted px-2.5 py-1 text-xs text-foreground"
                    }
                  >
                    {cuisine}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium">Meals</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <ModeButton
                pressed={profile.meals === "dinners"}
                onClick={() => patch({ meals: "dinners" })}
                title="Dinners"
                detail="Seven weeknights"
              />
              <ModeButton
                pressed={profile.meals === "all"}
                onClick={() => patch({ meals: "all" })}
                title="Full day"
                detail="Breakfast, lunch, dinner"
              />
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <Label htmlFor="time-budget">Time budget</Label>
              <span className="font-heading text-lg">{profile.timeBudgetMinutes} min</span>
            </div>
            <input
              id="time-budget"
              type="range"
              min={10}
              max={60}
              step={5}
              value={profile.timeBudgetMinutes}
              onChange={(event) => patch({ timeBudgetMinutes: Number(event.target.value) })}
              className="mt-2 w-full accent-[var(--primary)]"
            />
          </div>

          <button
            type="button"
            aria-pressed={profile.vegetarianFriendly}
            onClick={() => patch({ vegetarianFriendly: !profile.vegetarianFriendly })}
            className="flex items-center justify-between rounded-2xl bg-muted px-3 py-2 text-left text-sm"
          >
            <span>
              <span className="block font-medium">Vegetarian-friendly</span>
              <span className="text-xs text-muted-foreground">Prefer plants when the clock is short.</span>
            </span>
            <span
              className={
                profile.vegetarianFriendly
                  ? "rounded-full bg-sage px-2 py-0.5 text-xs font-medium text-white"
                  : "rounded-full bg-card px-2 py-0.5 text-xs text-muted-foreground"
              }
            >
              {profile.vegetarianFriendly ? "On" : "Off"}
            </span>
          </button>

          <div>
            <Label htmlFor="notes">Kitchen notes</Label>
            <textarea
              id="notes"
              value={profile.notes}
              onChange={(event) => patch({ notes: event.target.value })}
              rows={3}
              className="mt-1.5 w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              placeholder="Anything else the local model should know"
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-card p-4 shadow-sm ring-1 ring-foreground/10">
        <h2 className="font-heading text-xl">On hand</h2>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">
          Optional. Matching ingredients move to the already-on-hand side of the grocery list.
        </p>
        <div className="mt-3">
          <ChipField
            label="Pantry"
            values={pantry}
            onChange={onPantry}
            placeholder="Add an ingredient"
            suggestions={PANTRY_SUGGESTIONS}
            inputId="pantry"
          />
        </div>
      </section>

      <Button
        type="submit"
        disabled={generating || profile.name.trim().length === 0}
        data-testid="generate-week"
        className="h-11 w-full text-base"
      >
        {generating ? "Writing the week…" : `Plan ${profile.name.trim() || "the"} week`}
      </Button>
    </form>
  );
}

function ModeButton({
  pressed,
  onClick,
  title,
  detail,
}: {
  pressed: boolean;
  onClick: () => void;
  title: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={
        pressed
          ? "rounded-2xl bg-primary px-3 py-2 text-left text-primary-foreground"
          : "rounded-2xl bg-muted px-3 py-2 text-left"
      }
    >
      <span className="block text-sm font-medium">{title}</span>
      <span className={pressed ? "text-xs text-primary-foreground/80" : "text-xs text-muted-foreground"}>{detail}</span>
    </button>
  );
}
