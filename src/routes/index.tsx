import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { POLL_INTERVAL_MS, POLL_TIMEOUT_MS } from "@/config/webhooks";
import { useRowAutosave } from "@/hooks/useRowAutosave";
import logoAsset from "@/assets/logo.png.asset.json";

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
        <p className="text-sm italic text-graphite/60" style={{ fontFamily: "var(--font-body)" }}>
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
          <p className="text-xs uppercase tracking-[0.4em] text-bordeaux" style={{ fontFamily: "var(--font-body)" }}>
            Painel Editorial
          </p>
          <h1 className="mt-3 text-4xl text-graphite">Acesso restrito</h1>
          <div className="mx-auto mt-6 h-px w-16 bg-gold" />
          <p className="mt-6 text-sm italic text-graphite/60" style={{ fontFamily: "var(--font-body)" }}>
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
            <p className="text-sm text-bordeaux italic" style={{ fontFamily: "var(--font-body)" }}>
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
        .select("id, cliente_id, agente, status, erro_mensagem, registros_afetados, iniciado_em")
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
          <span className="text-bordeaux text-sm tracking-[0.3em] uppercase" style={{ fontFamily: "var(--font-body)" }}>
            ETAPA {number}
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

type SecaoKey = "painel" | "clientes" | "estrategia" | "perfil" | "tokens" | "configuracoes";

const MENU_ITEMS: { key: SecaoKey; label: string }[] = [
  { key: "painel", label: "Painel" },
  { key: "clientes", label: "Clientes" },
  { key: "estrategia", label: "Estratégia" },
  { key: "perfil", label: "Perfil do Cliente" },
  { key: "tokens", label: "Tokens" },
  { key: "configuracoes", label: "Configurações" },
];

