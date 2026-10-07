export const ROOMS = ['Geral', 'Sala', 'Cozinha', 'Quarto', 'Quarto 2', 'Banheiro', 'Área de serviço', 'Varanda', 'Escritório'];

export const STATUS = [
  ['pesquisando', 'Pesquisando'],
  ['decidido', 'Decidido'],
  ['comprado', 'Comprado'],
  ['instalado', 'Entregue / instalado'],
];

export const UNITS = ['un', 'm²', 'm', 'L', 'lata', 'caixa', 'serviço', 'diária'];

/** Statuses that count as money already spent. */
export const DONE = new Set(['comprado', 'instalado']);

export const stName = k => (STATUS.find(s => s[0] === k) || STATUS[0])[1];
