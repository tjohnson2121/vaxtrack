/** API / UI shape: vaccine with nested sources and latest snapshot (no DB imports). */

export type SnapshotSummary = {
  id: string;
  vaccineSourceId: string;
  fetchedAt: number;
  status: string;
  httpStatus: number | null;
  contentType: string | null;
  extractedText: string | null;
  contentHash: string;
  finalUrl: string | null;
  errorMessage: string | null;
};

export type SourceWithSnapshot = {
  id: string;
  vaccineId: string;
  url: string;
  sourceType: string;
  createdAt: number;
  latestSnapshot: SnapshotSummary | null;
};

export type VaccineWithSources = {
  id: string;
  name: string;
  createdAt: number;
  sources: SourceWithSnapshot[];
};

export type ProposedRuleRow = {
  id: string;
  vaccineId: string;
  sourceSnapshotId: string | null;
  title: string | null;
  body: string;
  status: string;
  createdAt: number;
  updatedAt: number;
};

export type CoverageRuleSetSummary = {
  id: string;
  vaccineId: string;
  sourceSnapshotId: string | null;
  status: string;
  extractor: string;
  model: string | null;
  promptVersion: string | null;
  createdAt: number;
  updatedAt: number;
  publishedAt: number | null;
};
