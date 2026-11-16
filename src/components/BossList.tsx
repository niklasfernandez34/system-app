import { useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import {
  Button,
  DateInput,
  Dialog,
  NumberInput,
  ProgressBar,
  SystemWindow,
} from "./ui";
import { ExercisePicker } from "./ExercisePicker";
import { XP } from "../config/xp";
import { addBoss, deleteBoss, useBosses } from "../lib/bosses";
import { fmt, useExerciseNames } from "../lib/sport";

type Draft = {
  exerciseId?: number;
  target: number;
  reps: number;
  deadline: string;
};

const inDays = (n: number) => format(addDays(new Date(), n), "yyyy-MM-dd");
const countdown = (d: number) =>
  d > 1
    ? `noch ${d} Tage`
    : d === 1
      ? "noch 1 Tag"
      : d === 0
        ? "letzter Tag"
        : "abgelaufen";

export function BossList({ compact = false }: { compact?: boolean }) {
  const bosses = useBosses();
  const names = useExerciseNames();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [picking, setPicking] = useState(false);
  const [showDone, setShowDone] = useState(false);

  if (!bosses) return null;
  const active = bosses.filter((b) => b.status === "active");
  const done = bosses.filter((b) => b.status !== "active").reverse();

  if (compact) {
    if (!active.length) return null;
    return (
      <SystemWindow title="Bosse">
        <ul className="space-y-3">
          {active.map((b) => (
            <li key={b.id}>
              <p className="mb-1 flex justify-between text-sm">
                <span>
                  {b.name} {fmt(b.target)} kg × {b.reps}
                </span>
                <span className="text-sys-muted">{countdown(b.daysLeft)}</span>
              </p>
              <ProgressBar value={b.best} max={b.target} />
            </li>
          ))}
        </ul>
      </SystemWindow>
    );
  }

  const save = async () => {
    if (!draft?.exerciseId) return;
    await addBoss({
      exerciseId: draft.exerciseId,
      target: draft.target,
      reps: draft.reps,
      deadline: draft.deadline,
    });
    setDraft(null);
  };

  return (
    <div className="space-y-4">
      {!active.length && (
        <p className="text-center text-sys-muted">Kein aktiver Boss.</p>
      )}
      <ul className="space-y-4">
        {active.map((b) => (
          <li key={b.id} className="space-y-1">
            <p className="flex justify-between gap-2 font-semibold">
              <span>
                {b.name} {fmt(b.target)} kg × {b.reps}
              </span>
              <span className="shrink-0 text-sm text-sys-glow">
                {countdown(b.daysLeft)}
              </span>
            </p>
            <ProgressBar
              value={b.best}
              max={b.target}
              label="Bestes Gewicht seit Start (kg)"
            />
            <button
              type="button"
              className="text-xs text-sys-muted underline"
              onClick={() => deleteBoss(b.id)}
            >
              Aufgeben
            </button>
          </li>
        ))}
      </ul>
      <Button
        className="w-full"
        onClick={() => setDraft({ target: 50, reps: 1, deadline: inDays(30) })}
      >
        Neuer Boss
      </Button>
      {done.length > 0 && (
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => setShowDone(!showDone)}
        >
          {showDone
            ? "Vergangene ausblenden"
            : `Vergangene Bosse (${done.length})`}
        </Button>
      )}
      {showDone && (
        <ul className="space-y-2">
          {done.map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span
                className={
                  b.status === "won" ? "text-sys-glow" : "text-sys-danger"
                }
              >
                {b.status === "won" ? "✓" : "✗"} {b.name} {fmt(b.target)} kg ×{" "}
                {b.reps}
              </span>
              {b.status === "lost" && (
                <Button
                  variant="ghost"
                  onClick={() =>
                    setDraft({
                      exerciseId: b.exerciseId,
                      target: b.target,
                      reps: b.reps,
                      deadline: inDays(30),
                    })
                  }
                >
                  Erneut
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!draft} onClose={() => setDraft(null)} title="Neuer Boss">
        {draft && (
          <div className="space-y-3">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setPicking(true)}
            >
              {draft.exerciseId ? names?.get(draft.exerciseId) : "Übung wählen"}
            </Button>
            <NumberInput
              label="Zielgewicht"
              unit="kg"
              step={2.5}
              min={0}
              value={draft.target}
              onChange={(target) => setDraft({ ...draft, target })}
            />
            <NumberInput
              label="Wiederholungen"
              step={1}
              min={1}
              value={draft.reps}
              onChange={(reps) => setDraft({ ...draft, reps })}
            />
            <DateInput
              label="Termin"
              min={inDays(1)}
              value={draft.deadline}
              onChange={(deadline) => setDraft({ ...draft, deadline })}
            />
            <p className="text-center text-xs text-sys-muted">
              Sieg bis{" "}
              {format(parseISO(draft.deadline), "d. MMMM yyyy", { locale: de })}
              : +{XP.boss_defeated} XP
            </p>
            <Button
              className="w-full"
              disabled={!draft.exerciseId || draft.target <= 0}
              onClick={save}
            >
              Herausfordern
            </Button>
          </div>
        )}
      </Dialog>
      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(exerciseId) => {
          setPicking(false);
          setDraft((d) => d && { ...d, exerciseId });
        }}
      />
    </div>
  );
}
