package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/Agastya909/workout-tracker/api/internal/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
)

func RegisterRoutineRoutes(mux *http.ServeMux, pool *pgxpool.Pool, auth func(http.Handler) http.Handler) {
	mux.Handle("GET /routines", auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		listRoutines(w, r, pool)
	})))
	mux.Handle("POST /routines", auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		createRoutine(w, r, pool)
	})))
	mux.Handle("GET /routines/{id}", auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		getRoutine(w, r, pool)
	})))
	mux.Handle("PATCH /routines/{id}", auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		updateRoutine(w, r, pool)
	})))
	mux.Handle("DELETE /routines/{id}", auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		deleteRoutine(w, r, pool)
	})))

	// routine exercises
	mux.Handle("POST /routines/{id}/exercises", auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		addRoutineExercise(w, r, pool)
	})))
	mux.Handle("DELETE /routines/{id}/exercises/{exId}", auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		removeRoutineExercise(w, r, pool)
	})))

	// routine sets
	mux.Handle("POST /routine-exercises/{exId}/sets", auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		addRoutineSet(w, r, pool)
	})))
	mux.Handle("DELETE /routine-exercises/{exId}/sets/{setId}", auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		deleteRoutineSet(w, r, pool)
	})))

	// full save (replaces all exercises+sets in one transaction)
	mux.Handle("PUT /routines/{id}/full", auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		saveRoutineFull(w, r, pool)
	})))
}

// --- list ---

func listRoutines(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool) {
	userID := middleware.GetUserID(r)
	rows, err := pool.Query(r.Context(),
		`SELECT id, name, description, created_at FROM routines WHERE user_id = $1 ORDER BY created_at DESC`,
		userID)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type row struct {
		ID          string    `json:"id"`
		Name        string    `json:"name"`
		Description string    `json:"description"`
		CreatedAt   time.Time `json:"created_at"`
	}
	results := []row{}
	for rows.Next() {
		var rt row
		if err := rows.Scan(&rt.ID, &rt.Name, &rt.Description, &rt.CreatedAt); err != nil {
			continue
		}
		results = append(results, rt)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

// --- get (full detail with exercises + sets) ---

func getRoutine(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool) {
	userID := middleware.GetUserID(r)
	id := r.PathValue("id")

	type setRow struct {
		ID            string   `json:"id"`
		SetNumber     int      `json:"set_number"`
		DefaultReps   *int     `json:"default_reps"`
		DefaultWeight *float64 `json:"default_weight"`
	}
	type exerciseRow struct {
		ID           string   `json:"id"`
		ExerciseID   string   `json:"exercise_id"`
		ExerciseName string   `json:"exercise_name"`
		MuscleGroup  string   `json:"muscle_group"`
		Position     int      `json:"position"`
		Sets         []setRow `json:"sets"`
	}
	type routineDetail struct {
		ID          string        `json:"id"`
		Name        string        `json:"name"`
		Description string        `json:"description"`
		Exercises   []exerciseRow `json:"exercises"`
	}

	var rt routineDetail
	err := pool.QueryRow(r.Context(),
		`SELECT id, name, description FROM routines WHERE id = $1 AND user_id = $2`,
		id, userID,
	).Scan(&rt.ID, &rt.Name, &rt.Description)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	rows, err := pool.Query(r.Context(),
		`SELECT re.id, re.exercise_id, e.name, e.muscle_group, re.position
		 FROM routine_exercises re
		 JOIN exercises e ON e.id = re.exercise_id
		 WHERE re.routine_id = $1
		 ORDER BY re.position ASC`, id)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	exMap := map[string]*exerciseRow{}
	exOrder := []string{}
	for rows.Next() {
		var ex exerciseRow
		ex.Sets = []setRow{}
		if err := rows.Scan(&ex.ID, &ex.ExerciseID, &ex.ExerciseName, &ex.MuscleGroup, &ex.Position); err != nil {
			continue
		}
		exMap[ex.ID] = &ex
		exOrder = append(exOrder, ex.ID)
	}

	if len(exOrder) > 0 {
		setRows, err := pool.Query(r.Context(),
			`SELECT rs.id, rs.routine_exercise_id, rs.set_number, rs.default_reps, rs.default_weight
			 FROM routine_sets rs
			 JOIN routine_exercises re ON re.id = rs.routine_exercise_id
			 WHERE re.routine_id = $1
			 ORDER BY rs.set_number ASC`, id)
		if err == nil {
			defer setRows.Close()
			for setRows.Next() {
				var s setRow
				var reID string
				if err := setRows.Scan(&s.ID, &reID, &s.SetNumber, &s.DefaultReps, &s.DefaultWeight); err != nil {
					continue
				}
				if ex, ok := exMap[reID]; ok {
					ex.Sets = append(ex.Sets, s)
				}
			}
		}
	}

	rt.Exercises = []exerciseRow{}
	for _, id := range exOrder {
		rt.Exercises = append(rt.Exercises, *exMap[id])
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rt)
}

// --- create ---

func createRoutine(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool) {
	userID := middleware.GetUserID(r)
	var body struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	var id string
	err := pool.QueryRow(r.Context(),
		`INSERT INTO routines (user_id, name, description) VALUES ($1, $2, $3) RETURNING id`,
		userID, body.Name, body.Description,
	).Scan(&id)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"id": id})
}

// --- update name/description ---

