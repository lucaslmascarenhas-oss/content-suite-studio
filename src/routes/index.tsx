import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

type Status = "rascunho" | "aprovado" | "copy_gerada";

type Post = {
  id: string;
  data: string;
  titulo: string;
  formato: string;
  status: Status;
};

type Copy = {
  id: string;
  postId: string;
  titulo: string;
  legenda: string;
  hashtags: string;
};

const CLIENTES = [
  { id: "villa-rosa", nome: "Villa Rosa Restaurante" },
  { id: "atelier-nord", nome: "Atelier Nord Joalheria" },
  { id: "casa-lume", nome: "Casa Lume Arquitetura" },
  { id: "belmonte", nome: "Belmonte Vinhos" },
];

const MESES = ["2026-05", "2026-06", "2026-07", "2026-08"];

const MOCK_POSTS: Record<string, Post[]> = {
  "villa-rosa|2026-07": [
    { id: "p1", data: "03/07", titulo: "Menu de inverno: risoto al tartufo", formato: "Carrossel", status: "copy_gerada" },
    { id: "p2", data: "08/07", titulo: "Bastidores da nossa adega", formato: "Reels", status: "aprovado" },
    { id: "p3", data: "12/07", titulo: "Harmonização — Barolo & queijos", formato: "Post único", status: "aprovado" },
    { id: "p4", data: "17/07", titulo: "A história do nosso chef", formato: "Carrossel", status: "rascunho" },
    { id: "p5", data: "22/07", titulo: "Sobremesa da semana: tiramisù", formato: "Reels", status: "rascunho" },
    { id: "p6", data: "27/07", titulo: "Reserva para o jantar de gala", formato: "Post único", status: "rascunho" },
  ],
  "atelier-nord|2026-07": [
    { id: "a1", data: "02/07", titulo: "Coleção Aurora — anéis solitário", formato: "Carrossel", status: "aprovado" },
    { id: "a2", data: "09/07", titulo: "Cravação à mão: o método", formato: "Reels", status: "rascunho" },
    { id: "a3", data: "16/07", titulo: "Ouro 18k reciclado", formato: "Post único", status: "rascunho" },
  ],
};

const MOCK_COPIES: Record<string, Copy[]> = {
  "villa-rosa|2026-07": [
    {
      id: "c1",
      postId: "p1",
      titulo: "Risoto al tartufo",
      legenda:
        "O inverno pede pratos que aquecem lentamente. Nosso risoto al tartufo é preparado com arroz carnaroli, manteiga italiana e lascas generosas de trufa negra fresca.",
      hashtags: "#villarosa #altaculinaria #tartufo #invernogastronomico",
    },
    {
      id: "c2",
      postId: "p2",
      titulo: "Nossa adega",
      legenda:
        "Mais de 400 rótulos, selecionados um a um. Um passeio silencioso pela adega da Villa Rosa — onde cada garrafa espera a noite certa.",
      hashtags: "#adega #vinhos #villarosa #bastidores",
    },
  ],
};

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { label: string; className: string }> = {
    rascunho: { label: "Rascunho", className: "bg-graphite text-cream" },
    aprovado: { label: "Aprovado", className: "bg-gold text-graphite" },
    copy_gerada: { label: "Copy gerada", className: "bg-bordeaux text-cream" },
  };
  const v = map[status];
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
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 bg-gold text-graphite px-6 py-3 uppercase tracking-[0.22em] text-sm border border-[color:var(--gold)] hover:bg-transparent hover:text-graphite transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ fontFamily: "var(--font-body)", fontWeight: 600 }}
    >
      {children}
    </button>
  );
}

function Sidebar() {
  return (
    <aside className="w-64 shrink-0 bg-graphite text-cream min-h-screen flex flex-col">
      {/* Reserva para logo */}
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
      </div>
    </aside>
  );
}

