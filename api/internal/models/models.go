package models

import "time"

type User struct {
	ID         string    `json:"id"`
	Email      string    `json:"email"`
	WeightUnit string    `json:"weight_unit"`
	CreatedAt  time.Time `json:"created_at"`
}

type Exercise struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	MuscleGroup string    `json:"muscle_group"`
	Type        string    `json:"type"`
	IsGlobal    bool      `json:"is_global"`
	UserID      *string   `json:"user_id,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

type Split struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Name      string    `json:"name"`
	Days      []string  `json:"days"`
	CreatedAt time.Time `json:"created_at"`
}

type Workout struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	SplitID   *string   `json:"split_id,omitempty"`
	Name      string    `json:"name"`
	Date      time.Time `json:"date"`
	Notes     string    `json:"notes"`
	CreatedAt time.Time `json:"created_at"`
}

type WorkoutSet struct {
	ID         string    `json:"id"`
	WorkoutID  string    `json:"workout_id"`
	ExerciseID string    `json:"exercise_id"`
	SetNumber  int       `json:"set_number"`
	Reps       *int      `json:"reps,omitempty"`
	Weight     *float64  `json:"weight,omitempty"`
	RPE        *float64  `json:"rpe,omitempty"`
	Notes      string    `json:"notes"`
	CreatedAt  time.Time `json:"created_at"`
}

type BodyMetric struct {
	ID         string    `json:"id"`
	UserID     string    `json:"user_id"`
	Date       time.Time `json:"date"`
	WeightKg   *float64  `json:"weight_kg,omitempty"`
	BodyFatPct *float64  `json:"body_fat_pct,omitempty"`
	Notes      string    `json:"notes"`
	CreatedAt  time.Time `json:"created_at"`
}
