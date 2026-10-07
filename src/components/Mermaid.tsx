"use client";

import { useEffect, useId, useState } from "react";
import { useTheme } from "next-themes";

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

export function Mermaid({ chart }: { chart: string }) {
  const id = useId();
  const [svg, setSvg] = useState("");
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    let cancelled = false;

    void import("mermaid").then(async ({ default: mermaid }) => {
      const surface = cssVar("--surface-2");
      const surfaceAlt = cssVar("--surface-1");
      const text = cssVar("--text-primary");
      const textMuted = cssVar("--text-tertiary");
      const border = cssVar("--line-structure");
      const brand = cssVar("--line-cta");

      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "loose",
        fontFamily: "var(--font-sans)",
        theme: "base",
        themeVariables: {
          background: "transparent",
          mainBkg: surface,
          primaryColor: surface,
          primaryBorderColor: border,
          primaryTextColor: text,
          secondaryColor: surfaceAlt,
          secondaryBorderColor: border,
          secondaryTextColor: text,
          tertiaryColor: surfaceAlt,
          tertiaryBorderColor: border,
          tertiaryTextColor: text,
          lineColor: textMuted,
          textColor: text,
          nodeTextColor: text,
          clusterBkg: surfaceAlt,
          clusterBorder: border,
          titleColor: text,
          edgeLabelBackground: surfaceAlt,
          actorBkg: surface,
          actorBorder: brand,
          actorTextColor: text,
          actorLineColor: textMuted,
          signalColor: text,
          signalTextColor: text,
          labelBoxBkgColor: surfaceAlt,
          labelBoxBorderColor: border,
          labelTextColor: text,
          loopTextColor: text,
          noteBkgColor: surfaceAlt,
          noteBorderColor: border,
          noteTextColor: text,
          activationBkgColor: surfaceAlt,
          activationBorderColor: brand,
          sequenceNumberColor: surface,
          attributeBackgroundColorEven: surfaceAlt,
          attributeBackgroundColorOdd: surface,
        },
      });

      try {
        const rendered = await mermaid.render(
          id.replaceAll(":", ""),
          chart.replaceAll("\\n", "\n"),
        );
        if (!cancelled) setSvg(rendered.svg);
      } catch (error) {
        console.error("Mermaid render failed:", error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [chart, id, resolvedTheme]);

  return (
    <div
      className="mermaid-diagram"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
