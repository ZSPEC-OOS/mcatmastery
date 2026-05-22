export type TopicGroup = { group: string; topics: string[] };
export type CurriculumSection = { id: string; label: string; color: string; groups: TopicGroup[] };

export const CURRICULUM_SECTIONS: CurriculumSection[] = [
  {
    id: "chem",
    label: "Chem/Phys",
    color: "#6366f1",
    groups: [
      {
        group: "General Chemistry",
        topics: [
          "Atomic Structure",
          "Periodic Trends",
          "Bonding & Intermolecular Forces",
          "Acids & Bases",
          "Electrochemistry",
          "Thermodynamics & Thermochemistry",
          "Kinetics & Equilibrium",
          "Solutions & Colligative Properties",
          "Nuclear Chemistry",
        ],
      },
      {
        group: "Physics",
        topics: [
          "Kinematics & Dynamics",
          "Work, Energy & Power",
          "Fluids & Pressure",
          "Electricity & Magnetism",
          "Circuits",
          "Waves & Sound",
          "Optics & Light",
        ],
      },
      {
        group: "Organic Chemistry",
        topics: [
          "Functional Groups & Nomenclature",
          "Stereochemistry & Chirality",
          "Reaction Mechanisms",
          "Lab Techniques & Separations",
        ],
      },
    ],
  },
  {
    id: "cars",
    label: "CARS",
    color: "#f0a500",
    groups: [
      {
        group: "Reading Comprehension Skills",
        topics: [
          "Passage Strategy & Mapping",
          "Main Idea & Central Argument",
          "Detail & Inference Questions",
          "Tone, Attitude & Author Purpose",
          "Strengthen, Weaken & Evaluate",
          "Vocabulary in Context",
        ],
      },
    ],
  },
  {
    id: "bio",
    label: "Bio/Biochem",
    color: "#4ade80",
    groups: [
      {
        group: "Biochemistry",
        topics: [
          "Amino Acids, Proteins & Enzymes",
          "Enzyme Kinetics & Inhibition",
          "Metabolism: Glycolysis & Fermentation",
          "Metabolism: TCA Cycle & Oxidative Phosphorylation",
          "Lipid Metabolism",
          "DNA & RNA Structure",
          "DNA Replication & Repair",
          "Transcription & RNA Processing",
          "Translation & Post-Translational Modification",
          "Gene Regulation & Epigenetics",
          "Recombinant DNA & Biotechnology",
        ],
      },
      {
        group: "Cell Biology",
        topics: [
          "Cell Structure & Organelles",
          "Cell Membrane & Transport",
          "Cell Signaling & Signal Transduction",
          "Cell Cycle & Mitosis",
          "Meiosis & Gametogenesis",
        ],
      },
      {
        group: "Genetics",
        topics: [
          "Mendelian Genetics & Heredity",
          "Chromosomal Inheritance",
          "Molecular Genetics & Mutations",
          "Population Genetics",
        ],
      },
      {
        group: "Systems Biology",
        topics: [
          "Nervous System & Neurophysiology",
          "Endocrine System",
          "Cardiovascular System",
          "Respiratory System",
          "Renal & Urinary System",
          "Digestive System & Nutrition",
          "Musculoskeletal System",
          "Immune System & Inflammation",
          "Reproductive System",
        ],
      },
      {
        group: "Additional Biology",
        topics: [
          "Microbiology (Bacteria, Viruses, Fungi)",
          "Evolution & Natural Selection",
        ],
      },
    ],
  },
  {
    id: "psych",
    label: "Psych/Soc",
    color: "#a78bfa",
    groups: [
      {
        group: "Psychology",
        topics: [
          "Biological Bases of Behavior",
          "Sensation & Perception",
          "Learning & Conditioning",
          "Memory & Cognition",
          "Language & Thought",
          "Motivation, Emotion & Stress",
          "Developmental Psychology",
          "Personality Theories",
          "Psychological Disorders",
          "Treatment & Therapeutic Approaches",
        ],
      },
      {
        group: "Sociology",
        topics: [
          "Social Structure & Institutions",
          "Culture & Norms",
          "Socialization & Social Learning",
          "Social Stratification & Inequality",
          "Demographics & Social Change",
          "Social Behavior & Influence",
        ],
      },
    ],
  },
];

export const SECTION_ID_TO_LABEL: Record<string, string> = {
  chem: "Chem/Phys",
  cars: "CARS",
  bio: "Bio/Biochem",
  psych: "Psych/Soc",
};

export function getSectionById(id: string): CurriculumSection | undefined {
  return CURRICULUM_SECTIONS.find((s) => s.id === id);
}

export function getGroupTopics(sectionId: string, groupName: string): string[] {
  const sec = getSectionById(sectionId);
  return sec?.groups.find((g) => g.group === groupName)?.topics ?? [];
}
