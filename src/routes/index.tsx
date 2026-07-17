import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { POLL_INTERVAL_MS, POLL_TIMEOUT_MS } from "@/config/webhooks";
import { useRowAutosave } from "@/hooks/useRowAutosave";

export const Route = createFileRoute("/")({
  component: DashboardGate,
  ssr: false,
});

function DashboardGate() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<unknown>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <p
          className="text-sm italic text-graphite/60"
          style={{ fontFamily: "var(--font-body)" }}
        >
          Carregando…
        </p>
      </div>
    );
  }

  if (!session) return <LoginScreen />;
  return <Dashboard />;
}

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <p
            className="text-xs uppercase tracking-[0.4em] text-bordeaux"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Painel Editorial
          </p>
          <h1 className="mt-3 text-4xl text-graphite">Acesso restrito</h1>
          <div className="mx-auto mt-6 h-px w-16 bg-gold" />
          <p
            className="mt-6 text-sm italic text-graphite/60"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Entre com suas credenciais para acessar a produção.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              className="block text-xs uppercase tracking-[0.28em] text-bordeaux mb-2"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-card border border-border px-4 py-3 text-lg text-foreground focus:outline-none focus:border-gold"
              style={{ fontFamily: "var(--font-body)" }}
            />
          </div>
          <div>
            <label
              className="block text-xs uppercase tracking-[0.28em] text-bordeaux mb-2"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Senha
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-card border border-border px-4 py-3 text-lg text-foreground focus:outline-none focus:border-gold"
              style={{ fontFamily: "var(--font-body)" }}
            />
          </div>

          {error && (
            <p
              className="text-sm text-bordeaux italic"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-graphite text-cream py-3 text-sm uppercase tracking-[0.32em] hover:bg-graphite/90 disabled:opacity-50"
            style={{ fontFamily: "var(--font-body)" }}
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p
          className="mt-10 text-center text-xs uppercase tracking-[0.4em] text-graphite/40"
          style={{ fontFamily: "var(--font-body)" }}
        >
          Acesso somente por convite
        </p>
      </div>
    </div>
  );
}

type StatusPost = "rascunho" | "aprovado" | "copy_gerada" | string;
type StatusExec = "iniciado" | "processando" | "concluido" | "erro" | string;
type Agente = "strategy" | "copywriter" | "design";

type Cliente = { id: string; nome_empresa: string };
type Post = {
  id: string;
  cliente_id: string;
  mes_referencia: string | null;
  status: StatusPost;
  copy_id: string | null;
  data_post: string | null;
  formato: string | null;
  pilar: string | null;
  tema: string | null;
  ideia: string | null;
  objetivo: string | null;
  cta: string | null;
};
type Peca = {
  id: string;
  calendario_id: string;
  gancho: string | null;
  legenda: string | null;
  hashtags: string | null;
  roteiro: string | null;
  link_imagem: string | null;
  prompt_imagem: string | null;
  imagem_base_link: string | null;
  versao: number;
};
type Execucao = {
  id: string;
  cliente_id: string;
  agente: string;
  status: StatusExec;
  erro_mensagem: string | null;
  registros_afetados: number | null;
  iniciado_em: string;
};

const MESES = (() => {
  const out: string[] = [];
  const now = new Date();
  for (let i = -3; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    out.push(`${y}-${m}`);
  }
  return out;
})();

function currentYm() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/* ---------------- Data hooks ---------------- */

function useClientes() {
  return useQuery({
    queryKey: ["clientes"],
    queryFn: async (): Promise<Cliente[]> => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome_empresa")
        .eq("status", "ativo")
        .order("nome_empresa", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Cliente[];
    },
  });
}

