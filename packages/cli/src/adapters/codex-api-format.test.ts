import { describe, expect, it } from "bun:test";
import {
  CodexAPIFormat,
  codexReasoningEffortFromRequest,
  codexServiceTierFromRequest,
} from "./codex-api-format.js";

function buildPayloadFor(request: any) {
  const adapter = new CodexAPIFormat("gpt-5.5");
  return adapter.buildPayload(
    { max_tokens: 4096, ...request },
    [{ role: "user", content: "hi" }],
    []
  );
}

describe("CodexAPIFormat reasoning effort", () => {
  it("maps Claude thinking budgets to Codex reasoning effort", () => {
    expect(codexReasoningEffortFromRequest({ thinking: { budget_tokens: 1024 } })).toBe("low");
    expect(codexReasoningEffortFromRequest({ thinking: { budget_tokens: 8000 } })).toBe("medium");
    expect(codexReasoningEffortFromRequest({ thinking: { budget_tokens: 32000 } })).toBe("high");
    expect(codexReasoningEffortFromRequest({ thinking: { budget_tokens: 80000 } })).toBe("xhigh");
  });

  it("uses explicit reasoning effort when present", () => {
    expect(codexReasoningEffortFromRequest({ reasoning_effort: "high" })).toBe("high");
    expect(codexReasoningEffortFromRequest({ reasoning: { effort: "xhigh" } })).toBe("xhigh");
    expect(codexReasoningEffortFromRequest({ reasoning_effort: "minimal" })).toBe("low");
    expect(codexReasoningEffortFromRequest({ reasoning_effort: "max" })).toBe("xhigh");
  });

  it("defaults to medium when no effort signal is present", () => {
    expect(codexReasoningEffortFromRequest({})).toBe("medium");
    expect(codexReasoningEffortFromRequest({ thinking: { budget_tokens: "high" } })).toBe("medium");
  });

  it("builds a Codex Responses payload with mapped reasoning effort", () => {
    const payload = buildPayloadFor({ thinking: { type: "enabled", budget_tokens: 32000 } });

    expect(payload.reasoning).toEqual({ effort: "high", summary: "auto" });
    expect(payload).not.toHaveProperty("thinking");
  });
});

describe("CodexAPIFormat fast service tier", () => {
  it("maps Claude Code fast slot requests to priority service tier", () => {
    expect(codexServiceTierFromRequest({ model: "claude-haiku-4-5-20251001" })).toBe(
      "priority"
    );
  });

  it("preserves explicit priority service tier", () => {
    expect(codexServiceTierFromRequest({ service_tier: "priority" })).toBe("priority");
  });

  it("does not enable priority service tier for normal requests", () => {
    expect(codexServiceTierFromRequest({ model: "gpt-5.5" })).toBeUndefined();
  });

  it("builds a Codex Responses payload with priority service tier for fast slot requests", () => {
    const payload = buildPayloadFor({
      model: "claude-haiku-4-5-20251001",
      thinking: { type: "enabled", budget_tokens: 32000 },
    });

    expect(payload.reasoning).toEqual({ effort: "high", summary: "auto" });
    expect(payload.service_tier).toBe("priority");
  });
});
