import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getQuestions } from "../../../../lib/firestore";
import type { QuestionDoc } from "../../../../lib/firestore";

const Schema = z.object({
  sections:     z.array(z.enum(["Chem/Phys", "CARS", "Bio/Biochem", "Psych/Soc"])).min(1),
  difficulties: z.array(z.enum(["easy", "medium", "hard"])).default(["easy", "medium", "hard"]),
  subTypes:     z.array(z.string()).optional(),
  count:        z.number().min(1).max(50).default(10),
  discreteOnly: z.boolean().optional().default(false),
});

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Round-robin across topics so each topic gets equal representation.
function selectEvenly(questions: QuestionDoc[], count: number): QuestionDoc[] {
  const byTopic = new Map<string, QuestionDoc[]>();
  for (const q of shuffle(questions)) {
    const arr = byTopic.get(q.topic) ?? [];
    arr.push(q);
    byTopic.set(q.topic, arr);
  }

  const topics = shuffle([...byTopic.keys()]);
  const result: QuestionDoc[] = [];
  let round = 0;

  outer: while (result.length < count) {
    let added = false;
    for (const t of topics) {
      const qs = byTopic.get(t)!;
      if (round < qs.length) {
        result.push(qs[round]);
        added = true;
        if (result.length >= count) break outer;
      }
    }
    if (!added) break;
    round++;
  }

  return shuffle(result);
}

export async function POST(req: NextRequest) {
  try {
    const body = Schema.parse(await req.json());

    const allMatching = await getQuestions({
      sections:     body.sections,
      difficulties: body.difficulties,
      subTypes:     body.subTypes?.length ? body.subTypes : undefined,
    });

    // In discrete-only mode, explicitly drop any question that belongs to a passage group.
    const pool = body.discreteOnly
      ? allMatching.filter(q => !q.passageGroupId)
      : allMatching;

    const selected = body.discreteOnly
      ? selectEvenly(pool, body.count)
      : shuffle(pool).slice(0, body.count);

    // Group passage questions together so all questions from one passage are consecutive.
    // Shuffle at the unit level (passage group = one unit, discrete = one unit each).
    const groupMap = new Map<string, QuestionDoc[]>();
    const discrete: QuestionDoc[] = [];

    for (const q of selected) {
      if (q.passageGroupId) {
        const g = groupMap.get(q.passageGroupId) ?? [];
        g.push(q);
        groupMap.set(q.passageGroupId, g);
      } else {
        discrete.push(q);
      }
    }

    // Sort each group internally by createdAt so questions appear in generation order
    for (const g of groupMap.values()) {
      g.sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
    }

    // Shuffle the units (groups + discrete), then flatten
    const units: QuestionDoc[][] = [
      ...Array.from(groupMap.values()),
      ...discrete.map(q => [q]),
    ];
    const ordered = shuffle(units).flat();

    return NextResponse.json({
      questions: ordered,
      found: pool.length,
      returned: ordered.length,
    });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.issues }, { status: 400 });
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
