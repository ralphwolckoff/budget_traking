// ══════════════════════════════════════════════════════════════════════════════
// Import CSV — parsing pur, aucun effet de bord (facile à tester, réutilisable
// hors du composant modal). Gère les exports bancaires typiques : délimiteur
// virgule OU point-virgule, montants "1 234,56" ou "-1234.56", dates
// DD/MM/YYYY ou ISO, et une colonne tags optionnelle en 4e position.
// ══════════════════════════════════════════════════════════════════════════════

import { CATEGORIES } from "./constants";

export interface ParsedRow {
  rowIndex: number;      // position dans le fichier source (pour debug/tri)
  date: string | null;   // ISO "YYYY-MM-DD", null si non reconnue
  description: string;
  amount: number | null; // toujours positif (montant absolu) — null si non reconnu
  rawAmount: string;     // valeur brute, pour afficher en cas d'échec de parsing
  tags: string[];        // vide si pas de 4e colonne ou colonne vide
  guessedCategory: string; // id de catégorie deviné par mots-clés, "autre" par défaut
  include: boolean;      // sélectionné pour import par défaut (false si date/montant invalides)
}

export interface ParseResult {
  rows: ParsedRow[];
  delimiter: "," | ";";
  hasHeader: boolean;
  hasTagsColumn: boolean;
  errors: string[]; // avertissements globaux (pas ligne par ligne)
}

// Séparateur INTERNE aux tags dans une même cellule — volontairement différent
// du délimiteur de colonnes (, ou ;) pour ne jamais entrer en conflit,
// quel que soit le délimiteur détecté dans le fichier.
const TAG_SEPARATOR = "|";

// ── Détection du délimiteur ───────────────────────────────────────────────────
function detectDelimiter(sample: string): "," | ";" {
  const firstLine = sample.split(/\r?\n/)[0] ?? "";
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  // Les relevés bancaires FR utilisent quasi toujours ";" quand la virgule
  // sert de séparateur décimal dans les montants
  return semicolons >= commas ? ";" : ",";
}

// ── Parseur de ligne CSV (gère les champs entre guillemets) ─────────────────
function parseLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

// ── Détection d'en-tête ────────────────────────────────────────────────────────
function looksLikeHeader(fields: string[]): boolean {
  // Une ligne d'en-tête ne contient (quasi) aucun chiffre
  const digitCount = fields.join("").replace(/[^0-9]/g, "").length;
  return digitCount === 0;
}

// ── Parsing de date ────────────────────────────────────────────────────────────
function parseDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  // ISO : 2026-03-15
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  // FR : 15/03/2026 ou 15-03-2026
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const day = m[1].padStart(2, "0");
    const month = m[2].padStart(2, "0");
    return `${m[3]}-${month}-${day}`;
  }

  // FR année courte : 15/03/26
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if (m) {
    const day = m[1].padStart(2, "0");
    const month = m[2].padStart(2, "0");
    const year = Number(m[3]) < 70 ? `20${m[3]}` : `19${m[3]}`;
    return `${year}-${month}-${day}`;
  }

  return null;
}

// ── Parsing de montant ────────────────────────────────────────────────────────
function parseAmount(raw: string): number | null {
  let s = raw.trim().replace(/[^\d,.\-]/g, ""); // retire "F", "CFA", espaces, devise...
  if (!s) return null;

  // Si les deux séparateurs sont présents, celui en dernier est le décimal
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (lastComma > -1) {
    // Une seule virgule → décimale (format FR "1234,56")
    s = s.replace(",", ".");
  }

  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return Math.abs(Math.round(n)); // on ne gère que les dépenses — montant absolu
}

// ── Parsing de tags ────────────────────────────────────────────────────────────
// Une cellule "urgent|remboursable|vacances" devient ["urgent", "remboursable", "vacances"].
// Cellule vide ou absente → tableau vide (pas de tags, comportement normal).
function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(TAG_SEPARATOR)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

