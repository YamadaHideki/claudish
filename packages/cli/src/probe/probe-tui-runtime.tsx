/** @jsxImportSource @opentui/react */
/**
 * Bootstrapping helper for the probe TUI. Creates an OpenTUI renderer,
 * mounts the React tree, and exposes the external store plus a shutdown
 * function. All output goes to process.stderr so stdout stays clean for
 * --json piping.
 */

import { createCliRenderer } from "@opentui/core";
import { createRoot, type Root } from "@opentui/react";
import { ProbeApp, ProbeStore, type ProbeAppState } from "./probe-tui-app.js";

export interface ProbeRuntime {
  store: ProbeStore;
  shutdown: () => Promise<void>;
}

export async function startProbeTui(
  initial: ProbeAppState,
): Promise<ProbeRuntime> {
  const renderer = await createCliRenderer({
    // Route rendering to stderr so --json piping on stdout stays clean.
    stdout: process.stderr as unknown as NodeJS.WriteStream,
    // Inline rendering — do NOT take over the full screen. This lets the
    // final probe results persist in the scrollback after shutdown.
    useAlternateScreen: false,
    // Mouse tracking ON so the scroll wheel drives the model-list scrollbox.
    // The scrollbox (focused) consumes wheel MouseEvents via its built-in
    // onMouseEvent. Trade-off accepted: while the probe is LIVE, the wheel
    // scrolls the list instead of the terminal's native scrollback; once the
    // TUI exits and renderer.destroy() disables mouse reporting, native
    // scrollback is restored (the final static results stay in scrollback).
    useMouse: true,
    exitOnCtrlC: true,
  });

  const store = new ProbeStore(initial);
  const root: Root = createRoot(renderer);
  root.render(<ProbeApp store={store} />);

  let destroyed = false;
  const shutdown = async (): Promise<void> => {
    if (destroyed) return;
    destroyed = true;
    try {
      root.unmount();
    } catch {
      /* ignore */
    }
    try {
      renderer.destroy();
    } catch {
      /* ignore */
    }
  };

  return { store, shutdown };
}
