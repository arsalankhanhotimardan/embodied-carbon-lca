"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

type WorkspaceEnvelope<T = unknown> = {
  schema: "green-engineering-tools-anonymous-workspace";
  schemaVersion: 1;
  toolId: string;
  toolLabel: string;
  toolVersion: string;
  name: string;
  savedAt: string;
  data: T;
};

type SavedWorkspaceRef = {
  id: string;
  name: string;
  savedAt: string;
  toolVersion: string;
};

type Props<T> = {
  toolId: string;
  toolLabel: string;
  toolVersion: string;
  snapshot: T;
  onRestore: (snapshot: T) => void;
  defaultSaveName?: string;
  privateBackup?: boolean;
  skipAutoRestoreWhenQuery?: boolean;
  className?: string;
};

const SCHEMA = "green-engineering-tools-anonymous-workspace" as const;
const SCHEMA_VERSION = 1 as const;
const INDEX_LIMIT = 20;
const LOCAL_ITEM_LIMIT_BYTES = 3_500_000;

const storageKeys = (toolId: string) => ({
  draft: `get:workspace:${toolId}:draft:v1`,
  index: `get:workspace:${toolId}:saved-index:v1`,
  itemPrefix: `get:workspace:${toolId}:saved:v1:`,
});

const safeJsonParse = <T,>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const safeLocalGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeLocalSet = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`Anonymous workspace could not write ${key}.`, error);
    return false;
  }
};

const safeLocalRemove = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // Browser storage is best-effort only.
  }
};

const fileSafe = (value: string): string =>
  value
    .trim()
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "project";

const randomId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const isEnvelopeForTool = <T,>(
  value: unknown,
  toolId: string
): value is WorkspaceEnvelope<T> => {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    row.schema === SCHEMA &&
    row.schemaVersion === SCHEMA_VERSION &&
    row.toolId === toolId &&
    typeof row.toolLabel === "string" &&
    typeof row.toolVersion === "string" &&
    typeof row.name === "string" &&
    typeof row.savedAt === "string" &&
    "data" in row
  );
};

