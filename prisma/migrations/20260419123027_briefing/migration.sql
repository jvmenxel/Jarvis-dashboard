-- CreateTable
CREATE TABLE "Briefing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "raw" TEXT NOT NULL,
    "sections" TEXT NOT NULL DEFAULT '{}',
    "sourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Briefing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Briefing_userId_date_idx" ON "Briefing"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Briefing_userId_date_key" ON "Briefing"("userId", "date");

-- AddForeignKey
ALTER TABLE "Briefing" ADD CONSTRAINT "Briefing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