function usePosts(clienteId: string | null, mes: string) {
  return useQuery({
    queryKey: ["calendario_conteudo", clienteId, mes],
    enabled: !!clienteId && !!mes,
    queryFn: async (): Promise<Post[]> => {
      const { data, error } = await supabase
        .from("calendario_conteudo")
        .select(
          "id, cliente_id, mes_referencia, status, copy_id, data_post, formato, pilar, tema, ideia, objetivo, cta",
        )
        .eq("cliente_id", clienteId!)
        .eq("mes_referencia", mes)
        .order("data_post", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Post[];
    },
  });
}

function usePecas(calendarioIds: string[]) {
  return useQuery({
    queryKey: ["pecas_conteudo", [...calendarioIds].sort()],
    enabled: calendarioIds.length > 0,
    queryFn: async (): Promise<Peca[]> => {
      const { data, error } = await supabase
        .from("pecas_conteudo")
        .select(
          "id, calendario_id, gancho, legenda, hashtags, roteiro, link_imagem, prompt_imagem, imagem_base_link, versao",
        )
        .in("calendario_id", calendarioIds)
        .order("versao", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Peca[];
    },
  });
}

function useExecucaoEmAndamento(clienteId: string | null, agente: Agente) {
  return useQuery({
    queryKey: ["execucao_em_andamento", clienteId, agente],
    enabled: !!clienteId,
    refetchInterval: 5000,
    queryFn: async (): Promise<Execucao | null> => {
      const { data, error } = await supabase
        .from("execucoes")
        .select(
          "id, cliente_id, agente, status, erro_mensagem, registros_afetados, iniciado_em",
        )
        .eq("cliente_id", clienteId!)
        .eq("agente", agente)
        .in("status", ["iniciado", "processando"])
        .order("iniciado_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Execucao | null;
    },
  });
}

/* ---------------- Webhooks & polling ---------------- */

async function dispararAgente(
  agente: "strategy" | "copywriter" | "design",
  clienteId: string,
  mes: string,
): Promise<{ ok: true; execucao_id: string } | { ok: false; motivo: string; conflict?: boolean }> {
  const { data, error } = await supabase.functions.invoke("disparar-agente", {
    body: { agente, cliente_id: clienteId, mes },
  });
  if (error) return { ok: false, motivo: `Falha ao chamar a função: ${error.message}` };
  return data as { ok: true; execucao_id: string } | { ok: false; motivo: string; conflict?: boolean };
}

type PollState =
  | { kind: "idle" }
  | { kind: "running"; execId: string; startedAt: number; slow: boolean }
  | { kind: "error"; message: string }
  | { kind: "done" };

/* ---------------- UI atoms ---------------- */

function StatusBadge({ status }: { status: StatusPost }) {
  // Semântica:
  //   dourado  → qualquer estado aprovado
  //   bordô    → gerado, aguardando revisão
  //   grafite  → rascunho
  const map: Record<string, { label: string; className: string }> = {
    rascunho: { label: "Rascunho", className: "bg-graphite text-cream" },
    aprovado: { label: "Aprovado", className: "bg-gold text-graphite" },
    copy_gerada: { label: "Copy gerada", className: "bg-bordeaux text-cream" },
    copy_aprovada: { label: "Copy aprovada", className: "bg-gold text-graphite" },
    prompt_gerado: { label: "Design gerado", className: "bg-bordeaux text-cream" },
    prompt_aprovado: { label: "Design aprovado", className: "bg-gold text-graphite" },
  };
  const v = map[status] ?? { label: status, className: "bg-muted text-foreground" };
  return (
    <span
      className={`inline-flex items-center px-3 py-1 text-xs uppercase tracking-[0.18em] ${v.className}`}
      style={{ fontFamily: "var(--font-body)" }}
    >
      {v.label}
    </span>
  );
}

function GoldRule() {
  return <div className="gold-rule my-6" />;
}

function StageCard({
  number,
  title,
  subtitle,
  children,
}: {
  number: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card border border-border shadow-[0_1px_0_rgba(33,33,33,0.04)]">
      <header className="px-8 pt-8 pb-5">
        <div className="flex items-baseline gap-4">
          <span
            className="text-bordeaux text-sm tracking-[0.3em] uppercase"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Etapa {number}
          </span>
          <div className="h-px flex-1 bg-gold/60" />
        </div>
        <h2 className="mt-3 text-3xl text-foreground">{title}</h2>
        <p className="mt-1 italic text-muted-foreground">{subtitle}</p>
      </header>
      <div className="px-8 pb-8">{children}</div>
    </section>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  loading,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="inline-flex items-center gap-2 bg-gold text-graphite px-6 py-3 uppercase tracking-[0.22em] text-sm border border-[color:var(--gold)] hover:bg-transparent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ fontFamily: "var(--font-body)", fontWeight: 600 }}
    >
      {loading ? "Aguarde…" : children}
    </button>
  );
}

function GhostButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 px-5 py-2 uppercase tracking-[0.22em] text-xs border border-graphite text-graphite hover:bg-graphite hover:text-cream transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ fontFamily: "var(--font-body)", fontWeight: 600 }}
    >
      {children}
    </button>
  );
}

function Sidebar() {
  return (
    <aside className="w-64 shrink-0 bg-graphite text-cream min-h-screen flex flex-col">
      <div className="h-32 border-b border-cream/10 flex items-center justify-center px-6">
        <div className="w-full h-16 border border-dashed border-cream/25 flex items-center justify-center">
          <span
            className="text-cream/40 text-xs uppercase tracking-[0.3em]"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Logo
          </span>
        </div>
      </div>
      <nav className="flex-1 px-6 py-8 space-y-1">
        {[
          { label: "Painel", active: true },
          { label: "Clientes", active: false },
          { label: "Calendários", active: false },
          { label: "Biblioteca", active: false },
          { label: "Configurações", active: false },
        ].map((item) => (
          <a
            key={item.label}
            href="#"
            className={`block px-3 py-2 text-lg tracking-wide ${
              item.active
                ? "text-gold border-l-2 border-gold pl-4"
                : "text-cream/70 hover:text-cream"
            }`}
            style={{ fontFamily: "var(--font-body)" }}
          >
            {item.label}
          </a>
        ))}
      </nav>
      <div className="px-6 py-6 border-t border-cream/10">
        <p
          className="text-xs uppercase tracking-[0.28em] text-cream/40"
          style={{ fontFamily: "var(--font-body)" }}
        >
          Painel Interno
        </p>
        <p className="mt-1 text-sm text-cream/70 italic">Uso pessoal — v1</p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="mt-4 text-xs uppercase tracking-[0.28em] text-cream/50 hover:text-gold transition-colors"
          style={{ fontFamily: "var(--font-body)" }}
        >
          Sair
        </button>
      </div>
    </aside>
  );
}

/* ---------------- Pipeline stages ---------------- */

function usePoller(
  clienteId: string | null,
  agente: Agente,
  execId: string | null,
  onDone: () => void,
) {
  const [slow, setSlow] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    if (!execId || !clienteId) return;
    setSlow(false);
    setErrorMsg(null);
    setFinished(false);
    startedAtRef.current = Date.now();

    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      const { data, error } = await supabase
        .from("execucoes")
        .select("status, erro_mensagem")
        .eq("id", execId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setErrorMsg(error.message);
        return;
      }
      const s = (data?.status ?? "") as StatusExec;
      if (s === "concluido") {
        setFinished(true);
        onDone();
        return;
      }
      if (s === "erro") {
        setErrorMsg(data?.erro_mensagem ?? "Erro na execução.");
        return;
      }
      if (Date.now() - startedAtRef.current > POLL_TIMEOUT_MS) {
        setSlow(true);
      }
      setTimeout(tick, POLL_INTERVAL_MS);
    };
    const t = setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execId, clienteId, agente]);

  return { slow, errorMsg, finished, setErrorMsg };
}

