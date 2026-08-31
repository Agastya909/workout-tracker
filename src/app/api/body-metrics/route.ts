import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUserId } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const userId = await requireUserId();
    const { rows } = await pool.query(
      `SELECT id, date, weight_kg, body_fat_pct, notes, created_at
       FROM body_metrics WHERE user_id = $1
       ORDER BY date DESC`,
      [userId]
    );
    return NextResponse.json(rows);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const date = body.date ? new Date(body.date) : new Date();
    const { rows } = await pool.query(
      `INSERT INTO body_metrics (user_id, date, weight_kg, body_fat_pct, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [userId, date, body.weight_kg ?? null, body.body_fat_pct ?? null, body.notes ?? ""]
    );
    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
