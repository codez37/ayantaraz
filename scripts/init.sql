-- PostgreSQL Initialization Script for Ayantaraz
-- This script runs when the PostgreSQL container starts for the first time

-- Create database if it doesn't exist
SELECT 'CREATE DATABASE ayantaraz'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ayantaraz')\;

-- Connect to the database
\c ayantaraz

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone
SET timezone = 'Asia/Tehran';

-- Create schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS public;

-- Grant permissions
GRANT ALL ON SCHEMA public TO ayantaraz;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ayantaraz;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ayantaraz;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'PostgreSQL database initialized for Ayantaraz';
END $$;
