import type { ChangeLine, Finding } from "./types.js";

interface SecretPattern {
  id: string;
  label: string;
  regex: RegExp;
  severity: "medium" | "high";
}

const SECRET_PATTERNS: SecretPattern[] = [
  {
    id: "openai-key",
    label: "OpenAI-style API key",
    regex: /\bsk-[A-Za-z0-9_-]{20,}\b/g,
    severity: "high"
  },
  {
    id: "anthropic-key",
    label: "Anthropic-style API key",
    regex: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g,
    severity: "high"
  },
  {
    id: "github-token",
    label: "GitHub token",
    regex: /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/g,
    severity: "high"
  },
  {
    id: "aws-access-key",
    label: "AWS access key id",
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
    severity: "high"
  },
  {
    id: "database-url",
    label: "database connection string",
    regex: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s"'`]+/gi,
    severity: "high"
  },
  {
    id: "generic-secret-assignment",
    label: "generic secret assignment",
    regex:
      /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password|private[_-]?key)\b\s*[:=]\s*["']?[^"'\s]{16,}/gi,
    severity: "medium"
  }
];

export function detectSecrets(path: string, addedLines: ChangeLine[]): Finding[] {
  const findings: Finding[] = [];

  for (const line of addedLines) {
    for (const pattern of SECRET_PATTERNS) {
      pattern.regex.lastIndex = 0;
      const matches = [...line.value.matchAll(pattern.regex)];

      if (matches.length === 0) {
        continue;
      }

      findings.push({
        ruleId: `secret-detected:${pattern.id}`,
        title: "Possible secret committed",
        message: `Added line looks like it contains a ${pattern.label}.`,
        severity: pattern.severity,
        path,
        evidence: [
          line.lineNumber
            ? `line ${line.lineNumber}: ${redactLine(line.value)}`
            : redactLine(line.value)
        ],
        recommendation:
          "Move credentials to a secret manager or CI secret store, rotate any exposed value, and commit only placeholders."
      });
    }
  }

  return findings;
}

function redactLine(line: string): string {
  return line
    .replace(/(sk-[A-Za-z0-9_-]{8})[A-Za-z0-9_-]+/g, "$1...[redacted]")
    .replace(/(sk-ant-[A-Za-z0-9_-]{8})[A-Za-z0-9_-]+/g, "$1...[redacted]")
    .replace(/(gh[pousr]_[A-Za-z0-9_]{8})[A-Za-z0-9_]+/g, "$1...[redacted]")
    .replace(/(AKIA[0-9A-Z]{4})[0-9A-Z]+/g, "$1...[redacted]")
    .replace(
      /((?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^:/\s"'`]+:)[^@\s"'`]+@/gi,
      "$1[redacted]@"
    )
    .replace(
      /((?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password|private[_-]?key)\b\s*[:=]\s*["']?)[^"'\s]+/gi,
      "$1[redacted]"
    );
}
