ALTER TABLE "DailySession"
ADD COLUMN "batchIndex" INTEGER;

UPDATE "DailySession"
SET "batchIndex" = 1
WHERE "batchIndex" IS NULL;

ALTER TABLE "DailySession"
ALTER COLUMN "batchIndex" SET NOT NULL;

DROP INDEX IF EXISTS "DailySession_userId_sessionDate_key";

CREATE UNIQUE INDEX "DailySession_userId_sessionDate_batchIndex_key"
ON "DailySession"("userId", "sessionDate", "batchIndex");

CREATE INDEX "DailySession_userId_sessionDate_idx"
ON "DailySession"("userId", "sessionDate");
