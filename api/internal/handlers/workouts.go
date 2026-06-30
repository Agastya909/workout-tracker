package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/Agastya909/workout-tracker/api/internal/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
)

func RegisterWorkoutRoutes(mux *http.ServeMux, pool *pgxpool.Pool, auth func(http.Handler) http.Handler) {
	mux.Handle("GET /workouts", auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		listWorkouts(w, r, pool)
	})))
	mux.Handle("POST /workouts", auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		createWorkout(w, r, pool)
	})))
	mux.Handle("GET /workouts/{id}", auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		getWorkout(w, r, pool)
	})))
	mux.Handle("DELETE /workouts/{id}", auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		deleteWorkout(w, r, pool)
	})))
	mux.Handle("POST /workouts/{id}/sets", auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		addSet(w, r, pool)
	})))
	mux.Handle("DELETE /workouts/{id}/sets/{setId}", auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		deleteSet(w, r, pool)
	})))
}

func listWorkouts(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool) {
	userID := middleware.GetUserID(r)
	rows, err := pool.Query(r.Context(),
		`SELECT id, name, date, notes, split_id, created_at
		 FROM workouts WHERE user_id = $1
		 ORDER BY date DESC LIMIT 50`, userID)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	type row struct {
		ID        string    `json:"id"`
		Name      string    `json:"name"`
		Date      time.Time `json:"date"`
		Notes     string    `json:"notes"`
		SplitID   *string   `json:"split_id,omitempty"`
		CreatedAt time.Time `json:"created_at"`
	}
	results := []row{}
	for rows.Next() {
		var wk row
		if err := rows.Scan(&wk.ID, &wk.Name, &wk.Date, &wk.Notes, &wk.SplitID, &wk.CreatedAt); err != nil {
			continue
		}
		results = append(results, wk)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

func createWorkout(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool) {
	userID := middleware.GetUserID(r)
	var body struct {
		Name    string    `json:"name"`
		Date    time.Time `json:"date"`
		Notes   string    `json:"notes"`
		SplitID *string   `json:"split_id"`
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
		`INSERT INTO workouts (user_id, name, date, notes, split_id)
		 VALUES ($1, $2, $3, $4, $5) RETURNING id`,
		userID, body.Name, body.Date, body.Notes, body.SplitID,
	).Scan(&id)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"id": id})
}

func getWorkout(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool) {
	userID := middleware.GetUserID(r)
	id := r.PathValue("id")
	type set struct {
		ID         string   `json:"id"`
		ExerciseID string   `json:"exercise_id"`
		Exercise   string   `json:"exercise_name"`
		SetNumber  int      `json:"set_number"`
		Reps       *int     `json:"reps,omitempty"`
		Weight     *float64 `json:"weight,omitempty"`
		RPE        *float64 `json:"rpe,omitempty"`
	}
	rows, err := pool.Query(r.Context(),
		`SELECT ws.id, ws.exercise_id, e.name, ws.set_number, ws.reps, ws.weight, ws.rpe
		 FROM workout_sets ws
		 JOIN exercises e ON e.id = ws.exercise_id
		 JOIN workouts w ON w.id = ws.workout_id
		 WHERE ws.workout_id = $1 AND w.user_id = $2
		 ORDER BY ws.set_number ASC`, id, userID)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	sets := []set{}
	for rows.Next() {
		var s set
		if err := rows.Scan(&s.ID, &s.ExerciseID, &s.Exercise, &s.SetNumber, &s.Reps, &s.Weight, &s.RPE); err != nil {
			continue
		}
		sets = append(sets, s)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"sets": sets})
}

func deleteWorkout(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool) {
	userID := middleware.GetUserID(r)
	id := r.PathValue("id")
	tag, err := pool.Exec(r.Context(),
		`DELETE FROM workouts WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil || tag.RowsAffected() == 0 {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func addSet(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool) {
	userID := middleware.GetUserID(r)
	workoutID := r.PathValue("id")
	var body struct {
		ExerciseID string   `json:"exercise_id"`
		SetNumber  int      `json:"set_number"`
		Reps       *int     `json:"reps"`
		Weight     *float64 `json:"weight"`
		RPE        *float64 `json:"rpe"`
		Notes      string   `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	var ownerID string
	if err := pool.QueryRow(r.Context(),
		`SELECT user_id FROM workouts WHERE id = $1`, workoutID).Scan(&ownerID); err != nil || ownerID != userID {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	var id string
	err := pool.QueryRow(r.Context(),
		`INSERT INTO workout_sets (workout_id, exercise_id, set_number, reps, weight, rpe, notes)
		 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
		workoutID, body.ExerciseID, body.SetNumber, body.Reps, body.Weight, body.RPE, body.Notes,
	).Scan(&id)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"id": id})
}

func deleteSet(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool) {
	userID := middleware.GetUserID(r)
	workoutID := r.PathValue("id")
	setID := r.PathValue("setId")
	tag, err := pool.Exec(r.Context(),
		`DELETE FROM workout_sets ws
		 USING workouts wk
		 WHERE ws.id = $1 AND ws.workout_id = $2 AND wk.id = ws.workout_id AND wk.user_id = $3`,
		setID, workoutID, userID)
	if err != nil || tag.RowsAffected() == 0 {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
