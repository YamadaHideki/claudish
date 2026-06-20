import { describe, expect, it } from "bun:test";
import { CODEX_FAST_SLOT_MODEL, isCodexFastTierCandidate } from "./codex-fast-mode.js";

describe("codex fast mode helpers", () => {
  it("uses a Claude Haiku slot for Claude Code fast-mode requests", () => {
    expect(CODEX_FAST_SLOT_MODEL).toContain("haiku");
  });

  it("detects Codex-routed model specs", () => {
    expect(isCodexFastTierCandidate("cx@gpt-5.5")).toBe(true);
    expect(isCodexFastTierCandidate("codex@gpt-5.5")).toBe(true);
    expect(isCodexFastTierCandidate("openai-codex@gpt-5.5")).toBe(true);
    expect(isCodexFastTierCandidate("gpt-5.5")).toBe(true);
    expect(isCodexFastTierCandidate("gpt-5.4-codex")).toBe(true);
  });

  it("does not detect non-Codex model specs", () => {
    expect(isCodexFastTierCandidate("oai@gpt-4o")).toBe(false);
    expect(isCodexFastTierCandidate("oai@gpt-5.4-codex")).toBe(false);
    expect(isCodexFastTierCandidate("google@gemini-3-pro-preview")).toBe(false);
    expect(isCodexFastTierCandidate("claude-sonnet-4-6")).toBe(false);
  });
});
