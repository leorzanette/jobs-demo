import type { JobApplication } from "../types/application";
import type { EmailSuggestion, GmailRulesConfig } from "../types/gmail";

const now = new Date();
const daysAgo = (n: number) =>
  new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

export const DEFAULT_DEMO_RULES: GmailRulesConfig = {
  keywords: [
    {
      status: "offer",
      keywords: [
        "oferta de emprego",
        "job offer",
        "offer letter",
        "proposta de emprego",
        "proposta de oferta",
        "congratulations on your offer",
      ],
    },
    {
      status: "rejected",
      keywords: [
        "infelizmente",
        "unfortunately",
        "not moving forward",
        "seguiremos com outras",
        "outras candidaturas",
        "we will not be moving forward",
        "decided not to proceed",
        "não seguiremos",
        "nao seguiremos",
      ],
    },
    {
      status: "interview",
      keywords: [
        "agendar conversa",
        "agendar entrevista",
        "entrevista",
        "interview",
        "schedule a call",
        "schedule an interview",
      ],
    },
    {
      status: "applied",
      keywords: [
        "candidatura recebida",
        "application received",
        "thank you for applying",
        "obrigado por se candidatar",
        "recebemos sua candidatura",
        "we received your application",
      ],
    },
  ],
  blacklist: [],
};

export const SEED_APPLICATIONS: JobApplication[] = [
  {
    id: "app-nubank",
    company: "Nubank",
    role: "Backend Engineer",
    status: "interview",
    platform: "gupy",
    stageCurrent: 3,
    stageTotal: 6,
    appliedDate: daysAgo(18),
    interviewDate: daysAgo(2).slice(0, 10),
    notes: "Technical interview scheduled with the team lead.",
    createdAt: daysAgo(20),
    updatedAt: daysAgo(2),
  },
  {
    id: "app-stone",
    company: "Stone",
    role: "Software Engineer",
    status: "applied",
    platform: "linkedin",
    appliedDate: daysAgo(5),
    createdAt: daysAgo(8),
    updatedAt: daysAgo(5),
  },
  {
    id: "app-ifood",
    company: "iFood",
    role: "Senior Developer",
    status: "wishlist",
    platform: "gupy",
    jobUrl: "https://carreiras.ifood.com.br",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
  {
    id: "app-ml",
    company: "Mercado Livre",
    role: "Staff Engineer",
    status: "offer",
    platform: "linkedin",
    appliedDate: daysAgo(45),
    notes: "Offer received — negotiating compensation.",
    createdAt: daysAgo(50),
    updatedAt: daysAgo(1),
  },
  {
    id: "app-quinto",
    company: "QuintoAndar",
    role: "Frontend Engineer",
    status: "rejected",
    platform: "gupy",
    appliedDate: daysAgo(30),
    createdAt: daysAgo(32),
    updatedAt: daysAgo(10),
  },
  {
    id: "app-picpay",
    company: "PicPay",
    role: "Mobile Developer",
    status: "applied",
    platform: "gupy",
    stageCurrent: 2,
    stageTotal: 6,
    appliedDate: daysAgo(7),
    createdAt: daysAgo(9),
    updatedAt: daysAgo(7),
  },
  {
    id: "app-amazon",
    company: "Amazon",
    role: "SDE II",
    status: "interview",
    platform: "linkedin",
    appliedDate: daysAgo(25),
    interviewDate: daysAgo(4).slice(0, 10),
    createdAt: daysAgo(28),
    updatedAt: daysAgo(4),
  },
  {
    id: "app-creditas",
    company: "Creditas",
    role: "Tech Lead",
    status: "withdrawn",
    platform: "linkedin",
    appliedDate: daysAgo(40),
    notes: "Withdrew after accepting another offer.",
    createdAt: daysAgo(42),
    updatedAt: daysAgo(15),
  },
  {
    id: "app-loggi",
    company: "Loggi",
    role: "Full Stack Engineer",
    status: "wishlist",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: "app-bb",
    company: "Banco do Brasil",
    role: "Analista de Sistemas",
    status: "applied",
    platform: "infojobs",
    appliedDate: daysAgo(12),
    createdAt: daysAgo(14),
    updatedAt: daysAgo(12),
  },
];

export interface SyncQueueEmail {
  id: string;
  applicationId: string;
  gmailMessageId: string;
  suggestedStatus: EmailSuggestion["suggestedStatus"];
  matchedKeyword: string;
  emailFrom: string;
  emailSubject: string;
  emailSnippet: string;
}

export const INITIAL_PENDING_SUGGESTIONS: Omit<
  EmailSuggestion,
  "company" | "role" | "currentStatus"
>[] = [
  {
    id: "sug-stone-applied",
    applicationId: "app-stone",
    gmailMessageId: "msg-demo-stone-1",
    suggestedStatus: "applied",
    matchedKeyword: "candidatura recebida",
    emailFrom: "recrutamento@stone.com.br",
    emailSubject: "Candidatura recebida — Software Engineer",
    emailSnippet:
      "Olá! Recebemos sua candidatura para a vaga de Software Engineer na Stone.",
    status: "pending",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: "sug-nubank-interview",
    applicationId: "app-nubank",
    gmailMessageId: "msg-demo-nubank-1",
    suggestedStatus: "interview",
    matchedKeyword: "entrevista",
    emailFrom: "talentos@nubank.com.br",
    emailSubject: "Convite para entrevista — Backend Engineer",
    emailSnippet:
      "Gostaríamos de agendar uma entrevista técnica para a posição de Backend Engineer no Nubank.",
    status: "pending",
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
  },
];

export const SYNC_QUEUE: SyncQueueEmail[] = [
  {
    id: "sug-ifood-applied",
    applicationId: "app-ifood",
    gmailMessageId: "msg-demo-ifood-1",
    suggestedStatus: "applied",
    matchedKeyword: "thank you for applying",
    emailFrom: "noreply@ifood.com.br",
    emailSubject: "Thank you for applying — Senior Developer",
    emailSnippet:
      "Thank you for applying to the Senior Developer position at iFood. We received your application.",
  },
  {
    id: "sug-amazon-offer",
    applicationId: "app-amazon",
    gmailMessageId: "msg-demo-amazon-1",
    suggestedStatus: "offer",
    matchedKeyword: "job offer",
    emailFrom: "recruiting@amazon.com",
    emailSubject: "Job offer — SDE II at Amazon",
    emailSnippet:
      "Congratulations! We are pleased to extend a job offer for the SDE II position at Amazon.",
  },
];