function PostRow({
  post,
  clienteId,
  mes,
}: {
  post: Post;
  clienteId: string | null;
  mes: string;
}) {
  const qc = useQueryClient();
  const queryKey = useMemo(
    () => ["calendario_conteudo", clienteId, mes],
    [clienteId, mes],
  );

  const initial = useMemo(
    () => ({
      data_post: post.data_post ?? "",
      formato: post.formato ?? "",
      pilar: post.pilar ?? "",
      tema: post.tema ?? "",
      ideia: post.ideia ?? "",
      objetivo: post.objetivo ?? "",
      cta: post.cta ?? "",
    }),
    [
      post.data_post,
      post.formato,
      post.pilar,
      post.tema,
      post.ideia,
      post.objetivo,
      post.cta,
    ],
  );

  const { values, setField, flushNow, saveState, errorMsg, retry } =
    useRowAutosave("calendario_conteudo", post.id, initial, queryKey);

  const [aprovErr, setAprovErr] = useState<string | null>(null);
  const aprovar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("calendario_conteudo")
        .update({ status: "aprovado" })
        .eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setAprovErr(null);
      qc.invalidateQueries({ queryKey });
    },
    onError: (e: Error) => setAprovErr(e.message),
  });

  const jaAprovado = post.status !== "rascunho";

  const inputCls =
    "w-full bg-transparent border border-border px-3 py-2 text-base text-foreground focus:outline-none focus:border-gold";
  const labelCls =
    "block text-[10px] uppercase tracking-[0.28em] text-bordeaux mb-1";

  return (
    <div className="py-5 border-b border-border last:border-b-0">
      <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-3">
          <StatusBadge status={post.status} />
          <span
            className="text-xs italic text-muted-foreground"
            style={{ fontFamily: "var(--font-body)" }}
          >
            {saveState === "salvando" && "salvando…"}
            {saveState === "salvo" && "salvo"}
            {saveState === "erro" && (
              <>
                <span className="text-bordeaux mr-2">erro ao salvar</span>
                <button
                  type="button"
                  onClick={retry}
                  className="underline text-bordeaux"
                >
                  tentar de novo
                </button>
              </>
            )}
          </span>
        </div>
        <button
          type="button"
          onClick={() => aprovar.mutate()}
          disabled={jaAprovado || aprovar.isPending || !clienteId}
          className="inline-flex items-center gap-2 px-5 py-2 uppercase tracking-[0.22em] text-xs border border-[color:var(--gold)] bg-gold text-graphite hover:bg-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gold"
          style={{ fontFamily: "var(--font-body)", fontWeight: 600 }}
        >
          {jaAprovado ? "✓ Aprovado" : aprovar.isPending ? "Aprovando…" : "Aprovar"}
        </button>
      </div>

      {aprovErr && (
        <div className="mb-2 text-xs text-bordeaux italic">{aprovErr}</div>
      )}
      {saveState === "erro" && errorMsg && (
        <div className="mb-2 text-xs text-bordeaux italic">{errorMsg}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="md:col-span-2">
          <label className={labelCls} style={{ fontFamily: "var(--font-body)" }}>
            Data
          </label>
          <input
            type="date"
            value={values.data_post ?? ""}
            onChange={(e) => setField("data_post", e.target.value)}
            onBlur={flushNow}
            className={inputCls}
            style={{ fontFamily: "var(--font-body)" }}
          />
        </div>
        <div className="md:col-span-2">
          <label className={labelCls} style={{ fontFamily: "var(--font-body)" }}>
            Formato
          </label>
          <input
            value={values.formato ?? ""}
            onChange={(e) => setField("formato", e.target.value)}
            onBlur={flushNow}
            className={inputCls}
            style={{ fontFamily: "var(--font-body)" }}
          />
        </div>
        <div className="md:col-span-2">
          <label className={labelCls} style={{ fontFamily: "var(--font-body)" }}>
            Pilar
          </label>
          <input
            value={values.pilar ?? ""}
            onChange={(e) => setField("pilar", e.target.value)}
            onBlur={flushNow}
            className={inputCls}
            style={{ fontFamily: "var(--font-body)" }}
          />
        </div>
        <div className="md:col-span-3">
          <label className={labelCls} style={{ fontFamily: "var(--font-body)" }}>
            Tema
          </label>
          <input
            value={values.tema ?? ""}
            onChange={(e) => setField("tema", e.target.value)}
            onBlur={flushNow}
            className={inputCls}
            style={{ fontFamily: "var(--font-body)" }}
          />
        </div>
        <div className="md:col-span-3">
          <label className={labelCls} style={{ fontFamily: "var(--font-body)" }}>
            Objetivo
          </label>
          <input
            value={values.objetivo ?? ""}
            onChange={(e) => setField("objetivo", e.target.value)}
            onBlur={flushNow}
            className={inputCls}
            style={{ fontFamily: "var(--font-body)" }}
          />
        </div>
        <div className="md:col-span-6">
          <label className={labelCls} style={{ fontFamily: "var(--font-body)" }}>
            Ideia
          </label>
          <textarea
            value={values.ideia ?? ""}
            onChange={(e) => setField("ideia", e.target.value)}
            onBlur={flushNow}
            rows={2}
            className={inputCls}
            style={{ fontFamily: "var(--font-body)" }}
          />
        </div>
        <div className="md:col-span-6">
          <label className={labelCls} style={{ fontFamily: "var(--font-body)" }}>
            CTA
          </label>
          <input
            value={values.cta ?? ""}
            onChange={(e) => setField("cta", e.target.value)}
            onBlur={flushNow}
            className={inputCls}
            style={{ fontFamily: "var(--font-body)" }}
          />
        </div>
      </div>
    </div>
  );
}

function CalendarioCard({
  clienteId,
  mes,
  posts,
  loading,
}: {
  clienteId: string | null;
  mes: string;
  posts: Post[];
  loading: boolean;
}) {
  const qc = useQueryClient();
  const execEmAndamento = useExecucaoEmAndamento(clienteId, "strategy");
  const [execId, setExecId] = useState<string | null>(null);
  const [webhookErr, setWebhookErr] = useState<string | null>(null);
  const [bulkErr, setBulkErr] = useState<string | null>(null);

  const { slow, errorMsg, finished, setErrorMsg } = usePoller(
    clienteId,
    "strategy",
    execId,
    () => {
      qc.invalidateQueries({ queryKey: ["calendario_conteudo", clienteId, mes] });
      qc.invalidateQueries({ queryKey: ["execucao_em_andamento", clienteId, "strategy"] });
    },
  );

  const gerar = useMutation({
    mutationFn: async () => {
      if (!clienteId) throw new Error("Selecione um cliente.");
      const r = await dispararAgente("strategy", clienteId, mes);
      if (!r.ok) throw new Error(r.motivo);
      return r.execucao_id;
    },
    onSuccess: (id) => {
      setWebhookErr(null);
      setExecId(id);
      qc.invalidateQueries({ queryKey: ["execucao_em_andamento", clienteId, "strategy"] });
    },
    onError: (e: Error) => setWebhookErr(e.message),
  });

  const aprovarTodos = useMutation({
    mutationFn: async () => {
      if (!clienteId) throw new Error("Selecione um cliente.");
      const { error } = await supabase
        .from("calendario_conteudo")
        .update({ status: "aprovado" })
        .eq("cliente_id", clienteId)
        .eq("mes_referencia", mes)
        .eq("status", "rascunho");
      if (error) throw error;
    },
    onSuccess: () => {
      setBulkErr(null);
      qc.invalidateQueries({ queryKey: ["calendario_conteudo", clienteId, mes] });
    },
    onError: (e: Error) => setBulkErr(e.message),
  });

  const jaExisteCalendario = posts.length > 0;
  const rodando = !!execEmAndamento.data || (!!execId && !finished && !errorMsg);
  const disabledGerar = !clienteId || rodando || jaExisteCalendario;
  const rascunhos = posts.filter((p) => p.status === "rascunho").length;

  return (
    <StageCard
      number="I"
      title="Calendário"
      subtitle="Pauta editorial gerada pelo agente de IA — edite e aprove linha a linha."
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <PrimaryButton
          onClick={() => gerar.mutate()}
          disabled={disabledGerar}
          loading={gerar.isPending}
        >
          Gerar calendário
        </PrimaryButton>
        <GhostButton
          onClick={() => aprovarTodos.mutate()}
          disabled={!clienteId || rascunhos === 0 || aprovarTodos.isPending}
        >
          {aprovarTodos.isPending
            ? "Aprovando…"
            : `Aprovar todos os rascunhos${rascunhos > 0 ? ` (${rascunhos})` : ""}`}
        </GhostButton>
        {rodando && (
          <span className="italic text-muted-foreground text-sm">
            Gerando calendário…
          </span>
        )}
      </div>

      {webhookErr && (
        <div className="mb-4 p-3 bg-bordeaux text-cream text-sm">
          {webhookErr}
        </div>
      )}
      {bulkErr && (
        <div className="mb-4 p-3 bg-bordeaux text-cream text-sm">{bulkErr}</div>
      )}

      {errorMsg && (
        <div className="mb-4 p-3 border border-bordeaux text-bordeaux text-sm flex items-center justify-between gap-3">
          <span>Erro: {errorMsg}</span>
          <GhostButton
            onClick={() => {
              setErrorMsg(null);
              setExecId(null);
              gerar.mutate();
            }}
          >
            Tentar de novo
          </GhostButton>
        </div>
      )}

      {slow && !errorMsg && !finished && (
        <div className="mb-4 p-3 border border-gold text-graphite text-sm flex items-center justify-between gap-3">
          <span>Está demorando mais que o esperado.</span>
          <GhostButton
            onClick={() =>
              qc.invalidateQueries({
                queryKey: ["calendario_conteudo", clienteId, mes],
              })
            }
          >
            Atualizar
          </GhostButton>
        </div>
      )}

      {loading ? (
        <p className="italic text-muted-foreground">Carregando…</p>
      ) : posts.length === 0 ? (
        <p className="italic text-muted-foreground">
          Nenhum calendário gerado ainda para este período.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {posts.map((p) => (
            <PostRow key={p.id} post={p} clienteId={clienteId} mes={mes} />
          ))}
        </div>
      )}
    </StageCard>
  );
}

function PecaRow({
  post,
  peca,
  clienteId,
  mes,
  pecasQueryKey,
}: {
  post: Post;
  peca: Peca;
  clienteId: string | null;
  mes: string;
  pecasQueryKey: unknown[];
}) {
  const qc = useQueryClient();

  const initial = useMemo(
    () => ({
      gancho: peca.gancho ?? "",
      legenda: peca.legenda ?? "",
      roteiro: peca.roteiro ?? "",
      hashtags: peca.hashtags ?? "",
    }),
    [peca.gancho, peca.legenda, peca.roteiro, peca.hashtags],
  );

  const { values, setField, flushNow, saveState, errorMsg, retry } =
    useRowAutosave("pecas_conteudo", peca.id, initial, pecasQueryKey);

  const [aprovErr, setAprovErr] = useState<string | null>(null);
  const aprovar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("calendario_conteudo")
        .update({ status: "copy_aprovada" })
        .eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setAprovErr(null);
      qc.invalidateQueries({ queryKey: ["calendario_conteudo", clienteId, mes] });
    },
    onError: (e: Error) => setAprovErr(e.message),
  });

  const podeAprovar = post.status === "copy_gerada";
  const jaAprovada =
    post.status === "copy_aprovada" ||
    post.status === "prompt_gerado" ||
    post.status === "prompt_aprovado";

  const inputCls =
    "w-full bg-transparent border border-border px-3 py-2 text-base text-foreground focus:outline-none focus:border-gold";
  const labelCls =
    "block text-[10px] uppercase tracking-[0.28em] text-bordeaux mb-1";

  const dataFmt = post.data_post
    ? new Date(post.data_post).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      })
    : "s/ data";

  return (
    <div className="py-5 border-b border-border last:border-b-0">
      <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <StatusBadge status={post.status} />
          <span
            className="text-xs uppercase tracking-[0.22em] text-bordeaux"
            style={{ fontFamily: "var(--font-body)" }}
          >
            {dataFmt}
            {post.tema ? ` · ${post.tema}` : ""} · v{peca.versao}
          </span>
          <span
            className="text-xs italic text-muted-foreground"
            style={{ fontFamily: "var(--font-body)" }}
          >
            {saveState === "salvando" && "salvando…"}
            {saveState === "salvo" && "salvo"}
            {saveState === "erro" && (
              <>
                <span className="text-bordeaux mr-2">erro ao salvar</span>
                <button
                  type="button"
                  onClick={retry}
                  className="underline text-bordeaux"
                >
                  tentar de novo
                </button>
              </>
            )}
          </span>
        </div>
        <button
          type="button"
          onClick={() => aprovar.mutate()}
          disabled={!podeAprovar || aprovar.isPending || !clienteId}
          className="inline-flex items-center gap-2 px-5 py-2 uppercase tracking-[0.22em] text-xs border border-[color:var(--gold)] bg-gold text-graphite hover:bg-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gold"
          style={{ fontFamily: "var(--font-body)", fontWeight: 600 }}
        >
          {jaAprovada
            ? "✓ Aprovado"
            : aprovar.isPending
            ? "Aprovando…"
            : "Aprovar copy"}
        </button>
      </div>

      {aprovErr && (
        <div className="mb-2 text-xs text-bordeaux italic">{aprovErr}</div>
      )}
      {saveState === "erro" && errorMsg && (
        <div className="mb-2 text-xs text-bordeaux italic">{errorMsg}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="md:col-span-6">
          <label className={labelCls} style={{ fontFamily: "var(--font-body)" }}>
            Gancho
          </label>
          <input
            value={values.gancho ?? ""}
            onChange={(e) => setField("gancho", e.target.value)}
            onBlur={flushNow}
            className={inputCls}
            style={{ fontFamily: "var(--font-body)" }}
          />
        </div>
        <div className="md:col-span-6">
          <label className={labelCls} style={{ fontFamily: "var(--font-body)" }}>
            Legenda
          </label>
          <textarea
            value={values.legenda ?? ""}
            onChange={(e) => setField("legenda", e.target.value)}
            onBlur={flushNow}
            rows={4}
            className={inputCls}
            style={{ fontFamily: "var(--font-body)" }}
          />
        </div>
        <div className="md:col-span-6">
          <label className={labelCls} style={{ fontFamily: "var(--font-body)" }}>
            Roteiro
          </label>
          <textarea
            value={values.roteiro ?? ""}
            onChange={(e) => setField("roteiro", e.target.value)}
            onBlur={flushNow}
            rows={3}
            className={inputCls}
            style={{ fontFamily: "var(--font-body)" }}
          />
        </div>
        <div className="md:col-span-6">
          <label className={labelCls} style={{ fontFamily: "var(--font-body)" }}>
            Hashtags
          </label>
          <input
            value={values.hashtags ?? ""}
            onChange={(e) => setField("hashtags", e.target.value)}
            onBlur={flushNow}
            className={inputCls}
            style={{ fontFamily: "var(--font-body)" }}
          />
        </div>
      </div>
    </div>
  );
}

function CopyCard({
  clienteId,
  mes,
  posts,
}: {
  clienteId: string | null;
  mes: string;
  posts: Post[];
}) {
  const qc = useQueryClient();
  const execEmAndamento = useExecucaoEmAndamento(clienteId, "copywriter");
  const [execId, setExecId] = useState<string | null>(null);
  const [webhookErr, setWebhookErr] = useState<string | null>(null);
  const [bulkErr, setBulkErr] = useState<string | null>(null);

  const calendarioIds = useMemo(() => posts.map((p) => p.id), [posts]);
  const pecas = usePecas(calendarioIds);
  const pecasQueryKey = useMemo(
    () => ["pecas_conteudo", [...calendarioIds].sort()],
    [calendarioIds],
  );

  const aprovados = posts.filter((p) => p.status === "aprovado").length;

  const { slow, errorMsg, finished, setErrorMsg } = usePoller(
    clienteId,
    "copywriter",
    execId,
    () => {
      qc.invalidateQueries({ queryKey: ["calendario_conteudo", clienteId, mes] });
      qc.invalidateQueries({ queryKey: ["pecas_conteudo"] });
      qc.invalidateQueries({ queryKey: ["execucao_em_andamento", clienteId, "copywriter"] });
    },
  );

  const gerar = useMutation({
    mutationFn: async () => {
      if (!clienteId) throw new Error("Selecione um cliente.");
      const r = await dispararAgente("copywriter", clienteId, mes);
      if (!r.ok) throw new Error(r.motivo);
      return r.execucao_id;
    },
    onSuccess: (id) => {
      setWebhookErr(null);
      setExecId(id);
      qc.invalidateQueries({ queryKey: ["execucao_em_andamento", clienteId, "copywriter"] });
    },
    onError: (e: Error) => setWebhookErr(e.message),
  });

  const aprovarTodas = useMutation({
    mutationFn: async () => {
      if (!clienteId) throw new Error("Selecione um cliente.");
      const { error } = await supabase
        .from("calendario_conteudo")
        .update({ status: "copy_aprovada" })
        .eq("cliente_id", clienteId)
        .eq("mes_referencia", mes)
        .eq("status", "copy_gerada");
      if (error) throw error;
    },
    onSuccess: () => {
      setBulkErr(null);
      qc.invalidateQueries({ queryKey: ["calendario_conteudo", clienteId, mes] });
    },
    onError: (e: Error) => setBulkErr(e.message),
  });

  const rodando = !!execEmAndamento.data || (!!execId && !finished && !errorMsg);
  const disabled = !clienteId || rodando || aprovados === 0;

  const pecasPorPost = useMemo(() => {
    const map: Record<string, Peca[]> = {};
    for (const p of pecas.data ?? []) {
      (map[p.calendario_id] ||= []).push(p);
    }
    return map;
  }, [pecas.data]);

  const STATUS_COM_COPY = new Set([
    "copy_gerada",
    "copy_aprovada",
    "prompt_gerado",
    "prompt_aprovado",
  ]);
  const linhas = posts
    .filter((p) => STATUS_COM_COPY.has(p.status))
    .map((post) => {
      const listas = pecasPorPost[post.id];
      const peca = listas && listas.length > 0 ? listas[0] : null;
      return { post, peca };
    })
    .filter((row): row is { post: Post; peca: Peca } => !!row.peca);

  const pendentes = posts.filter((p) => p.status === "copy_gerada").length;

  return (
    <StageCard
      number="III"
      title="Copy"
      subtitle="Textos finais escritos pelo agente — edite e aprove linha a linha."
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <PrimaryButton
          onClick={() => gerar.mutate()}
          disabled={disabled}
          loading={gerar.isPending}
        >
          Gerar copy
        </PrimaryButton>
        <GhostButton
          onClick={() => aprovarTodas.mutate()}
          disabled={!clienteId || pendentes === 0 || aprovarTodas.isPending}
        >
          {aprovarTodas.isPending
            ? "Aprovando…"
            : `Aprovar todas as copies${pendentes > 0 ? ` (${pendentes})` : ""}`}
        </GhostButton>
        {rodando && (
          <span className="italic text-muted-foreground text-sm">
            Gerando copy…
          </span>
        )}
      </div>

      {webhookErr && (
        <div className="mb-4 p-3 bg-bordeaux text-cream text-sm">
          {webhookErr}
        </div>
      )}
      {bulkErr && (
        <div className="mb-4 p-3 bg-bordeaux text-cream text-sm">{bulkErr}</div>
      )}
      {errorMsg && (
        <div className="mb-4 p-3 border border-bordeaux text-bordeaux text-sm flex items-center justify-between gap-3">
          <span>Erro: {errorMsg}</span>
          <GhostButton
            onClick={() => {
              setErrorMsg(null);
              setExecId(null);
              gerar.mutate();
            }}
          >
            Tentar de novo
          </GhostButton>
        </div>
      )}
      {slow && !errorMsg && !finished && (
        <div className="mb-4 p-3 border border-gold text-graphite text-sm flex items-center justify-between gap-3">
          <span>Está demorando mais que o esperado.</span>
          <GhostButton
            onClick={() =>
              qc.invalidateQueries({ queryKey: ["pecas_conteudo"] })
            }
          >
            Atualizar
          </GhostButton>
        </div>
      )}

      {pecas.isLoading ? (
        <p className="italic text-muted-foreground">Carregando…</p>
      ) : linhas.length === 0 ? (
        <p className="italic text-muted-foreground">
          {aprovados === 0
            ? "Aprove o calendário antes de gerar as copies."
            : "Nenhuma copy gerada ainda."}
        </p>
      ) : (
        <div className="divide-y divide-border">
          {linhas.map(({ post, peca }) => (
            <PecaRow
              key={peca.id}
              post={post}
              peca={peca}
              clienteId={clienteId}
              mes={mes}
              pecasQueryKey={pecasQueryKey}
            />
          ))}
        </div>
      )}
    </StageCard>
  );
}

/* ---------------- Design ---------------- */

function DesignRow({
  post,
  peca,
  clienteId,
  mes,
  pecasQueryKey,
}: {
  post: Post;
  peca: Peca;
  clienteId: string | null;
  mes: string;
  pecasQueryKey: unknown[];
}) {
  const qc = useQueryClient();

  const initial = useMemo(
    () => ({
      prompt_imagem: peca.prompt_imagem ?? "",
      imagem_base_link: peca.imagem_base_link ?? "",
    }),
    [peca.prompt_imagem, peca.imagem_base_link],
  );

  const { values, setField, flushNow, saveState, errorMsg, retry } =
    useRowAutosave("pecas_conteudo", peca.id, initial, pecasQueryKey);

  const [aprovErr, setAprovErr] = useState<string | null>(null);
  const aprovar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("calendario_conteudo")
        .update({ status: "prompt_aprovado" })
        .eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setAprovErr(null);
      qc.invalidateQueries({ queryKey: ["calendario_conteudo", clienteId, mes] });
    },
    onError: (e: Error) => setAprovErr(e.message),
  });

  const podeAprovar = post.status === "prompt_gerado";
  const jaAprovada = post.status === "prompt_aprovado";

  const inputCls =
    "w-full bg-transparent border border-border px-3 py-2 text-base text-foreground focus:outline-none focus:border-gold";
  const labelCls =
    "block text-[10px] uppercase tracking-[0.28em] text-bordeaux mb-1";

  const dataFmt = post.data_post
    ? new Date(post.data_post).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      })
    : "s/ data";

  return (
    <div className="py-5 border-b border-border last:border-b-0">
      <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <StatusBadge status={post.status} />
          <span
            className="text-xs uppercase tracking-[0.22em] text-bordeaux"
            style={{ fontFamily: "var(--font-body)" }}
          >
            {dataFmt}
            {post.tema ? ` · ${post.tema}` : ""} · v{peca.versao}
          </span>
          <span
            className="text-xs italic text-muted-foreground"
            style={{ fontFamily: "var(--font-body)" }}
          >
            {saveState === "salvando" && "salvando…"}
            {saveState === "salvo" && "salvo"}
            {saveState === "erro" && (
              <>
                <span className="text-bordeaux mr-2">erro ao salvar</span>
                <button
                  type="button"
                  onClick={retry}
                  className="underline text-bordeaux"
                >
                  tentar de novo
                </button>
              </>
            )}
          </span>
        </div>
        <button
          type="button"
          onClick={() => aprovar.mutate()}
          disabled={!podeAprovar || aprovar.isPending || !clienteId}
          className="inline-flex items-center gap-2 px-5 py-2 uppercase tracking-[0.22em] text-xs border border-[color:var(--gold)] bg-gold text-graphite hover:bg-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gold"
          style={{ fontFamily: "var(--font-body)", fontWeight: 600 }}
        >
          {jaAprovada
            ? "✓ Aprovado"
            : aprovar.isPending
            ? "Aprovando…"
            : "Aprovar design"}
        </button>
      </div>

      {aprovErr && (
        <div className="mb-2 text-xs text-bordeaux italic">{aprovErr}</div>
      )}
      {saveState === "erro" && errorMsg && (
        <div className="mb-2 text-xs text-bordeaux italic">{errorMsg}</div>
      )}

      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className={labelCls} style={{ fontFamily: "var(--font-body)" }}>
            Prompt de imagem
          </label>
          <textarea
            value={values.prompt_imagem ?? ""}
            onChange={(e) => setField("prompt_imagem", e.target.value)}
            onBlur={flushNow}
            rows={6}
            className={inputCls}
            style={{ fontFamily: "var(--font-body)" }}
          />
        </div>
        <div>
          <label className={labelCls} style={{ fontFamily: "var(--font-body)" }}>
            Link da imagem base
          </label>
          <input
            value={values.imagem_base_link ?? ""}
            onChange={(e) => setField("imagem_base_link", e.target.value)}
            onBlur={flushNow}
            placeholder="https://…"
            className={inputCls}
            style={{ fontFamily: "var(--font-body)" }}
          />
        </div>
      </div>
    </div>
  );
}

