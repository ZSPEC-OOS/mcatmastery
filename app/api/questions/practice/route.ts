import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getQuestions } from "../../../../lib/firestore";
import type { QuestionDoc } from "../../../../lib/firestore";

const Schema = z.object({
  sections:     z.array(z.enum(["Chem/Phys", "CARS", "Bio/Biochem", "Psych/Soc"])).min(1),
  difficulties: z.array(z.enum(["easy", "medium", "hard"])).default(["easy", "medium", "hard"]),
  subTypes:     z.array(z.string()).optional(),
  count:        z.number().min(1).max(50).default(10),
});

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function POST(req: NextRequest) {
  try {
    const body = Schema.parse(await req.json());

    const allMatching = await getQuestions({
      sections:     body.sections,
      difficulties: body.difficulties,
      subTypes:     body.subTypes?.length ? body.subTypes : undefined,
    });

    const selected = shuffle(allMatching).slice(0, body.count);

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
      found: allMatching.length,
      returned: ordered.length,
    });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.issues }, { status: 400 });
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
