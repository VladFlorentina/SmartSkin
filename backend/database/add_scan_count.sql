-- Migration: add scan_count column to scanned_products
-- Run this in the Supabase SQL Editor

-- Step 1: Add the new column (safe to run multiple times)
ALTER TABLE scanned_products
  ADD COLUMN IF NOT EXISTS scan_count INTEGER DEFAULT 1 NOT NULL;

-- Step 2: Deduplicate existing rows
-- For each (user_id, product_id) group, keep the most recent row and
-- set its scan_count to the total number of duplicates. Delete the rest.

WITH ranked AS (
  SELECT
    id,
    user_id,
    product_id,
    scanned_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, product_id
      ORDER BY scanned_at DESC
    ) AS rn,
    COUNT(*) OVER (
      PARTITION BY user_id, product_id
    ) AS total_count
  FROM scanned_products
),
to_keep AS (
  SELECT id, total_count
  FROM ranked
  WHERE rn = 1
),
to_delete AS (
  SELECT id
  FROM ranked
  WHERE rn > 1
)
-- Update the kept row with the correct scan_count
UPDATE scanned_products sp
SET scan_count = tk.total_count
FROM to_keep tk
WHERE sp.id = tk.id;

-- Delete duplicate rows (keep only the most recent per user+product)
DELETE FROM scanned_products
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, product_id
        ORDER BY scanned_at DESC
      ) AS rn
    FROM scanned_products
  ) sub
  WHERE rn > 1
);
