/**
 * Supabase Database Schema
 * Run these SQL commands in your Supabase dashboard before the hackathon starts
 */

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Trips table: log each time a user takes a green trip
create table if not exists trips (
  id uuid default gen_random_uuid() primary key,
  session_id text not null,
  persona text not null,
  mode text not null,
  g_co2e integer not null,
  distance_miles numeric(5,2),
  origin_address text,
  destination_address text,
  logged_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Streaks table: track user streaks keyed by session
create table if not exists streaks (
  session_id text primary key,
  persona text not null,
  current_streak integer default 0,
  last_green_date date,
  total_g_saved integer default 0,
  trips_logged integer default 0,
  updated_at timestamptz default now()
);

-- Create indexes for fast queries
create index if not exists idx_trips_session_id on trips(session_id);
create index if not exists idx_trips_logged_at on trips(logged_at);
create index if not exists idx_streaks_updated_at on streaks(updated_at);

-- Enable Row Level Security (optional)
alter table trips enable row level security;
alter table streaks enable row level security;

-- Allow all reads (public)
create policy "Allow public read" on trips
  for select
  using (true);

create policy "Allow public read" on streaks
  for select
  using (true);

-- Allow inserts from any session (no auth needed)
create policy "Allow public insert" on trips
  for insert
  with check (true);

create policy "Allow public insert" on streaks
  for insert
  with check (true);

-- Allow updates for streak tracking
create policy "Allow streak updates" on streaks
  for update
  using (true);
