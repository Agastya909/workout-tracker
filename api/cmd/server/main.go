package main

import (
	"log"
	"net/http"

	"github.com/Agastya909/workout-tracker/api/config"
	"github.com/Agastya909/workout-tracker/api/internal/db"
	"github.com/Agastya909/workout-tracker/api/internal/handlers"
	"github.com/Agastya909/workout-tracker/api/internal/middleware"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	cfg := config.Load()

	pool, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()

	auth, err := middleware.NewAuth(cfg.SupabaseURL)
	if err != nil {
		log.Fatalf("auth init: %v", err)
	}

	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	handlers.RegisterExerciseRoutes(mux, pool, auth)
	handlers.RegisterWorkoutRoutes(mux, pool, auth)
	handlers.RegisterBodyMetricRoutes(mux, pool, auth)
	handlers.RegisterUserRoutes(mux, pool, auth)
	handlers.RegisterRoutineRoutes(mux, pool, auth)
	handlers.RegisterSessionRoutes(mux, pool, auth)

	addr := ":" + cfg.Port
	log.Printf("server listening on %s", addr)
	if err := http.ListenAndServe(addr, middleware.Logger(middleware.CORS(mux))); err != nil {
		log.Fatal(err)
	}
}
