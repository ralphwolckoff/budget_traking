import { useState } from "react";
import type {
  Investment,
  InvestmentPayment,
  InvestmentGainEntry,
  InvestmentEvent,
  InvestmentValuePoint,
  InvestmentDocument,
  InvestmentType,
} from "../../lib/types.ts";
import { getMonthKey, getMonthLabel, MONTH_NAMES } from "../../lib/constants.ts";
import { Section, SectionTitle } from "../../ui/Primitives.tsx";
import {
  Kpi,
  Badge,
  InlineCell,
  InlineSelect,
  DeleteX,
  ListRow,
  ListTotal,
  AddPanel,
  EmptySection,
  EventRow,
  DocRow,
  InvSelect,
  SubTabs,
} from "../../ui/Investmentui.tsx";

const TYPE_LABELS: Record<InvestmentType, { label: string; icon: string }> = {
  actions: { label: "Actions / Bourse", icon: "📈" },
  immobilier: { label: "Immobilier", icon: "🏠" },
  crypto: { label: "Crypto-monnaies", icon: "₿" },
  obligations: { label: "Obligations", icon: "📜" },
  epargne: { label: "Épargne", icon: "🏦" },
  business: { label: "Business / PME", icon: "🏢" },
  autre: { label: "Autre", icon: "💼" },
};

const STATUS_CFG = {
  actif: { label: "✅ Actif", color: "success" as const },
  en_attente: { label: "⏳ En attente", color: "warning" as const },
  cloture: { label: "🔒 Clôturé", color: "muted" as const },
};

const DOC_TYPES = ["Contrat", "Reçu", "Rapport", "Relevé", "Autre"];

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
const fmtD = (s: string) =>
  new Date(s).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// ── Onglets de la page détail ────────────────────────────────────────────────
type DetailTab =
  | "apercu"
  | "infos"
  | "versements"
  | "gains"
  | "evolution"
  | "documents"
  | "journal";

const DETAIL_TABS: { id: DetailTab; label: string; icon: string }[] = [
  { id: "apercu", label: "Aperçu", icon: "🏠" },
  { id: "infos", label: "Infos", icon: "ℹ️" },
  { id: "versements", label: "Versements", icon: "💸" },
  { id: "gains", label: "Gains", icon: "💰" },
  { id: "evolution", label: "Évolution", icon: "📈" },
  { id: "documents", label: "Documents", icon: "📎" },
  { id: "journal", label: "Journal", icon: "📓" },
];

