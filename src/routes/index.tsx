import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { POLL_INTERVAL_MS, POLL_TIMEOUT_MS } from "@/config/webhooks";

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
          "id, calendario_id, gancho, legenda, hashtags, roteiro, link_imagem, versao",
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
  const map: Record<string, { label: string; className: string }> = {
    rascunho: { label: "Rascunho", className: "bg-graphite text-cream" },
    aprovado: { label: "Aprovado", className: "bg-gold text-graphite" },
    copy_gerada: { label: "Copy gerada", className: "bg-bordeaux text-cream" },
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

  const jaExisteCalendario = posts.length > 0;
  const rodando = !!execEmAndamento.data || (!!execId && !finished && !errorMsg);
  const disabled = !clienteId || rodando || jaExisteCalendario;

  return (
    <StageCard
      number="I"
      title="Calendário"
      subtitle="Pauta editorial gerada pelo agente de IA."
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <PrimaryButton
          onClick={() => gerar.mutate()}
          disabled={disabled}
          loading={gerar.isPending}
        >
          Gerar calendário
        </PrimaryButton>
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
        <ul className="divide-y divide-border">
          {posts.map((p) => (
            <li key={p.id} className="py-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p
                  className="text-xs uppercase tracking-[0.22em] text-bordeaux"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {p.data_post
                    ? new Date(p.data_post).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                      })
                    : "s/ data"}
                  {p.formato ? ` · ${p.formato}` : ""}
                  {p.pilar ? ` · ${p.pilar}` : ""}
                </p>
                <p className="mt-1 text-lg text-foreground leading-snug">
                  {p.tema ?? p.ideia ?? "(sem tema)"}
                </p>
                {p.objetivo && (
                  <p className="mt-1 text-sm italic text-muted-foreground">
                    Objetivo: {p.objetivo}
                  </p>
                )}
                {p.cta && (
                  <p className="mt-1 text-sm italic text-muted-foreground">
                    CTA: {p.cta}
                  </p>
                )}
              </div>
              <StatusBadge status={p.status} />
            </li>
          ))}
        </ul>
      )}
    </StageCard>
  );
}

