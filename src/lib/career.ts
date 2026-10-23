import sourceYaml from "../../_data/data.yml?raw";
import explorerYaml from "../../_data/explorer.yml?raw";
import { parse } from "yaml";
import { marked } from "marked";
import { z } from "zod";

const https = z.string().startsWith("https://");
const rawSchema = z.object({
  sidebar: z.object({
    name: z.string(),
    email: z.email(),
    timezone: z.string(),
    github: z.string(),
    linkedin: z.string(),
    languages: z.object({
      info: z.array(z.object({ idiom: z.string(), level: z.string() })),
    }),
    interests: z.object({ info: z.array(z.object({ item: z.string() })) }),
  }),
  "career-profile": z.object({ summary: z.string() }),
  experiences: z.object({
    info: z.array(
      z.object({
        id: z.string(),
        role: z.string(),
        company: z.string(),
        time: z.string(),
        link: https.optional(),
        details: z.string().optional(),
      }),
    ),
  }),
  oss: z.object({
    intro: z.string(),
    contributions: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        link: https,
        tagline: z.string(),
      }),
    ),
  }),
  skills: z.object({ details: z.string() }),
  education: z.object({
    info: z.array(
      z.object({
        degree: z.string(),
        university: z.string(),
        time: z.string(),
      }),
    ),
  }),
});
const viewSchema = z.enum(["engineering", "leadership", "business-impact"]);
export type SavedView = z.infer<typeof viewSchema>;
const metaSchema = z.object({
  focus: z.string(),
  views: z.array(viewSchema),
  keywords: z.array(z.string()),
  outcome: z.string(),
});
const explorerSchema = z.object({
  experience: z.record(z.string(), metaSchema),
  projects: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      experienceId: z.string(),
      focus: z.string(),
      views: z.array(viewSchema),
      problem: z.string(),
      decision: z.string(),
      delivery: z.string(),
      outcome: z.string(),
    }),
  ),
  capabilities: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      experienceIds: z.array(z.string()),
      contributionIds: z.array(z.string()),
    }),
  ),
});
const source = rawSchema.parse(parse(sourceYaml));
const curated = explorerSchema.parse(parse(explorerYaml));

export interface CareerRecord {
  id: string;
  kind: "Experience" | "Project" | "Open source" | "Skill";
  company: string;
  role: string;
  period: string;
  focus: string;
  outcome: string;
  views: SavedView[];
  keywords: string[];
  html: string;
  link?: string;
  experienceId?: string;
  caseStudy?: {
    problem: string;
    decision: string;
    delivery: string;
    outcome: string;
  };
}
const unique = new Set<string>();
function assertId(id: string) {
  if (unique.has(id)) throw new Error(`Duplicate career record ID: ${id}`);
  unique.add(id);
}
const experience: CareerRecord[] = source.experiences.info.map((job) => {
  assertId(job.id);
  const meta = curated.experience[job.id];
  if (!meta) throw new Error(`Missing explorer metadata for ${job.id}`);
  return {
    id: job.id,
    kind: "Experience",
    company: job.company,
    role: job.role,
    period: job.time,
    ...meta,
    html: marked.parse(job.details || `Earlier experience at ${job.company}.`, {
      async: false,
    }),
    link: job.link,
  };
});
function requireExperience(id: string) {
  const record = experience.find((job) => job.id === id);
  if (!record) throw new Error(`Unknown experience reference: ${id}`);
  return record;
}
const projects: CareerRecord[] = curated.projects.map((project) => {
  assertId(project.id);
  const job = requireExperience(project.experienceId);
  return {
    id: project.id,
    kind: "Project",
    company: job.company,
    role: project.title,
    period: job.period,
    focus: project.focus,
    outcome: project.outcome,
    views: project.views,
    keywords: job.keywords,
    html: "",
    experienceId: job.id,
    caseStudy: project,
  };
});
const contributions: CareerRecord[] = source.oss.contributions.map((item) => {
  const id = item.id;
  assertId(id);
  return {
    id,
    kind: "Open source",
    company: "Prefect ecosystem",
    role: item.title,
    period: "Not listed",
    focus: "Orchestration",
    outcome: item.tagline,
    keywords: ["Prefect", "orchestration", "open source", item.title],
    views: ["engineering"],
    html: "",
    link: item.link,
  };
});
const capabilities = curated.capabilities.map((skill) => ({
  ...skill,
  recordIds: [
    ...skill.experienceIds.map((id) => requireExperience(id).id),
    ...skill.contributionIds.map((id) => {
      if (!contributions.some((item) => item.id === id))
        throw new Error(`Unknown contribution reference: ${id}`);
      return id;
    }),
  ],
}));
const tools = source.skills.details
  .split(/\n/)
  .filter((line) => line.trim())
  .map((line) => {
    const [category, ...items] = line
      .trim()
      .replaceAll("&amp;", "&")
      .split(":");
    const id = `tool-${category
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-$/, "")}`;
    assertId(id);
    return { id, category, tools: items.join(":").trim() };
  });
const toolRecords: CareerRecord[] = tools.map((tool) => ({
  id: tool.id,
  kind: "Skill",
  company: "Career-wide toolkit",
  role: tool.category,
  period: "Across career",
  focus: "Tools & skills",
  outcome: tool.tools,
  views: [],
  keywords: [tool.category, tool.tools],
  html: "",
}));
export const career = {
  profile: {
    ...source.sidebar,
    headline: "Data & Analytics Engineering",
    summaryHtml: marked.parse(source["career-profile"].summary, {
      async: false,
    }),
  },
  experience,
  projects,
  contributions,
  capabilities,
  records: [...experience, ...projects, ...contributions, ...toolRecords],
  education: source.education.info,
  tools,
  ossIntro: source.oss.intro,
};
export type Career = typeof career;
