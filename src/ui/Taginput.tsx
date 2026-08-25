import { useState } from "react";
import { X } from "lucide-react";

/**
 * Saisie de tags libres façon "chips" — tape puis Entrée/virgule pour ajouter,
 * clique le × pour retirer. Réutilisé dans AddExpenseForm et
 * ExpenseDetailModal.
 */
interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export default function TagInput({
  tags,
  onChange,
  placeholder = "Ajouter un tag…",
}: Props) {
  const [draft, setDraft] = useState("");

  const commitDraft = () => {
    const clean = draft.trim().replace(/,$/, "");
    if (clean && !tags.includes(clean)) {
      onChange([...tags, clean]);
    }
    setDraft("");
  };

  const remove = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  return (
    <div className="flex flex-wrap items-center  gap-1.5 py-2  rounded-lg bg-none min-h-[42px]">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-full pl-2.5 pr-1.5 py-1 text-[0.78rem] font-medium"
        >
          {tag}
          <button
            type="button"
            onClick={() => remove(tag)}
            className="bg-transparent border-none cursor-pointer text-primary/70 hover:text-primary flex items-center justify-center p-0.5"
          >
            <X size={11} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => {
          const v = e.target.value;
          // Virgule = validation immédiate du tag (saisie rapide "loyer, urgent,")
          if (v.endsWith(",")) {
            setDraft(v);
            commitDraft();
          } else {
            setDraft(v);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitDraft();
          }
          if (e.key === "Backspace" && draft === "" && tags.length > 0) {
            remove(tags[tags.length - 1]);
          }
        }}
        onBlur={commitDraft}
        data-tag-input="true"
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-[0.85rem] text-text placeholder:text-text-muted"
      />
    </div>
  );
}
