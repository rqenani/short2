-- Prisma Migration: initial schema for short.al
-- This mirrors schema.prisma for PostgreSQL
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Link" (
  "id" TEXT PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
  "longUrl" TEXT NOT NULL,
  "domain" TEXT,
  "clicks" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Click" (
  "id" TEXT PRIMARY KEY,
  "linkId" TEXT NOT NULL REFERENCES "Link"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "ip" TEXT,
  "ua" TEXT,
  "referer" TEXT
);

CREATE TABLE IF NOT EXISTS "Domain" (
  "id" TEXT PRIMARY KEY,
  "host" TEXT NOT NULL UNIQUE,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "AdConfig" (
  "id" TEXT PRIMARY KEY,
  "enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "html" TEXT NOT NULL DEFAULT '<div style=''font-family:Inter,sans-serif;padding:24px;text-align:center'><h3>Redirecting…</h3><p>Powered by short.al</p></div>',
  "seconds" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Trigger to auto-update updatedAt on AdConfig
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'adconfig_updated_at') THEN
    CREATE TRIGGER adconfig_updated_at
    BEFORE UPDATE ON "AdConfig"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
