-- CreateTable
CREATE TABLE "route_fixed_expenses" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "expense_type_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "route_fixed_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "route_fixed_expenses_route_id_expense_type_id_key" ON "route_fixed_expenses"("route_id", "expense_type_id");

-- CreateIndex
CREATE INDEX "route_fixed_expenses_route_id_idx" ON "route_fixed_expenses"("route_id");

-- CreateIndex
CREATE INDEX "route_fixed_expenses_expense_type_id_idx" ON "route_fixed_expenses"("expense_type_id");

-- AddForeignKey
ALTER TABLE "route_fixed_expenses" ADD CONSTRAINT "route_fixed_expenses_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_fixed_expenses" ADD CONSTRAINT "route_fixed_expenses_expense_type_id_fkey" FOREIGN KEY ("expense_type_id") REFERENCES "expense_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

