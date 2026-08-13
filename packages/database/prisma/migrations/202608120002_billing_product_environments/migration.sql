DROP INDEX "BillingProduct_externalId_key";
CREATE UNIQUE INDEX "BillingProduct_externalId_devMode_key" ON "BillingProduct"("externalId", "devMode");
