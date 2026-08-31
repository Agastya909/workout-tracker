"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { colors } from "@/lib/colors";
import { apiFetch } from "@/lib/api";

type ExerciseOption = { id: string; name: string };

type ProgressPoint = {
  date: string;
  best1RM: number;
  bestReps: number;
  isBodyweight: boolean;
};

type SetSeries = {
  setNumber: number;
  points: { date: string; value: number; isBodyweight: boolean }[];
};

type ProgressResponse = {
  points: ProgressPoint[];
  setSeries: SetSeries[];
};

const SET_COLORS = ["#f472b6", "#60a5fa", "#facc15", "#4ade80", "#c084fc", "#fb923c"];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ProgressChart({ exercises }: { exercises: ExerciseOption[] }) {
  const [exerciseId, setExerciseId] = useState(exercises[0]?.id ?? "");
  const [view, setView] = useState<"best" | "sets">("best");
  const [data, setData] = useState<ProgressResponse>({ points: [], setSeries: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!exerciseId) return;
    setLoading(true);
    apiFetch<ProgressResponse>(`/progress/${exerciseId}?days=30`)
      .then((res) => setData(res))
      .catch(() => setData({ points: [], setSeries: [] }))
      .finally(() => setLoading(false));
  }, [exerciseId]);

  const isBodyweight = data.points.some((p) => p.isBodyweight);

  const bestChartData = data.points.map((p) => ({
    date: formatDate(p.date),
    value: isBodyweight ? p.bestReps : Math.round(p.best1RM * 10) / 10,
  }));

  const setChartData = useMemo(() => {
    const dateSet = new Set<string>();
    data.setSeries.forEach((s) => s.points.forEach((p) => dateSet.add(p.date)));
    const dates = Array.from(dateSet).sort((a, b) => a.localeCompare(b));

    return dates.map((date) => {
      const row: Record<string, string | number | null> = { date: formatDate(date) };
      for (const series of data.setSeries) {
        const point = series.points.find((p) => p.date === date);
        row[`Set ${series.setNumber}`] = point ? point.value : null;
      }
      return row;
    });
  }, [data.setSeries]);

  const hasData = view === "best" ? bestChartData.length > 0 : setChartData.length > 0;

  return (
    <div className="space-y-4">
      <select
        value={exerciseId}
        onChange={(e) => setExerciseId(e.target.value)}
        className={`w-full px-4 py-2.5 rounded-xl ${colors.bg.elevated} border ${colors.border.default} text-sm ${colors.text.primary} focus:outline-none focus:${colors.border.focus}`}
      >
        {exercises.map((ex) => (
          <option key={ex.id} value={ex.id}>
            {ex.name}
          </option>
        ))}
      </select>

      <div className="flex gap-2">
        <button
          onClick={() => setView("best")}
          className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium ${colors.interactive.base} ${
            view === "best" ? colors.accent.primary : `${colors.bg.elevated} border ${colors.border.default} ${colors.text.secondary}`
          }`}
        >
          Best Set
        </button>
        <button
          onClick={() => setView("sets")}
          className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium ${colors.interactive.base} ${
            view === "sets" ? colors.accent.primary : `${colors.bg.elevated} border ${colors.border.default} ${colors.text.secondary}`
          }`}
        >
          By Set
        </button>
      </div>

      <div className={`${colors.bg.elevated} border ${colors.border.default} rounded-2xl p-4`}>
        <p className={`text-xs ${colors.text.muted} mb-3`}>
          {view === "best"
            ? isBodyweight
              ? "Best reps per session"
              : "Estimated 1RM per session (kg)"
            : isBodyweight
            ? "Reps per set, by set position"
            : "Estimated 1RM per set, by set position (kg)"}
        </p>

        {loading && <p className={`text-sm ${colors.text.muted} text-center py-16`}>Loading…</p>}

        {!loading && !hasData && (
          <p className={`text-sm ${colors.text.muted} text-center py-16`}>
            No sets logged for this exercise in the last 30 days.
          </p>
        )}

        {!loading && hasData && view === "best" && (
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={bestChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" stroke="#71717a" tick={{ fontSize: 11 }} />
                <YAxis stroke="#71717a" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
                  labelStyle={{ color: "#a1a1aa" }}
                  itemStyle={{ color: "#fff" }}
                />
                <Line type="monotone" dataKey="value" stroke="#fff" strokeWidth={2} dot={{ r: 3, fill: "#fff" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {!loading && hasData && view === "sets" && (
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={setChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" stroke="#71717a" tick={{ fontSize: 11 }} />
                <YAxis stroke="#71717a" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
                  labelStyle={{ color: "#a1a1aa" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {data.setSeries.map((series, i) => (
                  <Line
                    key={series.setNumber}
                    type="monotone"
                    dataKey={`Set ${series.setNumber}`}
                    stroke={SET_COLORS[i % SET_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
