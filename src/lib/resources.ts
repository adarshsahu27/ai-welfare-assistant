export const KNOWLEDGE_BASE = {
  "hardship-fund": {
    title: "University Hardship Fund",
    link: "/resources/hardship-fund",
    category: "financial",
  },
  "student-visa": {
    title: "Student Visa and CAS",
    link: "https://www.gov.uk/student-visa",
    category: "visa",
  },
  "deposit-guide": {
    title: "Tenancy Deposit Guide",
    link: "/resources/deposit-guide",
    category: "housing",
  },
  library: {
    title: "Academic Resources",
    link: "/resources/library",
    category: "academic",
  },
  "extenuating-circumstances": {
    title: "Extenuating Circumstances",
    link: "/resources/extenuating-circumstances",
    category: "academic",
  },
  "it-help": {
    title: "IT and Account Support",
    link: "/resources/it-help",
    category: "academic",
  },
  "disability-support": {
    title: "Disability and Additional Learning Support",
    link: "/resources/disability-support",
    category: "health",
  },
  fees: {
    title: "Fees and Payment Plans",
    link: "/resources/fees",
    category: "financial",
  },
  careers: {
    title: "Careers and Part-Time Work",
    link: "/resources/careers",
    category: "academic",
  },
  wellbeing: {
    title: "Wellbeing and Counselling Service",
    link: "/resources/wellbeing",
    category: "health",
  },
  "report-and-support": {
    title: "Reporting Harassment or Sexual Misconduct",
    link: "/resources/report-and-support",
    category: "health",
  },
} as const;

export type ResourceId = keyof typeof KNOWLEDGE_BASE;

export function getResource(id: ResourceId) {
  return KNOWLEDGE_BASE[id];
}

export function getResourcesAsText() {
  return Object.entries(KNOWLEDGE_BASE)
    .map(([id, r]) => `- ${id}: ${r.title}`)
    .join("\n");
}
