insert into exercises (name, muscle_group, type, is_global) values
  -- Chest
  ('Bench Press', 'Chest', 'strength', true),
  ('Incline Bench Press', 'Chest', 'strength', true),
  ('Decline Bench Press', 'Chest', 'strength', true),
  ('Dumbbell Fly', 'Chest', 'strength', true),
  ('Cable Crossover', 'Chest', 'strength', true),
  ('Push Up', 'Chest', 'bodyweight', true),
  ('Dip', 'Chest', 'bodyweight', true),

  -- Back
  ('Deadlift', 'Back', 'strength', true),
  ('Pull Up', 'Back', 'bodyweight', true),
  ('Chin Up', 'Back', 'bodyweight', true),
  ('Barbell Row', 'Back', 'strength', true),
  ('Dumbbell Row', 'Back', 'strength', true),
  ('Lat Pulldown', 'Back', 'strength', true),
  ('Seated Cable Row', 'Back', 'strength', true),
  ('T-Bar Row', 'Back', 'strength', true),
  ('Face Pull', 'Back', 'strength', true),

  -- Shoulders
  ('Overhead Press', 'Shoulders', 'strength', true),
  ('Dumbbell Shoulder Press', 'Shoulders', 'strength', true),
  ('Lateral Raise', 'Shoulders', 'strength', true),
  ('Front Raise', 'Shoulders', 'strength', true),
  ('Rear Delt Fly', 'Shoulders', 'strength', true),
  ('Arnold Press', 'Shoulders', 'strength', true),

  -- Legs
  ('Squat', 'Legs', 'strength', true),
  ('Front Squat', 'Legs', 'strength', true),
  ('Leg Press', 'Legs', 'strength', true),
  ('Romanian Deadlift', 'Legs', 'strength', true),
  ('Leg Curl', 'Legs', 'strength', true),
  ('Leg Extension', 'Legs', 'strength', true),
  ('Lunge', 'Legs', 'bodyweight', true),
  ('Bulgarian Split Squat', 'Legs', 'strength', true),
  ('Calf Raise', 'Legs', 'strength', true),
  ('Hip Thrust', 'Legs', 'strength', true),

  -- Arms
  ('Barbell Curl', 'Arms', 'strength', true),
  ('Dumbbell Curl', 'Arms', 'strength', true),
  ('Hammer Curl', 'Arms', 'strength', true),
  ('Preacher Curl', 'Arms', 'strength', true),
  ('Tricep Pushdown', 'Arms', 'strength', true),
  ('Skull Crusher', 'Arms', 'strength', true),
  ('Overhead Tricep Extension', 'Arms', 'strength', true),
  ('Close Grip Bench Press', 'Arms', 'strength', true),
  ('Diamond Push Up', 'Arms', 'bodyweight', true),

  -- Core
  ('Plank', 'Core', 'bodyweight', true),
  ('Crunch', 'Core', 'bodyweight', true),
  ('Sit Up', 'Core', 'bodyweight', true),
  ('Leg Raise', 'Core', 'bodyweight', true),
  ('Russian Twist', 'Core', 'bodyweight', true),
  ('Ab Wheel Rollout', 'Core', 'bodyweight', true),
  ('Cable Crunch', 'Core', 'strength', true),

  -- Olympic
  ('Power Clean', 'Full Body', 'olympic', true),
  ('Clean and Jerk', 'Full Body', 'olympic', true),
  ('Snatch', 'Full Body', 'olympic', true),

  -- Cardio
  ('Running', 'Cardio', 'cardio', true),
  ('Cycling', 'Cardio', 'cardio', true),
  ('Rowing', 'Cardio', 'cardio', true),
  ('Jump Rope', 'Cardio', 'cardio', true),
  ('Stair Climber', 'Cardio', 'cardio', true)

on conflict do nothing;
