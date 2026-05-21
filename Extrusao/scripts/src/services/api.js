import axios from 'axios';

const API_URL = 'https://6a064e4ec83ba8ad9b3d6252.mockapi.io/Ops';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json', 
  },
});

// BUSCAR
export const getOps = async () => {
  const res = await api.get('/');
  return res.data;
};

// CRIAR (Atualizado com os novos campos que você pediu)
export const createOp = async (data) => {
  const res = await api.post('/', {
    numero_op: data.numero_op || '',
    maquina: data.maquina || '',
    estrutura: data.estrutura || 'Padrão',
    espessura: Number(data.espessura || 0),
    largura_cm: Number(data.largura_cm || 0),
    tempo_setup_minutos: Number(data.tempo_setup_minutos || 0),
    tempo_producao_horas: Number(data.tempo_producao_horas || 0),
    status: data.status || 'Pendente',
    observacao: data.observacao || '',
    
    // Novas implementações:
    data_hora_inicio: data.data_hora_inicio || null,       // "a hora que vai começar" (String ISO ou Datetime)
    meta_velocidade: Number(data.meta_velocidade || 0),   // "em quanto vai fazer" (Ex: metros/hora ou peças/hora)
    perda_estimada_kg: Number(data.perda_estimada_kg || 0), // "o quanto tem que perder" (Ex: kg ou metros de perda)
    prioridade: Number(data.prioridade || 1),               // "ordem de prioridade" (Ex: 1 = Alta, 2 = Média, 3 = Baixa)
  });

  return res.data;
};

// ATUALIZAR
export const updateOp = async (id, data) => {
  const res = await api.put(`/${id}`, data);
  return res.data;
};

// DELETE
export const deleteOp = async (id) => {
  await api.delete(`/${id}`);
  return true;
};

// DELETE MANY
export const deleteManyOps = async (ids) => {
  await Promise.all(ids.map(id => api.delete(`/${id}`)));
  return true;
};

// LIMPAR TUDO
export const clearAllOps = async () => {
  const res = await api.get('/');
  const ops = res.data;

  await Promise.all(ops.map(op => api.delete(`/${op.id}`)));
  return true;
};


/* ==========================================================================
   FUNÇÃO DE ORGANIZAÇÃO / PRIORIZAÇÃO (Lógica de Negócio)
   ========================================================================== */

/**
 * Organiza as OPs por prioridade e depois por data de início.
 * OPs com prioridade menor (ex: 1) ou datas mais antigas/proximas vêm primeiro.
 */
export const ordenarOpsPorPrioridade = (listaDeOps) => {
  return [...listaDeOps].sort((a, b) => {
    // 1º Critério: Prioridade (Ex: Prioridade 1 vem antes da Prioridade 2)
    if (a.prioridade !== b.prioridade) {
      return a.prioridade - b.prioridade;
    }
    
    // 2º Critério: Data/Hora de início (Se a prioridade for igual, quem começa antes vem primeiro)
    const dataA = new Date(a.data_hora_inicio || '9999-12-31');
    const dataB = new Date(b.data_hora_inicio || '9999-12-31');
    return dataA - dataB;
  });
};

export default api;