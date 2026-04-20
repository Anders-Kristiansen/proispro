-- Add quantity field to discs table
-- Allows users to own multiple copies of the same disc (e.g. 3 identical putters)
ALTER TABLE discs ADD COLUMN IF NOT EXISTS quantity INT NOT NULL DEFAULT 1;
ALTER TABLE discs ADD CONSTRAINT discs_quantity_min CHECK (quantity >= 1);