function Sidebar({ active, onChange }: { active: SecaoKey; onChange: (k: SecaoKey) => void }) {
  return (
    <aside className="w-64 shrink-0 bg-graphite text-cream min-h-screen flex flex-col">
      <div className="h-44 border-b border-cream/10 flex items-center justify-center px-6">
        <div className="w-32 h-32 overflow-hidden flex items-center justify-center">
          <img src={logoAsset.url} alt="Logo" className="w-full h-full object-cover" />
        </div>
      </div>
      <nav className="flex-1 px-6 py-8 space-y-1">
        {MENU_ITEMS.map((item) => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={`block w-full text-left px-3 py-2 text-lg tracking-wide transition-colors ${
                isActive ? "text-gold border-l-2 border-gold pl-4" : "text-cream/70 hover:text-cream"
              }`}
              style={{ fontFamily: "var(--font-body)" }}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="px-6 py-6 border-t border-cream/10">
        <p className="text-xs uppercase tracking-[0.28em] text-cream/40" style={{ fontFamily: "var(--font-body)" }}>
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

function PlaceholderSection({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div>
      <p
        className="text-xs uppercase tracking-[0.32em] text-muted-foreground"
        style={{ fontFamily: "var(--font-body)" }}
      >
        Seção
      </p>
      <h2 className="mt-1 text-4xl text-foreground">{titulo}</h2>
      <GoldRule />
      <p className="italic text-muted-foreground text-lg">{texto}</p>
    </div>
  );
}

type ClienteRow = {
  id: string;
  nome_empresa: string;
  status: string;
  nome_contato: string | null;
  responsavel: string | null;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  cidade: string | null;
  plano: string | null;
  valor_mensal: number | null;
  dia_vencimento: number | null;
  data_inicio: string | null;
  data_cancelamento: string | null;
  link_planilha: string | null;
  observacoes: string | null;
};

function useClientesCadastro() {
  return useQuery({
    queryKey: ["clientes_cadastro"],
    queryFn: async (): Promise<ClienteRow[]> => {
      const { data, error } = await supabase
        .from("clientes")
        .select(
          "id, nome_empresa, status, nome_contato, responsavel, whatsapp, email, instagram, cidade, plano, valor_mensal, dia_vencimento, data_inicio, data_cancelamento, link_planilha, observacoes",
        )
        .order("nome_empresa", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ClienteRow[];
    },
  });
}

function formatBRL(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ClientesSection() {
  const qc = useQueryClient();
  const { data: clientes = [], isLoading } = useClientesCadastro();
  const [filtro, setFiltro] = useState<"todos" | "ativo" | "inativo">("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClienteRow | null>(null);

  const lista = useMemo(() => {
    if (filtro === "todos") return clientes;
    return clientes.filter((c) => c.status === filtro);
  }, [clientes, filtro]);

  const toggleStatus = useMutation({
    mutationFn: async (c: ClienteRow) => {
      const novo = c.status === "ativo" ? "inativo" : "ativo";
      const { error } = await supabase.from("clientes").update({ status: novo }).eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clientes_cadastro"] });
      qc.invalidateQueries({ queryKey: ["clientes"] });
    },
  });

  function openNovo() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEditar(c: ClienteRow) {
    setEditing(c);
    setModalOpen(true);
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-6">
        <div>
          <p
            className="text-xs uppercase tracking-[0.32em] text-muted-foreground"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Seção
          </p>
          <h2 className="mt-1 text-4xl text-foreground">Clientes</h2>
        </div>
        <PrimaryButton onClick={openNovo}>Adicionar cliente</PrimaryButton>
      </div>
      <GoldRule />

      <div className="flex gap-2 mb-6" style={{ fontFamily: "var(--font-body)" }}>
        {(["todos", "ativo", "inativo"] as const).map((f) => {
          const active = filtro === f;
          const label = f === "todos" ? "Todos" : f === "ativo" ? "Ativos" : "Inativos";
          return (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-4 py-2 text-xs uppercase tracking-[0.22em] border transition-colors ${
                active
                  ? "bg-graphite text-cream border-graphite"
                  : "bg-transparent text-graphite border-border hover:border-gold"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <p className="italic text-muted-foreground">Carregando…</p>
      ) : lista.length === 0 ? (
        <p className="italic text-muted-foreground">Nenhum cliente encontrado.</p>
      ) : (
        <div className="border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm" style={{ fontFamily: "var(--font-body)" }}>
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.22em] text-bordeaux border-b border-border">
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3">Cidade</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Valor mensal</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 text-foreground">{c.nome_empresa}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.nome_contato ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.whatsapp ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.cidade ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.plano ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatBRL(c.valor_mensal)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-3 py-1 text-xs uppercase tracking-[0.18em] ${
                        c.status === "ativo" ? "bg-gold text-graphite" : "bg-graphite text-cream"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => openEditar(c)}
                      className="text-xs uppercase tracking-[0.22em] text-bordeaux hover:text-gold mr-4"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => toggleStatus.mutate(c)}
                      disabled={toggleStatus.isPending}
                      className="text-xs uppercase tracking-[0.22em] text-graphite hover:text-gold disabled:opacity-40"
                    >
                      {c.status === "ativo" ? "Inativar" : "Reativar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <ClienteFormModal
          cliente={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            qc.invalidateQueries({ queryKey: ["clientes_cadastro"] });
            qc.invalidateQueries({ queryKey: ["clientes"] });
          }}
        />
      )}
    </div>
  );
}

type ClienteFormState = {
  nome_empresa: string;
  status: string;
  nome_contato: string;
  responsavel: string;
  whatsapp: string;
  email: string;
  instagram: string;
  cidade: string;
  plano: string;
  valor_mensal: string;
  dia_vencimento: string;
  data_inicio: string;
  data_cancelamento: string;
  link_planilha: string;
  observacoes: string;
};

function toFormState(c: ClienteRow | null): ClienteFormState {
  return {
    nome_empresa: c?.nome_empresa ?? "",
    status: c?.status ?? "ativo",
    nome_contato: c?.nome_contato ?? "",
    responsavel: c?.responsavel ?? "",
    whatsapp: c?.whatsapp ?? "",
    email: c?.email ?? "",
    instagram: c?.instagram ?? "",
    cidade: c?.cidade ?? "",
    plano: c?.plano ?? "",
    valor_mensal: c?.valor_mensal != null ? String(c.valor_mensal) : "",
    dia_vencimento: c?.dia_vencimento != null ? String(c.dia_vencimento) : "",
    data_inicio: c?.data_inicio ?? "",
    data_cancelamento: c?.data_cancelamento ?? "",
    link_planilha: c?.link_planilha ?? "",
    observacoes: c?.observacoes ?? "",
  };
}

function ClienteFormModal({
  cliente,
  onClose,
  onSaved,
}: {
  cliente: ClienteRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ClienteFormState>(() => toFormState(cliente));
  const [nomeErr, setNomeErr] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function upd<K extends keyof ClienteFormState>(k: K, v: ClienteFormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSave() {
    setSaveErr(null);
    if (!form.nome_empresa.trim()) {
      setNomeErr("Informe o nome da empresa.");
      return;
    }
    setNomeErr(null);

    const textOrNull = (v: string) => (v.trim() === "" ? null : v.trim());
    const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));
    const intOrNull = (v: string) => (v.trim() === "" ? null : Math.trunc(Number(v)));
    const dateOrNull = (v: string) => (v.trim() === "" ? null : v);

    const payload = {
      nome_empresa: form.nome_empresa.trim(),
      status: form.status,
      nome_contato: textOrNull(form.nome_contato),
      responsavel: textOrNull(form.responsavel),
      whatsapp: textOrNull(form.whatsapp),
      email: textOrNull(form.email),
      instagram: textOrNull(form.instagram),
      cidade: textOrNull(form.cidade),
      plano: textOrNull(form.plano),
      valor_mensal: numOrNull(form.valor_mensal),
      dia_vencimento: intOrNull(form.dia_vencimento),
      data_inicio: dateOrNull(form.data_inicio),
      data_cancelamento: dateOrNull(form.data_cancelamento),
      link_planilha: textOrNull(form.link_planilha),
      observacoes: textOrNull(form.observacoes),
    };

    setSaving(true);
    try {
      if (cliente && cliente.id) {
        const { data, error } = await supabase.from("clientes").update(payload).eq("id", cliente.id).select();
        if (error) {
          console.error("[ClienteFormModal] Erro ao atualizar cliente:", error, {
            id: cliente.id,
            payload,
          });
          throw error;
        }
        if (!data || data.length === 0) {
          console.error("[ClienteFormModal] Update afetou 0 linhas:", {
            id: cliente.id,
            payload,
          });
          setSaveErr(
            "Nenhuma linha foi atualizada — verifique o id do cliente ou as permissões (RLS) da tabela clientes.",
          );
          setSaving(false);
          return;
        }
      } else {
        const { data, error } = await supabase.from("clientes").insert(payload).select();
        if (error) {
          console.error("[ClienteFormModal] Erro ao inserir cliente:", error, { payload });
          throw error;
        }
        if (!data || data.length === 0) {
          console.error("[ClienteFormModal] Insert não retornou linha:", { payload });
          setSaveErr("O cliente não foi criado — verifique as permissões (RLS) da tabela clientes.");
          setSaving(false);
          return;
        }
      }
      onSaved();
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-graphite/60 px-4 py-10"
      onClick={onClose}
    >
      <div className="w-full max-w-3xl bg-cream border border-border shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="px-8 pt-8 pb-5 border-b border-border">
          <p className="text-xs uppercase tracking-[0.32em] text-bordeaux" style={{ fontFamily: "var(--font-body)" }}>
            Cadastro
          </p>
          <h3 className="mt-2 text-3xl text-foreground">{cliente ? "Editar cliente" : "Novo cliente"}</h3>
          <div className="mt-4 h-px w-16 bg-gold" />
        </header>

        <div className="px-8 py-6 space-y-8" style={{ fontFamily: "var(--font-body)" }}>
          <FormGroup titulo="Dados principais">
            <Field label="Nome da empresa *" error={nomeErr}>
              <input
                type="text"
                value={form.nome_empresa}
                onChange={(e) => upd("nome_empresa", e.target.value)}
                className="form-input"
              />
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => upd("status", e.target.value)} className="form-input">
                <option value="ativo">ativo</option>
                <option value="inativo">inativo</option>
              </select>
            </Field>
            <Field label="Nome do contato">
              <input
                type="text"
                value={form.nome_contato}
                onChange={(e) => upd("nome_contato", e.target.value)}
                className="form-input"
              />
            </Field>
            <Field label="Responsável">
              <input
                type="text"
                value={form.responsavel}
                onChange={(e) => upd("responsavel", e.target.value)}
                className="form-input"
              />
            </Field>
          </FormGroup>

          <FormGroup titulo="Contato">
            <Field label="WhatsApp">
              <input
                type="text"
                value={form.whatsapp}
                onChange={(e) => upd("whatsapp", e.target.value)}
                className="form-input"
              />
            </Field>
            <Field label="Email">
              <input
                type="text"
                value={form.email}
                onChange={(e) => upd("email", e.target.value)}
                className="form-input"
              />
            </Field>
            <Field label="Instagram">
              <input
                type="text"
                value={form.instagram}
                onChange={(e) => upd("instagram", e.target.value)}
                className="form-input"
              />
            </Field>
            <Field label="Cidade">
              <input
                type="text"
                value={form.cidade}
                onChange={(e) => upd("cidade", e.target.value)}
                className="form-input"
              />
            </Field>
          </FormGroup>

          <FormGroup titulo="Contrato e financeiro">
            <Field label="Plano">
              <input
                type="text"
                value={form.plano}
                onChange={(e) => upd("plano", e.target.value)}
                className="form-input"
              />
            </Field>
            <Field label="Valor mensal (R$)">
              <input
                type="number"
                step="0.01"
                value={form.valor_mensal}
                onChange={(e) => upd("valor_mensal", e.target.value)}
                className="form-input"
              />
            </Field>
            <Field label="Dia de vencimento">
              <input
                type="number"
                min={1}
                max={31}
                value={form.dia_vencimento}
                onChange={(e) => upd("dia_vencimento", e.target.value)}
                className="form-input"
              />
            </Field>
            <Field label="Data de início">
              <input
                type="date"
                value={form.data_inicio}
                onChange={(e) => upd("data_inicio", e.target.value)}
                className="form-input"
              />
            </Field>
            <Field label="Data de cancelamento">
              <input
                type="date"
                value={form.data_cancelamento}
                onChange={(e) => upd("data_cancelamento", e.target.value)}
                className="form-input"
              />
            </Field>
          </FormGroup>

          <FormGroup titulo="Outros">
            <Field label="Link da planilha" full>
              <input
                type="text"
                value={form.link_planilha}
                onChange={(e) => upd("link_planilha", e.target.value)}
                className="form-input"
                placeholder="https://…"
              />
            </Field>
            <Field label="Observações" full>
              <textarea
                value={form.observacoes}
                onChange={(e) => upd("observacoes", e.target.value)}
                rows={4}
                className="form-input"
              />
            </Field>
          </FormGroup>

          {saveErr && <p className="text-sm text-bordeaux italic">{saveErr}</p>}
        </div>

        <footer className="px-8 py-5 border-t border-border flex items-center justify-end gap-4 bg-cream">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-3 text-xs uppercase tracking-[0.22em] text-graphite hover:text-bordeaux disabled:opacity-40"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Cancelar
          </button>
          <PrimaryButton onClick={handleSave} loading={saving}>
            Salvar
          </PrimaryButton>
        </footer>
      </div>

      <style>{`
        .form-input {
          width: 100%;
          background: var(--card, #fff);
          border: 1px solid var(--border, #e5e5e5);
          padding: 0.65rem 0.85rem;
          font-family: var(--font-body);
          font-size: 0.95rem;
          color: inherit;
        }
        .form-input:focus {
          outline: none;
          border-color: var(--gold, #D4AF37);
        }
      `}</style>
    </div>
  );
}

function FormGroup({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs uppercase tracking-[0.28em] text-bordeaux mb-4" style={{ fontFamily: "var(--font-body)" }}>
        {titulo}
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
  error,
  full,
}: {
  label: string;
  children: React.ReactNode;
  error?: string | null;
  full?: boolean;
}) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label
        className="block text-xs uppercase tracking-[0.22em] text-graphite/70 mb-2"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-xs text-bordeaux italic" style={{ fontFamily: "var(--font-body)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

type EstrategiaStatus = "rascunho" | "aprovado";

type EstrategiaFormState = {
  pilares: string[];
  cadencia: string;
  mix_formatos: string;
  status: EstrategiaStatus;
};

const ESTRATEGIA_VAZIA: EstrategiaFormState = {
  pilares: [""],
  cadencia: "",
  mix_formatos: "",
  status: "rascunho",
};

function EstrategiaSection() {
  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes_estrategia_ativos"],
    queryFn: async (): Promise<{ id: string; nome_empresa: string }[]> => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome_empresa")
        .eq("status", "ativo")
        .order("nome_empresa", { ascending: true });
      if (error) throw error;
      return (data ?? []) as { id: string; nome_empresa: string }[];
    },
  });

  const [clienteEstrategiaId, setClienteEstrategiaId] = useState<string>("");
  const [form, setForm] = useState<EstrategiaFormState>(ESTRATEGIA_VAZIA);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "ok" | "erro"; msg: string } | null>(null);

  const {
    data: estrategia,
    isLoading: estrategiaLoading,
    refetch: refetchEstrategia,
  } = useQuery({
    queryKey: ["estrategia_conteudo", clienteEstrategiaId],
    enabled: !!clienteEstrategiaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estrategia_conteudo")
        .select("*")
        .eq("cliente_id", clienteEstrategiaId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    setFeedback(null);
    if (!clienteEstrategiaId) {
      setForm(ESTRATEGIA_VAZIA);
      return;
    }
    if (estrategia) {
      const pilaresRaw = estrategia.pilares;
      const pilaresArr = Array.isArray(pilaresRaw)
        ? pilaresRaw.map((p) => (typeof p === "string" ? p : String(p ?? "")))
        : [];
      const statusVal = (estrategia.status as EstrategiaStatus) ?? "rascunho";
      setForm({
        pilares: pilaresArr.length > 0 ? pilaresArr : [""],
        cadencia: estrategia.cadencia ?? "",
        mix_formatos: estrategia.mix_formatos ?? "",
        status: (["rascunho", "aprovado"].includes(statusVal) ? statusVal : "rascunho") as EstrategiaStatus,
      });
    } else if (!estrategiaLoading) {
      setForm({ ...ESTRATEGIA_VAZIA, pilares: [""] });
    }
  }, [estrategia, estrategiaLoading, clienteEstrategiaId]);

  function updatePilar(idx: number, value: string) {
    setForm((f) => ({
      ...f,
      pilares: f.pilares.map((p, i) => (i === idx ? value : p)),
    }));
  }
  function removePilar(idx: number) {
    setForm((f) => ({
      ...f,
      pilares: f.pilares.filter((_, i) => i !== idx),
    }));
  }
  function addPilar() {
    setForm((f) => ({ ...f, pilares: [...f.pilares, ""] }));
  }

  async function handleSave() {
    if (!clienteEstrategiaId) return;
    setSaving(true);
    setFeedback(null);
    const pilaresLimpo = form.pilares.map((p) => p.trim()).filter((p) => p !== "");
    const emptyToNull = (v: string) => {
      const t = v.trim();
      return t === "" ? null : t;
    };
    const payload = {
      cliente_id: clienteEstrategiaId,
      pilares: pilaresLimpo,
      cadencia: emptyToNull(form.cadencia),
      mix_formatos: emptyToNull(form.mix_formatos),
      status: form.status,
    };
    const { error } = await supabase.from("estrategia_conteudo").upsert(payload, { onConflict: "cliente_id" }).select();
    setSaving(false);
    if (error) {
      console.error("[estrategia_conteudo upsert] erro:", error, "payload:", payload);
      setFeedback({ tipo: "erro", msg: error.message || "Erro ao salvar estratégia." });
      return;
    }
    setFeedback({ tipo: "ok", msg: "Estratégia salva." });
    await refetchEstrategia();
  }

  const clienteAtual = clientes.find((c) => c.id === clienteEstrategiaId);

  return (
    <div>
      <div>
        <p
          className="text-xs uppercase tracking-[0.32em] text-muted-foreground"
          style={{ fontFamily: "var(--font-body)" }}
        >
          Seção
        </p>
        <h2 className="mt-1 text-4xl text-foreground">Estratégia</h2>
      </div>
      <GoldRule />

      <div className="mb-8 max-w-md">
        <label
          className="block text-xs uppercase tracking-[0.22em] text-graphite/70 mb-2"
          style={{ fontFamily: "var(--font-body)" }}
        >
          Cliente
        </label>
        <select
          value={clienteEstrategiaId}
          onChange={(e) => setClienteEstrategiaId(e.target.value)}
          className="w-full bg-transparent border border-border px-3 py-2 text-foreground focus:outline-none focus:border-gold"
          style={{ fontFamily: "var(--font-body)" }}
        >
          <option value="">Selecione um cliente…</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome_empresa}
            </option>
          ))}
        </select>
      </div>

      {!clienteEstrategiaId && (
        <p className="italic text-graphite/70 text-lg" style={{ fontFamily: "var(--font-body)" }}>
          Selecione um cliente para ver ou editar a estratégia.
        </p>
      )}

      {clienteEstrategiaId && estrategiaLoading && (
        <p className="italic text-graphite/70" style={{ fontFamily: "var(--font-body)" }}>
          Carregando…
        </p>
      )}

      {clienteEstrategiaId && !estrategiaLoading && (
        <div className="space-y-10">
          {clienteAtual && (
            <p
              className="text-sm uppercase tracking-[0.22em] text-graphite/60"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {estrategia ? "Editando estratégia de" : "Nova estratégia para"} · {clienteAtual.nome_empresa}
            </p>
          )}

          <PerfilGrupo titulo="Pilares de conteúdo">
            <div className="md:col-span-2 space-y-3">
              {form.pilares.map((pilar, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input
                    type="text"
                    value={pilar}
                    onChange={(e) => updatePilar(idx, e.target.value)}
                    placeholder={`Pilar ${idx + 1}`}
                    className="flex-1 bg-transparent border border-border px-3 py-2 text-foreground focus:outline-none focus:border-gold"
                    style={{ fontFamily: "var(--font-body)" }}
                  />
                  <button
                    type="button"
                    onClick={() => removePilar(idx)}
                    className="w-9 h-9 flex items-center justify-center border border-border text-graphite/70 hover:border-bordeaux hover:text-bordeaux transition"
                    aria-label="Remover pilar"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addPilar}
                className="text-sm uppercase tracking-[0.22em] text-gold hover:text-gold/80 transition"
                style={{ fontFamily: "var(--font-body)" }}
              >
                + Adicionar pilar
              </button>
            </div>
          </PerfilGrupo>

          <PerfilGrupo titulo="Cadência e formatos">
            <PerfilCampo label="Cadência">
              <PerfilInput
                value={form.cadencia}
                onChange={(v) => setForm((f) => ({ ...f, cadencia: v }))}
                placeholder="12 posts por mês"
              />
            </PerfilCampo>
            <PerfilCampo label="Mix de formatos">
              <PerfilInput
                value={form.mix_formatos}
                onChange={(v) => setForm((f) => ({ ...f, mix_formatos: v }))}
                placeholder="feed, carrossel, stories"
              />
            </PerfilCampo>
          </PerfilGrupo>

          <PerfilGrupo titulo="Status">
            <PerfilCampo label="Status">
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as EstrategiaStatus }))}
                className="w-full bg-transparent border border-border px-3 py-2 text-foreground focus:outline-none focus:border-gold"
                style={{ fontFamily: "var(--font-body)" }}
              >
                <option value="rascunho">Rascunho</option>
                <option value="aprovado">Aprovado</option>
              </select>
            </PerfilCampo>
          </PerfilGrupo>

          <div className="flex items-center gap-4 pt-4">
            <PrimaryButton onClick={handleSave} loading={saving}>
              Salvar estratégia
            </PrimaryButton>
            {feedback && (
              <span
                className={`text-sm italic ${feedback.tipo === "ok" ? "text-graphite/70" : "text-bordeaux"}`}
                style={{ fontFamily: "var(--font-body)" }}
              >
                {feedback.msg}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type PerfilFormState = {
  segmento: string;
  publico_alvo: string;
  tom_de_voz: string;
  objetivo_principal: string;
  diferenciais: string;
  produtos_servicos: string;
  restricoes: string;
  paleta_cores: string;
  fontes: string;
};

const PERFIL_VAZIO: PerfilFormState = {
  segmento: "",
  publico_alvo: "",
  tom_de_voz: "",
  objetivo_principal: "",
  diferenciais: "",
  produtos_servicos: "",
  restricoes: "",
  paleta_cores: "",
  fontes: "",
};

function PerfilSection() {
  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes_perfil_ativos"],
    queryFn: async (): Promise<{ id: string; nome_empresa: string }[]> => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome_empresa")
        .eq("status", "ativo")
        .order("nome_empresa", { ascending: true });
      if (error) throw error;
      return (data ?? []) as { id: string; nome_empresa: string }[];
    },
  });
  const [clientePerfilId, setClientePerfilId] = useState<string>("");
  const [form, setForm] = useState<PerfilFormState>(PERFIL_VAZIO);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "ok" | "erro"; msg: string } | null>(null);

  const {
    data: perfil,
    isLoading: perfilLoading,
    refetch: refetchPerfil,
  } = useQuery({
    queryKey: ["perfil_marca", clientePerfilId],
    enabled: !!clientePerfilId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perfis_marca")
        .select("*")
        .eq("cliente_id", clientePerfilId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    setFeedback(null);
    if (!clientePerfilId) {
      setForm(PERFIL_VAZIO);
      return;
    }
    if (perfil) {
      setForm({
        segmento: perfil.segmento ?? "",
        publico_alvo: perfil.publico_alvo ?? "",
        tom_de_voz: perfil.tom_de_voz ?? "",
        objetivo_principal: perfil.objetivo_principal ?? "",
        diferenciais: perfil.diferenciais ?? "",
        produtos_servicos: perfil.produtos_servicos ?? "",
        restricoes: perfil.restricoes ?? "",
        paleta_cores: perfil.paleta_cores ?? "",
        fontes: perfil.fontes ?? "",
      });
    } else if (!perfilLoading) {
      setForm(PERFIL_VAZIO);
    }
  }, [perfil, perfilLoading, clientePerfilId]);

  function setField<K extends keyof PerfilFormState>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSave() {
    if (!clientePerfilId) return;
    setSaving(true);
    setFeedback(null);
    const emptyToNull = (v: string) => {
      const t = v.trim();
      return t === "" ? null : t;
    };
    const payload = {
      cliente_id: clientePerfilId,
      segmento: emptyToNull(form.segmento),
      publico_alvo: emptyToNull(form.publico_alvo),
      tom_de_voz: emptyToNull(form.tom_de_voz),
      objetivo_principal: emptyToNull(form.objetivo_principal),
      diferenciais: emptyToNull(form.diferenciais),
      produtos_servicos: emptyToNull(form.produtos_servicos),
      restricoes: emptyToNull(form.restricoes),
      paleta_cores: emptyToNull(form.paleta_cores),
      fontes: emptyToNull(form.fontes),
    };
    const { error } = await supabase.from("perfis_marca").upsert(payload, { onConflict: "cliente_id" }).select();
    setSaving(false);
    if (error) {
      console.error("[perfis_marca upsert] erro:", error, "payload:", payload);
      setFeedback({ tipo: "erro", msg: error.message || "Erro ao salvar perfil." });
      return;
    }
    setFeedback({ tipo: "ok", msg: "Perfil salvo." });
    await refetchPerfil();
  }

  const clienteAtual = clientes.find((c) => c.id === clientePerfilId);

  return (
    <div>
      <div>
        <p
          className="text-xs uppercase tracking-[0.32em] text-muted-foreground"
          style={{ fontFamily: "var(--font-body)" }}
        >
          Seção
        </p>
        <h2 className="mt-1 text-4xl text-foreground">Perfil do Cliente</h2>
      </div>
      <GoldRule />

      <div className="mb-8 max-w-md">
        <label
          className="block text-xs uppercase tracking-[0.22em] text-graphite/70 mb-2"
          style={{ fontFamily: "var(--font-body)" }}
        >
          Cliente
        </label>
        <select
          value={clientePerfilId}
          onChange={(e) => setClientePerfilId(e.target.value)}
          className="w-full bg-transparent border border-border px-3 py-2 text-foreground focus:outline-none focus:border-gold"
          style={{ fontFamily: "var(--font-body)" }}
        >
          <option value="">Selecione um cliente…</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome_empresa}
            </option>
          ))}
        </select>
      </div>

      {!clientePerfilId && (
        <p className="italic text-graphite/70 text-lg" style={{ fontFamily: "var(--font-body)" }}>
          Selecione um cliente para ver ou editar o perfil da marca.
        </p>
      )}

      {clientePerfilId && perfilLoading && (
        <p className="italic text-graphite/70" style={{ fontFamily: "var(--font-body)" }}>
          Carregando…
        </p>
      )}

      {clientePerfilId && !perfilLoading && (
        <div className="space-y-10">
          {clienteAtual && (
            <p
              className="text-sm uppercase tracking-[0.22em] text-graphite/60"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {perfil ? "Editando perfil de" : "Novo perfil para"} · {clienteAtual.nome_empresa}
            </p>
          )}

          <PerfilGrupo titulo="Identidade da marca">
            <PerfilCampo label="Segmento">
              <PerfilInput value={form.segmento} onChange={(v) => setField("segmento", v)} />
            </PerfilCampo>
            <PerfilCampo label="Público-alvo" full>
              <PerfilTextarea value={form.publico_alvo} onChange={(v) => setField("publico_alvo", v)} />
            </PerfilCampo>
            <PerfilCampo label="Tom de voz" full>
              <PerfilTextarea value={form.tom_de_voz} onChange={(v) => setField("tom_de_voz", v)} />
            </PerfilCampo>
          </PerfilGrupo>

          <PerfilGrupo titulo="Produto e objetivo">
            <PerfilCampo label="Objetivo principal" full>
              <PerfilTextarea value={form.objetivo_principal} onChange={(v) => setField("objetivo_principal", v)} />
            </PerfilCampo>
            <PerfilCampo label="Diferenciais" full>
              <PerfilTextarea value={form.diferenciais} onChange={(v) => setField("diferenciais", v)} />
            </PerfilCampo>
            <PerfilCampo label="Produtos e serviços" full>
              <PerfilTextarea value={form.produtos_servicos} onChange={(v) => setField("produtos_servicos", v)} />
            </PerfilCampo>
          </PerfilGrupo>

          <PerfilGrupo titulo="Restrições">
            <PerfilCampo label="Restrições" full>
              <PerfilTextarea value={form.restricoes} onChange={(v) => setField("restricoes", v)} />
            </PerfilCampo>
          </PerfilGrupo>

          <PerfilGrupo titulo="Visual">
            <PerfilCampo label="Paleta de cores">
              <PerfilInput
                value={form.paleta_cores}
                onChange={(v) => setField("paleta_cores", v)}
                placeholder="#D4AF37, #4A0E0E, #FFFFFF"
              />
            </PerfilCampo>
            <PerfilCampo label="Fontes">
              <PerfilInput
                value={form.fontes}
                onChange={(v) => setField("fontes", v)}
                placeholder="Playfair Display, Cormorant Garamond"
              />
            </PerfilCampo>
          </PerfilGrupo>

          <div className="flex items-center gap-4 pt-4">
            <PrimaryButton onClick={handleSave} loading={saving}>
              Salvar perfil
            </PrimaryButton>
            {feedback && (
              <span
                className={`text-sm italic ${feedback.tipo === "ok" ? "text-graphite/70" : "text-bordeaux"}`}
                style={{ fontFamily: "var(--font-body)" }}
              >
                {feedback.msg}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PerfilGrupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-2xl text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>
        {titulo}
      </h3>
      <div className="h-px bg-border mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{children}</div>
    </section>
  );
}

function PerfilCampo({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label
        className="block text-xs uppercase tracking-[0.22em] text-graphite/70 mb-2"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function PerfilInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-transparent border border-border px-3 py-2 text-foreground focus:outline-none focus:border-gold"
      style={{ fontFamily: "var(--font-body)" }}
    />
  );
}

function PerfilTextarea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      className="w-full bg-transparent border border-border px-3 py-2 text-foreground focus:outline-none focus:border-gold resize-y"
      style={{ fontFamily: "var(--font-body)" }}
    />
  );
}

