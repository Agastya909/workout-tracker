export type ImportRow = {
  date: string;
  workout_name: string;
  exercise_name: string;
  set_number: number;
  weight: number | null;
  reps: number;
  is_bodyweight: boolean;
};

export function parseImportCsv(text: string): ImportRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const header = lines[0].split(",").map((h) => h.trim());
  const idx = (name: string) => header.indexOf(name);

  const dateIdx = idx("date");
  const workoutIdx = idx("workout_name");
  const exerciseIdx = idx("exercise_name");
  const setIdx = idx("set_number");
  const weightIdx = idx("weight");
  const repsIdx = idx("reps");
  const bwIdx = idx("is_bodyweight");

  if ([dateIdx, workoutIdx, exerciseIdx, setIdx, repsIdx].some((i) => i === -1)) {
    throw new Error(
      "CSV must include columns: date, workout_name, exercise_name, set_number, weight, reps, is_bodyweight"
    );
  }

  const rows: ImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const isBodyweight = bwIdx !== -1 ? cols[bwIdx]?.trim().toLowerCase() === "true" : false;
    const weightRaw = cols[weightIdx]?.trim();
    rows.push({
      date: cols[dateIdx]?.trim(),
      workout_name: cols[workoutIdx]?.trim(),
      exercise_name: cols[exerciseIdx]?.trim(),
      set_number: parseInt(cols[setIdx]?.trim(), 10),
      weight: weightRaw ? parseFloat(weightRaw) : null,
      reps: parseInt(cols[repsIdx]?.trim(), 10),
      is_bodyweight: isBodyweight,
    });
  }
  return rows;
}

export type ImportSession = {
  date: string;
  workout_name: string;
  exercises: {
    exercise_name: string;
    sets: { set_number: number; weight: number | null; reps: number; is_bodyweight: boolean }[];
  }[];
};

export function groupRowsIntoSessions(rows: ImportRow[]): ImportSession[] {
  const sessionMap = new Map<string, ImportSession>();

  for (const row of rows) {
    const sessionKey = `${row.date}__${row.workout_name}`;
    let session = sessionMap.get(sessionKey);
    if (!session) {
      session = { date: row.date, workout_name: row.workout_name, exercises: [] };
      sessionMap.set(sessionKey, session);
    }

    let exercise = session.exercises.find((e) => e.exercise_name === row.exercise_name);
    if (!exercise) {
      exercise = { exercise_name: row.exercise_name, sets: [] };
      session.exercises.push(exercise);
    }

    exercise.sets.push({
      set_number: row.set_number,
      weight: row.weight,
      reps: row.reps,
      is_bodyweight: row.is_bodyweight,
    });
  }

  return Array.from(sessionMap.values());
}
