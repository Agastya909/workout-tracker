create extension if not exists "pgcrypto";

create table if not exists users (
  id          uuid primary key,
  email       text not null default '',
  weight_unit text not null default 'kg' check (weight_unit in ('kg', 'lbs')),
  created_at  timestamptz not null default now()
);

create table if not exists exercises (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  muscle_group text not null,
  type         text not null check (type in ('strength', 'cardio', 'bodyweight', 'olympic')),
  is_global    boolean not null default false,
  user_id      uuid references users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  constraint exercises_name_user unique (name, user_id)
);

create table if not exists splits (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

create table if not exists programs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  name       text not null,
  weeks      int not null default 4,
  created_at timestamptz not null default now()
);

create table if not exists workouts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  split_id   uuid references splits(id) on delete set null,
  name       text not null default '',
  date       timestamptz not null default now(),
  notes      text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists workout_sets (
  id          uuid primary key default gen_random_uuid(),
  workout_id  uuid not null references workouts(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete restrict,
  set_number  int not null,
  reps        int,
  weight      numeric(8,2),
  rpe         numeric(3,1) check (rpe between 1 and 10),
  notes       text not null default '',
  created_at  timestamptz not null default now()
);

create table if not exists body_metrics (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  date         timestamptz not null default now(),
  weight_kg    numeric(6,2),
  body_fat_pct numeric(5,2),
  notes        text not null default '',
  created_at   timestamptz not null default now()
);

create index if not exists workouts_user_date on workouts(user_id, date desc);
create index if not exists workout_sets_workout on workout_sets(workout_id);
create index if not exists body_metrics_user_date on body_metrics(user_id, date desc);