export default function AnonymousWorkspacePanel<T>({
  toolId,
  toolLabel,
  toolVersion,
  snapshot,
  onRestore,
  defaultSaveName,
  privateBackup = false,
  skipAutoRestoreWhenQuery = true,
  className = "",
}: Props<T>) {
  const keys = useMemo(() => storageKeys(toolId), [toolId]);
  const restoreRef = useRef(onRestore);
  const suppressNextAutosaveRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftEnvelopeRef = useRef<WorkspaceEnvelope<T> | null>(null);

  const [hydrated, setHydrated] = useState(false);
  const [draftAvailable, setDraftAvailable] = useState(false);
  const [status, setStatus] = useState("");
  const [lastAutosaved, setLastAutosaved] = useState("");
  const [saveName, setSaveName] = useState(
    defaultSaveName?.trim() || `${toolLabel} project`
  );
  const [recent, setRecent] = useState<SavedWorkspaceRef[]>([]);

  restoreRef.current = onRestore;

  const serializedSnapshot = useMemo(() => {
    try {
      return JSON.stringify(snapshot);
    } catch (error) {
      console.warn("Anonymous workspace snapshot could not be serialized.", error);
      return "";
    }
  }, [snapshot]);

  const refreshRecent = () => {
    const parsed = safeJsonParse<SavedWorkspaceRef[]>(safeLocalGet(keys.index));
    if (!Array.isArray(parsed)) {
      setRecent([]);
      return;
    }

    setRecent(
      parsed
        .filter(
          (item) =>
            item &&
            typeof item.id === "string" &&
            typeof item.name === "string" &&
            typeof item.savedAt === "string"
        )
        .slice(0, INDEX_LIMIT)
    );
  };

  useEffect(() => {
    refreshRecent();

    const queryShouldWin =
      skipAutoRestoreWhenQuery && window.location.search.length > 1;

    const draft = safeJsonParse<WorkspaceEnvelope<T>>(
      safeLocalGet(keys.draft)
    );

    if (isEnvelopeForTool<T>(draft, toolId)) {
      draftEnvelopeRef.current = draft;
      setLastAutosaved(draft.savedAt);

      if (!queryShouldWin) {
        suppressNextAutosaveRef.current = true;
        restoreRef.current(draft.data);
        setStatus(`Autosaved draft restored from ${new Date(draft.savedAt).toLocaleString()}.`);
        setDraftAvailable(false);
        if (draft.name) setSaveName(draft.name);
      } else {
        setDraftAvailable(true);
        setStatus(
          "URL calculator context was kept. An autosaved browser draft is also available if you want to restore it."
        );
      }
    }

    setHydrated(true);
    // Tool ID identifies the storage namespace. We intentionally restore once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolId]);

  useEffect(() => {
    if (!hydrated || !serializedSnapshot) return;

    if (suppressNextAutosaveRef.current) {
      suppressNextAutosaveRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      const now = new Date().toISOString();
      const envelope: WorkspaceEnvelope<T> = {
        schema: SCHEMA,
        schemaVersion: SCHEMA_VERSION,
        toolId,
        toolLabel,
        toolVersion,
        name: saveName.trim() || `${toolLabel} draft`,
        savedAt: now,
        data: safeJsonParse<T>(serializedSnapshot) as T,
      };

      const serialized = JSON.stringify(envelope);
      if (serialized.length > LOCAL_ITEM_LIMIT_BYTES) {
        setStatus(
          "This workspace is too large for reliable browser autosave. Use Download backup; cloud/key-based LCA saving can still be used where available."
        );
        return;
      }

      if (safeLocalSet(keys.draft, serialized)) {
        setLastAutosaved(now);
      } else {
        setStatus(
          "Browser autosave is unavailable or full. Download a JSON backup before leaving this page."
        );
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [
    hydrated,
    keys.draft,
    saveName,
    serializedSnapshot,
    toolId,
    toolLabel,
    toolVersion,
  ]);

  const restoreAutosavedDraft = () => {
    const draft = draftEnvelopeRef.current;
    if (!draft || !isEnvelopeForTool<T>(draft, toolId)) {
      setStatus("No compatible autosaved draft is available.");
      return;
    }

    suppressNextAutosaveRef.current = true;
    restoreRef.current(draft.data);
    setSaveName(draft.name || `${toolLabel} project`);
    setLastAutosaved(draft.savedAt);
    setDraftAvailable(false);
    setStatus(`Autosaved draft restored from ${new Date(draft.savedAt).toLocaleString()}.`);
  };

  const makeEnvelope = (name: string): WorkspaceEnvelope<T> | null => {
    if (!serializedSnapshot) return null;
    const data = safeJsonParse<T>(serializedSnapshot);
    if (data === null) return null;

    return {
      schema: SCHEMA,
      schemaVersion: SCHEMA_VERSION,
      toolId,
      toolLabel,
      toolVersion,
      name: name.trim() || `${toolLabel} project`,
      savedAt: new Date().toISOString(),
      data,
    };
  };

  const saveLocalCopy = () => {
    const name = saveName.trim() || `${toolLabel} project`;
    const envelope = makeEnvelope(name);
    if (!envelope) {
      setStatus("This workspace could not be serialized.");
      return;
    }

    const serialized = JSON.stringify(envelope);
    if (serialized.length > LOCAL_ITEM_LIMIT_BYTES) {
      setStatus(
        "This project is too large for a reliable named browser copy. Use Download backup instead."
      );
      return;
    }

    const id = randomId();
    if (!safeLocalSet(`${keys.itemPrefix}${id}`, serialized)) {
      setStatus(
        "The browser could not save this local copy. Download a JSON backup instead."
      );
      return;
    }

    const next: SavedWorkspaceRef[] = [
      {
        id,
        name: envelope.name,
        savedAt: envelope.savedAt,
        toolVersion,
      },
      ...recent,
    ].slice(0, INDEX_LIMIT);

    if (!safeLocalSet(keys.index, JSON.stringify(next))) {
      safeLocalRemove(`${keys.itemPrefix}${id}`);
      setStatus("The browser could not update the recent-project index.");
      return;
    }

    setRecent(next);
    setStatus(`Saved a local anonymous copy: ${envelope.name}.`);
  };

  const loadLocalCopy = (ref: SavedWorkspaceRef) => {
    const envelope = safeJsonParse<WorkspaceEnvelope<T>>(
      safeLocalGet(`${keys.itemPrefix}${ref.id}`)
    );

    if (!isEnvelopeForTool<T>(envelope, toolId)) {
      setStatus("That local project copy is missing or incompatible.");
      return;
    }

    suppressNextAutosaveRef.current = true;
    restoreRef.current(envelope.data);
    safeLocalSet(keys.draft, JSON.stringify(envelope));
    setSaveName(envelope.name);
    setLastAutosaved(envelope.savedAt);
    setStatus(`Loaded ${envelope.name}.`);
  };

  const deleteLocalCopy = (ref: SavedWorkspaceRef) => {
    if (!window.confirm(`Delete the local browser copy “${ref.name}”?`)) return;

    safeLocalRemove(`${keys.itemPrefix}${ref.id}`);
    const next = recent.filter((item) => item.id !== ref.id);
    safeLocalSet(keys.index, JSON.stringify(next));
    setRecent(next);
    setStatus(`Deleted local copy: ${ref.name}.`);
  };

  const downloadBackup = () => {
    const envelope = makeEnvelope(saveName);
    if (!envelope) {
      setStatus("This workspace could not be serialized.");
      return;
    }

    const blob = new Blob([JSON.stringify(envelope, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${fileSafe(envelope.name)}-${fileSafe(toolId)}-backup.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setStatus("JSON backup downloaded.");
  };

  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > 25_000_000) {
      setStatus("Backup file is too large. Maximum supported import size is 25 MB.");
      return;
    }

    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      if (!isEnvelopeForTool<T>(parsed, toolId)) {
        setStatus(
          `This is not a compatible ${toolLabel} backup. Open the matching calculator and import it there.`
        );
        return;
      }

      suppressNextAutosaveRef.current = true;
      draftEnvelopeRef.current = parsed;
      setDraftAvailable(false);
      restoreRef.current(parsed.data);
      safeLocalSet(keys.draft, JSON.stringify(parsed));
      setSaveName(parsed.name || `${toolLabel} project`);
      setLastAutosaved(parsed.savedAt);
      setStatus(`Imported backup: ${parsed.name}.`);
    } catch (error) {
      console.error(error);
      setStatus("The selected file is not valid Green Engineering Tools workspace JSON.");
    }
  };

  return (
    <section
      className={`min-w-0 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 sm:p-4 ${className}`}
      aria-label={`${toolLabel} anonymous workspace`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={importBackup}
      />

      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-emerald-300 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-800">
              No signup required
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
              Browser autosave
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
              {toolVersion}
            </span>
          </div>
          <h2 className="mt-2 text-sm font-black text-slate-950 sm:text-base">
            Anonymous workspace
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600 sm:text-sm">
            Work without an account. Your unfinished work is autosaved in this browser. Download a JSON backup if you want to move the project to another device or protect against cleared browser storage.
          </p>
          {privateBackup && (
            <p className="mt-2 text-xs font-bold text-amber-800">
              LCA backups can include a private project access key. Treat the backup file like a password and do not publish it.
            </p>
          )}
          {lastAutosaved && (
            <p className="mt-2 text-[11px] text-slate-500">
              Last browser autosave: {new Date(lastAutosaved).toLocaleString()}
            </p>
          )}
        </div>

        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap lg:justify-end">
          <button
            type="button"
            onClick={downloadBackup}
            className="w-full rounded-lg bg-slate-950 px-3 py-2.5 text-xs font-black text-white sm:w-auto"
          >
            Download backup
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs font-black text-slate-800 sm:w-auto"
          >
            Import backup
          </button>
        </div>
      </div>

      <details className="mt-4 rounded-xl border border-emerald-200 bg-white/80">
        <summary className="cursor-pointer list-none px-3 py-3 text-sm font-black text-slate-800 sm:px-4">
          Recent anonymous projects ({recent.length})
        </summary>
        <div className="border-t border-emerald-100 p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={saveName}
              onChange={(event) => setSaveName(event.target.value.slice(0, 160))}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
              placeholder={`${toolLabel} project name`}
              aria-label={`${toolLabel} local project name`}
            />
            <button
              type="button"
              onClick={saveLocalCopy}
              className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-black text-white sm:w-auto"
            >
              Save local copy
            </button>
          </div>

          {recent.length ? (
            <div className="mt-4 space-y-2">
              {recent.map((item) => (
                <div
                  key={item.id}
                  className="flex min-w-0 flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-slate-900">
                      {item.name}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      {new Date(item.savedAt).toLocaleString()} · {item.toolVersion}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                    <button
                      type="button"
                      onClick={() => loadLocalCopy(item)}
                      className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white"
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteLocalCopy(item)}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-xs text-slate-500">
              No named local projects yet. Autosave still protects the current draft.
            </p>
          )}
        </div>
      </details>

      {draftAvailable && (
        <button
          type="button"
          onClick={restoreAutosavedDraft}
          className="mt-3 w-full rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-left text-xs font-black text-indigo-800 sm:w-auto"
        >
          Restore autosaved draft
        </button>
      )}

      {status && (
        <div className="mt-3 break-words rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-slate-700">
          {status}
        </div>
      )}
    </section>
  );
}