function ConfiguracoesSection() {
  return <PlaceholderSection titulo="Configurações" texto="Em construção." />;
}

/* ---------------- Tokens Section ---------------- */

type UsoRow = {
  cliente_id: string | null;
  mes_referencia: string | null;
  tokens_total: number | null;
  custo_usd: number | null;
};

function useUsoTokens() {
  return useQuery({
    queryKey: ["uso_tokens_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("uso_tokens")
        .select("cliente_id, mes_referencia, tokens_total, custo_usd");
      if (error) throw error;
      return (data ?? []) as UsoRow[];
    },
  });
}

function useClientesMap() {
  return useQuery({
    queryKey: ["clientes_map_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("id, nome_empresa");
      if (error) throw error;
      const map = new Map<string, string>();
      (data ?? []).forEach((c: { id: string; nome_empresa: string }) => map.set(c.id, c.nome_empresa));
      return map;
    },
  });
}

const usdFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});
const intFmt = new Intl.NumberFormat("pt-BR");

function formatMesLabel(mes: string): string {
  // Expect YYYY-MM or YYYY-MM-DD
  const m = mes.match(/^(\d{4})-(\d{2})/);
  if (!m) return mes;
  const year = m[1];
  const month = parseInt(m[2], 10);
  const nomes = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return `${nomes[month - 1] ?? mes} de ${year}`;
}

