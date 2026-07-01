package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/Agastya909/workout-tracker/api/internal/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
)

func RegisterSessionRoutes(mux *http.ServeMux, pool *pgxpool.Pool, auth func(http.Handler) http.Handler) {
	// get current active session (on page load)
	mux.Handle("GET /sessions/active", auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		getActiveSession(w, r, pool)
	})))
	// start a new session
	mux.Handle("POST /sessions/start", auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		startSession(w, r, pool)
	})))
	// sync state (background save)
	mux.Handle("PATCH /sessions/active", auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		syncSession(w, r, pool)
	})))
	// finish and save workout
	mux.Handle("POST /sessions/finish", auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		finishSession(w, r, pool)
	})))
	// discard
	mux.Handle("DELETE /sessions/active", auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		discardSession(w, r, pool)
	})))
}

func getActiveSession(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool) {
	userID := middleware.GetUserID(r)
	var result struct {
		ID        string          `json:"id"`
		RoutineID *string         `json:"routine_id"`
		StartedAt string          `json:"started_at"`
		State     json.RawMessage `json:"state"`
	}
	err := pool.QueryRow(r.Context(),
		`SELECT id, routine_id, started_at, state FROM active_sessions WHERE user_id = $1`, userID,
	).Scan(&result.ID, &result.RoutineID, &result.StartedAt, &result.State)
	if err != nil {
		// no active session
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte("null"))
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func startSession(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool) {
	userID := middleware.GetUserID(r)
	var body struct {
		RoutineID *string         `json:"routine_id"`
		State     json.RawMessage `json:"state"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	if body.State == nil {
		body.State = json.RawMessage("{}")
	}

	var id string
	// upsert — if there's already an active session, return it (prevent double-start)
	err := pool.QueryRow(r.Context(),
		`INSERT INTO active_sessions (user_id, routine_id, state)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
		 RETURNING id`,
		userID, body.RoutineID, body.State,
	).Scan(&id)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"id": id})
}

func syncSession(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool) {
	userID := middleware.GetUserID(r)
	var body struct {
		State json.RawMessage `json:"state"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.State == nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	tag, err := pool.Exec(r.Context(),
		`UPDATE active_sessions SET state = $1, updated_at = now() WHERE user_id = $2`,
		body.State, userID)
	if err != nil || tag.RowsAffected() == 0 {
		http.Error(w, "no active session", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func discardSession(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool) {
	userID := middleware.GetUserID(r)
	pool.Exec(r.Context(), `DELETE FROM active_sessions WHERE user_id = $1`, userID)
	w.WriteHeader(http.StatusNoContent)
}

// finishSession saves the completed workout + sets, optionally updates routine, then clears session.
func finishSession(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool) {
	userID := middleware.GetUserID(r)

	var body struct {
		Name          string          `json:"name"`
		Notes         string          `json:"notes"`
		RoutineID     *string         `json:"routine_id"`
		Sets          []finishedSet   `json:"sets"`
		RoutineUpdate *routineUpdate  `json:"routine_update"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	tx, err := pool.Begin(r.Context())
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	// insert workout
	var workoutID string
	if err := tx.QueryRow(r.Context(),
		`INSERT INTO workouts (user_id, name, notes) VALUES ($1, $2, $3) RETURNING id`,
		userID, body.Name, body.Notes,
	).Scan(&workoutID); err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	// insert completed sets
	for _, s := range body.Sets {
		if _, err := tx.Exec(r.Context(),
			`INSERT INTO workout_sets (workout_id, exercise_id, set_number, reps, weight, rpe, notes)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			workoutID, s.ExerciseID, s.SetNumber, s.Reps, s.Weight, s.RPE, s.Notes,
		); err != nil {
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
	}

	// optional routine update — only adds new exercises + their sets
	if body.RoutineUpdate != nil && body.RoutineID != nil {
		for _, ex := range body.RoutineUpdate.NewExercises {
			var reID string
			if err := tx.QueryRow(r.Context(),
				`INSERT INTO routine_exercises (routine_id, exercise_id, position)
				 VALUES ($1, $2, (SELECT COALESCE(MAX(position)+1, 0) FROM routine_exercises WHERE routine_id = $1))
				 RETURNING id`,
				*body.RoutineID, ex.ExerciseID,
			).Scan(&reID); err != nil {
				continue
			}
			for _, s := range ex.Sets {
				tx.Exec(r.Context(),
					`INSERT INTO routine_sets (routine_exercise_id, set_number, default_reps, default_weight)
					 VALUES ($1, $2, $3, $4)`,
					reID, s.SetNumber, s.DefaultReps, s.DefaultWeight,
				)
			}
		}

		// handle added/removed sets for existing exercises
		for _, ex := range body.RoutineUpdate.ModifiedSets {
			// delete sets beyond the new count
			tx.Exec(r.Context(),
				`DELETE FROM routine_sets WHERE routine_exercise_id = $1 AND set_number > $2`,
				ex.RoutineExerciseID, ex.NewSetCount,
			)
			// add missing sets
			for _, s := range ex.SetsToAdd {
				tx.Exec(r.Context(),
					`INSERT INTO routine_sets (routine_exercise_id, set_number, default_reps, default_weight)
					 VALUES ($1, $2, $3, $4)
					 ON CONFLICT DO NOTHING`,
					ex.RoutineExerciseID, s.SetNumber, s.DefaultReps, s.DefaultWeight,
				)
			}
		}
	}

	// clear session
	tx.Exec(r.Context(), `DELETE FROM active_sessions WHERE user_id = $1`, userID)

	if err := tx.Commit(r.Context()); err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"workout_id": workoutID})
}

type finishedSet struct {
	ExerciseID string   `json:"exercise_id"`
	SetNumber  int      `json:"set_number"`
	Reps       *int     `json:"reps"`
	Weight     *float64 `json:"weight"`
	RPE        *float64 `json:"rpe"`
	Notes      string   `json:"notes"`
}

type newRoutineSet struct {
	SetNumber     int      `json:"set_number"`
	DefaultReps   *int     `json:"default_reps"`
	DefaultWeight *float64 `json:"default_weight"`
}

type newRoutineExercise struct {
	ExerciseID string          `json:"exercise_id"`
	Sets       []newRoutineSet `json:"sets"`
}

type modifiedExerciseSets struct {
	RoutineExerciseID string          `json:"routine_exercise_id"`
	NewSetCount       int             `json:"new_set_count"`
	SetsToAdd         []newRoutineSet `json:"sets_to_add"`
}

type routineUpdate struct {
	NewExercises []newRoutineExercise   `json:"new_exercises"`
	ModifiedSets []modifiedExerciseSets `json:"modified_sets"`
}
