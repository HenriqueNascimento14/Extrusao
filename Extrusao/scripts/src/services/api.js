import axios from 'axios';

const API_URL = 'https://6a064e4ec83ba8ad9b3d6252.mockapi.io/Ops';

// instância correta
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

// CRIAR
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
  });

  return res.data;
};

// ATUALIZAR
export const updateOp = async (id, data) => {
  const res = await api.put(`/${id}`, data);
  return res.data;
};

// DELETE (IMPORTANTE: corrigido)
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

export default api;