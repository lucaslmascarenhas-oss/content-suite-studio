import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SaveState = "idle" | "salvando" | "salvo" | "erro";

/**
 * Reusable per-row autosave hook.
 *
 * - Mantém rascunho local em `values` (inputs controlados; digitação instantânea).
 * - `setField(key, value)` marca o campo como dirty e agenda flush com debounce 800ms.
 * - `flushNow()` força salvamento imediato (usar em onBlur).
 * - Em sucesso, faz patch do cache do React Query em `queryKey` no lugar
 *   (NÃO invalida a query), preservando o foco/edição.
 * - Em erro, mantém os campos como dirty para permitir retry.
 * - `values` só é reinicializado a partir de `initial` quando `rowId` muda
 *   OU quando a linha não está dirty (permite refetch externo sem sobrescrever edição).
 */
export function useRowAutosave<T extends Record<string, any>>(
  tabela: string,
  rowId: string,
  initial: T,
  queryKey: unknown[],
) {
  const [values, setValues] = useState<T>(initial);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const dirtyRef = useRef<Set<string>>(new Set());
  const valuesRef = useRef<T>(initial);
  const rowIdRef = useRef(rowId);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const qc = useQueryClient();

  // Track latest values for the flush closure.
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  // Ressincroniza a partir do servidor apenas quando muda o rowId
  // ou quando a linha não está dirty. Usamos assinatura JSON para não
  // reagir a nova referência de objeto a cada render.
  const initialSig = JSON.stringify(initial);
  useEffect(() => {
    if (rowIdRef.current !== rowId) {
      rowIdRef.current = rowId;
      dirtyRef.current.clear();
      setValues(initial);
      setSaveState("idle");
      setErrorMsg(null);
      return;
    }
    if (dirtyRef.current.size === 0) {
      setValues(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowId, initialSig]);

  const doFlush = useCallback(async () => {
    if (dirtyRef.current.size === 0) return;
    const keys = Array.from(dirtyRef.current);
    const patch: Record<string, any> = {};
    for (const k of keys) {
      const raw = (valuesRef.current as any)[k];
      // strings vazias → null (evita salvar "" onde antes havia null)
      patch[k] = raw === "" ? null : raw;
    }
    dirtyRef.current.clear();
    setSaveState("salvando");
    setErrorMsg(null);

    // tabela é dinâmica → escapamos os tipos gerados do Supabase aqui.
    const client = supabase as unknown as {
      from: (t: string) => {
        update: (v: Record<string, any>) => {
          eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
        };
      };
    };
    const { error } = await client.from(tabela).update(patch).eq("id", rowId);
    if (error) {
      // preserva edições e permite retry
      for (const k of keys) dirtyRef.current.add(k);
      setSaveState("erro");
      setErrorMsg(error.message);
      return;
    }

    // Patch no cache do React Query — sem invalidar, sem perder foco.
    qc.setQueryData(queryKey, (old: any) => {
      if (!Array.isArray(old)) return old;
      return old.map((r: any) => (r && r.id === rowId ? { ...r, ...patch } : r));
    });

    setSaveState("salvo");
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => {
      setSaveState((s) => (s === "salvo" ? "idle" : s));
    }, 2000);
  }, [qc, rowId, tabela, JSON.stringify(queryKey)]);

  const flushRef = useRef(doFlush);
  useEffect(() => {
    flushRef.current = doFlush;
  }, [doFlush]);

  const setField = useCallback((key: keyof T, value: any) => {
    setValues((v) => ({ ...v, [key]: value }));
    dirtyRef.current.add(key as string);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      flushRef.current();
    }, 800);
  }, []);

  const flushNow = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    flushRef.current();
  }, []);

  const retry = useCallback(() => {
    flushRef.current();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  return { values, setField, flushNow, saveState, errorMsg, retry };
}
