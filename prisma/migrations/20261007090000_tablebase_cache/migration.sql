-- CreateTable
CREATE TABLE "TablebaseCache" (
    "fenNormalized" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TablebaseCache_pkey" PRIMARY KEY ("fenNormalized")
);
