import { NextResponse } from "next/server";
import { getQuestions, updateQuestion } from "../../../../lib/firestore";
import { CURRICULUM_SECTIONS } from "../../../../lib/curriculum-sections";

// Build flat list of all canonical topic names
const KNOWN_TOPICS = CURRICULUM_SECTIONS.flatMap((s) =>
  s.groups.flatMap((g) => g.topics)
);

// Normalise for comparison: lowercase + collapse whitespace
function norm(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

const NORM_MAP = new Map<string, string>(
  KNOWN_TOPICS.map((t) => [norm(t), t])
);

function bestMatch(raw: string): string | null {
  const n = norm(raw);
  // 1. Exact normalised match
  if (NORM_MAP.has(n)) return NORM_MAP.get(n)!;
  // 2. One is a substring of the other
  for (const [knownNorm, canonical] of NORM_MAP) {
    if (n.includes(knownNorm) || knownNorm.includes(n)) return canonical;
  }
  return null;
}

export async function POST() {
  try {
    const all = await getQuestions({});
    const orphans = all.filter((q) => !KNOWN_TOPICS.includes(q.topic));

    if (orphans.length === 0) {
      return NextResponse.json({ fixed: 0, unmatched: [] });
    }

    const fixed: string[] = [];
    const unmatched: { id: string; topic: string; section: string; stem: string }[] = [];

    await Promise.all(
      orphans.map(async (q) => {
        const match = bestMatch(q.topic);
        if (match) {
          await updateQuestion(q.id, { topic: match });
          fixed.push(q.id);
        } else {
          unmatched.push({ id: q.id, topic: q.topic, section: q.section, stem: q.stem });
        }
      })
    );

    return NextResponse.json({ fixed: fixed.length, unmatched });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET — dry run (just report, don't patch)
export async function GET() {
  try {
    const all = await getQuestions({});
    const orphans = all.filter((q) => !KNOWN_TOPICS.includes(q.topic));

    const results = orphans.map((q) => ({
      id: q.id,
      topic: q.topic,
      section: q.section,
      suggestedFix: bestMatch(q.topic),
    }));

    return NextResponse.json({ count: results.length, results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
