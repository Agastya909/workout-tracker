-- drop old unused tables
drop table if exists programs cascade;
drop table if exists splits cascade;

-- routine = a named workout template owned by a user
create table if not exists routines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  name        text not null,
  description text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ordered exercises within a routine
create table if not exists routine_exercises (
  id          uuid primary key default gen_random_uuid(),
  routine_id  uuid not null references routines(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete restrict,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);

-- default sets for each routine exercise
create table if not exists routine_sets (
  id                   uuid primary key default gen_random_uuid(),
  routine_exercise_id  uuid not null references routine_exercises(id) on delete cascade,
  set_number           int not null,
  default_reps         int,
  default_weight       numeric(8,2),
  created_at           timestamptz not null default now()
);

-- one active workout session per user at a time
create table if not exists active_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade unique,
  routine_id  uuid references routines(id) on delete set null,
  started_at  timestamptz not null default now(),
  state       jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);

create index if not exists routine_exercises_routine on routine_exercises(routine_id, position);
create index if not exists routine_sets_exercise on routine_sets(routine_exercise_id, set_number);
