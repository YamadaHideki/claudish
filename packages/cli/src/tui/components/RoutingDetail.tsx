/** @jsxImportSource @opentui/react */
import { C } from "../theme.js";
import { DETAIL_H } from "../constants.js";
import type { ProbeMode } from "../types.js";
import type { MergedRule } from "../types.js";

interface RoutingDetailProps {
  probeMode: ProbeMode;
  mergedRules: MergedRule[];
}

export function RoutingDetail({ probeMode, mergedRules }: RoutingDetailProps) {
  // Probe is full-screen — no separate detail panel shown
  if (probeMode !== "idle") {
    return null;
  }

  const defaults = mergedRules.filter((r) => r.kind === "default").length;
  const globalRules = mergedRules.filter((r) => r.kind === "global");
  const projectRules = mergedRules.filter((r) => r.kind === "project");
  // Among global rules, how many override a built-in default? (Project rules
  // get the ▴ marker regardless, so their override status doesn't change
  // the count.)
  const globalOverrides = globalRules.filter((r) => r.overridesDefault).length;
  const globalCustom = globalRules.length - globalOverrides;

  return (
    <box
      height={DETAIL_H}
      border
      borderStyle="single"
      borderColor={C.dim}
      title=" Legend "
      backgroundColor={C.bgAlt}
      flexDirection="column"
      paddingX={1}
    >
      <text>
        <span fg={C.dim} bold>{" · "}</span>
        <span fg={C.fgMuted}>{"default · "}</span>
        <span fg={C.green} bold>{"•"}</span>
        <span fg={C.fgMuted}>{" custom global · "}</span>
        <span fg={C.yellow} bold>{"★"}</span>
        <span fg={C.fgMuted}>{" global override of default · "}</span>
        <span fg={C.cyan} bold>{"▴"}</span>
        <span fg={C.fgMuted}>{" project (.claudish.json)"}</span>
      </text>
      <text>
        <span fg={C.fgMuted}>{"  Each row owns its scope: "}</span>
        <span fg={C.green} bold>{"d"}</span>
        <span fg={C.fgMuted}>{" deletes from that scope; "}</span>
        <span fg={C.green} bold>{"e"}</span>
        <span fg={C.fgMuted}>{" can move scope. Project beats global beats default at runtime."}</span>
      </text>
      <text>
        <span fg={C.cyan} bold>{`  ${defaults}`}</span>
        <span fg={C.fgMuted}>{" default"}</span>
        <span fg={C.dim}>{"  ·  "}</span>
        <span fg={C.green} bold>{`${globalCustom}`}</span>
        <span fg={C.fgMuted}>{" global custom"}</span>
        <span fg={C.dim}>{"  ·  "}</span>
        <span fg={C.yellow} bold>{`${globalOverrides}`}</span>
        <span fg={C.fgMuted}>{" override" + (globalOverrides === 1 ? "" : "s")}</span>
        <span fg={C.dim}>{"  ·  "}</span>
        <span fg={C.cyan} bold>{`${projectRules.length}`}</span>
        <span fg={C.fgMuted}>{" project"}</span>
      </text>
    </box>
  );
}
