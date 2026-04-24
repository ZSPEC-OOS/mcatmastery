"use client";
import { useEffect, useState } from "react";

type Topic = { label: string; pct: number };
type TopicGroup = { group: string; topics: Topic[] };
type Section = { id: string; label: string; color: string; groups: TopicGroup[] };

const SECTIONS: Section[] = [
  {
    id: "chem",
    label: "Chem/Phys",
    color: "#6366f1",
    groups: [
      {
        group: "General Chemistry",
        topics: [
          { label: "Atomic Structure", pct: 0 },
          { label: "Periodic Trends", pct: 0 },
          { label: "Bonding & Intermolecular Forces", pct: 0 },
          { label: "Acids & Bases", pct: 0 },
          { label: "Electrochemistry", pct: 0 },
          { label: "Thermodynamics & Thermochemistry", pct: 0 },
          { label: "Kinetics & Equilibrium", pct: 0 },
          { label: "Solutions & Colligative Properties", pct: 0 },
          { label: "Nuclear Chemistry", pct: 0 },
        ],
      },
      {
        group: "Physics",
        topics: [
          { label: "Kinematics & Dynamics", pct: 0 },
          { label: "Work, Energy & Power", pct: 0 },
          { label: "Fluids & Pressure", pct: 0 },
          { label: "Electricity & Magnetism", pct: 0 },
          { label: "Circuits", pct: 0 },
          { label: "Waves & Sound", pct: 0 },
          { label: "Optics & Light", pct: 0 },
        ],
      },
      {
        group: "Organic Chemistry",
        topics: [
          { label: "Functional Groups & Nomenclature", pct: 0 },
          { label: "Stereochemistry & Chirality", pct: 0 },
          { label: "Reaction Mechanisms", pct: 0 },
          { label: "Lab Techniques & Separations", pct: 0 },
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
          { label: "Passage Strategy & Mapping", pct: 0 },
          { label: "Main Idea & Central Argument", pct: 0 },
          { label: "Detail & Inference Questions", pct: 0 },
          { label: "Tone, Attitude & Author Purpose", pct: 0 },
          { label: "Strengthen, Weaken & Evaluate", pct: 0 },
          { label: "Vocabulary in Context", pct: 0 },
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
          { label: "Amino Acids, Proteins & Enzymes", pct: 0 },
          { label: "Enzyme Kinetics & Inhibition", pct: 0 },
          { label: "Metabolism: Glycolysis & Fermentation", pct: 0 },
          { label: "Metabolism: TCA Cycle & Oxidative Phosphorylation", pct: 0 },
          { label: "Lipid Metabolism", pct: 0 },
          { label: "DNA & RNA Structure", pct: 0 },
          { label: "DNA Replication & Repair", pct: 0 },
          { label: "Transcription & RNA Processing", pct: 0 },
          { label: "Translation & Post-Translational Modification", pct: 0 },
          { label: "Gene Regulation & Epigenetics", pct: 0 },
          { label: "Recombinant DNA & Biotechnology", pct: 0 },
        ],
      },
      {
        group: "Cell Biology",
        topics: [
          { label: "Cell Structure & Organelles", pct: 0 },
          { label: "Cell Membrane & Transport", pct: 0 },
          { label: "Cell Signaling & Signal Transduction", pct: 0 },
          { label: "Cell Cycle & Mitosis", pct: 0 },
          { label: "Meiosis & Gametogenesis", pct: 0 },
        ],
      },
      {
        group: "Genetics",
        topics: [
          { label: "Mendelian Genetics & Heredity", pct: 0 },
          { label: "Chromosomal Inheritance", pct: 0 },
          { label: "Molecular Genetics & Mutations", pct: 0 },
          { label: "Population Genetics", pct: 0 },
        ],
      },
      {
        group: "Systems Biology",
        topics: [
          { label: "Nervous System & Neurophysiology", pct: 0 },
          { label: "Endocrine System", pct: 0 },
          { label: "Cardiovascular System", pct: 0 },
          { label: "Respiratory System", pct: 0 },
          { label: "Renal & Urinary System", pct: 0 },
          { label: "Digestive System & Nutrition", pct: 0 },
          { label: "Musculoskeletal System", pct: 0 },
          { label: "Immune System & Inflammation", pct: 0 },
          { label: "Reproductive System", pct: 0 },
        ],
      },
      {
        group: "Additional Biology",
        topics: [
          { label: "Microbiology (Bacteria, Viruses, Fungi)", pct: 0 },
          { label: "Evolution & Natural Selection", pct: 0 },
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
          { label: "Biological Bases of Behavior", pct: 0 },
          { label: "Sensation & Perception", pct: 0 },
          { label: "Learning & Conditioning", pct: 0 },
          { label: "Memory & Cognition", pct: 0 },
          { label: "Language & Thought", pct: 0 },
          { label: "Motivation, Emotion & Stress", pct: 0 },
          { label: "Developmental Psychology", pct: 0 },
          { label: "Personality Theories", pct: 0 },
          { label: "Psychological Disorders", pct: 0 },
          { label: "Treatment & Therapeutic Approaches", pct: 0 },
        ],
      },
      {
        group: "Sociology",
        topics: [
          { label: "Social Structure & Institutions", pct: 0 },
          { label: "Culture & Norms", pct: 0 },
          { label: "Socialization & Social Learning", pct: 0 },
          { label: "Social Stratification & Inequality", pct: 0 },
          { label: "Demographics & Social Change", pct: 0 },
          { label: "Social Behavior & Influence", pct: 0 },
        ],
      },
    ],
  },
];

