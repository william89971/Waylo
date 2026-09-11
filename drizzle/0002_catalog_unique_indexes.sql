CREATE UNIQUE INDEX "institutions_code_idx" ON "institutions" USING btree ("code");-->statement-breakpoint
CREATE UNIQUE INDEX "catalog_courses_code_release_idx" ON "catalog_courses" USING btree ("code","release_id");
