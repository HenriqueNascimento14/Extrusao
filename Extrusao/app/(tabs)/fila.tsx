import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  FlatList,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons';
import Checkbox from 'expo-checkbox';

const api = axios.create({
  baseURL: 'https://6a064e4ec83ba8ad9b3d6252.mockapi.io',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

interface OrdemProducao {
  id: string;
  numero_op: string;
  maquina: string;
  estrutura: string;
  espessura: number;
  largura_cm: number;
  tempo_setup_minutos: number;
  tempo_producao_horas: number;
  status: string;
  observacao: string;
  data_hora_inicio: string; 
  meta_velocidade: number;
  perda_estimada_kg: number;
  prioridade: number; 
  quantidade_produzir: number; 
}

const STATUS_OPTIONS = [
  'Pendente',
  'Em Produção',
  'Concluída',
  'Aguardando Material',
  'Cancelada',
];

export default function Fila() {
  const router = useRouter();

  const [ops, setOps] = useState<OrdemProducao[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedOps, setSelectedOps] = useState<string[]>([]);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedOp, setSelectedOp] = useState<OrdemProducao | null>(null);
  const [searchText, setSearchText] = useState('');

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingOp, setEditingOp] = useState({
    id: '',
    numero_op: '',
    maquina: '',
    data_hora_inicio: '',
    meta_velocidade: '',
    perda_estimada_kg: '',
    quantidade_produzir: '',
    tempo_setup_minutos: '',
    prioridade: '2',
  });

  const [newOp, setNewOp] = useState({
    numero_op: '',
    maquina: '',
    data_hora_inicio: '', 
    meta_velocidade: '',  
    perda_estimada_kg: '',
    quantidade_produzir: '', 
    tempo_setup_minutos: '30', 
    prioridade: '2', 
  });

  const ordenarOps = (listaDeOps: OrdemProducao[]) => {
    return [...listaDeOps].sort((a, b) => {
      if (Number(a.prioridade || 2) !== Number(b.prioridade || 2)) {
        return Number(a.prioridade || 2) - Number(b.prioridade || 2);
      }
      const dataA = new Date(a.data_hora_inicio || '9999-12-31').getTime();
      const dataB = new Date(b.data_hora_inicio || '9999-12-31').getTime();
      return dataA - dataB;
    });
  };

  const fetchOps = async () => {
    try {
      setLoading(true);
      const res = await api.get('/Ops');
      const listaOrdenada = ordenarOps(res.data);
      setOps(listaOrdenada);
    } catch {
      Alert.alert('Erro', 'Falha ao carregar OPs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOps();
  }, []);

  const opsFiltradas = ops.filter(op => 
    op.numero_op.toLowerCase().includes(searchText.toLowerCase())
  );

  const totalMinutosProducao = opsFiltradas.reduce((acc, op) => {
    const qtdKg = Number(op.quantidade_produzir || 0);
    const prodPorHora = Number(op.meta_velocidade || 0);
    const setupMinutos = Number(op.tempo_setup_minutos || 0); 

    const tempoExecucaoMinutos = prodPorHora > 0 ? ((qtdKg / prodPorHora) * 60) : 0;
    return acc + tempoExecucaoMinutos + setupMinutos;
  }, 0);

  const totalPerdaKg = opsFiltradas.reduce((acc, op) => acc + Number(op.perda_estimada_kg || 0), 0);
  const taxaAcertoEstimada = opsFiltradas.length > 0 ? Math.max(100 - (totalPerdaKg / opsFiltradas.length) * 0.1, 85).toFixed(1) : '100';

  const toggleSelection = (id: string) => {
    setSelectedOps(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  /* ==========================================================================
     1. TRAVA DE CONFIRMAÇÃO NA EXCLUSÃO (ATUALIZADO)
     ========================================================================== */
  const handleDelete = (id: string, numeroOp: string) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Você tem certeza que deseja excluir a OP nº ${numeroOp}? Essa ação não pode ser desfeita.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel', // Não faz nada e apenas fecha o aviso
        },
        {
          text: 'Excluir',
          style: 'destructive', // Deixa o botão vermelho no iOS
          onPress: async () => {
            try {
              await api.delete(`/Ops/${id}`);
              setOps(prev => prev.filter(op => op.id !== id));
            } catch {
              Alert.alert('Erro', 'Falha ao deletar a OP');
            }
          },
        },
      ]
    );
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedOp) return;
    try {
      setIsUpdating(true);
      await api.put(`/Ops/${selectedOp.id}`, { ...selectedOp, status });
      setOps(prev => {
        const atualizadas = prev.map(op => op.id === selectedOp.id ? { ...op, status } : op);
        return ordenarOps(atualizadas);
      });
      setStatusModalVisible(false);
      setSelectedOp(null);
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenEditModal = (op: OrdemProducao) => {
    setEditingOp({
      id: op.id,
      numero_op: op.numero_op,
      maquina: op.maquina,
      data_hora_inicio: op.data_hora_inicio || '',
      meta_velocidade: String(op.meta_velocidade || ''),
      perda_estimada_kg: String(op.perda_estimada_kg || ''),
      quantidade_produzir: String(op.quantidade_produzir || ''),
      tempo_setup_minutos: String(op.tempo_setup_minutos || '30'),
      prioridade: String(op.prioridade || '2'),
    });
    setEditModalVisible(true);
  };

  const handleSaveFullEdit = async () => {
    if (!editingOp.numero_op || !editingOp.maquina || !editingOp.quantidade_produzir || !editingOp.meta_velocidade) {
      Alert.alert('Erro', 'Preencha os campos obrigatórios de produção');
      return;
    }

    try {
      const opOriginal = ops.find(o => o.id === editingOp.id);
      if (!opOriginal) return;

      const dadosAtualizados = {
        ...opOriginal,
        numero_op: editingOp.numero_op,
        maquina: editingOp.maquina,
        data_hora_inicio: editingOp.data_hora_inicio,
        meta_velocidade: Number(editingOp.meta_velocidade),
        perda_estimada_kg: Number(editingOp.perda_estimada_kg || 0),
        quantidade_produzir: Number(editingOp.quantidade_produzir),
        tempo_setup_minutos: Number(editingOp.tempo_setup_minutos || 30),
        prioridade: Number(editingOp.prioridade),
        tempo_producao_horas: Number(editingOp.quantidade_produzir) / Number(editingOp.meta_velocidade),
      };

      await api.put(`/Ops/${editingOp.id}`, dadosAtualizados);

      setOps(prev => {
        const modificadas = prev.map(op => op.id === editingOp.id ? dadosAtualizados : op);
        return ordenarOps(modificadas);
      });

      setEditModalVisible(false);
      Alert.alert('Sucesso', 'OP atualizada com sucesso!');
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar as alterações');
    }
  };

  const handleAddOp = async () => {
    if (!newOp.numero_op || !newOp.maquina || !newOp.data_hora_inicio || !newOp.quantidade_produzir || !newOp.meta_velocidade) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios de produção');
      return;
    }

    try {
      const res = await api.post('/Ops', {
        numero_op: newOp.numero_op,
        maquina: newOp.maquina,
        estrutura: 'Padrão',
        espessura: 100,
        largura_cm: 120,
        tempo_setup_minutos: Number(newOp.tempo_setup_minutos || 30), 
        tempo_producao_horas: Number(newOp.quantidade_produzir) / Number(newOp.meta_velocidade), 
        status: 'Pendente',
        observacao: '',
        data_hora_inicio: newOp.data_hora_inicio,
        meta_velocidade: Number(newOp.meta_velocidade || 0),
        perda_estimada_kg: Number(newOp.perda_estimada_kg || 0),
        prioridade: Number(newOp.prioridade || 2),
        quantidade_produzir: Number(newOp.quantidade_produzir || 0),
      });

      setOps(prev => ordenarOps([res.data, ...prev]));
      setModalVisible(false);
      setNewOp({ 
        numero_op: '', maquina: '', data_hora_inicio: '', 
        meta_velocidade: '', perda_estimada_kg: '', quantidade_produzir: '', tempo_setup_minutos: '30', prioridade: '2' 
      });
    } catch {
      Alert.alert('Erro', 'Não salvou no MockAPI');
    }
  };

  const handleLogout = () => router.replace('/');

  const getPrioridadeTexto = (p: number) => {
    if (p === 1) return '⭐ ALTA';
    if (p === 3) return 'BAIXA';
    return 'MÉDIA';
  };

  return (
    <SafeAreaView style={styles.containerWhite}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.headerFila}>
        <Text style={styles.titleFila}>Fila de Produção</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <MaterialIcons name="add" size={20} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>SAIR</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* BUSCA */}
      <View style={styles.searchContainer}>
        <View style={styles.searchSection}>
          <MaterialIcons style={styles.searchIcon} name="search" size={20} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar OP pelo número..."
            value={searchText}
            onChangeText={setSearchText}
            keyboardType="numeric"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <MaterialIcons name="close" size={20} color="#888" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* LISTA */}
      {loading ? (
        <ActivityIndicator size="large" color="#5A189A" style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={opsFiltradas}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 }}
          ListEmptyComponent={() => (
            <Text style={styles.emptyText}>Nenhuma OP encontrada com esse número.</Text>
          )}
          renderItem={({ item }) => {
            const selected = selectedOps.includes(item.id);
            const tempoCardMinutos = item.meta_velocidade > 0 ? ((item.quantidade_produzir / item.meta_velocidade) * 60) : 0;
            const tempoSetupCard = item.tempo_setup_minutos !== undefined ? item.tempo_setup_minutos : 30;

            return (
              <View style={[styles.card, selected && styles.selectedCard]}>
                <View style={styles.priorityBadge}>
                  <Text style={[styles.priorityText, item.prioridade === 1 && { color: '#D32F2F', fontWeight: 'bold' }]}>
                    Prioridade: {getPrioridadeTexto(item.prioridade)}
                  </Text>
                </View>

                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Checkbox value={selected} onValueChange={() => toggleSelection(item.id)} />
                    <Text style={styles.opNumber}>{item.numero_op}</Text>
                    <Text style={styles.status}>{item.status}</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setSelectedOp(item); setStatusModalVisible(true); }}>
                    <MaterialIcons name="keyboard-arrow-down" size={26} color="#5A189A" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.machineName}>Máquina: {item.maquina}</Text>
                
                <TouchableOpacity 
                  style={styles.detailsContainer}
                  onPress={() => handleOpenEditModal(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.detailText}>⚖️ Qtd Programada: {item.quantidade_produzir || 0} kg</Text>
                  <Text style={styles.detailText}>🚀 Produção / Hora: {item.meta_velocidade || 0} kg/h</Text>
                  <Text style={[styles.detailText, { color: '#5A189A', fontWeight: '500' }]}>⏱️ Duração de Produção: {tempoCardMinutos.toFixed(0)} min</Text>
                  <Text style={[styles.detailText, { color: '#D32F2F', fontWeight: '500' }]}>⚙️ Tempo de Setup: {tempoSetupCard} min</Text>
                  <Text style={styles.detailText}>📅 Início: {item.data_hora_inicio || 'Não agendado'}</Text>
                  <Text style={styles.editAlertText}>📝 Clique no bloco para Editar Dados</Text>
                </TouchableOpacity>

                {/* PASSA O ID E O NÚMERO DA OP PARA IDENTIFICAR FACILMENTE NO TOQUE DO OPERADOR */}
                <TouchableOpacity onPress={() => handleDelete(item.id, item.numero_op)}>
                  <Text style={{ color: 'red', marginTop: 12 }}>Excluir</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      {/* FOOTER FIXO OPERACIONAL */}
      <View style={styles.summaryFooterCard}>
        <Text style={styles.summaryTitle}>Analise da Fila</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryBlock}>
            <MaterialIcons name="access-time" size={22} color="#5A189A" />
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.summaryLabel}>Tempo Total da Fila</Text>
              <Text style={styles.summaryValue}>{totalMinutosProducao.toFixed(0)} min</Text>
            </View>
          </View>
          <View style={[styles.summaryBlock, { borderLeftWidth: 1, borderColor: '#E0E0E0', paddingLeft: 15 }]}>
            <MaterialIcons name="trending-up" size={22} color="#00C853" />
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.summaryLabel}>Meta de Acerto</Text>
              <Text style={[styles.summaryValue, { color: '#00C853' }]}>{taxaAcertoEstimada}%</Text>
            </View>
          </View>
        </View>
      </View>

      {/* MODAL CRIAR */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Nova Ordem de Produção</Text>
            <TextInput placeholder="Número OP" style={styles.input} value={newOp.numero_op} onChangeText={t => setNewOp(prev => ({ ...prev, numero_op: t }))} />
            <TextInput placeholder="Máquina" style={styles.input} value={newOp.maquina} onChangeText={t => setNewOp(prev => ({ ...prev, maquina: t }))} />
            <TextInput placeholder="Quantidade Total a Ser Produzida (kg)" keyboardType="numeric" style={styles.input} value={newOp.quantidade_produzir} onChangeText={t => setNewOp(prev => ({ ...prev, quantity_produzir: t, quantidade_produzir: t }))} />
            <TextInput placeholder="Produção por Hora - Ritmo Meta (kg/h)" keyboardType="numeric" style={styles.input} value={newOp.meta_velocidade} onChangeText={t => setNewOp(prev => ({ ...prev, meta_velocidade: t }))} />
            <TextInput placeholder="Tempo de Setup Inicial (minutos)" keyboardType="numeric" style={styles.input} value={newOp.tempo_setup_minutos} onChangeText={t => setNewOp(prev => ({ ...prev, tempo_setup_minutos: t }))} />
            <TextInput placeholder="Início Previsto (Ex: 22/05 14:00)" style={styles.input} value={newOp.data_hora_inicio} onChangeText={t => setNewOp(prev => ({ ...prev, data_hora_inicio: t }))} />
            <TextInput placeholder="Perda Estimada Máxima (kg)" keyboardType="numeric" style={styles.input} value={newOp.perda_estimada_kg} onChangeText={t => setNewOp(prev => ({ ...prev, perda_estimada_kg: t }))} />

            <Text style={styles.labelField}>Prioridade da OP:</Text>
            <View style={styles.prioritySelectorRow}>
              {[1, 2, 3].map((num) => (
                <TouchableOpacity key={num} style={[styles.selectorBtn, newOp.prioridade === num.toString() && styles.selectorBtnActive]} onPress={() => setNewOp(prev => ({ ...prev, prioridade: num.toString() }))}>
                  <Text style={[styles.selectorBtnText, newOp.prioridade === num.toString() && { color: '#FFF' }]}>{num === 1 ? '1 - Alta' : num === 2 ? '2 - Média' : '3 - Baixa'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 }}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.saveBtn, { backgroundColor: '#BBB', width: '45%' }]}><Text style={styles.btnText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleAddOp} style={[styles.saveBtn, { width: '45%' }]}><Text style={styles.btnText}>Salvar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL EDITAR */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Editar Informações da OP</Text>
            
            <TextInput placeholder="Número OP" style={styles.input} value={editingOp.numero_op} onChangeText={t => setEditingOp(prev => ({ ...prev, numero_op: t }))} />
            <TextInput placeholder="Máquina" style={styles.input} value={editingOp.maquina} onChangeText={t => setEditingOp(prev => ({ ...prev, maquina: t }))} />
            <TextInput placeholder="Quantidade Programada (kg)" keyboardType="numeric" style={styles.input} value={editingOp.quantidade_produzir} onChangeText={t => setEditingOp(prev => ({ ...prev, quantidade_produzir: t }))} />
            <TextInput placeholder="Produção por Hora (kg/h)" keyboardType="numeric" style={styles.input} value={editingOp.meta_velocidade} onChangeText={t => setEditingOp(prev => ({ ...prev, meta_velocidade: t }))} />
            <TextInput placeholder="Tempo de Setup (minutos)" keyboardType="numeric" style={styles.input} value={editingOp.tempo_setup_minutos} onChangeText={t => setEditingOp(prev => ({ ...prev, tempo_setup_minutos: t }))} />
            <TextInput placeholder="Início Previsto" style={styles.input} value={editingOp.data_hora_inicio} onChangeText={t => setEditingOp(prev => ({ ...prev, data_hora_inicio: t }))} />
            <TextInput placeholder="Perda Estimada Max (kg)" keyboardType="numeric" style={styles.input} value={editingOp.perda_estimada_kg} onChangeText={t => setEditingOp(prev => ({ ...prev, perda_estimada_kg: t }))} />

            <Text style={styles.labelField}>Alterar Prioridade da OP:</Text>
            <View style={styles.prioritySelectorRow}>
              {[1, 2, 3].map((num) => (
                <TouchableOpacity 
                  key={num} 
                  style={[styles.selectorBtn, editingOp.prioridade === num.toString() && styles.selectorBtnActive]} 
                  onPress={() => setEditingOp(prev => ({ ...prev, prioridade: num.toString() }))}
                >
                  <Text style={[styles.selectorBtnText, editingOp.prioridade === num.toString() && { color: '#FFF' }]}>
                    {num === 1 ? '1 - Alta' : num === 2 ? '2 - Média' : '3 - Baixa'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 }}>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={[styles.saveBtn, { backgroundColor: '#BBB', width: '45%' }]}><Text style={styles.btnText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSaveFullEdit} style={[styles.saveBtn, { backgroundColor: '#00C853', width: '45%' }]}><Text style={styles.btnText}>Salvar Alterações</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL STATUS */}
      <Modal visible={statusModalVisible} transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={{ fontWeight: 'bold', marginBottom: 10, fontSize: 16 }}>Alterar Status</Text>
            {STATUS_OPTIONS.map(status => (
              <TouchableOpacity key={status} style={styles.statusBtn} onPress={() => handleUpdateStatus(status)}><Text>{status}</Text></TouchableOpacity>
            ))}
            <TouchableOpacity style={{ marginTop: 15, padding: 10, alignSelf: 'center' }} onPress={() => setStatusModalVisible(false)}><Text style={{ color: '#5A189A', fontWeight: 'bold' }}>Fechar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

/* CSS */
const styles = StyleSheet.create({
  containerWhite: { flex: 1, backgroundColor: '#F8F9FA' },
  headerFila: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingBottom: 10 },
  titleFila: { fontSize: 20, fontWeight: 'bold', color: '#5A189A' },
  headerButtons: { flexDirection: 'row' },
  addBtn: { backgroundColor: '#00C853', padding: 8, borderRadius: 8, marginRight: 10 },
  logoutBtn: { backgroundColor: '#5A189A', padding: 8, borderRadius: 8 },
  logoutText: { color: '#FFF' },
  
  searchContainer: { paddingHorizontal: 20, marginBottom: 5 },
  searchSection: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 10, elevation: 1 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, color: '#333' },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 40, fontSize: 14 },

  card: { backgroundColor: '#FFF', padding: 15, marginBottom: 10, borderRadius: 12, elevation: 2 },
  selectedCard: { borderWidth: 2, borderColor: '#5A189A' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  opNumber: { marginLeft: 10, fontWeight: 'bold', fontSize: 16 },
  status: { marginLeft: 10, fontSize: 12, color: '#5A189A', fontWeight: 'bold' },
  machineName: { marginTop: 5, color: '#333', fontWeight: '500' },
  
  priorityBadge: { marginBottom: 6, borderBottomWidth: 1, borderColor: '#F0F0F0', paddingBottom: 4 },
  priorityText: { fontSize: 11, color: '#666', textTransform: 'uppercase' },
  detailsContainer: { marginTop: 8, backgroundColor: '#F8F9FA', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#EAEAEA' },
  detailText: { fontSize: 12, color: '#555', marginBottom: 2 },
  editAlertText: { fontSize: 10, color: '#5A189A', fontStyle: 'italic', marginTop: 6, textAlign: 'right', fontWeight: '500' },

  summaryFooterCard: { backgroundColor: '#FFF', padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 4, borderWidth: 1, borderColor: '#EFEFEF' },
  summaryTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 12, textAlign: 'center' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  summaryBlock: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
  summaryLabel: { fontSize: 11, color: '#777' },
  summaryValue: { fontSize: 16, fontWeight: 'bold', color: '#5A189A', marginTop: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalContainer: { backgroundColor: '#FFF', padding: 20, borderRadius: 12 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  input: { borderWidth: 1, borderColor: '#DDD', marginBottom: 10, padding: 10, borderRadius: 8, backgroundColor: '#FAFAFA' },
  labelField: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 5, marginBottom: 5 },
  
  prioritySelectorRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  selectorBtn: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#DDD', marginHorizontal: 2, borderRadius: 6, alignItems: 'center', backgroundColor: '#FFF' },
  selectorBtnActive: { backgroundColor: '#5A189A', borderColor: '#5A189A' },
  selectorBtnText: { fontSize: 12, color: '#555', fontWeight: '500' },

  saveBtn: { backgroundColor: '#5A189A', padding: 12, borderRadius: 8 },
  btnText: { color: '#FFF', textAlign: 'center', fontWeight: 'bold' },
  statusBtn: { padding: 12, borderBottomWidth: 1, borderColor: '#EEE' }
});