function DesignCard({
  clienteId,
  mes,
  posts,
}: {
  clienteId: string | null;
  mes: string;
  posts: Post[];
}) {
  const qc = useQueryClient();
  const execEmAndamento = useExecucaoEmAndamento(clienteId, "design");
  const [execId, setExecId] = useState<string | null>(null);
  const [webhookErr, setWebhookErr] = useState<string | null>(null);
  const [bulkErr, setBulkErr] = useState<string | null>(null);

  const calendarioIds = useMemo(() => posts.map((p) => p.id), [posts]);
  const pecas = usePecas(calendarioIds);
  const pecasQueryKey = useMemo(
    () => ["pecas_conteudo", [...calendarioIds].sort()],
    [calendarioIds],
  );

  const copyAprovadas = posts.filter(
    (p) =>
      p.status === "copy_aprovada" ||
      p.status === "prompt_gerado" ||
      p.status === "prompt_aprovado",
  ).length;

  const { slow, errorMsg, finished, setErrorMsg } = usePoller(
    clienteId,
    "design",
    execId,
    () => {
      qc.invalidateQueries({ queryKey: ["calendario_conteudo", clienteId, mes] });
      qc.invalidateQueries({ queryKey: ["pecas_conteudo"] });
      qc.invalidateQueries({ queryKey: ["execucao_em_andamento", clienteId, "design"] });
    },
  );

  const gerar = useMutation({
    mutationFn: async () => {
      if (!clienteId) throw new Error("Selecione um cliente.");
      const r = await dispararAgente("design", clienteId, mes);
      if (!r.ok) throw new Error(r.motivo);
      return r.execucao_id;
    },
    onSuccess: (id) => {
      setWebhookErr(null);
      setExecId(id);
      qc.invalidateQueries({ queryKey: ["execucao_em_andamento", clienteId, "design"] });
    },
    onError: (e: Error) => setWebhookErr(e.message),
  });

  const aprovarTodos = useMutation({
    mutationFn: async () => {
      if (!clienteId) throw new Error("Selecione um cliente.");
      const { error } = await supabase
        .from("calendario_conteudo")
        .update({ status: "prompt_aprovado" })
        .eq("cliente_id", clienteId)
        .eq("mes_referencia", mes)
        .eq("status", "prompt_gerado");
      if (error) throw error;
    },
    onSuccess: () => {
      setBulkErr(null);
      qc.invalidateQueries({ queryKey: ["calendario_conteudo", clienteId, mes] });
    },
    onError: (e: Error) => setBulkErr(e.message),
  });

  const rodando = !!execEmAndamento.data || (!!execId && !finished && !errorMsg);
  const disabled = !clienteId || rodando || copyAprovadas === 0;

  const pecasPorPost = useMemo(() => {
    const map: Record<string, Peca[]> = {};
    for (const p of pecas.data ?? []) {
      (map[p.calendario_id] ||= []).push(p);
    }
    return map;
  }, [pecas.data]);

  const STATUS_COM_DESIGN = new Set(["prompt_gerado", "prompt_aprovado"]);
  const linhas = posts
    .filter((p) => STATUS_COM_DESIGN.has(p.status))
    .map((post) => {
      const listas = pecasPorPost[post.id];
      const peca = listas && listas.length > 0 ? listas[0] : null;
      return { post, peca };
    })
    .filter((row): row is { post: Post; peca: Peca } => !!row.peca);

  const pendentes = posts.filter((p) => p.status === "prompt_gerado").length;

  return (
    <StageCard number="IV" title="Design" subtitle="Prompts de imagem gerados pelo agente — edite e aprove linha a linha.">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <PrimaryButton
          onClick={() => gerar.mutate()}
          disabled={disabled}
          loading={gerar.isPending}
        >
          Gerar design
        </PrimaryButton>
        <GhostButton
          onClick={() => aprovarTodos.mutate()}
          disabled={!clienteId || pendentes === 0 || aprovarTodos.isPending}
        >
          {aprovarTodos.isPending
            ? "Aprovando…"
            : `Aprovar todos os designs${pendentes > 0 ? ` (${pendentes})` : ""}`}
        </GhostButton>
        {rodando && (
          <span className="italic text-muted-foreground text-sm">
            Gerando design…
          </span>
        )}
      </div>

      {webhookErr && (
        <div className="mb-4 p-3 bg-bordeaux text-cream text-sm">{webhookErr}</div>
      )}
      {bulkErr && (
        <div className="mb-4 p-3 bg-bordeaux text-cream text-sm">{bulkErr}</div>
      )}
      {errorMsg && (
        <div className="mb-4 p-3 border border-bordeaux text-bordeaux text-sm flex items-center justify-between gap-3">
          <span>Erro: {errorMsg}</span>
          <GhostButton
            onClick={() => {
              setErrorMsg(null);
              setExecId(null);
              gerar.mutate();
            }}
          >
            Tentar de novo
          </GhostButton>
        </div>
      )}
      {slow && !errorMsg && !finished && (
        <div className="mb-4 p-3 border border-gold text-graphite text-sm flex items-center justify-between gap-3">
          <span>Está demorando mais que o esperado.</span>
          <GhostButton
            onClick={() => qc.invalidateQueries({ queryKey: ["pecas_conteudo"] })}
          >
            Atualizar
          </GhostButton>
        </div>
      )}

      {pecas.isLoading ? (
        <p className="italic text-muted-foreground">Carregando…</p>
      ) : linhas.length === 0 ? (
        <p className="italic text-muted-foreground">
          {copyAprovadas === 0
            ? "Aprove as copies antes de gerar os designs."
            : "Nenhum design gerado ainda."}
        </p>
      ) : (
        <div className="divide-y divide-border">
          {linhas.map(({ post, peca }) => (
            <DesignRow
              key={peca.id}
              post={post}
              peca={peca}
              clienteId={clienteId}
              mes={mes}
              pecasQueryKey={pecasQueryKey}
            />
          ))}
        </div>
      )}
    </StageCard>
  );
}

