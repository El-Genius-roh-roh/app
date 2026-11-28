"use client";
import { useRef, useState } from "react";
import { FileUp, Upload } from "lucide-react";

/** Zone de glisser-déposer pour importer un ou plusieurs PDF avec aperçu avant envoi. */
export default function DropZone({ action, subjectId, categorie }: {
  action: (fd: FormData) => Promise<void>;
  subjectId: string;
  categorie: "cours" | "annale";
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(list: FileList | null) {
    if (!list) return;
    setFiles(Array.from(list).filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDrag(false);
    if (!e.dataTransfer.files.length) return;
    const dt = new DataTransfer();
    Array.from(e.dataTransfer.files).forEach((f) => dt.items.add(f));
    if (inputRef.current) inputRef.current.files = dt.files;
    pick(dt.files);
  }

  return (
    <form action={async (fd) => { setBusy(true); try { await action(fd); setFiles([]); } finally { setBusy(false); } }} className="space-y-2">
      <input type="hidden" name="subject" value={subjectId} />
      <input type="hidden" name="categorie" value={categorie} />
      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed p-4 text-center text-sm transition
          ${drag ? "border-accent-500 bg-accent-50" : "border-accent-200 hover:border-accent-400 hover:bg-accent-50/40"}`}>
        <FileUp className="h-6 w-6 text-accent-500" />
        <span className="font-semibold text-accent-700">
          {files.length > 0 ? `${files.length} PDF sélectionné${files.length > 1 ? "s" : ""}` : "Glisser des PDF ici ou cliquer"}
        </span>
        {files.length > 0 && (
          <span className="max-w-full truncate text-xs text-slate-500">{files.map((f) => f.name).join(", ")}</span>
        )}
        <input ref={inputRef} type="file" name="fichier" accept="application/pdf" multiple required className="sr-only"
          onChange={(e) => pick(e.target.files)} />
      </label>
      <button disabled={busy || files.length === 0} className="btn-ghost py-2">
        <Upload className="h-4 w-4" />
        {busy ? "Envoi en cours…" : "Importer"}
      </button>
    </form>
  );
}
