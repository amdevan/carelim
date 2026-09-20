-- Generic clinical Procedure model for the General clinic type
-- (mirrors DentalProcedure minus dental-specific fields)

-- CreateTable
CREATE TABLE "Procedure" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "procNo" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT,
    "assistantId" TEXT,
    "appointmentId" TEXT,
    "procedureName" TEXT NOT NULL,
    "category" TEXT,
    "procedureDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "complications" TEXT,
    "invoiceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Procedure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Procedure_tenantId_procNo_key" ON "Procedure"("tenantId", "procNo");

-- AddForeignKey
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;