function Dashboard() {
  const [clienteId, setClienteId] = useState(CLIENTES[0].id);
  const [mes, setMes] = useState("2026-07");

  const key = `${clienteId}|${mes}`;
  const posts = MOCK_POSTS[key] ?? [];
  const copies = MOCK_COPIES[key] ?? [];
  const cliente = CLIENTES.find((c) => c.id === clienteId)!;

  const calendarioGerado = posts.length > 0;
  const todosAprovados = useMemo(
    () => calendarioGerado && posts.every((p) => p.status === "aprovado" || p.status === "copy_gerada"),
    [posts, calendarioGerado],
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 min-w-0">
        {/* Top bar */}
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
              quarta-feira, 15 de julho de 2026
            </p>
          </div>
        </div>

        <div className="px-10 py-10 max-w-[1400px]">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
            <div>
              <label
                className="block text-xs uppercase tracking-[0.28em] text-bordeaux mb-2"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Cliente
              </label>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="w-full bg-card border border-border px-4 py-3 text-lg text-foreground focus:outline-none focus:border-gold"
                style={{ fontFamily: "var(--font-body)" }}
              >
                {CLIENTES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
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
            <h2 className="mt-1 text-4xl text-foreground">{cliente.nome}</h2>
            <p className="mt-1 italic text-muted-foreground">Referência editorial — {mes}</p>
          </div>

          {/* Pipeline */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Etapa 1 */}
            <StageCard
              number="I"
              title="Calendário"
              subtitle="Pauta editorial gerada pelo agente de IA."
            >
              <div className="mb-6">
                <PrimaryButton>Gerar calendário</PrimaryButton>
              </div>

              {calendarioGerado ? (
                <ul className="divide-y divide-border">
                  {posts.map((p) => (
                    <li key={p.id} className="py-4 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p
                          className="text-xs uppercase tracking-[0.22em] text-bordeaux"
                          style={{ fontFamily: "var(--font-body)" }}
                        >
                          {p.data} · {p.formato}
                        </p>
                        <p className="mt-1 text-lg text-foreground leading-snug">{p.titulo}</p>
                      </div>
                      <StatusBadge status={p.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="italic text-muted-foreground">
                  Nenhum calendário gerado ainda para este período.
                </p>
              )}
            </StageCard>

            {/* Etapa 2 */}
            <StageCard
              number="II"
              title="Aprovação"
              subtitle="Revisão editorial antes da produção das peças."
            >
              <div className="mb-6">
                <PrimaryButton disabled={!calendarioGerado}>Aprovar calendário</PrimaryButton>
              </div>

              {calendarioGerado ? (
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
                    <span className="text-2xl text-gold">
                      {posts.filter((p) => p.status !== "rascunho").length}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span
                      className="text-xs uppercase tracking-[0.24em] text-muted-foreground"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      Em rascunho
                    </span>
                    <span className="text-2xl text-bordeaux">
                      {posts.filter((p) => p.status === "rascunho").length}
                    </span>
                  </div>

                  {!todosAprovados && (
                    <p className="italic text-muted-foreground mt-4 text-sm">
                      Aguardando aprovação de todas as peças em rascunho.
                    </p>
                  )}
                </div>
              ) : (
                <p className="italic text-muted-foreground">
                  Gere o calendário antes de prosseguir.
                </p>
              )}
            </StageCard>

            {/* Etapa 3 */}
            <StageCard
              number="III"
              title="Copy"
              subtitle="Textos finais escritos pelo agente."
            >
              <div className="mb-6">
                <PrimaryButton disabled={!calendarioGerado}>Gerar copy</PrimaryButton>
              </div>

              {copies.length > 0 ? (
                <ul className="space-y-6">
                  {copies.map((c) => (
                    <li key={c.id} className="border-l-2 border-gold pl-4">
                      <p
                        className="text-xs uppercase tracking-[0.22em] text-bordeaux"
                        style={{ fontFamily: "var(--font-body)" }}
                      >
                        Peça · {c.postId}
                      </p>
                      <h3 className="mt-1 text-xl text-foreground">{c.titulo}</h3>
                      <p className="mt-2 text-foreground/85 leading-relaxed italic">
                        “{c.legenda}”
                      </p>
                      <p
                        className="mt-3 text-xs tracking-wider text-muted-foreground"
                        style={{ fontFamily: "var(--font-body)" }}
                      >
                        {c.hashtags}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="italic text-muted-foreground">
                  Nenhuma copy gerada ainda.
                </p>
              )}
            </StageCard>
          </div>

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