// ── Deviner une catégorie à partir de mots-clés dans la description ────────────
// Heuristique volontairement simple et sans prétention — sert de point de
// départ, l'utilisateur ajuste dans le tableau de prévisualisation avant
// import. Aucune de ces correspondances n'est garantie juste.
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  alimentation: ["carrefour", "supermarche", "market", "restaurant", "maquis", "boulangerie", "epicerie"],
  transport: ["essence", "carburant", "taxi", "uber", "bolt", "peage", "parking", "transport"],
  logement: ["loyer", "bailleur", "immobilier", "syndic"],
  internet: ["orange", "mtn", "camtel", "internet", "forfait", "telephone", "canal+", "netflix", "spotify"],
  sante: ["pharmacie", "hopital", "clinique", "medecin", "docteur"],
  education: ["ecole", "universite", "scolarite", "cours"],
};

function guessCategory(description: string): string {
  const lower = description.toLowerCase();
  for (const [catId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    // Ne propose que les catégories qui existent réellement dans l'app
    if (!CATEGORIES.some((c) => c.id === catId)) continue;
    if (keywords.some((kw) => lower.includes(kw))) return catId;
  }
  return CATEGORIES[0]?.id ?? "autre";
}

// ── Point d'entrée ────────────────────────────────────────────────────────────
// Ordre de colonnes par défaut : date, description, montant, tags (optionnelle).
// Si ton fichier n'a que 3 colonnes, la colonne tags est simplement absente
// et chaque ligne aura tags: [] — aucune erreur, comportement identique à avant.
export function parseCsv(
  content: string,
  columnOrder: { date: number; description: number; amount: number; tags?: number } = {
    date: 0,
    description: 1,
    amount: 2,
    tags: 3,
  },
): ParseResult {
  const errors: string[] = [];
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    return { rows: [], delimiter: ",", hasHeader: false, hasTagsColumn: false, errors: ["Fichier vide"] };
  }

  const delimiter = detectDelimiter(content);
  const firstFields = parseLine(lines[0], delimiter);
  const hasHeader = looksLikeHeader(firstFields);
  const dataLines = hasHeader ? lines.slice(1) : lines;

  // La colonne tags n'existe que si au moins une ligne de données va assez loin
  const tagsColIdx = columnOrder.tags;
  const hasTagsColumn =
    tagsColIdx !== undefined &&
    dataLines.some((line) => parseLine(line, delimiter).length > tagsColIdx);

  const maxRequiredCol = Math.max(columnOrder.date, columnOrder.description, columnOrder.amount);

  const rows: ParsedRow[] = dataLines.map((line, i) => {
    const fields = parseLine(line, delimiter);
    if (fields.length <= maxRequiredCol) {
      return {
        rowIndex: i,
        date: null,
        description: fields.join(" ").trim() || "(ligne illisible)",
        amount: null,
        rawAmount: "",
        tags: [],
        guessedCategory: CATEGORIES[0]?.id ?? "autre",
        include: false,
      };
    }

    const date = parseDate(fields[columnOrder.date] ?? "");
    const description = (fields[columnOrder.description] ?? "").trim() || "(sans description)";
    const rawAmount = fields[columnOrder.amount] ?? "";
    const amount = parseAmount(rawAmount);
    const tags = hasTagsColumn && tagsColIdx !== undefined ? parseTags(fields[tagsColIdx]) : [];

    return {
      rowIndex: i,
      date,
      description,
      amount,
      rawAmount,
      tags,
      guessedCategory: guessCategory(description),
      include: date !== null && amount !== null && amount > 0,
    };
  });

  if (rows.every((r) => r.date === null)) {
    errors.push(
      "Aucune date reconnue — vérifie l'ordre des colonnes de ton fichier.",
    );
  }
  if (rows.every((r) => r.amount === null)) {
    errors.push(
      "Aucun montant reconnu — vérifie l'ordre des colonnes de ton fichier.",
    );
  }

  return { rows, delimiter, hasHeader, hasTagsColumn, errors };
}