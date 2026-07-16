import { createClient } from "jsr:@supabase/supabase-js@2";

const N8N_URLS: Record<string, string> = {
  strategy: "https://n8n.luvidpro.com.br/webhook/strategy-gerar-calendario",
  copywriter: "https://n8n.luvidpro.com.br/webhook/copywriter-gerar",
  design: "https://n8n.luvidpro.com.br/webhook/gerar-design",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Exige usuário LOGADO (não apenas a chave anon)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ ok: false, motivo: "Não autenticado." }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) return json({ ok: false, motivo: "Sessão inválida." }, 401);

    const { agente, cliente_id, mes } = await req.json();
    const url = N8N_URLS[agente];
    if (!url) return json({ ok: false, motivo: `Agente desconhecido: ${agente}` }, 400);
    if (!cliente_id || !mes) return json({ ok: false, motivo: "cliente_id e mes são obrigatórios." }, 400);

    const { data: cliente, error: cliErr } = await supabase
      .from("clientes")
      .select("nome_empresa")
      .eq("id", cliente_id)
      .single();
    if (cliErr || !cliente) return json({ ok: false, motivo: "Cliente não encontrado." }, 400);

    const apiKey = Deno.env.get("N8N_API_KEY");
    if (!apiKey) return json({ ok: false, motivo: "N8N_API_KEY não configurada." }, 500);

    let resp: Response;
    try {
      resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({ cliente_id, mes }),
      });
    } catch (e) {
      return json({ ok: false, motivo: `Falha ao contatar o n8n: ${(e as Error).message}` }, 200);
    }

    let body: any = null;
    try { body = await resp.json(); } catch { /* ignore */ }

    if (resp.status === 409)
      return json({ ok: false, conflict: true, motivo: body?.motivo ?? "Execução já em andamento." }, 200);
    if (!resp.ok)
      return json({ ok: false, motivo: body?.motivo ?? `Erro ${resp.status} do n8n.` }, 200);
    if (body?.ok && body.execucao_id)
      return json({ ok: true, execucao_id: body.execucao_id }, 200);
    return json({ ok: false, motivo: "Resposta inesperada do n8n." }, 200);
  } catch (e) {
    return json({ ok: false, motivo: `Erro interno: ${(e as Error).message}` }, 200);
  }
});
