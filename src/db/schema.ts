import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const vaccines = sqliteTable("vaccines", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const vaccineSources = sqliteTable("vaccine_sources", {
  id: text("id").primaryKey(),
  vaccineId: text("vaccine_id")
    .notNull()
    .references(() => vaccines.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  sourceType: text("source_type").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const sourceSnapshots = sqliteTable("source_snapshots", {
  id: text("id").primaryKey(),
  vaccineSourceId: text("vaccine_source_id")
    .notNull()
    .references(() => vaccineSources.id, { onDelete: "cascade" }),
  fetchedAt: integer("fetched_at").notNull(),
  status: text("status").notNull(),
  httpStatus: integer("http_status"),
  contentType: text("content_type"),
  extractedText: text("extracted_text"),
  contentHash: text("content_hash").notNull(),
  finalUrl: text("final_url"),
  errorMessage: text("error_message"),
});

/** Manual / LLM-proposed structured rules; draft until reviewed (plan phase 2). */
export const proposedRules = sqliteTable("proposed_rules", {
  id: text("id").primaryKey(),
  vaccineId: text("vaccine_id")
    .notNull()
    .references(() => vaccines.id, { onDelete: "cascade" }),
  sourceSnapshotId: text("source_snapshot_id").references(
    () => sourceSnapshots.id,
    { onDelete: "set null" }
  ),
  title: text("title"),
  body: text("body").notNull(),
  status: text("status").notNull().default("draft"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export type Vaccine = typeof vaccines.$inferSelect;
export type VaccineSource = typeof vaccineSources.$inferSelect;
export type SourceSnapshot = typeof sourceSnapshots.$inferSelect;
export type ProposedRule = typeof proposedRules.$inferSelect;

/** Validated JSON rules for Coverage Check; one published set per vaccine at a time. */
export const coverageRuleSets = sqliteTable("coverage_rule_sets", {
  id: text("id").primaryKey(),
  vaccineId: text("vaccine_id")
    .notNull()
    .references(() => vaccines.id, { onDelete: "cascade" }),
  sourceSnapshotId: text("source_snapshot_id").references(
    () => sourceSnapshots.id,
    { onDelete: "set null" }
  ),
  status: text("status").notNull().default("draft"),
  rulesJson: text("rules_json").notNull(),
  extractor: text("extractor").notNull(),
  model: text("model"),
  promptVersion: text("prompt_version"),
  validationErrors: text("validation_errors"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  publishedAt: integer("published_at"),
});

export type CoverageRuleSet = typeof coverageRuleSets.$inferSelect;
