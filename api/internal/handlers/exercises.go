package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/Agastya909/workout-tracker/api/internal/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
)

func RegisterExerciseRoutes(mux *http.ServeMux, pool *pgxpool.Pool, auth func(http.Handler) http.Handler) {
	mux.Handle("GET /exercises", auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		listExercises(w, r, pool)
	})))
	mux.Handle("POST /exercises", auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		createExercise(w, r, pool)
	})))
	mux.Handle("DELETE /exercises/{id}", auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		deleteExercise(w, r, pool)
	})))
}

func listExercises(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool) {
	userID := middleware.GetUserID(r)
	rows, err := pool.Query(r.Context(),
		`SELECT id, name, muscle_group, type, is_global, user_id
		 FROM exercises WHERE is_global = true OR user_id = $1
		 ORDER BY name ASC`, userID)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	type row struct {
		ID          string  `json:"id"`
		Name        string  `json:"name"`
		MuscleGroup string  `json:"muscle_group"`
		Type        string  `json:"type"`
		IsGlobal    bool    `json:"is_global"`
		UserID      *string `json:"user_id,omitempty"`
	}
	results := []row{}
	for rows.Next() {
		var e row
		if err := rows.Scan(&e.ID, &e.Name, &e.MuscleGroup, &e.Type, &e.IsGlobal, &e.UserID); err != nil {
			continue
		}
		results = append(results, e)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

func createExercise(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool) {
	userID := middleware.GetUserID(r)
	var body struct {
		Name        string `json:"name"`
		MuscleGroup string `json:"muscle_group"`
		Type        string `json:"type"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	var id string
	err := pool.QueryRow(r.Context(),
		`INSERT INTO exercises (name, muscle_group, type, is_global, user_id)
		 VALUES ($1, $2, $3, false, $4) RETURNING id`,
		body.Name, body.MuscleGroup, body.Type, userID,
	).Scan(&id)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"id": id})
}

func deleteExercise(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool) {
	userID := middleware.GetUserID(r)
	id := r.PathValue("id")
	tag, err := pool.Exec(r.Context(),
		`DELETE FROM exercises WHERE id = $1 AND user_id = $2 AND is_global = false`, id, userID)
	if err != nil || tag.RowsAffected() == 0 {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