function AprovacaoCard({
  clienteId,
  mes,
  posts,
}: {
  clienteId: string | null;
  mes: string;
  posts: Post[];
}) {
  const qc = useQueryClient();
  const [err, setErr] = useState<string | null>(null);

  const rascunhos = posts.filter((p) => p.status === "rascunho").length;
  const aprovados = posts.filter((p) => p.status !== "rascunho").length;

  const aprovar = useMutation({
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
      setErr(null);
      qc.invalidateQueries({ queryKey: ["calendario_conteudo", clienteId, mes] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  const disabled = !clienteId || rascunhos === 0;

  return (
    <StageCard
      number="II"
      title="Aprovação"
      subtitle="Revisão editorial antes da produção das peças."
    >
      <div className="mb-6">
        <PrimaryButton
          onClick={() => aprovar.mutate()}
          disabled={disabled}
          loading={aprovar.isPending}
        >
          Aprovar calendário
        </PrimaryButton>
      </div>

      {err && (
        <div className="mb-4 p-3 bg-bordeaux text-cream text-sm">{err}</div>
      )}

      {posts.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-baseline justify-between border-b border-border pb-3">
            <span
              className="text-xs uppercase tracking-[0.24em] text-muted-foreground"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Total de peças
            </span>
            <span className="text-2xl text-foreground">{posts.length}</span>
          </div>
          <div className="flex items-baseline justify-between border-b border-border pb-3">
            <span
              className="text-xs uppercase tracking-[0.24em] text-muted-foreground"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Aprovadas
            </span>
            <span className="text-2xl text-gold">{aprovados}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span
              className="text-xs uppercase tracking-[0.24em] text-muted-foreground"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Em rascunho
            </span>
            <span className="text-2xl text-bordeaux">{rascunhos}</span>
          </div>
          {rascunhos > 0 && (
            <p className="italic text-muted-foreground mt-4 text-sm">
              A aprovação move todas as peças em rascunho deste cliente/mês para
              "aprovado".
            </p>
          )}
        </div>
      ) : (
        <p className="italic text-muted-foreground">
          Gere o calendário antes de prosseguir.
        </p>
      )}
    </StageCard>
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

  const calendarioIds = useMemo(() => posts.map((p) => p.id), [posts]);
  const pecas = usePecas(calendarioIds);

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

  const rodando = !!execEmAndamento.data || (!!execId && !finished && !errorMsg);
  const disabled = !clienteId || rodando || aprovados === 0;

  const pecasPorPost = useMemo(() => {
    const map: Record<string, Peca[]> = {};
    for (const p of pecas.data ?? []) {
      (map[p.calendario_id] ||= []).push(p);
    }
    return map;
  }, [pecas.data]);

  return (
    <StageCard
      number="III"
      title="Copy"
      subtitle="Textos finais escritos pelo agente."
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <PrimaryButton
          onClick={() => gerar.mutate()}
          disabled={disabled}
          loading={gerar.isPending}
        >
          Gerar copy
        </PrimaryButton>
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

      {(pecas.data ?? []).length === 0 ? (
        <p className="italic text-muted-foreground">
          {aprovados === 0
            ? "Aprove o calendário antes de gerar as copies."
            : "Nenhuma copy gerada ainda."}
        </p>
      ) : (
        <ul className="space-y-6">
          {posts.map((post) => {
            const listas = pecasPorPost[post.id];
            if (!listas || listas.length === 0) return null;
            const peca = listas[0];
            return (
              <li key={post.id} className="border-l-2 border-gold pl-4">
                <p
                  className="text-xs uppercase tracking-[0.22em] text-bordeaux"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {post.data_post
                    ? new Date(post.data_post).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                      })
                    : "s/ data"}
                  {post.formato ? ` · ${post.formato}` : ""} · v{peca.versao}
                </p>
                <h3 className="mt-1 text-xl text-foreground">
                  {peca.gancho ?? post.tema ?? "(sem gancho)"}
                </h3>
                {peca.legenda && (
                  <p className="mt-2 text-foreground/85 leading-relaxed italic whitespace-pre-line">
                    “{peca.legenda}”
                  </p>
                )}
                {peca.roteiro && (
                  <p className="mt-2 text-sm text-foreground/70 whitespace-pre-line">
                    <span
                      className="uppercase tracking-[0.22em] text-xs text-muted-foreground"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      Roteiro:{" "}
                    </span>
                    {peca.roteiro}
                  </p>
                )}
                {peca.hashtags && (
                  <p
                    className="mt-3 text-xs tracking-wider text-muted-foreground"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    {peca.hashtags}
                  </p>
                )}
                {peca.link_imagem && (
                  <a
                    href={peca.link_imagem}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs uppercase tracking-[0.22em] text-gold hover:underline"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    Ver imagem →
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </StageCard>
  );
}

/* ---------------- Design (shell) ---------------- */

function DesignCard({
  clienteId,
  mes,
}: {
  clienteId: string | null;
  mes: string;
}) {
  const qc = useQueryClient();
  const execEmAndamento = useExecucaoEmAndamento(clienteId, "design");
  const [execId, setExecId] = useState<string | null>(null);
  const [webhookErr, setWebhookErr] = useState<string | null>(null);

  const { slow, errorMsg, finished, setErrorMsg } = usePoller(
    clienteId,
    "design",
    execId,
    () => {
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

  const rodando = !!execEmAndamento.data || (!!execId && !finished && !errorMsg);
  const disabled = !clienteId || rodando;

  return (
    <StageCard number="IV" title="Design" subtitle="Peças visuais geradas pelo agente.">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <PrimaryButton
          onClick={() => gerar.mutate()}
          disabled={disabled}
          loading={gerar.isPending}
        >
          Gerar design
        </PrimaryButton>
        {rodando && (
          <span className="italic text-muted-foreground text-sm">
            Gerando design…
          </span>
        )}
      </div>

      {webhookErr && (
        <div className="mb-4 p-3 bg-bordeaux text-cream text-sm">{webhookErr}</div>
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
        <div className="mb-4 p-3 border border-gold text-graphite text-sm">
          <span>Está demorando mais que o esperado.</span>
        </div>
      )}

      <p className="italic text-muted-foreground">
        A pré-visualização e a tabela de aprovação do design serão adicionadas na
        próxima etapa.
      </p>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CalendarioCard
                clienteId={clienteId}
                mes={mes}
                posts={posts}
                loading={postsQ.isLoading}
              />
              <AprovacaoCard clienteId={clienteId} mes={mes} posts={posts} />
            </div>
          )}

          {activeTab === "copy" && (
            <CopyCard clienteId={clienteId} mes={mes} posts={posts} />
          )}

          {activeTab === "design" && (
            <DesignCard clienteId={clienteId} mes={mes} />
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