/* ---------------- Tabs ---------------- */

type TabKey = "calendario" | "copy" | "design";

function TabsBar({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (k: TabKey) => void;
}) {
  const tabs: { key: TabKey; label: string }[] = [
    { key: "calendario", label: "Calendário" },
    { key: "copy", label: "Copy" },
    { key: "design", label: "Design" },
  ];
  return (
    <div className="border-b border-border mb-8 flex gap-8">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`relative pb-3 text-sm uppercase tracking-[0.28em] transition-colors ${
              isActive ? "text-graphite" : "text-muted-foreground hover:text-graphite"
            }`}
            style={{ fontFamily: "var(--font-body)", fontWeight: 600 }}
          >
            {t.label}
            {isActive && (
              <span
                className="absolute left-0 right-0 -bottom-px h-[2px]"
                style={{ background: "var(--gold)" }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Dashboard ---------------- */


function Dashboard() {
  const clientes = useClientes();
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [mes, setMes] = useState<string>(currentYm());
  const [activeTab, setActiveTab] = useState<TabKey>("calendario");

  // Auto-select first client
  useEffect(() => {
    if (!clienteId && clientes.data && clientes.data.length > 0) {
      setClienteId(clientes.data[0].id);
    }
  }, [clientes.data, clienteId]);

  const postsQ = usePosts(clienteId, mes);
  const posts = postsQ.data ?? [];
  const cliente = clientes.data?.find((c) => c.id === clienteId);

  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 min-w-0">
        <div className="bg-graphite text-cream">
          <div className="px-10 py-5 flex items-center justify-between">
            <div>
              <p
                className="text-xs uppercase tracking-[0.32em] text-gold"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Produção Editorial
              </p>
              <h1 className="mt-1 text-2xl text-cream">Pipeline de conteúdo</h1>
            </div>
            <p
              className="text-sm italic text-cream/60"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {hoje}
            </p>
          </div>
        </div>

        <div className="px-10 py-10 max-w-[1400px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
            <div>
              <label
                className="block text-xs uppercase tracking-[0.28em] text-bordeaux mb-2"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Cliente
              </label>
              <select
                value={clienteId ?? ""}
                onChange={(e) => setClienteId(e.target.value || null)}
                disabled={clientes.isLoading}
                className="w-full bg-card border border-border px-4 py-3 text-lg text-foreground focus:outline-none focus:border-gold"
                style={{ fontFamily: "var(--font-body)" }}
              >
                {clientes.isLoading && <option>Carregando…</option>}
                {!clientes.isLoading && (clientes.data?.length ?? 0) === 0 && (
                  <option>Nenhum cliente ativo</option>
                )}
                {clientes.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome_empresa}
                  </option>
                ))}
              </select>
              {clientes.error && (
                <p className="mt-2 text-xs text-bordeaux">
                  {(clientes.error as Error).message}
                </p>
              )}
            </div>
            <div>
              <label
                className="block text-xs uppercase tracking-[0.28em] text-bordeaux mb-2"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Mês (AAAA-MM)
              </label>
              <select
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="w-full bg-card border border-border px-4 py-3 text-lg text-foreground focus:outline-none focus:border-gold"
                style={{ fontFamily: "var(--font-body)" }}
              >
                {MESES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <GoldRule />

          <div className="mb-8">
            <p
              className="text-xs uppercase tracking-[0.32em] text-muted-foreground"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Cliente selecionado
            </p>
            <h2 className="mt-1 text-4xl text-foreground">
              {cliente?.nome_empresa ?? "—"}
            </h2>
            <p className="mt-1 italic text-muted-foreground">
              Referência editorial — {mes}
            </p>
          </div>

          <TabsBar active={activeTab} onChange={setActiveTab} />

          {activeTab === "calendario" && (
            <CalendarioCard
              clienteId={clienteId}
              mes={mes}
              posts={posts}
              loading={postsQ.isLoading}
            />
          )}

          {activeTab === "copy" && (
            <CopyCard clienteId={clienteId} mes={mes} posts={posts} />
          )}

          {activeTab === "design" && (
            <DesignCard clienteId={clienteId} mes={mes} posts={posts} />
          )}


          <GoldRule />

          <p
            className="text-center text-xs uppercase tracking-[0.4em] text-muted-foreground"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Painel Editorial · Uso Interno
          </p>
        </div>
      </main>
    </div>
  );
}
