-- Setting keys must be unique per tenant, not globally.
-- Previously `key` had a global @unique constraint, so saving one tenant's
-- "tax_rate" would update another tenant's row (cross-tenant data leak).

-- Dedupe safety: drop any duplicate (tenantId, key) pairs before creating
-- the compound unique index (keeps the oldest row per pair, NULL tenantId
-- groups included).
DELETE FROM "Setting" s
WHERE s."id" <> (
  SELECT s2."id" FROM "Setting" s2
  WHERE s2."key" = s."key"
    AND s2."tenantId" IS NOT DISTINCT FROM s."tenantId"
  ORDER BY s2."id" ASC
  LIMIT 1
);

ALTER TABLE "Setting" DROP CONSTRAINT IF EXISTS "Setting_key_key";

DROP INDEX IF EXISTS "Setting_key_key";

CREATE UNIQUE INDEX "Setting_tenantId_key_key" ON "Setting"("tenantId", "key");
