import { NextRequest } from "next/server";
import { z } from "zod";
import { getSetting, ensureSchema } from "../../../../lib/db";
import { GENERATION_SYSTEM_PROMPT, VALIDATION_SYSTEM_PROMPT, PASSAGE_SET_SYSTEM_PROMPT } from "../../../../lib/anthropic";
import { saveQuestion, getQuestions, getModelByModelId, uploadQuestionImage, updateQuestion } from "../../../../lib/firestore";
import { callModel, getModelForRole } from "../../../../lib/model";
import { getSubTypeById } from "../../../../lib/subtypes";
import { extractModelJson } from "../../../../lib/parse";
import { SECTION_TOPICS } from "../../../../lib/topics";

// ── Image prompts ─────────────────────────────────────────────────────────────

const IMAGE_GENERATION_PROMPT = `You are an expert MCAT question writer who creates figure-based questions requiring visual interpretation of scientific data.

You will receive a request specifying a section and subtype. Generate a high-quality MCAT-style question where a figure (graph, diagram, table, or experimental setup) is ESSENTIAL to answering correctly. Students must interpret the visual to answer.

**Topic:** If a "Topic:" line appears in the request, you MUST use that exact topic verbatim in the "topic" output field — do not substitute a different one. If no topic is specified, choose the canonical topic that best fits the requested section and subtype from the lists below.

Chem/Phys: Atomic Structure | Periodic Trends | Bonding & Intermolecular Forces | Acids & Bases | Electrochemistry | Thermodynamics & Thermochemistry | Kinetics & Equilibrium | Solutions & Colligative Properties | Nuclear Chemistry | Kinematics & Dynamics | Work, Energy & Power | Fluids & Pressure | Electricity & Magnetism | Circuits | Waves & Sound | Optics & Light | Functional Groups & Nomenclature | Stereochemistry & Chirality | Reaction Mechanisms | Lab Techniques & Separations

Bio/Biochem: Amino Acids, Proteins & Enzymes | Enzyme Kinetics & Inhibition | Metabolism: Glycolysis & Fermentation | Metabolism: TCA Cycle & Oxidative Phosphorylation | Lipid Metabolism | DNA & RNA Structure | DNA Replication & Repair | Transcription & RNA Processing | Translation & Post-Translational Modification | Gene Regulation & Epigenetics | Recombinant DNA & Biotechnology | Cell Structure & Organelles | Cell Membrane & Transport | Cell Signaling & Signal Transduction | Cell Cycle & Mitosis | Meiosis & Gametogenesis | Mendelian Genetics & Heredity | Chromosomal Inheritance | Molecular Genetics & Mutations | Population Genetics | Nervous System & Neurophysiology | Endocrine System | Cardiovascular System | Respiratory System | Renal & Urinary System | Digestive System & Nutrition | Musculoskeletal System | Immune System & Inflammation | Reproductive System | Microbiology (Bacteria, Viruses, Fungi) | Evolution & Natural Selection

Psych/Soc: Biological Bases of Behavior | Sensation & Perception | Learning & Conditioning | Memory & Cognition | Language & Thought | Motivation, Emotion & Stress | Developmental Psychology | Personality Theories | Psychological Disorders | Treatment & Therapeutic Approaches | Social Structure & Institutions | Culture & Norms | Socialization & Social Learning | Social Stratification & Inequality | Demographics & Social Change | Social Behavior & Influence

**Subtype definitions — generate a question that matches the requested type exactly:**

Chem/Phys subtypes:
- Passage-Based Experimental Analysis: Lab experiment scenario with a figure showing apparatus or setup. Test identification of variables, hypothesis, and prediction of how changing a condition alters results.
- Data Interpretation (Graphs, Tables, Figures): Analyse a line graph, table, or scientific figure. Ask about trends, extrapolation, or cross-dataset comparison linked to a scientific principle.
- Biological Applications of Physical Science: Apply a physical principle to a biological system with a supporting diagram (e.g., fluid dynamics graph for blood vessels, neuron circuit diagram).

Bio/Biochem subtypes:
- Passage-Based Research Analysis: Interpret a biology or biochemistry experiment using a figure (gel, blot, growth curve). Combine passage information with prior biological knowledge.
- Mechanism and Pathway Questions: Test how a process works using a pathway diagram or reaction scheme. Predict effects of inhibition, mutation, or a missing step.
- Data Interpretation (Experimental Results): Analyse a protein activity graph, gene expression heatmap, or gel/blot result. Identify patterns and connect findings to biological function.
- Structure–Function Relationships: Connect molecular or cellular structure to biological role using a diagram or molecular model.

Psych/Soc subtypes:
- Research Design and Data Interpretation: Analyse a human behaviour or social trends study using a graph or table of results. Identify variables, evaluate conclusions, or interpret statistics.

**Figure requirements:**
- The stem MUST reference the figure explicitly (e.g. "Based on the graph in Figure 1...", "According to the experimental setup shown...", "What does the data in Figure 1 indicate about...")
- Include a 2–4 sentence passage describing the experimental context that produced the figure
- Write four plausible answer choices (A–D) with exactly one correct answer
- Provide a detailed explanation referencing what the figure shows and why each distractor is wrong
- The figure_prompt must describe a scientifically accurate, publication-quality figure: specify chart type (line graph/bar chart/scatter plot/gel/diagram/experimental setup), axis labels with units, data trends, key features, clean white background, no text overlays except axis labels

Output ONLY valid JSON in this exact shape:
{
  "section": "Chem/Phys" | "CARS" | "Bio/Biochem" | "Psych/Soc",
  "topic": "<canonical topic auto-selected for this section and subtype>",
  "passage": "<experimental context, 2–4 sentences>",
  "stem": "<question stem explicitly referencing Figure 1>",
  "optionA": "<choice A>",
  "optionB": "<choice B>",
  "optionC": "<choice C>",
  "optionD": "<choice D>",
  "correctAnswer": "A" | "B" | "C" | "D",
  "explanation": "<detailed explanation referencing what the figure shows>",
  "difficulty": "easy" | "medium" | "hard",
  "figure_prompt": "<detailed image generation prompt: chart type, axis labels with units, data trends, key features, clean white background, publication-quality scientific style, no text overlays except axis labels>"
}`;

