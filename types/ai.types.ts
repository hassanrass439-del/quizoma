// Mode 1 — Bluff sur Cours
export interface GeneratedQuestion {
  question: string
  vraie_reponse: string
  synonymes: string[]
  explication: string
}

export interface GeneratedQuestionsResponse {
  questions_generees: GeneratedQuestion[]
}

// Mode 2 — Annales QCM
export interface ParsedQCM {
  vraie_combinaison: string
  explications: string
}

export interface ParseQCMResponse {
  vraie_combinaison: string
  explications: string
}

// Document parsing
export interface Chapter {
  title: string
  startIndex: number
  endIndex: number
}

export interface ParsedDocument {
  rawText: string
  chapters: Chapter[]
}

export interface ChunkOptions {
  size: number
  overlap: number
}
