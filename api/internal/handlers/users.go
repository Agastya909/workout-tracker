package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/Agastya909/workout-tracker/api/internal/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
)

func RegisterUserRoutes(mux *http.ServeMux, pool *pgxpool.Pool, auth func(http.Handler) http.Handler) {
	mux.Handle("GET /me", auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		getMe(w, r, pool)
	})))
	mux.Handle("PATCH /me", auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		updateMe(w, r, pool)
	})))
}

func getMe(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool) {
	userID := middleware.GetUserID(r)
	var u struct {
		ID         string `json:"id"`
		Email      string `json:"email"`
		WeightUnit string `json:"weight_unit"`
	}
	err := pool.QueryRow(r.Context(),
		`SELECT id, email, weight_unit FROM users WHERE id = $1`, userID).
		Scan(&u.ID, &u.Email, &u.WeightUnit)
	if err != nil {
		_ = pool.QueryRow(r.Context(),
			`INSERT INTO users (id, email, weight_unit)
			 VALUES ($1, '', 'kg')
			 ON CONFLICT (id) DO UPDATE SET id = EXCLUDED.id
			 RETURNING id, email, weight_unit`,
			userID).Scan(&u.ID, &u.Email, &u.WeightUnit)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(u)
}

func updateMe(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool) {
	userID := middleware.GetUserID(r)
	var body struct {
		WeightUnit *string `json:"weight_unit"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	if body.WeightUnit != nil {
		if *body.WeightUnit != "kg" && *body.WeightUnit != "lbs" {
			http.Error(w, "weight_unit must be kg or lbs", http.StatusBadRequest)
			return
		}
		if _, err := pool.Exec(r.Context(),
			`UPDATE users SET weight_unit = $1 WHERE id = $2`,
			*body.WeightUnit, userID); err != nil {
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
	}
	w.WriteHeader(http.StatusNoContent)
}
