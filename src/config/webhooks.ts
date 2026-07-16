// Configuração de polling para a tabela `execucoes`.
// Os disparos de agentes são feitos pela Edge Function `disparar-agente`.

// Tempo máximo de polling em milissegundos (2 minutos) antes de mostrar
// o aviso "está demorando mais que o esperado".
export const POLL_TIMEOUT_MS = 2 * 60 * 1000;

// Intervalo entre consultas à tabela execucoes (3 segundos).
export const POLL_INTERVAL_MS = 3000;
