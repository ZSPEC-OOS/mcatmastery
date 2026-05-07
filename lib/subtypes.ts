export interface SubTypeDefinition {
  id: string;
  label: string;
  imageRecommended: boolean;
  passageBased: boolean;
  description: string;
}

export const SECTION_SUBTYPES: Record<string, SubTypeDefinition[]> = {
  "Chem/Phys": [
    {
      id: "cp1",
      label: "Passage-Based Experimental Analysis",
      imageRecommended: true,
      passageBased: true,
      description:
        "Lab experiment scenario. Test identification of variables, experimental hypothesis, and prediction of how changing a condition alters results. Include irrelevant passage details to force filtering.",
    },
    {
      id: "cp2",
      label: "Data Interpretation (Graphs, Tables, Figures)",
      imageRecommended: true,
      passageBased: true,
      description:
        "Analyze line graphs, tables, or scientific figures. Ask about trends, extrapolation, or comparison across datasets. Link visual data to an underlying scientific principle.",
    },
    {
      id: "cp3",
      label: "Calculation-Based Problems",
      imageRecommended: false,
      passageBased: false,
      description:
        "Apply physics or chemistry formulas (energy, force, pressure, circuits, pH). Design numbers to favour estimation and proportional reasoning over precise arithmetic.",
    },
    {
      id: "cp4",
      label: "Conceptual Physics and Chemistry",
      imageRecommended: false,
      passageBased: false,
      description:
        "Test qualitative understanding — why a law works, how variables relate conceptually. Use 'if X increases, what happens to Y?' or 'which explanation best accounts for this?' patterns.",
    },
    {
      id: "cp5",
      label: "Biological Applications of Physical Science",
      imageRecommended: true,
      passageBased: true,
      description:
        "Apply physical principles to biological systems (fluid flow in vessels, electrochemistry in neurons, gas laws in respiration). Require translation of abstract science into physiological meaning.",
    },
  ],

  CARS: [
    {
      id: "cars1",
      label: "Main Idea / Thesis Identification",
      imageRecommended: false,
      passageBased: true,
      description:
        "Ask what the author's central argument or primary topic is. Wrong answers should be either too narrow (detail-focused) or too broad (missing the argument).",
    },
    {
      id: "cars2",
      label: "Inference Questions",
      imageRecommended: false,
      passageBased: true,
      description:
        "Ask what is implied but not stated. All correct answers must be supportable from the passage only; no outside knowledge permitted.",
    },
    {
      id: "cars3",
      label: "Tone and Author Attitude Analysis",
      imageRecommended: false,
      passageBased: true,
      description:
        "Focus on the author's opinion and subtle wording cues. Ask how the author feels about a theory, group, or claim.",
    },
    {
      id: "cars4",
      label: "Function of Passage Components",
      imageRecommended: false,
      passageBased: true,
      description:
        "Ask why something is included — how a specific example, paragraph, or piece of evidence functions within the argument (supports, contrasts, introduces counterpoint).",
    },
    {
      id: "cars5",
      label: "Application of Arguments to New Contexts",
      imageRecommended: false,
      passageBased: true,
      description:
        "Extend the author's reasoning to a new hypothetical scenario. Test transfer of logical structure, not recall.",
    },
  ],

  "Bio/Biochem": [
    {
      id: "bb1",
      label: "Passage-Based Research Analysis",
      imageRecommended: true,
      passageBased: true,
      description:
        "Interpret biology or biochemistry experiments (gene knockouts, enzyme assays, protein studies). Combine passage information with prior biological knowledge.",
    },
    {
      id: "bb2",
      label: "Mechanism and Pathway Questions",
      imageRecommended: true,
      passageBased: false,
      description:
        "Test how processes work: enzyme catalysis, signal transduction, metabolic pathways. Predict effects of inhibition, mutation, or missing pathway steps.",
    },
    {
      id: "bb3",
      label: "Data Interpretation (Experimental Results)",
      imageRecommended: true,
      passageBased: true,
      description:
        "Analyze protein activity graphs, gene expression data, or gel/blot results. Identify patterns, draw conclusions, and connect findings to biological function.",
    },
    {
      id: "bb4",
      label: "Structure–Function Relationships",
      imageRecommended: true,
      passageBased: false,
      description:
        "Connect molecular or cellular structure to biological role. Ask how protein shape, membrane composition, or organelle arrangement determines behaviour.",
    },
    {
      id: "bb5",
      label: "Discrete Knowledge Questions",
      imageRecommended: false,
      passageBased: false,
      description:
        "Standalone question (no passage) testing core factual knowledge: amino acids, organelles, DNA processes. Design choices to require precision and depth.",
    },
  ],

  "Psych/Soc": [
    {
      id: "ps1",
      label: "Concept Definition and Recognition",
      imageRecommended: false,
      passageBased: false,
      description:
        "Present a scenario and ask which term or concept applies. Distinguish between closely related concepts (e.g., classical vs operant conditioning, types of memory).",
    },
    {
      id: "ps2",
      label: "Passage-Based Application of Theories",
      imageRecommended: false,
      passageBased: true,
      description:
        "Present a scenario and ask which psychological or sociological theory explains it, or which concept is being demonstrated.",
    },
    {
      id: "ps3",
      label: "Research Design and Data Interpretation",
      imageRecommended: true,
      passageBased: true,
      description:
        "Analyse a human behaviour or social trends study. Identify variables and controls, evaluate conclusions, or interpret statistical results.",
    },
    {
      id: "ps4",
      label: "Behavior Prediction Questions",
      imageRecommended: false,
      passageBased: false,
      description:
        "Predict how a person or group will behave under given conditions using an underlying psychological or sociological theory.",
    },
    {
      id: "ps5",
      label: "Sociological and Psychological Theory Application",
      imageRecommended: false,
      passageBased: false,
      description:
        "Connect theories to broader systems: culture, institutions, inequality, social structures, group dynamics, or behavioural influences.",
    },
  ],
};

export function getSubTypeById(id: string): SubTypeDefinition | undefined {
  for (const subtypes of Object.values(SECTION_SUBTYPES)) {
    const found = subtypes.find((s) => s.id === id);
    if (found) return found;
  }
  return undefined;
}

export function getSubTypesForSections(sections: string[]): SubTypeDefinition[] {
  const seen = new Set<string>();
  const result: SubTypeDefinition[] = [];
  for (const sec of sections) {
    for (const st of SECTION_SUBTYPES[sec] ?? []) {
      if (!seen.has(st.id)) {
        seen.add(st.id);
        result.push(st);
      }
    }
  }
  return result;
}
