import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

async function main() {
  // Seed a handful of sample questions for local development
  const questions = [
    {
      section: "Chem/Phys",
      topic: "Enzyme Kinetics",
      passage:
        "An enzyme follows Michaelis-Menten kinetics. Researchers measured reaction velocity at varying substrate concentrations in the presence and absence of a competitive inhibitor.",
      stem: "A competitive inhibitor is added to an enzyme reaction. Which of the following correctly describes the effect on Km and Vmax?",
      optionA: "Km increases, Vmax unchanged",
      optionB: "Km decreases, Vmax unchanged",
      optionC: "Km unchanged, Vmax decreases",
      optionD: "Both Km and Vmax decrease",
      correctAnswer: "A",
      explanation:
        "Competitive inhibitors bind reversibly to the active site and compete with substrate. This apparent increase in Km reflects reduced substrate affinity, but Vmax is unchanged because excess substrate can overcome the inhibitor. Non-competitive inhibitors lower Vmax without affecting Km.",
      difficulty: "medium",
    },
    {
      section: "Bio/Biochem",
      topic: "Amino Acids",
      passage: null,
      stem: "Which amino acid contains a thiol group in its side chain that allows it to form disulfide bonds?",
      optionA: "Serine",
      optionB: "Threonine",
      optionC: "Cysteine",
      optionD: "Methionine",
      correctAnswer: "C",
      explanation:
        "Cysteine has a -SH (thiol) side chain that can be oxidized to form covalent disulfide bonds (-S-S-) with another cysteine residue. These bonds stabilize tertiary and quaternary protein structure. Methionine also contains sulfur but in a thioether linkage that cannot form disulfide bonds.",
      difficulty: "easy",
    },
    {
      section: "Psych/Soc",
      topic: "Self Identity Development",
      passage: null,
      stem: "According to Erikson's theory of psychosocial development, which stage involves the conflict of Identity vs. Role Confusion?",
      optionA: "Early childhood (ages 3–5)",
      optionB: "Middle childhood (ages 6–11)",
      optionC: "Adolescence (ages 12–18)",
      optionD: "Early adulthood (ages 19–40)",
      correctAnswer: "C",
      explanation:
        "Erikson's fifth stage, Identity vs. Role Confusion, occurs during adolescence. Teenagers explore who they are and where they fit in society. Success leads to a strong sense of identity; failure results in role confusion. This is distinct from the Intimacy vs. Isolation conflict of early adulthood.",
      difficulty: "easy",
    },
    {
      section: "Chem/Phys",
      topic: "Thermodynamics",
      passage:
        "A researcher measures the free energy change of a biochemical reaction under standard conditions. The reaction has ΔH° = −40 kJ/mol and ΔS° = −80 J/(mol·K).",
      stem: "At what temperature (in Kelvin) will the reaction be at equilibrium (ΔG° = 0)?",
      optionA: "200 K",
      optionB: "500 K",
      optionC: "−500 K",
      optionD: "0.002 K",
      correctAnswer: "B",
      explanation:
        "At equilibrium ΔG° = 0, so ΔH° = TΔS°. Solving: T = ΔH°/ΔS° = (−40,000 J/mol)/(−80 J/mol·K) = 500 K. Note that ΔS° must be converted to J (not kJ) for consistent units. Below 500 K the reaction is spontaneous; above it becomes non-spontaneous.",
      difficulty: "medium",
    },
  ];

  for (const q of questions) {
    await db.question.upsert({
      where: { id: q.topic.toLowerCase().replace(/\s+/g, "-") + "-seed" },
      update: {},
      create: {
        id: q.topic.toLowerCase().replace(/\s+/g, "-") + "-seed",
        ...q,
        aiGenerated: false,
      },
    });
  }

  console.log(`Seeded ${questions.length} questions.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
