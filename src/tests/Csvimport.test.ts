import { describe, it, expect } from "vitest";
import { parseCsv } from "../lib/Csvimport";

describe("parseCsv", () => {
  it("parse un CSV simple avec délimiteur virgule et en-tête", () => {
    const csv = "date,description,montant\n15/03/2026,Carrefour,12500\n16/03/2026,Loyer,80000";
    const result = parseCsv(csv);
    expect(result.delimiter).toBe(",");
    expect(result.hasHeader).toBe(true);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].date).toBe("2026-03-15");
    expect(result.rows[0].amount).toBe(12500);
    expect(result.rows[0].description).toBe("Carrefour");
    expect(result.rows[0].tags).toEqual([]);
  });

  it("détecte le point-virgule quand c'est le délimiteur dominant", () => {
    const csv = "Date;Libellé;Montant\n15/03/2026;Essence Total;25000";
    const result = parseCsv(csv);
    expect(result.delimiter).toBe(";");
    expect(result.rows[0].amount).toBe(25000);
  });

  it("gère les montants au format français (virgule décimale)", () => {
    const csv2 = "01/01/2026;Test;1234,56";
    const result2 = parseCsv(csv2);
    expect(result2.rows[0].amount).toBe(1235); // arrondi
  });

  it("prend la valeur absolue d'un montant négatif (débit bancaire)", () => {
    const csv = "01/01/2026;Retrait;-15000";
    const result = parseCsv(csv);
    expect(result.rows[0].amount).toBe(15000);
  });

  it("nettoie les symboles monétaires et espaces avant parsing", () => {
    const csv = "01/01/2026;Achat;3 500 F CFA";
    const result = parseCsv(csv);
    expect(result.rows[0].amount).toBe(3500);
  });

  it("reconnaît les dates ISO en plus du format FR", () => {
    const csv = "2026-03-15;Test;1000";
    const result = parseCsv(csv);
    expect(result.rows[0].date).toBe("2026-03-15");
  });

  it("marque include=false pour une ligne sans date ou montant valide", () => {
    const csv = "date;description;montant\nPasUneDate;Mystère;PasUnMontant";
    const result = parseCsv(csv);
    expect(result.rows[0].include).toBe(false);
  });

  it("marque include=true par défaut pour une ligne valide", () => {
    const csv = "date;description;montant\n15/03/2026;Test;5000";
    const result = parseCsv(csv);
    expect(result.rows[0].include).toBe(true);
  });

  it("devine une catégorie à partir de mots-clés dans la description", () => {
    const csv = "date;description;montant\n15/03/2026;Orange Money forfait;10000";
    const result = parseCsv(csv);
    expect(result.rows[0].guessedCategory).toBe("internet");
  });

  it("remonte une erreur globale si aucune date n'est reconnue sur tout le fichier", () => {
    const csv = "date;description;montant\nXX;Test1;1000\nYY;Test2;2000";
    const result = parseCsv(csv);
    expect(result.errors.some((e) => e.includes("date"))).toBe(true);
  });

  it("gère un fichier vide sans planter", () => {
    const result = parseCsv("");
    expect(result.rows).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("détecte l'absence d'en-tête quand la première ligne contient des chiffres", () => {
    const csv = "15/03/2026;Test;5000";
    const result = parseCsv(csv);
    expect(result.hasHeader).toBe(false);
    expect(result.rows).toHaveLength(1);
  });

  // ── Nouveaux tests — colonne tags ──────────────────────────────────────────
  it("parse une colonne tags avec plusieurs tags séparés par |", () => {
    const csv = "date;description;montant;tags\n15/03/2026;Essence;12000;urgent|remboursable";
    const result = parseCsv(csv);
    expect(result.hasTagsColumn).toBe(true);
    expect(result.rows[0].tags).toEqual(["urgent", "remboursable"]);
  });

  it("gère un seul tag sans séparateur", () => {
    const csv = "date;description;montant;tags\n15/03/2026;Essence;12000;urgent";
    const result = parseCsv(csv);
    expect(result.rows[0].tags).toEqual(["urgent"]);
  });

  it("cellule tags vide → tableau vide, pas d'erreur", () => {
    const csv = "date;description;montant;tags\n15/03/2026;Essence;12000;";
    const result = parseCsv(csv);
    expect(result.rows[0].tags).toEqual([]);
  });

  it("reste rétrocompatible : un fichier à 3 colonnes fonctionne toujours (pas de tags)", () => {
    const csv = "date;description;montant\n15/03/2026;Essence;12000";
    const result = parseCsv(csv);
    expect(result.hasTagsColumn).toBe(false);
    expect(result.rows[0].tags).toEqual([]);
    expect(result.rows[0].amount).toBe(12000);
  });

  it("ignore les espaces superflus autour de chaque tag", () => {
    const csv = "date;description;montant;tags\n15/03/2026;Essence;12000; urgent | remboursable ";
    const result = parseCsv(csv);
    expect(result.rows[0].tags).toEqual(["urgent", "remboursable"]);
  });
});