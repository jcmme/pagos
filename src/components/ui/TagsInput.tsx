"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/Input";

// Etiquetas libres: se escriben y se confirman con Enter o coma. Van al form
// como un único campo separado por comas.
export function TagsInput({
  name = "tags",
  defaultTags = [],
  suggestions = [],
}: {
  name?: string;
  defaultTags?: string[];
  suggestions?: string[];
}) {
  const [tags, setTags] = useState<string[]>(defaultTags);
  const [draft, setDraft] = useState("");

  function addTag(value: string) {
    const clean = value.trim().replace(/^#/, "");
    if (!clean || tags.includes(clean)) return;
    setTags([...tags, clean]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={tags.join(",")} />

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-(--radius-full) bg-(--surface-3) px-2.5 py-1 text-[12px]"
            >
              #{tag}
              <button
                type="button"
                onClick={() => setTags(tags.filter((item) => item !== tag))}
                className="text-(--foreground-subtle) hover:text-(--danger)"
                aria-label={`Quitar ${tag}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            // Enter dentro del campo no debe enviar el formulario completo.
            event.preventDefault();
            addTag(draft);
          }
          if (event.key === "Backspace" && !draft && tags.length > 0) {
            setTags(tags.slice(0, -1));
          }
        }}
        onBlur={() => addTag(draft)}
        placeholder="viaje, trabajo…"
      />

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions
            .filter((tag) => !tags.includes(tag))
            .slice(0, 8)
            .map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => addTag(tag)}
                className="rounded-(--radius-full) border border-(--border) px-2.5 py-1 text-[12px] text-(--foreground-muted) hover:text-(--foreground)"
              >
                #{tag}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
