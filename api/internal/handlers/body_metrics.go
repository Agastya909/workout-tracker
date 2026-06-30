package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/Agastya909/workout-tracker/api/internal/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
)

func RegisterBodyMetricRoutes(mux *http.ServeMux, pool *pgxpool.Pool, auth func(http.Handler) http.Handler) {
	mux.Handle("GET /body-metrics", auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		listBodyMetrics(w, r, pool)
	})))
	mux.Handle("POST /body-metrics", auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		createBodyMetric(w, r, pool)
	})))
	mux.Handle("DELETE /body-metrics/{id}", auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		deleteBodyMetric(w, r, pool)
	})))
}

func listBodyMetrics(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool) {
	userID := middleware.GetUserID(r)
	rows, err := pool.Query(r.Context(),
		`SELECT id, date, weight_kg, body_fat_pct, notes, created_at
		 FROM body_metrics WHERE user_id = $1
		 ORDER BY date DESC`, userID)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	type row struct {
		ID         string    `json:"id"`
		Date       time.Time `json:"date"`
		WeightKg   *float64  `json:"weight_kg,omitempty"`
		BodyFatPct *float64  `json:"body_fat_pct,omitempty"`
		Notes      string    `json:"notes"`
		CreatedAt  time.Time `json:"created_at"`
	}
	results := []row{}
	for rows.Next() {
		var m row
		if err := rows.Scan(&m.ID, &m.Date, &m.WeightKg, &m.BodyFatPct, &m.Notes, &m.CreatedAt); err != nil {
			continue
		}
		results = append(results, m)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

func createBodyMetric(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool) {
	userID := middleware.GetUserID(r)
	var body struct {
		Date       time.Time `json:"date"`
		WeightKg   *float64  `json:"weight_kg"`
		BodyFatPct *float64  `json:"body_fat_pct"`
		Notes      string    `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	if body.Date.IsZero() {
		body.Date = time.Now()
	}
	var id string
	err := pool.QueryRow(r.Context(),
		`INSERT INTO body_metrics (user_id, date, weight_kg, body_fat_pct, notes)
		 VALUES ($1, $2, $3, $4, $5) RETURNING id`,
		userID, body.Date, body.WeightKg, body.BodyFatPct, body.Notes,
	).Scan(&id)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"id": id})
}

func deleteBodyMetric(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool) {
	userID := middleware.GetUserID(r)
	id := r.PathValue("id")
	tag, err := pool.Exec(r.Context(),
		`DELETE FROM body_metrics WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil || tag.RowsAffected() == 0 {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
