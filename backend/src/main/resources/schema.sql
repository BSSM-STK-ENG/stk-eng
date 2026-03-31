ALTER TABLE IF EXISTS inventory_transactions
    ADD COLUMN IF NOT EXISTS reverted boolean;

UPDATE inventory_transactions
SET reverted = false
WHERE reverted IS NULL;

ALTER TABLE IF EXISTS inventory_transactions
    ALTER COLUMN reverted SET DEFAULT false;

ALTER TABLE IF EXISTS inventory_transactions
    ALTER COLUMN reverted SET NOT NULL;

ALTER TABLE IF EXISTS inventory_transactions
    ADD COLUMN IF NOT EXISTS system_generated boolean;

UPDATE inventory_transactions
SET system_generated = false
WHERE system_generated IS NULL;

ALTER TABLE IF EXISTS inventory_transactions
    ALTER COLUMN system_generated SET DEFAULT false;

ALTER TABLE IF EXISTS inventory_transactions
    ALTER COLUMN system_generated SET NOT NULL;