function TokensSection() {
  const { data: rows, isLoading } = useUsoTokens();
  const { data: clientesMap } = useClientesMap();

  const mesesDisponiveis = useMemo(() => {
    if (!rows) return [];
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.mes_referencia) set.add(r.mes_referencia);
    });
    return Array.from(set).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  }, [rows]);

  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null);

  useEffect(() => {
    if (mesesDisponiveis.length > 0 && (!mesSelecionado || !mesesDisponiveis.includes(mesSelecionado))) {
      setMesSelecionado(mesesDisponiveis[0]);
    }
  }, [mesesDisponiveis, mesSelecionado]);

  const totalMes = useMemo(() => {
    if (!rows || !mesSelecionado) return { custo: 0, tokens: 0 };
    return rows
      .filter((r) => r.mes_referencia === mesSelecionado)
      .reduce(
        (acc, r) => ({
          custo: acc.custo + (r.custo_usd ?? 0),
          tokens: acc.tokens + (r.tokens_total ?? 0),
        }),
        { custo: 0, tokens: 0 },
      );
  }, [rows, mesSelecionado]);

  const porClienteMes = useMemo(() => {
    if (!rows || !mesSelecionado) return [];
    const map = new Map<string, { custo: number; tokens: number }>();
    rows
      .filter((r) => r.mes_referencia === mesSelecionado && r.cliente_id)
      .forEach((r) => {
        const key = r.cliente_id as string;
        const cur = map.get(key) ?? { custo: 0, tokens: 0 };
        cur.custo += r.custo_usd ?? 0;
        cur.tokens += r.tokens_total ?? 0;
        map.set(key, cur);
      });
    return Array.from(map.entries())
      .map(([cliente_id, v]) => ({ cliente_id, ...v }))
      .sort((a, b) => b.custo - a.custo);
  }, [rows, mesSelecionado]);

  const porClienteTotal = useMemo(() => {
    if (!rows) return [];
    const map = new Map<string, { custo: number; tokens: number }>();
    rows.forEach((r) => {
      if (!r.cliente_id) return;
      const cur = map.get(r.cliente_id) ?? { custo: 0, tokens: 0 };
      cur.custo += r.custo_usd ?? 0;
      cur.tokens += r.tokens_total ?? 0;
      map.set(r.cliente_id, cur);
    });
    return Array.from(map.entries())
      .map(([cliente_id, v]) => ({ cliente_id, ...v }))
      .sort((a, b) => b.custo - a.custo);
  }, [rows]);

  const nomeCliente = (id: string) => clientesMap?.get(id) ?? "—";

  return (
    <div>
      <p
        className="text-xs uppercase tracking-[0.32em] text-muted-foreground"
        style={{ fontFamily: "var(--font-body)" }}
      >
        Seção
      </p>
      <h2 className="mt-1 text-4xl text-foreground">Tokens</h2>
      <GoldRule />

      {isLoading ? (
        <p className="italic text-muted-foreground text-lg">Carregando…</p>
      ) : !rows || rows.length === 0 ? (
        <p className="italic text-muted-foreground text-lg">Nenhum registro de uso de tokens ainda.</p>
      ) : (
        <>
          {/* Seletor de mês */}
          <div className="flex items-center gap-4 mb-8">
            <label
              className="text-xs uppercase tracking-[0.28em] text-muted-foreground"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Mês de referência
            </label>
            <select
              value={mesSelecionado ?? ""}
              onChange={(e) => setMesSelecionado(e.target.value)}
              className="bg-transparent border border-border px-3 py-2 text-foreground focus:outline-none focus:border-gold"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {mesesDisponiveis.map((m) => (
                <option key={m} value={m}>
                  {formatMesLabel(m)}
                </option>
              ))}
            </select>
          </div>

          {/* Visão 1 */}
          {mesSelecionado && (
            <div className="border border-gold/40 bg-cream/50 p-8 mb-10">
              <p
                className="text-xs uppercase tracking-[0.32em] text-muted-foreground"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Gasto total em {formatMesLabel(mesSelecionado)}
              </p>
              <p
                className="mt-4 text-6xl text-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {usdFmt.format(totalMes.custo).replace("$", "US$ ")}
              </p>
              <p className="mt-3 text-lg italic text-muted-foreground">
                {intFmt.format(totalMes.tokens)} tokens
              </p>
            </div>
          )}

          {/* Visão 2 */}
          <div className="mb-10">
            <h3 className="text-2xl text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              Por cliente em {mesSelecionado ? formatMesLabel(mesSelecionado) : "—"}
            </h3>
            <GoldRule />
            {porClienteMes.length === 0 ? (
              <p className="italic text-muted-foreground">Nenhum gasto neste mês.</p>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gold/40">
                    <th
                      className="text-left py-3 text-xs uppercase tracking-[0.28em] text-muted-foreground font-normal"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      Cliente
                    </th>
                    <th
                      className="text-right py-3 text-xs uppercase tracking-[0.28em] text-muted-foreground font-normal"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      Tokens
                    </th>
                    <th
                      className="text-right py-3 text-xs uppercase tracking-[0.28em] text-muted-foreground font-normal"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      Custo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {porClienteMes.map((r) => (
                    <tr key={r.cliente_id} className="border-b border-border/40">
                      <td className="py-3 text-foreground">{nomeCliente(r.cliente_id)}</td>
                      <td className="py-3 text-right text-foreground">{intFmt.format(r.tokens)}</td>
                      <td className="py-3 text-right text-foreground">
                        {usdFmt.format(r.custo).replace("$", "US$ ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Visão 3 */}
          <div>
            <h3 className="text-2xl text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              Total por cliente (desde o início)
            </h3>
            <GoldRule />
            {porClienteTotal.length === 0 ? (
              <p className="italic text-muted-foreground">Sem registros.</p>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gold/40">
                    <th
                      className="text-left py-3 text-xs uppercase tracking-[0.28em] text-muted-foreground font-normal"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      Cliente
                    </th>
                    <th
                      className="text-right py-3 text-xs uppercase tracking-[0.28em] text-muted-foreground font-normal"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      Tokens totais
                    </th>
                    <th
                      className="text-right py-3 text-xs uppercase tracking-[0.28em] text-muted-foreground font-normal"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      Custo total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {porClienteTotal.map((r) => (
                    <tr key={r.cliente_id} className="border-b border-border/40">
                      <td className="py-3 text-foreground">{nomeCliente(r.cliente_id)}</td>
                      <td className="py-3 text-right text-foreground">{intFmt.format(r.tokens)}</td>
                      <td className="py-3 text-right text-foreground">
                        {usdFmt.format(r.custo).replace("$", "US$ ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- Pipeline stages ---------------- */

function usePoller(clienteId: string | null, agente: Agente, execId: string | null, onDone: () => void) {
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

function PostRow({ post, clienteId, mes }: { post: Post; clienteId: string | null; mes: string }) {
  const qc = useQueryClient();
  const queryKey = useMemo(() => ["calendario_conteudo", clienteId, mes], [clienteId, mes]);

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
    [post.data_post, post.formato, post.pilar, post.tema, post.ideia, post.objetivo, post.cta],
  );

  const { values, setField, flushNow, saveState, errorMsg, retry } = useRowAutosave(
    "calendario_conteudo",
    post.id,
    initial,
    queryKey,
  );

  const [aprovErr, setAprovErr] = useState<string | null>(null);
  const aprovar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("calendario_conteudo").update({ status: "aprovado" }).eq("id", post.id);
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
  const labelCls = "block text-[10px] uppercase tracking-[0.28em] text-bordeaux mb-1";

  return (
    <div className="py-5 border-b border-border last:border-b-0">
      <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-3">
          <StatusBadge status={post.status} />
          <span className="text-xs italic text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
            {saveState === "salvando" && "salvando…"}
            {saveState === "salvo" && "salvo"}
            {saveState === "erro" && (
              <>
                <span className="text-bordeaux mr-2">erro ao salvar</span>
                <button type="button" onClick={retry} className="underline text-bordeaux">
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

      {aprovErr && <div className="mb-2 text-xs text-bordeaux italic">{aprovErr}</div>}
      {saveState === "erro" && errorMsg && <div className="mb-2 text-xs text-bordeaux italic">{errorMsg}</div>}

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

  const { slow, errorMsg, finished, setErrorMsg } = usePoller(clienteId, "strategy", execId, () => {
    qc.invalidateQueries({ queryKey: ["calendario_conteudo", clienteId, mes] });
    qc.invalidateQueries({ queryKey: ["execucao_em_andamento", clienteId, "strategy"] });
  });

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
        <PrimaryButton onClick={() => gerar.mutate()} disabled={disabledGerar} loading={gerar.isPending}>
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
        {rodando && <span className="italic text-muted-foreground text-sm">Gerando calendário…</span>}
      </div>

      {webhookErr && <div className="mb-4 p-3 bg-bordeaux text-cream text-sm">{webhookErr}</div>}
      {bulkErr && <div className="mb-4 p-3 bg-bordeaux text-cream text-sm">{bulkErr}</div>}

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
        <p className="italic text-muted-foreground">Nenhum calendário gerado ainda para este período.</p>
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

  const { values, setField, flushNow, saveState, errorMsg, retry } = useRowAutosave(
    "pecas_conteudo",
    peca.id,
    initial,
    pecasQueryKey,
  );

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
    post.status === "copy_aprovada" || post.status === "prompt_gerado" || post.status === "prompt_aprovado";

  const inputCls =
    "w-full bg-transparent border border-border px-3 py-2 text-base text-foreground focus:outline-none focus:border-gold";
  const labelCls = "block text-[10px] uppercase tracking-[0.28em] text-bordeaux mb-1";

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
          <span className="text-xs italic text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
            {saveState === "salvando" && "salvando…"}
            {saveState === "salvo" && "salvo"}
            {saveState === "erro" && (
              <>
                <span className="text-bordeaux mr-2">erro ao salvar</span>
                <button type="button" onClick={retry} className="underline text-bordeaux">
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
          {jaAprovada ? "✓ Aprovado" : aprovar.isPending ? "Aprovando…" : "Aprovar copy"}
        </button>
      </div>

      {aprovErr && <div className="mb-2 text-xs text-bordeaux italic">{aprovErr}</div>}
      {saveState === "erro" && errorMsg && <div className="mb-2 text-xs text-bordeaux italic">{errorMsg}</div>}

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

function CopyCard({ clienteId, mes, posts }: { clienteId: string | null; mes: string; posts: Post[] }) {
  const qc = useQueryClient();
  const execEmAndamento = useExecucaoEmAndamento(clienteId, "copywriter");
  const [execId, setExecId] = useState<string | null>(null);
  const [webhookErr, setWebhookErr] = useState<string | null>(null);
  const [bulkErr, setBulkErr] = useState<string | null>(null);

  const calendarioIds = useMemo(() => posts.map((p) => p.id), [posts]);
  const pecas = usePecas(calendarioIds);
  const pecasQueryKey = useMemo(() => ["pecas_conteudo", [...calendarioIds].sort()], [calendarioIds]);

  const aprovados = posts.filter((p) => p.status === "aprovado").length;

  const { slow, errorMsg, finished, setErrorMsg } = usePoller(clienteId, "copywriter", execId, () => {
    qc.invalidateQueries({ queryKey: ["calendario_conteudo", clienteId, mes] });
    qc.invalidateQueries({ queryKey: ["pecas_conteudo"] });
    qc.invalidateQueries({ queryKey: ["execucao_em_andamento", clienteId, "copywriter"] });
  });

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

  const STATUS_COM_COPY = new Set(["copy_gerada", "copy_aprovada", "prompt_gerado", "prompt_aprovado"]);
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
    <StageCard number="II" title="Copy" subtitle="Textos finais escritos pelo agente — edite e aprove linha a linha.">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <PrimaryButton onClick={() => gerar.mutate()} disabled={disabled} loading={gerar.isPending}>
          Gerar copy
        </PrimaryButton>
        <GhostButton
          onClick={() => aprovarTodas.mutate()}
          disabled={!clienteId || pendentes === 0 || aprovarTodas.isPending}
        >
          {aprovarTodas.isPending ? "Aprovando…" : `Aprovar todas as copies${pendentes > 0 ? ` (${pendentes})` : ""}`}
        </GhostButton>
        {rodando && <span className="italic text-muted-foreground text-sm">Gerando copy…</span>}
      </div>

      {webhookErr && <div className="mb-4 p-3 bg-bordeaux text-cream text-sm">{webhookErr}</div>}
      {bulkErr && <div className="mb-4 p-3 bg-bordeaux text-cream text-sm">{bulkErr}</div>}
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
          <GhostButton onClick={() => qc.invalidateQueries({ queryKey: ["pecas_conteudo"] })}>Atualizar</GhostButton>
        </div>
      )}

      {pecas.isLoading ? (
        <p className="italic text-muted-foreground">Carregando…</p>
      ) : linhas.length === 0 ? (
        <p className="italic text-muted-foreground">
          {aprovados === 0 ? "Aprove o calendário antes de gerar as copies." : "Nenhuma copy gerada ainda."}
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

  const { values, setField, flushNow, saveState, errorMsg, retry } = useRowAutosave(
    "pecas_conteudo",
    peca.id,
    initial,
    pecasQueryKey,
  );

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
  const labelCls = "block text-[10px] uppercase tracking-[0.28em] text-bordeaux mb-1";

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
          <span className="text-xs italic text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
            {saveState === "salvando" && "salvando…"}
            {saveState === "salvo" && "salvo"}
            {saveState === "erro" && (
              <>
                <span className="text-bordeaux mr-2">erro ao salvar</span>
                <button type="button" onClick={retry} className="underline text-bordeaux">
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
          {jaAprovada ? "✓ Aprovado" : aprovar.isPending ? "Aprovando…" : "Aprovar design"}
        </button>
      </div>

      {aprovErr && <div className="mb-2 text-xs text-bordeaux italic">{aprovErr}</div>}
      {saveState === "erro" && errorMsg && <div className="mb-2 text-xs text-bordeaux italic">{errorMsg}</div>}

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

function DesignCard({ clienteId, mes, posts }: { clienteId: string | null; mes: string; posts: Post[] }) {
  const qc = useQueryClient();
  const execEmAndamento = useExecucaoEmAndamento(clienteId, "design");
  const [execId, setExecId] = useState<string | null>(null);
  const [webhookErr, setWebhookErr] = useState<string | null>(null);
  const [bulkErr, setBulkErr] = useState<string | null>(null);

  const calendarioIds = useMemo(() => posts.map((p) => p.id), [posts]);
  const pecas = usePecas(calendarioIds);
  const pecasQueryKey = useMemo(() => ["pecas_conteudo", [...calendarioIds].sort()], [calendarioIds]);

  const copyAprovadas = posts.filter(
    (p) => p.status === "copy_aprovada" || p.status === "prompt_gerado" || p.status === "prompt_aprovado",
  ).length;

  const { slow, errorMsg, finished, setErrorMsg } = usePoller(clienteId, "design", execId, () => {
    qc.invalidateQueries({ queryKey: ["calendario_conteudo", clienteId, mes] });
    qc.invalidateQueries({ queryKey: ["pecas_conteudo"] });
    qc.invalidateQueries({ queryKey: ["execucao_em_andamento", clienteId, "design"] });
  });

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
    <StageCard
      number="III"
      title="Design"
      subtitle="Prompts de imagem gerados pelo agente — edite e aprove linha a linha."
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <PrimaryButton onClick={() => gerar.mutate()} disabled={disabled} loading={gerar.isPending}>
          Gerar design
        </PrimaryButton>
        <GhostButton
          onClick={() => aprovarTodos.mutate()}
          disabled={!clienteId || pendentes === 0 || aprovarTodos.isPending}
        >
          {aprovarTodos.isPending ? "Aprovando…" : `Aprovar todos os designs${pendentes > 0 ? ` (${pendentes})` : ""}`}
        </GhostButton>
        {rodando && <span className="italic text-muted-foreground text-sm">Gerando design…</span>}
      </div>

      {webhookErr && <div className="mb-4 p-3 bg-bordeaux text-cream text-sm">{webhookErr}</div>}
      {bulkErr && <div className="mb-4 p-3 bg-bordeaux text-cream text-sm">{bulkErr}</div>}
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
          <GhostButton onClick={() => qc.invalidateQueries({ queryKey: ["pecas_conteudo"] })}>Atualizar</GhostButton>
        </div>
      )}

      {pecas.isLoading ? (
        <p className="italic text-muted-foreground">Carregando…</p>
      ) : linhas.length === 0 ? (
        <p className="italic text-muted-foreground">
          {copyAprovadas === 0 ? "Aprove as copies antes de gerar os designs." : "Nenhum design gerado ainda."}
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

function TabsBar({ active, onChange }: { active: TabKey; onChange: (k: TabKey) => void }) {
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
              <span className="absolute left-0 right-0 -bottom-px h-[2px]" style={{ background: "var(--gold)" }} />
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
  const [secaoAtiva, setSecaoAtiva] = useState<SecaoKey>("painel");

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
      <Sidebar active={secaoAtiva} onChange={setSecaoAtiva} />

      <main className="flex-1 min-w-0">
        <div className="bg-graphite text-cream">
          <div className="px-10 py-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-gold" style={{ fontFamily: "var(--font-body)" }}>
                Produção Editorial
              </p>
              <h1 className="mt-1 text-2xl text-cream">Pipeline de conteúdo</h1>
            </div>
            <p className="text-sm italic text-cream/60" style={{ fontFamily: "var(--font-body)" }}>
              {hoje}
            </p>
          </div>
        </div>

        <div className="px-10 py-10 max-w-[1400px]">
          {secaoAtiva === "painel" && (
            <>
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
                    {!clientes.isLoading && (clientes.data?.length ?? 0) === 0 && <option>Nenhum cliente ativo</option>}
                    {clientes.data?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome_empresa}
                      </option>
                    ))}
                  </select>
                  {clientes.error && <p className="mt-2 text-xs text-bordeaux">{(clientes.error as Error).message}</p>}
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
                <h2 className="mt-1 text-4xl text-foreground">{cliente?.nome_empresa ?? "—"}</h2>
                <p className="mt-1 italic text-muted-foreground">Referência editorial — {mes}</p>
              </div>

              <TabsBar active={activeTab} onChange={setActiveTab} />

              {activeTab === "calendario" && (
                <CalendarioCard clienteId={clienteId} mes={mes} posts={posts} loading={postsQ.isLoading} />
              )}

              {activeTab === "copy" && <CopyCard clienteId={clienteId} mes={mes} posts={posts} />}

              {activeTab === "design" && <DesignCard clienteId={clienteId} mes={mes} posts={posts} />}
            </>
          )}

          {secaoAtiva === "clientes" && <ClientesSection />}
          {secaoAtiva === "estrategia" && <EstrategiaSection />}
          {secaoAtiva === "perfil" && <PerfilSection />}
          {secaoAtiva === "configuracoes" && <ConfiguracoesSection />}

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
