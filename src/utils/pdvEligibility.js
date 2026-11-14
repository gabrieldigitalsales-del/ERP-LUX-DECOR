/** Apenas peças de mostruário podem entrar em vendas diretas no PDV.
 * Estoque geral continua disponível aos demais módulos, sem alteração de quantidade.
 */
export const eligibleForPdv = product =>
  Boolean(product && product.active !== false &&
    String(product.stockType || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()==='mostruario');
export const pdvProducts = products => (Array.isArray(products)?products:[]).filter(eligibleForPdv);
