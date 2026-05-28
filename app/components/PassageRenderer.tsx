"use client";
import { Fragment } from "react";

const SUBSCRIPT: Record<string, string> = {
  "0":"₀","1":"₁","2":"₂","3":"₃","4":"₄","5":"₅","6":"₆","7":"₇","8":"₈","9":"₉",
};

function applyChemistry(text: string): string {
  return text.replace(/\b([A-Z][a-z]?)(\d+)/g, (_, sym: string, num: string) =>
    sym + [...num].map(d => SUBSCRIPT[d] ?? d).join("")
  );
}

// Parses **bold**, *italic*, ==highlight==, __underline__, <u>underline</u> within a single line.
// Each token's inner content is recursively processed so nesting works (e.g. ==**bold**==).
function renderInline(text: string, keyPrefix: string): React.ReactNode {
  const processed = applyChemistry(text);
  const segments = processed.split(/(\*\*(?:[^*]|\*(?!\*))+?\*\*|\*[^*\n]+?\*|==.+?==|__[^_\n]+?__|<u>.*?<\/u>)/g);
  return segments.map((seg, i) => {
    const k = `${keyPrefix}-${i}`;
    if (seg.startsWith("**") && seg.endsWith("**") && seg.length > 4)
      return <strong key={k}>{renderInline(seg.slice(2, -2), `${k}-b`)}</strong>;
    if (seg.startsWith("*") && seg.endsWith("*") && seg.length > 2)
      return <em key={k}>{renderInline(seg.slice(1, -1), `${k}-i`)}</em>;
    if (seg.startsWith("==") && seg.endsWith("==") && seg.length > 4)
      return <mark key={k}>{renderInline(seg.slice(2, -2), `${k}-m`)}</mark>;
    if (seg.startsWith("__") && seg.endsWith("__") && seg.length > 4)
      return <span key={k} style={{ textDecoration: "underline" }}>{renderInline(seg.slice(2, -2), `${k}-u`)}</span>;
    if (seg.startsWith("<u>") && seg.endsWith("</u>") && seg.length > 7)
      return <span key={k} style={{ textDecoration: "underline" }}>{renderInline(seg.slice(3, -4), `${k}-u`)}</span>;
    return <Fragment key={k}>{seg}</Fragment>;
  });
}

function listType(lines: string[]): "ul" | "ol" | null {
  if (lines.length === 0) return null;
  if (lines.every(l => /^[-•]\s+/.test(l))) return "ul";
  if (lines.every((l, i) => new RegExp(`^${i + 1}\\.\\s+`).test(l))) return "ol";
  return null;
}

// Detect markdown table: lines where every line starts and ends with |
function isTableBlock(lines: string[]): boolean {
  if (lines.length < 2) return false;
  return lines.every(l => /^\|.*\|$/.test(l.trim()));
}

function parseTableRow(line: string): string[] {
  return line.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
}

function isSeparatorRow(cols: string[]): boolean {
  return cols.every(c => /^:?-+:?$/.test(c));
}

function renderTable(lines: string[], key: number, mb: string | number) {
  const rows = lines.map(parseTableRow);
  const headerRow = rows[0];
  const dataRows = rows.filter((_, i) => i > 0 && !isSeparatorRow(rows[i]));

  return (
    <div key={key} style={{ overflowX: "auto", marginBottom: mb }}>
      <table style={{
        borderCollapse: "collapse",
        width: "100%",
        fontSize: "0.82rem",
        lineHeight: 1.5,
      }}>
        <thead>
          <tr>
            {headerRow.map((cell, ci) => (
              <th key={ci} style={{
                padding: "6px 12px",
                textAlign: "left",
                borderBottom: "2px solid var(--border)",
                fontWeight: 600,
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
              }}>
                {renderInline(cell, `th-${key}-${ci}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((row, ri) => (
            <tr key={ri} style={{ borderBottom: "1px solid var(--border)" }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{
                  padding: "5px 12px",
                  color: "var(--text-secondary)",
                }}>
                  {renderInline(cell, `td-${key}-${ri}-${ci}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
        fontFamily: 'var(--font-roboto), system-ui, sans-serif',
        fontSize: "0.875rem",
        lineHeight: 1.78,
        ...style,
      }}
    >
      {paragraphs.map((para, pi) => {
        const lines = para.split("\n");
        const mb = pi < paragraphs.length - 1 ? "0.9em" : 0;

        if (isTableBlock(lines)) {
          return renderTable(lines, pi, mb);
        }

        const kind = listType(lines);

        if (kind === "ul") {
          return (
            <ul key={pi} style={{ margin: 0, marginBottom: mb, paddingLeft: "1.4em" }}>
              {lines.map((l, li) => (
                <li key={li} style={{ color: "inherit" }}>
                  {renderInline(l.replace(/^[-•]\s+/, ""), `${pi}-${li}`)}
                </li>
              ))}
            </ul>
          );
        }

        if (kind === "ol") {
          return (
            <ol key={pi} style={{ margin: 0, marginBottom: mb, paddingLeft: "1.4em" }}>
              {lines.map((l, li) => (
                <li key={li} style={{ color: "inherit" }}>
                  {renderInline(l.replace(/^\d+\.\s+/, ""), `${pi}-${li}`)}
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={pi} style={{ margin: 0, marginBottom: mb, color: "inherit" }}>
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
