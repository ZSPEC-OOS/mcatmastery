import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getQuestions } from "../../../../lib/firestore";

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

    return NextResponse.json({
      questions: selected,
      found: allMatching.length,
      returned: selected.length,
    });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.issues }, { status: 400 });
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