func updateRoutine(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool) {
	userID := middleware.GetUserID(r)
	id := r.PathValue("id")
	var body struct {
		Name        *string `json:"name"`
		Description *string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	_, err := pool.Exec(r.Context(),
		`UPDATE routines SET
		   name        = COALESCE($1, name),
		   description = COALESCE($2, description),
		   updated_at  = now()
		 WHERE id = $3 AND user_id = $4`,
		body.Name, body.Description, id, userID)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// --- delete ---

func deleteRoutine(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool) {
	userID := middleware.GetUserID(r)
	id := r.PathValue("id")
	tag, err := pool.Exec(r.Context(),
		`DELETE FROM routines WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil || tag.RowsAffected() == 0 {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// --- add exercise to routine ---

func addRoutineExercise(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool) {
	userID := middleware.GetUserID(r)
	routineID := r.PathValue("id")

	// verify ownership
	var ownerID string
	if err := pool.QueryRow(r.Context(),
		`SELECT user_id FROM routines WHERE id = $1`, routineID).Scan(&ownerID); err != nil || ownerID != userID {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	var body struct {
		ExerciseID string `json:"exercise_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.ExerciseID == "" {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	// append at end
	var id string
	err := pool.QueryRow(r.Context(),
		`INSERT INTO routine_exercises (routine_id, exercise_id, position)
		 VALUES ($1, $2, (SELECT COALESCE(MAX(position)+1, 0) FROM routine_exercises WHERE routine_id = $1))
		 RETURNING id`,
		routineID, body.ExerciseID,
	).Scan(&id)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"id": id})
}

// --- remove exercise from routine ---

func removeRoutineExercise(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool) {
	userID := middleware.GetUserID(r)
	routineID := r.PathValue("id")
	exID := r.PathValue("exId")

	tag, err := pool.Exec(r.Context(),
		`DELETE FROM routine_exercises re
		 USING routines rt
		 WHERE re.id = $1 AND re.routine_id = $2 AND rt.id = re.routine_id AND rt.user_id = $3`,
		exID, routineID, userID)
	if err != nil || tag.RowsAffected() == 0 {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// --- add set to routine exercise ---

func addRoutineSet(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool) {
	userID := middleware.GetUserID(r)
	reID := r.PathValue("exId")

	// verify ownership through routine
	var ownerID string
	if err := pool.QueryRow(r.Context(),
		`SELECT rt.user_id FROM routine_exercises re JOIN routines rt ON rt.id = re.routine_id WHERE re.id = $1`,
		reID).Scan(&ownerID); err != nil || ownerID != userID {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	var body struct {
		SetNumber     int      `json:"set_number"`
		DefaultReps   *int     `json:"default_reps"`
		DefaultWeight *float64 `json:"default_weight"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	var id string
	err := pool.QueryRow(r.Context(),
		`INSERT INTO routine_sets (routine_exercise_id, set_number, default_reps, default_weight)
		 VALUES ($1, $2, $3, $4) RETURNING id`,
		reID, body.SetNumber, body.DefaultReps, body.DefaultWeight,
	).Scan(&id)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"id": id})
}

// --- full save (replaces all exercises+sets atomically) ---

func saveRoutineFull(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool) {
	userID := middleware.GetUserID(r)
	routineID := r.PathValue("id")

	type incomingSet struct {
		SetNumber     int      `json:"set_number"`
		DefaultReps   *int     `json:"default_reps"`
		DefaultWeight *float64 `json:"default_weight"`
	}
	type incomingExercise struct {
		ExerciseID string        `json:"exercise_id"`
		Sets       []incomingSet `json:"sets"`
	}
	var body struct {
		Exercises []incomingExercise `json:"exercises"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	// verify ownership
	var ownerID string
	if err := pool.QueryRow(r.Context(),
		`SELECT user_id FROM routines WHERE id = $1`, routineID).Scan(&ownerID); err != nil || ownerID != userID {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	tx, err := pool.Begin(r.Context())
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	// wipe existing exercises (cascade deletes sets)
	if _, err := tx.Exec(r.Context(),
		`DELETE FROM routine_exercises WHERE routine_id = $1`, routineID); err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	// re-insert in order
	for pos, ex := range body.Exercises {
		var reID string
		if err := tx.QueryRow(r.Context(),
			`INSERT INTO routine_exercises (routine_id, exercise_id, position) VALUES ($1, $2, $3) RETURNING id`,
			routineID, ex.ExerciseID, pos,
		).Scan(&reID); err != nil {
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		for _, s := range ex.Sets {
			if _, err := tx.Exec(r.Context(),
				`INSERT INTO routine_sets (routine_exercise_id, set_number, default_reps, default_weight) VALUES ($1, $2, $3, $4)`,
				reID, s.SetNumber, s.DefaultReps, s.DefaultWeight,
			); err != nil {
				http.Error(w, "internal error", http.StatusInternalServerError)
				return
			}
		}
	}

	// bump updated_at
	tx.Exec(r.Context(), `UPDATE routines SET updated_at = now() WHERE id = $1`, routineID)

	if err := tx.Commit(r.Context()); err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// --- delete set from routine exercise ---

func deleteRoutineSet(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool) {
	userID := middleware.GetUserID(r)
	reID := r.PathValue("exId")
	setID := r.PathValue("setId")

	tag, err := pool.Exec(r.Context(),
		`DELETE FROM routine_sets rs
		 USING routine_exercises re
		 JOIN routines rt ON rt.id = re.routine_id
		 WHERE rs.id = $1 AND rs.routine_exercise_id = $2 AND re.id = $2 AND rt.user_id = $3`,
		setID, reID, userID)
	if err != nil || tag.RowsAffected() == 0 {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
