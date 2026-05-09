import type { PullRequestContext } from "./types.js";

export interface EvidenceSignals {
  descriptionState: "unavailable" | "missing" | "thin" | "present";
  verificationEvidence: boolean;
  reproductionEvidence: boolean;
}

const VERIFICATION_PATTERNS = [
  /\b(?:tested|tests?|verified|validated|checks?|ci|unit test|integration test)\b/i,
  /\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?test\b/i,
  /\b(?:pytest|go test|cargo test|mvn test|gradle test|dotnet test)\b/i,
  /\bmanual(?:ly)?\s+(?:tested|verified|checked)\b/i,
  /\bscreenshot(?:s)?\b/i,
  /测试|验证|已测|截图|单元测试|集成测试/
];

const REPRODUCTION_PATTERNS = [
  /\b(?:repro|reproduce|reproduction|steps to reproduce|minimal reproduction)\b/i,
  /\b(?:before|after|expected|actual)\b/i,
  /复现|重现|复现步骤|期望|实际/
];

export function analyzeEvidence(context?: PullRequestContext): EvidenceSignals {
  if (!context) {
    return {
      descriptionState: "unavailable",
      verificationEvidence: false,
      reproductionEvidence: false
    };
  }

  const text = [context.title ?? "", context.body ?? ""].join("\n").trim();
  const body = (context.body ?? "").trim();

  return {
    descriptionState: descriptionState(body),
    verificationEvidence: matchesAnyPattern(text, VERIFICATION_PATTERNS),
    reproductionEvidence: matchesAnyPattern(text, REPRODUCTION_PATTERNS)
  };
}

function descriptionState(body: string): EvidenceSignals["descriptionState"] {
  if (body.length === 0) {
    return "missing";
  }

  if (body.length < 80) {
    return "thin";
  }

  return "present";
}

function matchesAnyPattern(value: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}
