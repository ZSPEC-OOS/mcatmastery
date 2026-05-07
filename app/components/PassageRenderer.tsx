"use client";
import { Fragment } from "react";

const SUBSCRIPT: Record<string, string> = {
  "0":"₀","1":"₁","2":"₂","3":"₃","4":"₄","5":"₅","6":"₆","7":"₇","8":"₈","9":"₉",
};

// Convert chemical formula subscripts: digits immediately after an element symbol.
// Uses word-boundary anchor so mid-word occurrences (e.g. pH7, Study2) are skipped.
function applyChemistry(text: string): string {
  return text.replace(/\b([A-Z][a-z]?)(\d+)/g, (_, sym: string, num: string) =>
    sym + [...num].map(d => SUBSCRIPT[d] ?? d).join("")
  );
}

// Parses **bold** and *italic* within a single line of text.
function renderInline(text: string, keyPrefix: string): React.ReactNode {
  const processed = applyChemistry(text);
  const segments = processed.split(/(\*\*(?:[^*]|\*(?!\*))+?\*\*|\*[^*\n]+?\*)/g);
  return segments.map((seg, i) => {
    const k = `${keyPrefix}-${i}`;
    if (seg.startsWith("**") && seg.endsWith("**") && seg.length > 4) {
      return <strong key={k}>{seg.slice(2, -2)}</strong>;
    }
    if (seg.startsWith("*") && seg.endsWith("*") && seg.length > 2) {
      return <em key={k}>{seg.slice(1, -1)}</em>;
    }
    return <Fragment key={k}>{seg}</Fragment>;
  });
}

interface PassageRendererProps {
  text: string;
  style?: React.CSSProperties;
  className?: string;
}

export function PassageRenderer({ text, style, className }: PassageRendererProps) {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <div
      className={className}
      style={{
        fontFamily: 'var(--font-playfair), Georgia, "Times New Roman", serif',
        fontSize: "0.875rem",
        lineHeight: 1.78,
        ...style,
      }}
    >
      {paragraphs.map((para, pi) => {
        const lines = para.split("\n");
        return (
          <p
            key={pi}
            style={{
              margin: 0,
              marginBottom: pi < paragraphs.length - 1 ? "0.9em" : 0,
              color: "inherit",
            }}
          >
            {lines.flatMap((line, li) => {
              const rendered = renderInline(line, `${pi}-${li}`);
              return li < lines.length - 1
                ? [rendered, <br key={`br-${pi}-${li}`} />]
                : [rendered];
            })}
          </p>
        );
      })}
    </div>
  );
}
