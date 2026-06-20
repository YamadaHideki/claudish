import { describe, expect, it } from "bun:test";
import { ENV } from "../config.js";
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

  it("honors the Claudish Codex reasoning effort override", () => {
    const previous = process.env[ENV.CLAUDISH_CODEX_REASONING_EFFORT];
    process.env[ENV.CLAUDISH_CODEX_REASONING_EFFORT] = "high";
    try {
      expect(codexReasoningEffortFromRequest({})).toBe("high");
      expect(buildPayloadFor({}).reasoning).toEqual({ effort: "high", summary: "auto" });
    } finally {
      if (previous === undefined) delete process.env[ENV.CLAUDISH_CODEX_REASONING_EFFORT];
      else process.env[ENV.CLAUDISH_CODEX_REASONING_EFFORT] = previous;
    }
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

  it("honors the Claudish Codex service tier override", () => {
    const previous = process.env[ENV.CLAUDISH_CODEX_SERVICE_TIER];
    process.env[ENV.CLAUDISH_CODEX_SERVICE_TIER] = "priority";
    try {
      expect(codexServiceTierFromRequest({ model: "gpt-5.5" })).toBe("priority");
    } finally {
      if (previous === undefined) delete process.env[ENV.CLAUDISH_CODEX_SERVICE_TIER];
      else process.env[ENV.CLAUDISH_CODEX_SERVICE_TIER] = previous;
    }
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