function pctColor(pct: number) {
  if (pct < 60) return "#e05c5c";
  if (pct < 70) return "#f0a500";
  return "var(--text-muted)";
}

type Props = {
  activeTopic: string;
  onSelect: (sectionId: string, topicLabel: string) => void;
};

export default function TopicSidebar({ activeTopic, onSelect }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ chem: true, cars: true, bio: true, psych: true });
  const [accMap, setAccMap] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/curriculum")
      .then(r => r.json())
      .then((data: { topicAccuracy: { topic: string; accuracy: number }[] }) => {
        if (data.topicAccuracy?.length > 0) {
          const m: Record<string, number> = {};
          for (const t of data.topicAccuracy) m[t.topic] = t.accuracy;
          setAccMap(m);
        }
      })
      .catch(() => {});
  }, []);

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div
      className="overflow-y-auto py-4"
      style={{
        width: 220,
        minWidth: 220,
        borderRight: "1px solid var(--border)",
        background: "var(--bg-card)",
      }}
    >
      <p className="px-4 mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        Sections
      </p>

      {SECTIONS.map((sec) => (
        <div key={sec.id}>
          <button
            className="w-full flex items-center justify-between px-4 py-2 text-left"
            onClick={() => toggle(sec.id)}
          >
            <div className="flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d={expanded[sec.id] ? "M3 4.5l3 3 3-3" : "M4.5 3l3 3-3 3"}
                  stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round"
                />
              </svg>
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {sec.label}
              </span>
            </div>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M4.5 3l3 3-3 3" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {expanded[sec.id] && (
            <div className="mb-1">
              {sec.groups.map((grp) => (
                <div key={grp.group}>
                  <p
                    className="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: sec.color, opacity: 0.85 }}
                  >
                    {grp.group}
                  </p>
                  {grp.topics.map((t) => {
                    const isActive = activeTopic === `${sec.id}:${t.label}`;
                    const pct = accMap[t.label] ?? t.pct;
                    return (
                      <button
                        key={t.label}
                        onClick={() => onSelect(sec.id, t.label)}
                        className="w-full flex items-center px-4 py-1.5 text-left"
                        style={{
                          background: isActive ? "rgba(27,58,107,0.12)" : "transparent",
                          borderLeft: isActive ? "2px solid var(--accent-blue)" : "2px solid transparent",
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full mr-2.5 flex-shrink-0"
                          style={{ background: isActive ? "var(--accent-blue)" : sec.color, opacity: isActive ? 1 : 0.7 }}
                        />
                        <span
                          className="flex-1 text-xs"
                          style={{ color: isActive ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: isActive ? 600 : 400 }}
                        >
                          {t.label}
                        </span>
                        <span
                          className="text-xs font-semibold ml-2"
                          style={{ color: isActive ? "var(--accent-blue)" : pct > 0 ? pctColor(pct) : "var(--text-muted)" }}
                        >
                          {pct > 0 ? `${pct}%` : "—"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
