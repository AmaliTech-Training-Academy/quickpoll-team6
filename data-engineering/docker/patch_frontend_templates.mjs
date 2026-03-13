import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const rootDir = process.argv[2];

if (!rootDir) {
  console.error("Expected frontend root directory as the first argument.");
  process.exit(1);
}

const filesToPatch = [
  "src/app/pages/dashboard.component.ts",
  "src/app/pages/poll-metrics.component.ts",
];

const selfClosingTagPattern = /<(div|span)([^>]*)\/>/g;

for (const relativePath of filesToPatch) {
  const absolutePath = join(rootDir, relativePath);
  const originalContent = readFileSync(absolutePath, "utf8");
  const patchedContent = originalContent.replace(
    selfClosingTagPattern,
    "<$1$2></$1>",
  );

  writeFileSync(absolutePath, patchedContent, "utf8");
}
