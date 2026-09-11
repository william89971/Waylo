#!/usr/bin/env npx tsx
import {
  formatIngestionDiff,
  ingestAssistFixtures,
  ingestPrivateArchetypes,
  ingestUscFixtures,
} from "../src/lib/server/ingestion/normalize";

function parseArgs(argv: string[]) {
  const provider = (argv.find((arg) => !arg.startsWith("-")) ?? "all") as "assist" | "usc" | "private" | "all";
  return {
    provider,
    dryRun: argv.includes("--dry-run") || !argv.includes("--write"),
  };
}

async function main() {
  const { provider, dryRun } = parseArgs(process.argv.slice(2));
  const results = [];
  if (provider === "assist" || provider === "all") results.push(ingestAssistFixtures({ dryRun }));
  if (provider === "usc" || provider === "all") results.push(ingestUscFixtures({ dryRun }));
  if (provider === "private" || provider === "all") results.push(ingestPrivateArchetypes({ dryRun }));

  for (const result of results) {
    console.log(formatIngestionDiff(result));
    console.log("---");
  }

  if (results.some((result) => result.validationErrors.length > 0)) {
    console.error("Ingestion validation failed; active release left unchanged.");
    process.exitCode = 1;
    return;
  }

  console.log(dryRun ? "Dry run only — no Neon writes performed." : "Write mode: fixture-normalized rules ready for draft release promotion.");
}

void main();