const IMAGE_VALIDATION_PROMPT = `You are an MCAT content auditor reviewing image-based questions. You will receive a JSON object with two fields: "question" (the generated question) and "requestedSubType" (the subtype label it was supposed to match). Review for:
1. Factual accuracy — flag any scientific errors
2. Answer key correctness — verify the correct answer requires interpreting the described figure
3. Figure necessity — the figure must be ESSENTIAL; flag if the question can be answered without it
4. figure_prompt quality — verify it describes a specific, scientifically accurate figure with clear axes/labels/data
5. Distractor quality — flag if multiple choices could be correct or distractors are implausible
6. MCAT alignment — flag if outside MCAT scope
7. Subtype alignment — verify the question genuinely matches the requested subtype's format and cognitive demand

Output ONLY valid JSON:
{
  "pass": true | false,
  "flags": ["<issue 1>", "<issue 2>"],
  "corrected_question": { <full corrected question JSON including figure_prompt, or null if pass=true> }
}`;

// ── Schema ────────────────────────────────────────────────────────────────────

const AdminGenerateSchema = z.object({
  section:         z.enum(["Chem/Phys", "CARS", "Bio/Biochem", "Psych/Soc"]),
  subTypes:        z.array(z.string()).optional(),
  count:           z.number().min(1).max(50).default(5),
  passageSets:     z.number().min(1).max(20).optional(),
  dedupThreshold:  z.number().min(0.3).max(0.99).default(0.75),
  imageGeneration: z.boolean().default(false),
  imageModelId:    z.string().optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\s+/));
  const setB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = [...setA].filter((w) => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function sseChunk(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

async function generateImage(opts: {
  prompt:  string;
  modelId: string;
  baseUrl: string;
  apiKey?: string;
}): Promise<string | null> {
  try {
    const url = `${opts.baseUrl.replace(/\/+$/, "")}/images/generations`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(opts.apiKey ? { Authorization: `Bearer ${opts.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model:           opts.modelId,
        prompt:          opts.prompt,
        n:               1,
        size:            "1024x1024",
        response_format: "b64_json",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { data: Array<{ b64_json?: string; url?: string }> };
    const item = data.data?.[0];
    if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
    if (item?.url) return item.url;
    return null;
  } catch {
    return null;
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = AdminGenerateSchema.parse(await req.json());

    await ensureSchema();

    const [customGen, customVal, customImgGen, customImgVal, customPassageGen] = await Promise.all([
      getSetting("generation_prompt"),
      getSetting("validation_prompt"),
      getSetting("image_generation_prompt"),
      getSetting("image_validation_prompt"),
      getSetting("passage_generation_prompt"),
    ]);

    const genPrompt = body.imageGeneration
      ? (customImgGen || IMAGE_GENERATION_PROMPT)
      : (customGen || GENERATION_SYSTEM_PROMPT);

    const valPrompt = body.imageGeneration
      ? (customImgVal || IMAGE_VALIDATION_PROMPT)
      : (customVal || VALIDATION_SYSTEM_PROMPT);

    const passageSetPrompt = customPassageGen || PASSAGE_SET_SYSTEM_PROMPT;

    const genModel = await getModelForRole("generation");

    const imageModelConfig = body.imageGeneration && body.imageModelId
      ? await getModelByModelId(body.imageModelId).catch(() => null)
      : null;

    const existing = await getQuestions({ section: body.section });

    // Build 2D coverage matrix: topic × subtype → count
    const canonicalTopics    = SECTION_TOPICS[body.section] ?? [];
    const effectiveSubTypeIds = body.subTypes?.length ? body.subTypes : [];

    // 2D mode when both dimensions are available; 1D fallback otherwise
    const counts2D: Record<string, Record<string, number>> | null =
      canonicalTopics.length > 0 && effectiveSubTypeIds.length > 0
        ? (() => {
            const m: Record<string, Record<string, number>> = {};
            for (const t of canonicalTopics) {
              m[t] = {};
              for (const stId of effectiveSubTypeIds) m[t][stId] = 0;
            }
            for (const q of existing) {
              if (q.topic in m && q.subType && q.subType in m[q.topic]) m[q.topic][q.subType]++;
            }
            return m;
          })()
        : null;

    const counts1D: Record<string, number> | null =
      counts2D === null && canonicalTopics.length > 0
        ? (() => {
            const m: Record<string, number> = {};
            for (const t of canonicalTopics) m[t] = 0;
            for (const q of existing) { if (q.topic in m) m[q.topic]++; }
            return m;
          })()
        : null;

    const encoder    = new TextEncoder();
    const savedStems = existing.map((q) => q.stem);

    function randInt(min: number, max: number) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // passageSets mode: each loop iteration = one complete passage, no slot-size cap
    const passageSetsMode  = !!(body.passageSets && body.passageSets > 0);
    const totalForProgress = passageSetsMode ? body.passageSets! : body.count;

    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (data: unknown) => {
          try { controller.enqueue(encoder.encode(sseChunk(data))); } catch { /* client disconnected */ }
        };

        let remaining  = totalForProgress;
        let totalSaved = 0;
        let slotIndex  = 0;

        while (remaining > 0) {
          // Pick (topic, subtype) pair with lowest count — ties broken by list order
          let targetTopic: string | undefined;
          let targetSubTypeId: string | undefined;

          if (counts2D) {
            let min = Infinity;
            for (const t of canonicalTopics) {
              for (const stId of effectiveSubTypeIds) {
                const n = counts2D[t][stId] ?? 0;
                if (n < min) { min = n; targetTopic = t; targetSubTypeId = stId; }
              }
            }
          } else if (counts1D) {
            targetTopic = canonicalTopics.reduce((best, t) =>
              (counts1D[t] ?? 0) < (counts1D[best] ?? 0) ? t : best, canonicalTopics[0]);
            targetSubTypeId = effectiveSubTypeIds.length
              ? effectiveSubTypeIds[slotIndex % effectiveSubTypeIds.length]
              : undefined;
          } else {
            targetSubTypeId = effectiveSubTypeIds.length
              ? effectiveSubTypeIds[slotIndex % effectiveSubTypeIds.length]
              : undefined;
          }

          const subTypeDef   = targetSubTypeId ? getSubTypeById(targetSubTypeId) : undefined;
          const passageBased = passageSetsMode || (!body.imageGeneration && (subTypeDef?.passageBased ?? false));

          // In passageSets mode each iteration = 1 slot; questions-per-passage are uncapped
          const passageQCount = body.section === "CARS" ? randInt(5, 7) : randInt(4, 6);
          const setSize  = passageBased
            ? (passageSetsMode ? passageQCount : Math.min(remaining, passageQCount))
            : 1;
          const slotSize = passageSetsMode ? 1 : setSize;

          enqueue({ type: "progress", current: totalForProgress - remaining, total: totalForProgress, topic: targetTopic });

          const subTypeClause = subTypeDef
            ? ` Subtype: "${subTypeDef.label}" — ${subTypeDef.description}`
            : "";
          const topicClause = targetTopic ? ` Topic: ${targetTopic}.` : "";

          try {
            if (passageBased) {
              // ── PASSAGE SET ──────────────────────────────────────────────────
              const userMsg = [
                `Generate one ${body.section} passage with ${setSize} questions.`,
                topicClause,
                subTypeClause,
              ].filter(Boolean).join(" ");

              const raw = await callModel({
                modelId:                 genModel?.modelId,
                baseUrl:                 genModel?.baseUrl,
                apiKey:                  genModel?.apiKey,
                modelMaxTokens:          genModel?.maxTokens,
                modelMaxReasoningTokens: genModel?.maxReasoningTokens || undefined,
                system:                  passageSetPrompt,
                userContent:             userMsg,
                maxTokens:               6000,
              });

              type PassageSet = { section: string; topic: string; passage: string; questions: Record<string, unknown>[] };
              let passageSet: PassageSet | null = null;
              try {
                const parsed = extractModelJson(raw);
                if (!parsed.passage || !Array.isArray(parsed.questions)) {
                  throw new Error("Missing passage or questions array");
                }
                passageSet = parsed as PassageSet;
              } catch (parseErr) {
                enqueue({
                  type: "skip", reason: "parse_error",
                  message: `${parseErr instanceof Error ? parseErr.message : String(parseErr)} | raw: ${raw.slice(0, 300)}`,
                });
              }

              if (passageSet) {
                const passageGroupId = crypto.randomUUID();
                let setCount = 0;

                for (const q of passageSet.questions) {
                  const stem = q.stem as string;
                  if (!stem || !q.optionA || !q.optionB || !q.optionC || !q.optionD || !q.correctAnswer || !q.explanation) continue;
                  if (savedStems.some((s) => jaccardSimilarity(s, stem) > body.dedupThreshold)) {
                    enqueue({ type: "skip", reason: "duplicate" });
                    continue;
                  }
                  const saved = await saveQuestion({
                    section:        passageSet!.section || body.section,
                    topic:          passageSet!.topic   || targetTopic || "",
                    subType:        targetSubTypeId,
                    passageGroupId,
                    passage:        passageSet!.passage,
                    stem,
                    optionA:        q.optionA as string,
                    optionB:        q.optionB as string,
                    optionC:        q.optionC as string,
                    optionD:        q.optionD as string,
                    correctAnswer:  q.correctAnswer as string,
                    explanation:    q.explanation as string,
                    difficulty:     (q.difficulty as string) ?? "medium",
                    aiGenerated:    true,
                  });
                  savedStems.push(stem);
                  setCount++;
                  totalSaved++;
                  enqueue({ type: "question", question: saved });
                }

                if (counts2D && targetTopic && targetSubTypeId) {
                  counts2D[targetTopic][targetSubTypeId] = (counts2D[targetTopic][targetSubTypeId] ?? 0) + setCount;
                } else if (counts1D && targetTopic) {
                  counts1D[targetTopic] = (counts1D[targetTopic] ?? 0) + setCount;
                }
              }

            } else {
              // ── DISCRETE QUESTION ─────────────────────────────────────────
              const userMsg = [
                `Generate one ${body.section} question.`,
                topicClause,
                subTypeClause,
                body.imageGeneration ? "The question MUST require a figure to answer." : "",
              ].filter(Boolean).join(" ");

              const raw = await callModel({
                modelId:                 genModel?.modelId,
                baseUrl:                 genModel?.baseUrl,
                apiKey:                  genModel?.apiKey,
                modelMaxTokens:          genModel?.maxTokens,
                modelMaxReasoningTokens: genModel?.maxReasoningTokens || undefined,
                system:                  genPrompt,
                userContent:             userMsg,
                maxTokens:               3000,
              });

              let parsed: Record<string, unknown> | null = null;
              try {
                parsed = extractModelJson(raw);
              } catch (parseErr) {
                enqueue({
                  type: "skip", reason: "parse_error",
                  message: `${parseErr instanceof Error ? parseErr.message : String(parseErr)} | raw: ${raw.slice(0, 300)}`,
                });
              }

              if (parsed) {
                if (savedStems.some((s) => jaccardSimilarity(s, parsed!.stem as string) > body.dedupThreshold)) {
                  enqueue({ type: "skip", reason: "duplicate" });
                } else {
                  const valRaw = await callModel({
                    modelId:                 genModel?.modelId,
                    baseUrl:                 genModel?.baseUrl,
                    apiKey:                  genModel?.apiKey,
                    modelMaxTokens:          genModel?.maxTokens,
                    modelMaxReasoningTokens: genModel?.maxReasoningTokens || undefined,
                    system:                  valPrompt,
                    userContent:             JSON.stringify({ question: parsed, requestedSubType: subTypeDef?.label ?? "general" }),
                    maxTokens:               2000,
                  });

                  type Validation = { pass: boolean; flags: string[]; corrected_question: Record<string, unknown> | null };
                  let validation: Validation | null = null;
                  try {
                    validation = extractModelJson(valRaw) as Validation;
                  } catch (parseErr) {
                    enqueue({
                      type: "skip", reason: "validation_parse_error",
                      message: `${parseErr instanceof Error ? parseErr.message : String(parseErr)} | raw: ${valRaw.slice(0, 200)}`,
                    });
                  }

                  if (validation) {
                    if (!validation.pass && !validation.corrected_question) {
                      enqueue({ type: "skip", reason: "validation_failed", flags: validation.flags });
                    } else {
                      const final = validation.pass ? parsed : (validation.corrected_question ?? parsed);

                      let saved = await saveQuestion({
                        section:        final.section as string,
                        topic:          final.topic as string,
                        subType:        targetSubTypeId,
                        passageGroupId: null,
                        passage:        (final.passage as string) ?? null,
                        stem:           final.stem as string,
                        optionA:        final.optionA as string,
                        optionB:        final.optionB as string,
                        optionC:        final.optionC as string,
                        optionD:        final.optionD as string,
                        correctAnswer:  final.correctAnswer as string,
                        explanation:    final.explanation as string,
                        difficulty:     (final.difficulty as string) ?? "medium",
                        aiGenerated:    true,
                      });

                      let figureUrl: string | null = null;
                      if (body.imageGeneration && imageModelConfig?.baseUrl && final.figure_prompt) {
                        const imgResult = await generateImage({
                          prompt:  final.figure_prompt as string,
                          modelId: imageModelConfig.modelId,
                          baseUrl: imageModelConfig.baseUrl,
                          apiKey:  imageModelConfig.apiKey,
                        });
                        if (imgResult) {
                          if (imgResult.startsWith("data:")) {
                            figureUrl = await uploadQuestionImage(imgResult, saved.id).catch(() => null);
                          } else {
                            figureUrl = imgResult;
                          }
                          if (figureUrl) {
                            await updateQuestion(saved.id, { figureUrl }).catch(() => {});
                            saved = { ...saved, figureUrl };
                          }
                        }
                      }

                      savedStems.push(final.stem as string);
                      totalSaved++;
                      if (counts2D && targetTopic && targetSubTypeId) {
                        counts2D[targetTopic][targetSubTypeId] = (counts2D[targetTopic][targetSubTypeId] ?? 0) + 1;
                      } else if (counts1D && targetTopic) {
                        counts1D[targetTopic] = (counts1D[targetTopic] ?? 0) + 1;
                      }
                      enqueue({ type: "question", question: { ...saved, hasFigure: !!figureUrl } });
                    }
                  }
                }
              }
            }
          } catch (err) {
            enqueue({ type: "skip", reason: "error", message: err instanceof Error ? err.message : "unknown" });
          }

          remaining -= slotSize;
          slotIndex++;
        }

        enqueue({ type: "done", generated: totalSaved });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (err) {
    if (err instanceof z.ZodError)
      return new Response(JSON.stringify({ error: err.issues }), { status: 400 });
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
