/**
 * Remove CPF/CNPJ e pontuação do início do nome do cliente e capitaliza corretamente
 *
 * Exemplos:
 * "63.178.111 Karla Beatriz Aurelio Da Silva" → "Karla Beatriz Aurelio da Silva"
 * "21.122.912 WILLIAN VIANA SANTOS" → "Willian Viana Santos"
 * "RENAN GIUSEPPE DE SOUZA ALMEIDA" → "Renan Giuseppe de Souza Almeida"
 */
export function formatBuyerName(name: string | null | undefined): string {
  if (!name) return '-';

  // Remove números, pontos e espaços do início do nome
  const cleaned = name.replace(/^[\d\s.]+/, '').trim();

  if (!cleaned) return '-';

  // Lista de preposições e artigos que devem ficar em minúsculo
  const lowercaseWords = ['de', 'da', 'do', 'dos', 'das', 'e'];

  // Capitaliza cada palavra
  const capitalized = cleaned
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      // Primeira palavra sempre capitalizada
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }

      // Preposições e artigos em minúsculo (exceto se for a primeira palavra)
      if (lowercaseWords.includes(word)) {
        return word;
      }

      // Demais palavras capitalizadas
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');

  return capitalized;
}
