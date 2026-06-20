export const CODEX_FAST_SLOT_MODEL = "claude-haiku-4-5-20251001";

export function isCodexFastTierCandidate(model: string | undefined): boolean {
  if (!model) return false;
  const lower = model.toLowerCase();

  if (lower.startsWith("oai@") || lower.startsWith("openai@")) return false;

  if (
    lower.startsWith("cx@") ||
    lower.startsWith("codex@") ||
    lower.startsWith("openai-codex@")
  ) {
    return true;
  }

  if (!lower.includes("@") && lower.includes("codex")) return true;

  // Bare GPT models route to openai-codex first when subscription credentials exist.
  // Keep this version-agnostic so future bare gpt-* Codex catalog entries inherit
  // TUI /fast support without a Claudish code change.
  return !lower.includes("@") && /^gpt-(?:[\w.-]+)$/.test(lower);
}
