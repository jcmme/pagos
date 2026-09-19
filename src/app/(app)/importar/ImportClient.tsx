"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, Trash2, ChevronRight, AlertCircle } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Field, Select } from "@/components/ui/Input";
import { formatDate } from "@/lib/utils";
import { IMPORT_STATUS_LABELS } from "@/lib/constants";
import { deleteImport } from "@/modules/statements/actions";
import { ICON } from "@/lib/icons";

type ImportRow = {
  id: string;
  fileName: string;
  mimeType: string;
  parser: string;
  status: keyof typeof IMPORT_STATUS_LABELS;
  error: string | null;
  createdAt: string;
  account: { name: string } | null;
  _count: { rows: number };
};

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "accent"> = {
  UPLOADED: "neutral",
  EXTRACTING: "accent",
  READY: "accent",
  PARTIAL: "warning",
  FAILED: "danger",
  COMPLETED: "success",
};

export function ImportClient({
  imports,
  accounts,
  pendingByImport,
  pdfEnabled,
}: {
  imports: ImportRow[];
  accounts: { id: string; name: string }[];
  pendingByImport: Record<string, number>;
  pdfEnabled: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [accountId, setAccountId] = useState("none");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);

    const body = new FormData();
    body.append("file", file);
    body.append("accountId", accountId);

    try {
      const response = await fetch("/api/statements/upload", { method: "POST", body });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "No se pudo procesar el archivo.");
        // Si ya existía, el servidor devuelve a qué importación corresponde.
        if (payload.importId && response.status === 409) {
          router.push(`/importar/${payload.importId}`);
        }
        return;
      }

      router.push(`/importar/${payload.importId}`);
    } catch {
      setError("No se pudo subir el archivo. Revisa tu conexión e inténtalo otra vez.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-[26px] font-semibold">Importar estados de cuenta</h1>

      <Card className="mb-5">
        <CardTitle>Subir archivo</CardTitle>

        <p className="mt-1 text-[13px] text-(--foreground-muted)">
          {pdfEnabled
            ? "Sube el PDF o el CSV que te da tu banco. Los movimientos quedan en una bandeja para que los revises antes de que entren a tus cuentas."
            : "Sube el CSV que te da tu banco. Para leer PDFs falta configurar GEMINI_API_KEY."}
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <Field>
            ¿De qué cuenta es?
            <Select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
              <option value="none">Sin cuenta</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </Field>

          <input
            ref={fileRef}
            type="file"
            accept={pdfEnabled ? ".pdf,.csv,text/csv,application/pdf" : ".csv,text/csv"}
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleUpload(file);
            }}
            className="text-[13px] text-(--foreground-muted) file:mr-3 file:rounded-(--radius-full) file:border-0 file:bg-(--surface-3) file:px-4 file:py-2 file:text-[13px] file:text-(--foreground)"
          />

          {uploading && (
            <p className="text-[13px] text-(--accent)">
              Leyendo el archivo… esto puede tardar hasta un minuto con PDFs.
            </p>
          )}

          {error && (
            <p className="flex items-start gap-2 text-[13px] text-(--danger)">
              <AlertCircle size={ICON.sm} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}
        </div>
      </Card>

      <div className="flex flex-col gap-2">
        {imports.map((item) => {
          const pending = pendingByImport[item.id] ?? 0;
          return (
            <Card key={item.id} className="flex items-center justify-between p-4">
              <Link href={`/importar/${item.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <FileText size={ICON.md} className="shrink-0 text-(--foreground-subtle)" />
                <div className="min-w-0">
                  <p className="truncate text-[14px]">{item.fileName}</p>
                  <p className="text-[12px] text-(--foreground-subtle)">
                    {formatDate(item.createdAt)} · {item._count.rows} movimientos
                    {item.account ? ` · ${item.account.name}` : ""}
                  </p>
                  {item.error && (
                    <p className="mt-1 text-[12px] text-(--danger)">{item.error}</p>
                  )}
                </div>
              </Link>

              <div className="flex shrink-0 items-center gap-2">
                {pending > 0 && <Badge tone="warning">{pending} por revisar</Badge>}
                <Badge tone={STATUS_TONE[item.status] ?? "neutral"}>
                  {IMPORT_STATUS_LABELS[item.status]}
                </Badge>
                <button
                  onClick={() => deleteImport(item.id)}
                  className="rounded-full p-1.5 text-(--foreground-subtle) hover:bg-(--surface-2) hover:text-(--danger)"
                  aria-label="Eliminar importación"
                >
                  <Trash2 size={ICON.sm} />
                </button>
                <ChevronRight size={ICON.md} className="text-(--foreground-subtle)" />
              </div>
            </Card>
          );
        })}

        {imports.length === 0 && (
          <p className="text-[14px] text-(--foreground-muted)">
            Todavía no has importado ningún estado de cuenta.
          </p>
        )}
      </div>
    </div>
  );
}
