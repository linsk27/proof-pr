import type { ChangeLine, DiffFile } from "./types.js";

const DIFF_HEADER = /^diff --git a\/(.+) b\/(.+)$/;
const HUNK_HEADER = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

export function parseUnifiedDiff(diffText: string): DiffFile[] {
  const files: DiffFile[] = [];
  let current: DiffFile | undefined;
  let oldLine = 0;
  let newLine = 0;

  for (const line of diffText.split(/\r?\n/)) {
    const fileMatch = line.match(DIFF_HEADER);

    if (fileMatch) {
      current = {
        oldPath: normalizeDiffPath(fileMatch[1] ?? ""),
        path: normalizeDiffPath(fileMatch[2] ?? ""),
        added: 0,
        removed: 0,
        isNew: false,
        isDeleted: false,
        addedLines: [],
        removedLines: []
      };
      files.push(current);
      continue;
    }

    if (!current) {
      continue;
    }

    if (line.startsWith("new file mode")) {
      current.isNew = true;
      continue;
    }

    if (line.startsWith("deleted file mode")) {
      current.isDeleted = true;
      continue;
    }

    if (line.startsWith("rename from ")) {
      current.oldPath = normalizeDiffPath(line.slice("rename from ".length));
      continue;
    }

    if (line.startsWith("rename to ")) {
      current.path = normalizeDiffPath(line.slice("rename to ".length));
      continue;
    }

    const hunkMatch = line.match(HUNK_HEADER);
    if (hunkMatch) {
      oldLine = Number(hunkMatch[1]);
      newLine = Number(hunkMatch[2]);
      continue;
    }

    if (line.startsWith("+++") || line.startsWith("---")) {
      continue;
    }

    if (line.startsWith("+")) {
      current.added += 1;
      current.addedLines.push(toChangeLine(line.slice(1), newLine));
      newLine += 1;
      continue;
    }

    if (line.startsWith("-")) {
      current.removed += 1;
      current.removedLines.push(toChangeLine(line.slice(1), oldLine));
      oldLine += 1;
      continue;
    }

    if (line.startsWith(" ")) {
      oldLine += 1;
      newLine += 1;
    }
  }

  return files.filter((file) => file.added > 0 || file.removed > 0 || file.isNew || file.isDeleted);
}

function normalizeDiffPath(path: string): string {
  const trimmed = path.trim();

  if (trimmed === "/dev/null") {
    return trimmed;
  }

  return trimmed.replace(/^"|"$/g, "");
}

function toChangeLine(value: string, lineNumber: number): ChangeLine {
  return lineNumber > 0 ? { value, lineNumber } : { value };
}
