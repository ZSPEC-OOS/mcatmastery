import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { saveQuestion, getQuestions } from "../../../../lib/firestore";

/**
 * One-time migration: copies all questions from Postgres to Firestore.
 * Safe to call multiple times — skips questions whose stem already exists in Firestore.
 */
export async function POST() {
  try {
    const pgQuestions = await db.question.findMany();
    if (pgQuestions.length === 0) {
      return NextResponse.json({ migrated: 0, message: "No questions found in Postgres." });
    }

    const existing = await getQuestions();
    const existingStems = new Set(existing.map((q) => q.stem));

    let migrated = 0;
    const skipped: string[] = [];

    for (const q of pgQuestions) {
      if (existingStems.has(q.stem)) {
        skipped.push(q.id);
        continue;
      }
      await saveQuestion({
        section:       q.section,
        topic:         q.topic,
        passage:       q.passage,
        stem:          q.stem,
        optionA:       q.optionA,
        optionB:       q.optionB,
        optionC:       q.optionC,
        optionD:       q.optionD,
        correctAnswer: q.correctAnswer,
        explanation:   q.explanation,
        difficulty:    q.difficulty,
        aiGenerated:   q.aiGenerated,
        figureUrl:     q.figureUrl,
      });
      migrated++;
    }

    return NextResponse.json({
      migrated,
      skipped: skipped.length,
      total:   pgQuestions.length,
      message: `Migrated ${migrated} question(s) to Firestore. ${skipped.length} already existed.`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
