import { describe, expect, it } from "bun:test";
import type { Context } from "hono";
import { createResponsesStreamHandler } from "./openai-responses-sse.js";

type ClaudeEventData = {
  content_block?: { type?: string; id?: string };
  delta?: { stop_reason?: string };
  index?: number;
};

type ClaudeEvent = { event: string; data: ClaudeEventData };

const context = {
  json: (body: unknown, status: number) => Response.json(body, { status }),
} as unknown as Context;

function responseFromEvents(events: unknown[]): Response {
  const body = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
  return new Response(body, { headers: { "Content-Type": "text/event-stream" } });
}

async function readClaudeEvents(response: Response): Promise<ClaudeEvent[]> {
  const text = await response.text();
  return text
    .trim()
    .split("\n\n")
    .filter(Boolean)
    .map((chunk) => {
      const lines = chunk.split("\n");
      const event = lines[0]?.replace(/^event: /, "") || "";
      const data = JSON.parse(lines[1]?.replace(/^data: /, "") || "{}") as ClaudeEventData;
      return { event, data };
    });
}

describe("openai-responses-sse stream parser", () => {
  it("does not emit duplicate tool block starts or stops after text content", async () => {
    const upstream = responseFromEvents([
      { type: "response.output_text.delta", delta: "checking" },
      {
        type: "response.output_item.added",
        item: {
          id: "fc_test",
          type: "function_call",
          call_id: "call_test",
          name: "Bash",
        },
      },
      { type: "response.function_call_arguments.delta", item_id: "fc_test", delta: '{"command"' },
      {
        type: "response.function_call_arguments.delta",
        item_id: "fc_test",
        delta: ':"printf ok"}',
      },
      {
        type: "response.output_item.done",
        item: {
          id: "fc_test",
          type: "function_call",
          call_id: "call_test",
          name: "Bash",
        },
      },
      { type: "response.completed", response: { usage: { input_tokens: 10, output_tokens: 5 } } },
    ]);

    const result = createResponsesStreamHandler(context, upstream, { modelName: "gpt-5.5" });
    const events = await readClaudeEvents(result);
    const toolStarts = events.filter(
      ({ event, data }) =>
        event === "content_block_start" && data.content_block?.type === "tool_use"
    );
    const toolStops = events.filter(
      ({ event, data }) => event === "content_block_stop" && data.index === 1
    );
    const textStops = events.filter(
      ({ event, data }) => event === "content_block_stop" && data.index === 0
    );

    expect(toolStarts).toHaveLength(1);
    expect(toolStarts[0].data.content_block.id).toBe("toolu_call_test");
    expect(toolStops).toHaveLength(1);
    expect(textStops).toHaveLength(1);
    expect(
      events.find(
        ({ event, data }) => event === "message_delta" && data.delta?.stop_reason === "tool_use"
      )
    ).toBeTruthy();
  });

  it("deduplicates repeated function_call added and done events", async () => {
    const functionCall = {
      id: "fc_test",
      type: "function_call",
      call_id: "call_test",
      name: "Bash",
    };
    const upstream = responseFromEvents([
      { type: "response.output_item.added", item: functionCall },
      { type: "response.output_item.added", item: functionCall },
      { type: "response.function_call_arguments.delta", item_id: "fc_test", delta: "{}" },
      { type: "response.output_item.done", item: functionCall },
      { type: "response.output_item.done", item: functionCall },
      { type: "response.completed", response: { usage: { input_tokens: 10, output_tokens: 5 } } },
    ]);

    const result = createResponsesStreamHandler(context, upstream, { modelName: "gpt-5.5" });
    const events = await readClaudeEvents(result);
    const toolStarts = events.filter(
      ({ event, data }) =>
        event === "content_block_start" && data.content_block?.type === "tool_use"
    );
    const toolStops = events.filter(
      ({ event, data }) => event === "content_block_stop" && data.index === 0
    );

    expect(toolStarts).toHaveLength(1);
    expect(toolStops).toHaveLength(1);
  });
});
