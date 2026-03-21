-- Caching tables for directions and scores

-- Directions cache: stores route polylines
CREATE TABLE IF NOT EXISTS directions_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  origin_lat DECIMAL(10, 7) NOT NULL,
  origin_lng DECIMAL(10, 7) NOT NULL,
  dest_lat DECIMAL(10, 7) NOT NULL,
  dest_lng DECIMAL(10, 7) NOT NULL,
  mode VARCHAR(50) NOT NULL,
  polyline TEXT NOT NULL,
  distance_meters INTEGER,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  UNIQUE(origin_lat, origin_lng, dest_lat, dest_lng, mode)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_directions_cache_lookup 
  ON directions_cache(origin_lat, origin_lng, dest_lat, dest_lng, mode);

CREATE INDEX IF NOT EXISTS idx_directions_cache_expires 
  ON directions_cache(expires_at);

-- Scores cache: stores mode scores for routes
CREATE TABLE IF NOT EXISTS scores_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  origin_lat DECIMAL(10, 7) NOT NULL,
  origin_lng DECIMAL(10, 7) NOT NULL,
  dest_lat DECIMAL(10, 7) NOT NULL,
  dest_lng DECIMAL(10, 7) NOT NULL,
  distance_miles DECIMAL(8, 2) NOT NULL,
  scores JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour'),
  UNIQUE(origin_lat, origin_lng, dest_lat, dest_lng, distance_miles)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_scores_cache_lookup 
  ON scores_cache(origin_lat, origin_lng, dest_lat, dest_lng, distance_miles);

CREATE INDEX IF NOT EXISTS idx_scores_cache_expires 
  ON scores_cache(expires_at);

-- Cleanup function to remove expired entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM directions_cache WHERE expires_at < NOW();
  DELETE FROM scores_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Auto-cleanup every hour (optional - can be disabled)
-- SELECT cron.schedule('cleanup-cache', '0 * * * *', 'SELECT cleanup_expired_cache()');
