export const API_URL = 'http://localhost:3000/api';
/** Mensagens de erro devolvidas pela API, com alternativa para conexão offline. */
export function apiErrorMessage(error: unknown): string {
  const response = error as { status?: number; error?: { error?: string } };
  if (response?.status === 0) return 'Não foi possível conectar à API. Confirme que o Back-end está executando na porta 3000.';
  return response?.error?.error ?? 'Não foi possível concluir a operação. Tente novamente.';
}
