import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUserId } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const userId = await requireUserId();
    const { rows } = await pool.query(
      `SELECT id, name, description, created_at FROM routines WHERE user_id = $1 ORDER BY created_at DESC`,
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
    if (!body.name) {
      return NextResponse.json({ error: "bad request" }, { status: 400 });
    }
    const { rows } = await pool.query(
      `INSERT INTO routines (user_id, name, description) VALUES ($1, $2, $3) RETURNING id`,
      [userId, body.name, body.description ?? ""]
    );
    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
