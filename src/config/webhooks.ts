// Configuração dos webhooks n8n.
// Substitua os valores abaixo pelas URLs reais do seu n8n e a API key compartilhada.
// Este é o único lugar que precisa ser editado para trocar os endpoints.

export const URL_STRATEGY = "COLE_AQUI";
export const URL_COPYWRITER = "COLE_AQUI";
export const API_KEY = "COLE_AQUI";

// Tempo máximo de polling em milissegundos (2 minutos) antes de mostrar
// o aviso "está demorando mais que o esperado".
export const POLL_TIMEOUT_MS = 2 * 60 * 1000;

// Intervalo entre consultas à tabela execucoes (3 segundos).
export const POLL_INTERVAL_MS = 3000;