// ── Graphe SVG ─────────────────────────────────────────────────────────────────
function ValueGraph({
  points,
  amount,
}: {
  points: InvestmentValuePoint[];
  amount: number;
}) {
  if (points.length < 2)
    return (
      <div className="text-center py-6 text-text-muted text-sm">
        <span className="text-2xl block mb-2">📈</span>
        <p>Ajoutez au moins 2 points de valeur pour afficher le graphe</p>
      </div>
    );
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals, amount) * 0.94;
  const max = Math.max(...vals) * 1.06;
  const W = 500,
    H = 160,
    PX = 32,
    PY = 20;
  const cx = (i: number) => PX + (i / (points.length - 1)) * (W - PX * 2);
  const cy = (v: number) => H - PY - ((v - min) / (max - min)) * (H - PY * 2);
  const linePath = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${cx(i).toFixed(1)} ${cy(p.value).toFixed(1)}`,
    )
    .join(" ");
  const areaPath = `${linePath} L ${cx(points.length - 1).toFixed(1)} ${(H - PY).toFixed(1)} L ${PX} ${(H - PY).toFixed(1)} Z`;
  const last = points[points.length - 1].value;
  const gPct = ((last - amount) / amount) * 100;
  const isPos = gPct >= 0;
  const color = isPos ? "var(--success)" : "var(--danger)";
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-[0.82rem] text-text-muted">
          {fmtD(points[0].date)} → {fmtD(points[points.length - 1].date)}
        </span>
        <span className="font-mono font-bold" style={{ color }}>
          {isPos ? "+" : ""}
          {gPct.toFixed(2)}%
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
        <line
          x1={PX}
          y1={cy(amount)}
          x2={W - PX}
          y2={cy(amount)}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1.5"
          strokeDasharray="5,4"
        />
        <text
          x={PX + 4}
          y={cy(amount) - 5}
          fontSize="9"
          fill="rgba(255,255,255,0.35)"
        >
          capital
        </text>
        <path
          d={areaPath}
          fill={isPos ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)"}
        />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={cx(i)}
              cy={cy(p.value)}
              r="5"
              fill={color}
              stroke="var(--dark-soft)"
              strokeWidth="2.5"
            />
            {(i === 0 || i === points.length - 1) && (
              <text
                x={cx(i)}
                y={cy(p.value) - 10}
                textAnchor="middle"
                fontSize="9"
                fill="rgba(255,255,255,0.5)"
              >
                {fmt(p.value)}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className="flex justify-between text-[0.7rem] text-text-muted mt-1">
        <span>{fmtD(points[0].date)}</span>
        <span>{fmtD(points[points.length - 1].date)}</span>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────
interface Props {
  inv: Investment;
  onUpdate: (p: Partial<Investment>) => void;
  onDelete: () => void;
  onBack: () => void;
}

export default function InvestmentDetailPage({
  inv,
  onUpdate: u,
  onDelete,
  onBack,
}: Props) {
  const [activeTab, setActiveTab] = useState<DetailTab>("apercu");

  const [payAmt, setPayAmt] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [valAmt, setValAmt] = useState("");
  const [valDate, setValDate] = useState(new Date().toISOString().slice(0, 10));
  const [evtNote, setEvtNote] = useState("");
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState("Contrat");
  const [docNotes, setDocNotes] = useState("");
  const [showAddPay, setShowAddPay] = useState(false);
  const [showAddVal, setShowAddVal] = useState(false);
  const [showAddEvt, setShowAddEvt] = useState(false);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [showAddGain, setShowAddGain] = useState(false);
  const [gainAmt, setGainAmt] = useState("");
  const [gainMonth, setGainMonth] = useState(getMonthKey());
  const [gainNote, setGainNote] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);

  const ti = TYPE_LABELS[inv.type];
  const sc = STATUS_CFG[inv.status];
  const totalPaid = (inv.payments ?? []).reduce((s, p) => s + p.amount, 0);
  const totalInvested = inv.amount + totalPaid;
  const totalGainsEarned = (inv.gains ?? []).reduce((s, g) => s + g.amount, 0);
  const gainLatent = inv.currentValue ? inv.currentValue - totalInvested : null;
  const gainLatentPct =
    gainLatent !== null ? (gainLatent / totalInvested) * 100 : null;
  const gainExp = inv.expectedReturn
    ? (totalInvested * inv.expectedReturn) / 100
    : null;
  const daysLeft = inv.endDate
    ? Math.ceil((new Date(inv.endDate).getTime() - Date.now()) / 86400000)
    : null;
  const valPoints: InvestmentValuePoint[] = [
    { date: inv.startDate, value: inv.amount },
    ...(inv.valueHistory ?? []),
    ...(inv.currentValue &&
    (!inv.valueHistory?.length ||
      inv.valueHistory[inv.valueHistory.length - 1]?.value !== inv.currentValue)
      ? [
          {
            date: new Date().toISOString().slice(0, 10),
            value: inv.currentValue,
          },
        ]
      : []),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const newEvt = (
    type: InvestmentEvent["type"],
    content: string,
    value?: number,
  ): InvestmentEvent => ({
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    date: new Date().toISOString().slice(0, 10),
    type,
    content,
    value,
  });

  const addPayment = () => {
    const amt = parseFloat(payAmt) || 0;
    if (amt <= 0) return;
    const p: InvestmentPayment = {
      id: `pay-${Date.now()}`,
      date: payDate,
      amount: amt,
      note: payNote.trim() || undefined,
    };
    u({
      payments: [...(inv.payments ?? []), p],
      events: [
        ...(inv.events ?? []),
        newEvt(
          "versement",
          `Versement +${fmt(amt)} F${payNote ? ` — ${payNote}` : ""}`,
        ),
      ],
    });
    setPayAmt("");
    setPayNote("");
    setShowAddPay(false);
  };

  const addValuePoint = () => {
    const v = parseFloat(valAmt) || 0;
    if (v <= 0) return;
    const pt: InvestmentValuePoint = { date: valDate, value: v };
    u({
      currentValue: v,
      valueHistory: [...(inv.valueHistory ?? []), pt].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
      events: [
        ...(inv.events ?? []),
        newEvt("valeur", `Valeur → ${fmt(v)} F`, v),
      ],
    });
    setValAmt("");
    setShowAddVal(false);
  };

  const addNote = () => {
    if (!evtNote.trim()) return;
    u({ events: [...(inv.events ?? []), newEvt("note", evtNote.trim())] });
    setEvtNote("");
    setShowAddEvt(false);
  };

  const addDocument = () => {
    if (!docName.trim()) return;
    const doc: InvestmentDocument = {
      id: `doc-${Date.now()}`,
      name: docName.trim(),
      type: docType,
      addedAt: new Date().toISOString().slice(0, 10),
      notes: docNotes.trim() || undefined,
    };
    u({
      documents: [...(inv.documents ?? []), doc],
      events: [
        ...(inv.events ?? []),
        newEvt("note", `Document : ${docName.trim()} (${docType})`),
      ],
    });
    setDocName("");
    setDocNotes("");
    setShowAddDoc(false);
  };

  const addGain = () => {
    const amt = parseFloat(gainAmt) || 0;
    if (amt <= 0) return;
    const g: InvestmentGainEntry = {
      id: `gain-${Date.now()}`,
      monthKey: gainMonth,
      amount: amt,
      note: gainNote.trim() || undefined,
    };
    const evt: InvestmentEvent = {
      id: `evt-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      type: "note",
      content: `Gain encaissé ${getMonthLabel(gainMonth)} : +${fmt(amt)} F${gainNote ? ` — ${gainNote}` : ""}`,
    };
    u({
      gains: [...(inv.gains ?? []), g],
      events: [...(inv.events ?? []), evt],
    });
    setGainAmt("");
    setGainNote("");
    setShowAddGain(false);
  };

  const infoRows: { label: string; el: React.ReactNode }[] = [
    {
      label: "💰 Montant initial",
      el: (
        <InlineCell
          value={String(inv.amount)}
          type="number"
          suffix=" F CFA"
          onSave={(v) => {
            const n = parseFloat(v) || 0;
            if (n > 0) u({ amount: n });
          }}
        />
      ),
    },
    {
      label: "📈 Valeur actuelle",
      el: (
        <InlineCell
          value={String(inv.currentValue ?? "")}
          type="number"
          suffix=" F CFA"
          placeholder="Non renseigné"
          onSave={(v) => {
            const n = parseFloat(v) || 0;
            n > 0
              ? u({
                  currentValue: n,
                  valueHistory: [
                    ...(inv.valueHistory ?? []),
                    { date: new Date().toISOString().slice(0, 10), value: n },
                  ],
                })
              : u({ currentValue: undefined });
          }}
        />
      ),
    },
    {
      label: "🎯 Rendement attendu",
      el: (
        <InlineCell
          value={String(inv.expectedReturn ?? "")}
          type="number"
          suffix="%"
          placeholder="Non défini"
          onSave={(v) => {
            const n = parseFloat(v) || 0;
            u({ expectedReturn: n || undefined });
          }}
        />
      ),
    },
    {
      label: "⏱️ Durée",
      el: (
        <InlineCell
          value={String(inv.durationMonths ?? "")}
          type="number"
          suffix=" mois"
          placeholder="Non définie"
          onSave={(v) => {
            const n = parseInt(v) || 0;
            u({ durationMonths: n || undefined });
          }}
        />
      ),
    },
    {
      label: "📅 Date début",
      el: (
        <InlineCell
          value={inv.startDate}
          type="date"
          onSave={(v) => v && u({ startDate: v })}
        />
      ),
    },
    {
      label: "📅 Date fin prévue",
      el: (
        <InlineCell
          value={inv.endDate ?? ""}
          type="date"
          placeholder="Non définie"
          onSave={(v) => u({ endDate: v || undefined })}
        />
      ),
    },
  ];

  // ── Onglet Aperçu (page d'accueil) ──────────────────────────────────────────
  function ApercuTab() {
    const recentEvents = [...(inv.events ?? [])].reverse().slice(0, 4);
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section>
          <SectionTitle
            icon="📈"
            action={
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveTab("evolution")}
              >
                Voir tout →
              </button>
            }
          >
            Évolution de la valeur
          </SectionTitle>
          <ValueGraph points={valPoints.slice(1)} amount={inv.amount} />
        </Section>

        <div className="flex flex-col gap-4">
          <Section>
            <SectionTitle
              icon="💸"
              action={
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setActiveTab("versements")}
                >
                  Voir tout →
                </button>
              }
            >
              Versements
              {totalPaid > 0 && (
                <span className="ml-1.5 text-[0.78rem] text-primary font-mono font-normal">
                  +{fmt(totalPaid)} F
                </span>
              )}
            </SectionTitle>
            {(inv.payments ?? []).length === 0 ? (
              <EmptySection>Aucun versement enregistré</EmptySection>
            ) : (
              <p className="text-[0.82rem] text-text-muted">
                {(inv.payments ?? []).length} versement
                {(inv.payments ?? []).length > 1 ? "s" : ""} enregistré
                {(inv.payments ?? []).length > 1 ? "s" : ""}
              </p>
            )}
          </Section>

          <Section>
            <SectionTitle
              icon="💰"
              action={
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setActiveTab("gains")}
                >
                  Voir tout →
                </button>
              }
            >
              Gains encaissés
              {totalGainsEarned > 0 && (
                <span className="ml-1.5 text-[0.78rem] text-success font-mono font-normal">
                  +{fmt(totalGainsEarned)} F
                </span>
              )}
            </SectionTitle>
            {(inv.gains ?? []).length === 0 ? (
              <EmptySection>Aucun gain encaissé</EmptySection>
            ) : (
              <p className="text-[0.82rem] text-text-muted">
                {(inv.gains ?? []).length} gain
                {(inv.gains ?? []).length > 1 ? "s" : ""} encaissé
                {(inv.gains ?? []).length > 1 ? "s" : ""}
              </p>
            )}
          </Section>

          <Section>
            <SectionTitle
              icon="📓"
              action={
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setActiveTab("journal")}
                >
                  Voir tout →
                </button>
              }
            >
              Activité récente
            </SectionTitle>
            {recentEvents.length === 0 ? (
              <EmptySection>Aucun événement enregistré</EmptySection>
            ) : (
              <div className="flex flex-col gap-1.5">
                {recentEvents.map((evt) => (
                  <EventRow
                    key={evt.id}
                    type={evt.type}
                    icon={
                      evt.type === "note"
                        ? "📝"
                        : evt.type === "valeur"
                          ? "📊"
                          : evt.type === "statut"
                            ? "🔄"
                            : "💸"
                    }
                    content={evt.content}
                    date={fmtD(evt.date)}
                    onDelete={() =>
                      u({
                        events: (inv.events ?? []).filter(
                          (e) => e.id !== evt.id,
                        ),
                      })
                    }
                  />
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    );
  }

  // ── Onglet Infos ─────────────────────────────────────────────────────────────
  function InfosTab() {
    return (
      <Section>
        <SectionTitle icon="ℹ️">
          Informations{" "}
          <span className="text-[0.72rem] text-text-muted font-normal ml-1">
            — cliquez pour modifier
          </span>
        </SectionTitle>
        <div className="flex flex-col">
          {infoRows.map(({ label, el }, i) => (
            <div
              key={i}
              className="flex items-center gap-2 py-2 px-2.5 border-b border-border/50 last:border-b-0 hover:bg-surface rounded-lg transition-colors"
            >
              <span className="text-[0.78rem] text-text-muted w-[150px] flex-shrink-0">
                {label}
              </span>
              {el}
            </div>
          ))}
          <div className="flex items-center gap-2 py-2 px-2.5 hover:bg-surface rounded-lg transition-colors">
            <span className="text-[0.78rem] text-text-muted w-[150px] flex-shrink-0">
              📝 Notes
            </span>
            <InlineCell
              value={inv.notes ?? ""}
              placeholder="Ajouter des notes…"
              onSave={(v) => u({ notes: v.trim() || undefined })}
              className="max-w-[300px] whitespace-pre-wrap break-words"
            />
          </div>
        </div>
      </Section>
    );
  }

  // ── Onglet Versements ────────────────────────────────────────────────────────
  function VersementsTab() {
    return (
      <Section>
        <SectionTitle
          icon="💸"
          action={
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowAddPay((p) => !p)}
            >
              + Ajouter
            </button>
          }
        >
          Versements
          {totalPaid > 0 && (
            <span className="ml-1.5 text-[0.78rem] text-primary font-mono font-normal">
              +{fmt(totalPaid)} F
            </span>
          )}
        </SectionTitle>
        {showAddPay && (
          <AddPanel>
            <div className="flex gap-3 flex-wrap [&>*]:flex-1 [&>*]:min-w-[140px]">
              <div className="input-group !mb-0">
                <label className="input-label">Montant (F)</label>
                <input
                  type="number"
                  min="0"
                  value={payAmt}
                  onChange={(e) => setPayAmt(e.target.value)}
                  placeholder="Ex: 50000"
                />
              </div>
              <div className="input-group !mb-0">
                <label className="input-label">Date</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </div>
            </div>
            <div className="input-group !mb-0">
              <label className="input-label">Note (optionnel)</label>
              <input
                type="text"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder="Ex: Apport de mars"
              />
            </div>
            <div className="flex gap-2">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAddPay(false)}
              >
                Annuler
              </button>
              <button className="btn btn-primary btn-sm" onClick={addPayment}>
                Ajouter
              </button>
            </div>
          </AddPanel>
        )}
        <div className="mt-2.5">
          {(inv.payments ?? []).length === 0 && !showAddPay ? (
            <EmptySection>Aucun versement enregistré</EmptySection>
          ) : (
            <div className="flex flex-col gap-1.5">
              {[...(inv.payments ?? [])].reverse().map((p) => (
                <ListRow
                  key={p.id}
                  date={fmtD(p.date)}
                  note={p.note}
                  amount={`+${fmt(p.amount)} F`}
                  onDelete={() =>
                    u({
                      payments: (inv.payments ?? []).filter(
                        (x) => x.id !== p.id,
                      ),
                    })
                  }
                />
              ))}
              {totalPaid > 0 && (
                <ListTotal
                  label="Total versements"
                  value={`${fmt(totalPaid)} F`}
                />
              )}
            </div>
          )}
        </div>
      </Section>
    );
  }

  // ── Onglet Gains ─────────────────────────────────────────────────────────────
  function GainsTab() {
    return (
      <Section>
        <SectionTitle
          icon="💰"
          action={
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setGainAmt("");
                setGainMonth(getMonthKey());
                setGainNote("");
                setShowAddGain((g) => !g);
              }}
            >
              + Encaisser
            </button>
          }
        >
          Gains encaissés
          {totalGainsEarned > 0 && (
            <span className="ml-1.5 text-[0.78rem] text-success font-mono font-normal">
              +{fmt(totalGainsEarned)} F total
            </span>
          )}
        </SectionTitle>
        <p className="text-[0.78rem] text-text-muted mb-2">
          Gains perçus ce mois — augmentent le budget disponible du mois
          concerné
        </p>
        {showAddGain && (
          <AddPanel>
            <div className="flex gap-3 flex-wrap [&>*]:flex-1 [&>*]:min-w-[140px]">
              <div className="input-group !mb-0">
                <label className="input-label">Montant encaissé (F)</label>
                <input
                  type="number"
                  min="0"
                  value={gainAmt}
                  onChange={(e) => setGainAmt(e.target.value)}
                  placeholder="Ex: 5000"
                />
              </div>
              <div className="input-group !mb-0">
                <label className="input-label">Mois</label>
                <InvSelect
                  className="w-full"
                  value={gainMonth}
                  onChange={(e) => setGainMonth(e.target.value)}
                >
                  {Array.from({ length: 12 }, (_, i) => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                    return (
                      <option key={mk} value={mk}>
                        {MONTH_NAMES[d.getMonth()]} {d.getFullYear()}
                      </option>
                    );
                  })}
                </InvSelect>
              </div>
            </div>
            <div className="input-group !mb-0">
              <label className="input-label">Note (optionnel)</label>
              <input
                type="text"
                value={gainNote}
                onChange={(e) => setGainNote(e.target.value)}
                placeholder="Ex: Loyer mars, dividende, intérêts..."
              />
            </div>
            <div className="flex gap-2">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAddGain(false)}
              >
                Annuler
              </button>
              <button className="btn btn-primary btn-sm" onClick={addGain}>
                Enregistrer
              </button>
            </div>
          </AddPanel>
        )}
        <div className="mt-2.5">
          {(inv.gains ?? []).length === 0 && !showAddGain ? (
            <EmptySection>
              Aucun gain encaissé — cliquez sur "+ Encaisser" pour en ajouter
            </EmptySection>
          ) : (
            <div className="flex flex-col gap-1.5">
              {[...(inv.gains ?? [])].reverse().map((g) => (
                <ListRow
                  key={g.id}
                  date={getMonthLabel(g.monthKey)}
                  note={g.note}
                  amount={`+${fmt(g.amount)} F`}
                  dateColor="text-success"
                  amountColor="text-success"
                  onDelete={() =>
                    u({
                      gains: (inv.gains ?? []).filter((x) => x.id !== g.id),
                    })
                  }
                />
              ))}
              {totalGainsEarned > 0 && (
                <ListTotal
                  label="Total gains encaissés"
                  value={`+${fmt(totalGainsEarned)} F`}
                  color="text-success"
                />
              )}
            </div>
          )}
        </div>
      </Section>
    );
  }

  // ── Onglet Évolution ─────────────────────────────────────────────────────────
  function EvolutionTab() {
    return (
      <Section>
        <SectionTitle
          icon="📈"
          action={
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setValAmt(String(inv.currentValue ?? ""));
                setValDate(new Date().toISOString().slice(0, 10));
                setShowAddVal((v) => !v);
              }}
            >
              + Point
            </button>
          }
        >
          Évolution de la valeur
        </SectionTitle>
        <ValueGraph points={valPoints.slice(1)} amount={inv.amount} />
        {showAddVal && (
          <AddPanel>
            <div className="flex gap-3 flex-wrap [&>*]:flex-1 [&>*]:min-w-[140px]">
              <div className="input-group !mb-0">
                <label className="input-label">Valeur (F)</label>
                <input
                  type="number"
                  min="0"
                  value={valAmt}
                  onChange={(e) => setValAmt(e.target.value)}
                  placeholder="Ex: 650000"
                />
              </div>
              <div className="input-group !mb-0">
                <label className="input-label">Date</label>
                <input
                  type="date"
                  value={valDate}
                  onChange={(e) => setValDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAddVal(false)}
              >
                Annuler
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={addValuePoint}
              >
                Ajouter
              </button>
            </div>
          </AddPanel>
        )}
        {(inv.valueHistory ?? []).length > 0 && (
          <div className="flex flex-col gap-1.5 mt-2.5">
            {[...(inv.valueHistory ?? [])].reverse().map((pt, i) => {
              const pct = ((pt.value - inv.amount) / inv.amount) * 100;
              const positive = pt.value >= inv.amount;
              return (
                <div
                  key={i}
                  className="grid grid-cols-[90px_1fr_auto_auto] items-center gap-2 py-1.5 px-2.5 bg-surface rounded-lg text-sm"
                >
                  <span className="text-xs text-text-muted">
                    {fmtD(pt.date)}
                  </span>
                  <span
                    className={`font-mono font-bold ${positive ? "text-success" : "text-danger"}`}
                  >
                    {fmt(pt.value)} F
                  </span>
                  <span
                    className={`text-[0.72rem] ${positive ? "text-success" : "text-danger"}`}
                  >
                    {positive ? "+" : ""}
                    {pct.toFixed(1)}%
                  </span>
                  <DeleteX
                    onClick={() => {
                      const h = (inv.valueHistory ?? []).filter(
                        (p) => !(p.date === pt.date && p.value === pt.value),
                      );
                      u({
                        valueHistory: h,
                        currentValue: h.length
                          ? h[h.length - 1].value
                          : undefined,
                      });
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </Section>
    );
  }

  // ── Onglet Documents ─────────────────────────────────────────────────────────
  function DocumentsTab() {
    return (
      <Section>
        <SectionTitle
          icon="📎"
          action={
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowAddDoc((d) => !d)}
            >
              + Ajouter
            </button>
          }
        >
          Pièces jointes{" "}
          <span className="text-[0.72rem] text-text-muted font-normal">
            — noms uniquement
          </span>
        </SectionTitle>
        {showAddDoc && (
          <AddPanel>
            <div className="flex gap-3 flex-wrap [&>*]:min-w-[140px]">
              <div className="input-group !mb-0 !flex-[2]">
                <label className="input-label">Nom du fichier</label>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="Ex: Contrat_Terrain.pdf"
                />
              </div>
              <div className="input-group !mb-0 !flex-1">
                <label className="input-label">Type</label>
                <InvSelect
                  className="w-full"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                >
                  {DOC_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </InvSelect>
              </div>
            </div>
            <div className="input-group !mb-0">
              <label className="input-label">Note (optionnel)</label>
              <input
                type="text"
                value={docNotes}
                onChange={(e) => setDocNotes(e.target.value)}
                placeholder="Ex: Signé le 12/01/2025"
              />
            </div>
            <div className="flex gap-2">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAddDoc(false)}
              >
                Annuler
              </button>
              <button className="btn btn-primary btn-sm" onClick={addDocument}>
                Enregistrer
              </button>
            </div>
          </AddPanel>
        )}
        <div className="mt-2.5">
          {(inv.documents ?? []).length === 0 && !showAddDoc ? (
            <EmptySection>Aucun document enregistré</EmptySection>
          ) : (
            <div className="flex flex-col gap-1.5">
              {(inv.documents ?? []).map((doc) => (
                <DocRow
                  key={doc.id}
                  name={doc.name}
                  meta={`${doc.type} · ${fmtD(doc.addedAt)}${doc.notes ? ` · ${doc.notes}` : ""}`}
                  onDelete={() =>
                    u({
                      documents: (inv.documents ?? []).filter(
                        (d) => d.id !== doc.id,
                      ),
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>
      </Section>
    );
  }

  // ── Onglet Journal ───────────────────────────────────────────────────────────
  function JournalTab() {
    return (
      <Section>
        <SectionTitle
          icon="📓"
          action={
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowAddEvt((e) => !e)}
            >
              + Note
            </button>
          }
        >
          Journal
        </SectionTitle>
        {showAddEvt && (
          <AddPanel>
            <div className="input-group !mb-0">
              <label className="input-label">Note</label>
              <textarea
                value={evtNote}
                onChange={(e) => setEvtNote(e.target.value)}
                rows={2}
                style={{ width: "100%", resize: "vertical" }}
                placeholder="Ex: Réunion avec gestionnaire, dividende reçu..."
              />
            </div>
            <div className="flex gap-2">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAddEvt(false)}
              >
                Annuler
              </button>
              <button className="btn btn-primary btn-sm" onClick={addNote}>
                Ajouter
              </button>
            </div>
          </AddPanel>
        )}
        <div className="mt-2.5">
          {(inv.events ?? []).length === 0 && !showAddEvt ? (
            <EmptySection>Aucun événement enregistré</EmptySection>
          ) : (
            <div className="flex flex-col gap-1.5">
              {[...(inv.events ?? [])].reverse().map((evt) => (
                <EventRow
                  key={evt.id}
                  type={evt.type}
                  icon={
                    evt.type === "note"
                      ? "📝"
                      : evt.type === "valeur"
                        ? "📊"
                        : evt.type === "statut"
                          ? "🔄"
                          : "💸"
                  }
                  content={evt.content}
                  date={fmtD(evt.date)}
                  onDelete={() =>
                    u({
                      events: (inv.events ?? []).filter((e) => e.id !== evt.id),
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>
      </Section>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <button
        onClick={onBack}
        className="self-start mb-1 bg-surface-soft border-none rounded-lg text-text-muted py-1.5 px-3.5 text-[0.83rem] cursor-pointer transition-colors hover:bg-surface hover:text-text"
      >
        ← Retour au portefeuille
      </button>

      {/* Hero — reste visible quel que soit l'onglet actif, plat désormais */}
      <div className="flex gap-5 p-5 bg-surface-soft rounded-2xl flex-wrap">
        <div className="flex gap-3.5 items-start flex-1 min-w-[200px]">
          <span className="w-14 h-14 rounded-xl bg-primary/15 flex items-center justify-center text-3xl flex-shrink-0">
            {ti.icon}
          </span>
          <div>
            <div className="text-xl font-extrabold text-text">
              <InlineCell
                value={inv.name}
                onSave={(v) => v.trim() && u({ name: v.trim() })}
              />
            </div>
            <div className="flex gap-2.5 mt-1.5 flex-wrap items-center text-sm">
              <InlineSelect
                value={inv.type}
                options={Object.entries(TYPE_LABELS).map(([v, t]) => ({
                  value: v as InvestmentType,
                  label: `${t.icon} ${t.label}`,
                }))}
                onSave={(v) => u({ type: v })}
              />
              <InlineSelect
                value={inv.status}
                options={Object.entries(STATUS_CFG).map(([v, s]) => ({
                  value: v as Investment["status"],
                  label: s.label,
                }))}
                onSave={(v) =>
                  u({
                    status: v,
                    events: [
                      ...(inv.events ?? []),
                      newEvt(
                        "statut",
                        `Statut → ${STATUS_CFG[v as Investment["status"]].label}`,
                      ),
                    ],
                  })
                }
              />
            </div>
          </div>
        </div>
        <div className="flex-[2] min-w-[280px]">
          <div
            className="grid gap-2.5"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            }}
          >
            <Kpi
              size="sm"
              label="Total investi"
              value={`${fmt(totalInvested)} F`}
              color="primary"
              sub={
                totalPaid > 0
                  ? `${fmt(inv.amount)} + ${fmt(totalPaid)} F`
                  : undefined
              }
            />
            {inv.currentValue != null && (
              <Kpi
                size="sm"
                label="Valeur actuelle"
                value={`${fmt(inv.currentValue)} F`}
                color={
                  gainLatent !== null && gainLatent >= 0 ? "success" : "danger"
                }
                sub={
                  gainLatentPct !== null
                    ? `${gainLatentPct >= 0 ? "+" : ""}${gainLatentPct.toFixed(2)}% latent`
                    : undefined
                }
              />
            )}
            {gainLatent !== null && (
              <Kpi
                size="sm"
                label={
                  gainLatent >= 0 ? "📈 Plus-value lat." : "📉 Moins-value"
                }
                value={`${gainLatent >= 0 ? "+" : ""}${fmt(gainLatent)} F`}
                color={gainLatent >= 0 ? "success" : "danger"}
              />
            )}
            {totalGainsEarned > 0 && (
              <Kpi
                size="sm"
                label="💰 Gains encaissés"
                value={`+${fmt(totalGainsEarned)} F`}
                color="success"
                sub={`${(inv.gains ?? []).length} versement${(inv.gains ?? []).length > 1 ? "s" : ""}`}
              />
            )}
            {gainExp !== null && (
              <Kpi
                size="sm"
                label="Gain prévu (indicatif)"
                value={`+${fmt(gainExp)} F`}
                color="warning"
                sub={`${inv.expectedReturn}% — indicatif`}
              />
            )}
            {daysLeft !== null && (
              <Kpi
                size="sm"
                label="Échéance"
                value={
                  daysLeft > 0 ? `${daysLeft}j` : `Échu ${Math.abs(daysLeft)}j`
                }
                color={
                  daysLeft < 0
                    ? "danger"
                    : daysLeft < 30
                      ? "warning"
                      : "primary"
                }
                sub={fmtD(inv.endDate!)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Onglets */}
      <SubTabs
        tabs={DETAIL_TABS.map((t) => ({
          ...t,
          count:
            t.id === "versements"
              ? (inv.payments ?? []).length || undefined
              : t.id === "gains"
                ? (inv.gains ?? []).length || undefined
                : t.id === "documents"
                  ? (inv.documents ?? []).length || undefined
                  : t.id === "journal"
                    ? (inv.events ?? []).length || undefined
                    : undefined,
          countMuted: t.id === "documents" || t.id === "journal",
        }))}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "apercu" && <ApercuTab />}
      {activeTab === "infos" && <InfosTab />}
      {activeTab === "versements" && <VersementsTab />}
      {activeTab === "gains" && <GainsTab />}
      {activeTab === "evolution" && <EvolutionTab />}
      {activeTab === "documents" && <DocumentsTab />}
      {activeTab === "journal" && <JournalTab />}

      {/* Supprimer — reste accessible depuis n'importe quel onglet */}
      <div className="flex justify-end pt-3 border-t border-border">
        {confirmDel ? (
          <div className="flex items-center gap-2.5">
            <span className="text-[0.85rem] text-danger">
              Confirmer la suppression ?
            </span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setConfirmDel(false)}
            >
              Annuler
            </button>
            <button className="btn btn-danger btn-sm" onClick={onDelete}>
              Supprimer
            </button>
          </div>
        ) : (
          <button
            className="btn btn-danger"
            onClick={() => setConfirmDel(true)}
          >
            🗑️ Supprimer cet investissement
          </button>
        )}
      </div>
    </div>
  );
}
