import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUserId } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const userId = await requireUserId();
    let { rows } = await pool.query(
      `SELECT id, email, weight_unit FROM users WHERE id = $1`,
      [userId]
    );
    if (rows.length === 0) {
      const inserted = await pool.query(
        `INSERT INTO users (id, email, weight_unit)
         VALUES ($1, '', 'kg')
         ON CONFLICT (id) DO UPDATE SET id = EXCLUDED.id
         RETURNING id, email, weight_unit`,
        [userId]
      );
      rows = inserted.rows;
    }
    return NextResponse.json(rows[0]);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    if (body.weight_unit !== undefined && body.weight_unit !== null) {
      if (body.weight_unit !== "kg" && body.weight_unit !== "lbs") {
        return NextResponse.json(
          { error: "weight_unit must be kg or lbs" },
          { status: 400 }
        );
      }
      await pool.query(`UPDATE users SET weight_unit = $1 WHERE id = $2`, [
        body.weight_unit,
        userId,
      ]);
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
