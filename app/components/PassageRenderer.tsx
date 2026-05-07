"use client";
import { Fragment } from "react";

// Parses **bold** and *italic* within a single line of text.
function renderInline(text: string, keyPrefix: string): React.ReactNode {
  const segments = text.split(/(\*\*(?:[^*]|\*(?!\*))+?\*\*|\*[^*\n]+?\*)/g);
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
