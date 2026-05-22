import React, { useState, useEffect, useRef } from 'react';
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
  Platform,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { create } from 'axios';
import { MaterialIcons } from '@expo/vector-icons';
import { Checkbox } from 'expo-checkbox';
import * as Notifications from 'expo-notifications';

// Configuração do comportamento das notificações
Notifications.setNotificationHandler({
  handleNotification: async () => {
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    } as any; 
  },
});

const api = create({
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

interface StatusConfig {
  bg: string;
  text: string;
}

const STATUS_OPTIONS = [
  'Pendente',
  'Em Produção',
  'Concluída',
  'Aguardando Material',
  'Cancelada',
];

const STATUS_COLORS: Record<string, StatusConfig> = {
  'Pendente':            { bg: '#F0F0F0', text: '#555555' },
  'Em Produção':         { bg: '#E3F2FD', text: '#1565C0' },
  'Concluída':           { bg: '#E8F5E9', text: '#2E7D32' },
  'Aguardando Material': { bg: '#FFF8E1', text: '#F57F17' },
  'Cancelada':           { bg: '#FFEBEE', text: '#C62828' },
};

const PRIORITY_BAR_COLORS: Record<number, string> = {
  1: '#E53935',
  2: '#FB8C00',
  3: '#43A047',
};

function getStatusConfig(status: string): StatusConfig {
  return STATUS_COLORS[status] ?? { bg: '#F0F0F0', text: '#555555' };
}

async function registerForPushNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    Alert.alert(
      'Permissão negada',
      'Para receber notificações de OPs concluídas no celular, ative as permissões nas configurações.',
    );
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('op-status', {
      name: 'Status de OP',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#5A189A',
    });
  }
}

async function notificarOpConcluida(numeroOp: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (!('Notification' in window)) {
        console.warn('Este navegador não suporta notificações de desktop');
        return;
      }

      if (Notification.permission === 'granted') {
        new Notification(`OP ${numeroOp} — Concluída ✅`, {
          body: `A ordem de produção ${numeroOp} foi marcada como concluída na máquina.`,
        });
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(`OP ${numeroOp} — Concluída ✅`, {
            body: `A ordem de produção ${numeroOp} foi marcada como concluída na máquina.`,
          });
        }
      }
    } 
    else {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `OP ${numeroOp} — Concluída`,
          body: `A ordem de produção ${numeroOp} foi marcada como concluída.`,
          sound: true,
          ...(Platform.OS === 'android' && { channelId: 'op-status' }),
        },
        trigger: null,
      });
    }
  } catch (err) {
    console.warn('Erro ao disparar notificação:', err);
  }
}

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

  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    registerForPushNotifications();

    notificationListener.current = Notifications.addNotificationReceivedListener(() => {});
    responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {});

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  const ordenarOps = (lista: OrdemProducao[]): OrdemProducao[] =>
    [...lista].sort((a, b) => {
      if (Number(a.prioridade || 2) !== Number(b.prioridade || 2))
        return Number(a.prioridade || 2) - Number(b.prioridade || 2);
      const dA = new Date(a.data_hora_inicio || '9999-12-31').getTime();
      const dB = new Date(b.data_hora_inicio || '9999-12-31').getTime();
      return dA - dB;
    });

  const fetchOps = async (): Promise<void> => {
    try {
      setLoading(true);
      const res = await api.get('/Ops');
      setOps(ordenarOps(res.data));
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Falha ao carregar OPs');
      } else {
        Alert.alert('Erro', 'Falha ao carregar OPs');
      }
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchOps(); }, []);

  const opsFiltradas = ops.filter(op =>
    op.numero_op.toLowerCase().includes(searchText.toLowerCase()),
  );

  // --- NOVOS CÁLCULOS DO DASHBOARD ---
  const opsAtivas = opsFiltradas.filter(
    op => op.status !== 'Concluída' && op.status !== 'Cancelada'
  );

  const totalOpsAtivas = opsAtivas.length;

  const totalVolumeKg = opsAtivas.reduce(
    (acc, op) => acc + Number(op.quantidade_produzir || 0), 0
  );

  const totalPerdaKg = opsAtivas.reduce(
    (acc, op) => acc + Number(op.perda_estimada_kg || 0), 0
  );

  // 1. APENAS TEMPO DE PRODUÇÃO (Sem Setup)
  const totalMinutosApenasProducao = opsAtivas.reduce((acc, op) => {
    const qtd = Number(op.quantidade_produzir || 0);
    const vel = Number(op.meta_velocidade || 0);
    return acc + (vel > 0 ? ((qtd / vel) * 60) : 0);
  }, 0);

  const horasProducao = Math.floor(totalMinutosApenasProducao / 60);
  const minutosProducao = Math.round(totalMinutosApenasProducao % 60);
  const tempoProducaoFormatado = horasProducao > 0 
    ? `${horasProducao}h ${minutosProducao}m` 
    : `${minutosProducao}m`;

  // 2. TEMPO DE SETUP (Considerado como tempo de perda na prática)
  const totalMinutosSetup = opsAtivas.reduce(
    (acc, op) => acc + Number(op.tempo_setup_minutos || 0), 0
  );

  const horasSetup = Math.floor(totalMinutosSetup / 60);
  const minutosSetup = Math.round(totalMinutosSetup % 60);
  const tempoSetupFormatado = horasSetup > 0 
    ? `${horasSetup}h ${minutosSetup}m` 
    : `${minutosSetup}m`;
  // -----------------------------------

  const toggleSelection = (id: string): void => {
    setSelectedOps(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id],
    );
  };

  const handleDelete = (id: string, numeroOp: string): void => {
    const mensagem = `Tem certeza que deseja excluir a OP nº ${numeroOp}? Essa ação não pode ser desfeita.`;

    const executarExclusao = async () => {
      try {
        await api.delete(`/Ops/${id}`);
        setOps(prev => prev.filter(op => op.id !== id));
      } catch (error) {
        console.error(error);
        if (Platform.OS === 'web') {
          window.alert('Falha ao deletar a OP');
        } else {
          Alert.alert('Erro', 'Falha ao deletar a OP');
        }
      }
    };

    if (Platform.OS === 'web') {
      const usuarioConfirmou = window.confirm(mensagem);
      if (usuarioConfirmou) {
        executarExclusao();
      }
    } else {
      Alert.alert(
        'Confirmar Exclusão',
        mensagem,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: executarExclusao,
          },
        ],
      );
    }
  };

  const handleUpdateStatus = async (status: string): Promise<void> => {
    if (!selectedOp) return;
    try {
      setIsUpdating(true);
      await api.put(`/Ops/${selectedOp.id}`, { ...selectedOp, status });

      setOps(prev => {
        const atualizadas = prev.map(op =>
          op.id === selectedOp.id ? { ...op, status } : op,
        );
        return ordenarOps(atualizadas);
      });

      setStatusModalVisible(false);

      if (status === 'Concluída') {
        await notificarOpConcluida(selectedOp.numero_op);
      }

      setSelectedOp(null);
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Não foi possível atualizar o status');
      } else {
        Alert.alert('Erro', 'Não foi possível atualizar o status');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenEditModal = (op: OrdemProducao): void => {
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

  const handleSaveFullEdit = async (): Promise<void> => {
    if (!editingOp.numero_op || !editingOp.maquina || !editingOp.quantidade_produzir || !editingOp.meta_velocidade) {
      if (Platform.OS === 'web') window.alert('Preencha os campos obrigatórios');
      else Alert.alert('Erro', 'Preencha os campos obrigatórios');
      return;
    }

    try {
      const opOriginal = ops.find(o => o.id === editingOp.id);
      if (!opOriginal) return;

      const dadosAtualizados: OrdemProducao = {
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
        const modificadas = prev.map(op =>
          op.id === editingOp.id ? dadosAtualizados : op,
        );
        return ordenarOps(modificadas);
      });

      setEditModalVisible(false);
      
      if (Platform.OS === 'web') window.alert('OP atualizada com sucesso!');
      else Alert.alert('Sucesso', 'OP atualizada com sucesso!');
      
    } catch {
      if (Platform.OS === 'web') window.alert('Não foi possível salvar as alterações');
      else Alert.alert('Erro', 'Não foi possível salvar as alterações');
    }
  };

  const handleAddOp = async (): Promise<void> => {
    if (!newOp.numero_op || !newOp.maquina || !newOp.data_hora_inicio || !newOp.quantidade_produzir || !newOp.meta_velocidade) {
      if (Platform.OS === 'web') window.alert('Preencha todos os campos obrigatórios');
      else Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
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
        meta_velocidade: '', perda_estimada_kg: '', quantidade_produzir: '',
        tempo_setup_minutos: '30', prioridade: '2',
      });
    } catch {
      if (Platform.OS === 'web') window.alert('Não foi possível salvar no MockAPI');
      else Alert.alert('Erro', 'Não foi possível salvar no MockAPI');
    }
  };

  const handleLogout = (): void => router.replace('/');

  const getPrioridadeTexto = (p: number): string => {
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
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 }}
          ListEmptyComponent={() => (
            <Text style={styles.emptyText}>Nenhuma OP encontrada.</Text>
          )}
          renderItem={({ item }) => {
            const selected = selectedOps.includes(item.id);
            const tempoCardMinutos = item.meta_velocidade > 0
              ? ((item.quantidade_produzir / item.meta_velocidade) * 60)
              : 0;
            const tempoSetupCard = item.tempo_setup_minutos ?? 30;
            const sc = getStatusConfig(item.status);
            const barColor = PRIORITY_BAR_COLORS[item.prioridade] ?? '#FB8C00';

            return (
              <View style={[styles.card, selected && styles.selectedCard]}>
                <View style={[styles.priorityBar, { backgroundColor: barColor }]} />
                <View style={styles.cardInner}>

                  <View style={styles.priorityBadge}>
                    <Text style={[
                      styles.priorityText,
                      item.prioridade === 1 && { color: '#C62828', fontWeight: 'bold' },
                      item.prioridade === 3 && { color: '#388E3C' },
                    ]}>
                      Prioridade: {getPrioridadeTexto(item.prioridade)}
                    </Text>
                  </View>

                  <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Checkbox
                        value={selected}
                        onValueChange={() => toggleSelection(item.id)}
                        color={selected ? '#5A189A' : undefined}
                      />
                      <Text style={styles.opNumber}>{item.numero_op}</Text>
                      <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
                        <Text style={[styles.statusPillText, { color: sc.text }]}>
                          {item.status}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => { setSelectedOp(item); setStatusModalVisible(true); }}
                    >
                      <MaterialIcons name="keyboard-arrow-down" size={26} color="#5A189A" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.machineName}>Máquina: {item.maquina}</Text>

                  <TouchableOpacity
                    style={styles.detailsContainer}
                    onPress={() => handleOpenEditModal(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.detailText}>⚖️ Qtd: <Text style={styles.detailBold}>{item.quantidade_produzir || 0} kg</Text></Text>
                    <Text style={styles.detailText}>🚀 Ritmo: <Text style={styles.detailBold}>{item.meta_velocidade || 0} kg/h</Text></Text>
                    <Text style={[styles.detailText, { color: '#5A189A' }]}>⏱️ Produção: <Text style={styles.detailBold}>{tempoCardMinutos.toFixed(0)} min</Text></Text>
                    <Text style={[styles.detailText, { color: '#D32F2F' }]}>⚙️ Setup: <Text style={styles.detailBold}>{tempoSetupCard} min</Text></Text>
                    <Text style={styles.detailText}>📅 Início: <Text style={styles.detailBold}>{item.data_hora_inicio || 'Não agendado'}</Text></Text>
                    <Text style={styles.detailText}>⚠️ Perda est.: <Text style={styles.detailBold}>{item.perda_estimada_kg || 0} kg</Text></Text>
                    <Text style={styles.editAlertText}>📝 Toque para Editar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(item.id, item.numero_op)}
                  >
                    <MaterialIcons name="delete-outline" size={16} color="#E53935" />
                    <Text style={styles.deleteBtnText}>Excluir OP</Text>
                  </TouchableOpacity>

                </View>
              </View>
            );
          }}
        />
      )}

      {/* FOOTER - DASHBOARD COMPLETO */}
      <View style={styles.summaryFooterCard}>
        <Text style={styles.summaryTitle}>Resumo da Fila (OPs Ativas)</Text>
        
        <View style={styles.summaryGrid}>
          {/* Bloco 1: Volume */}
          <View style={styles.summaryBlock}>
            <MaterialIcons name="inventory" size={22} color="#5A189A" />
            <View style={styles.summaryTextContainer}>
              <Text style={styles.summaryLabel}>Volume Total</Text>
              <Text style={[styles.summaryValue, { color: '#5A189A' }]}>{totalVolumeKg.toLocaleString('pt-BR')} kg</Text>
            </View>
          </View>

          {/* Bloco 2: Apenas Produção */}
          <View style={styles.summaryBlock}>
            <MaterialIcons name="precision-manufacturing" size={22} color="#0277BD" />
            <View style={styles.summaryTextContainer}>
              <Text style={styles.summaryLabel}>Tempo Produção</Text>
              <Text style={[styles.summaryValue, { color: '#0277BD' }]}>{tempoProducaoFormatado}</Text>
            </View>
          </View>

          {/* Bloco 3: Perda (Kg e Tempo de Setup) */}
          <View style={styles.summaryBlock}>
            <MaterialIcons name="warning-amber" size={22} color="#E65100" />
            <View style={styles.summaryTextContainer}>
              <Text style={styles.summaryLabel}>Perda Prevista</Text>
              <Text style={[styles.summaryValue, { color: '#E65100' }]}>{totalPerdaKg.toLocaleString('pt-BR')} kg</Text>
              <Text style={{ fontSize: 10, color: '#E65100', marginTop: 2, fontWeight: 'bold' }}>⏱️ Setup: {tempoSetupFormatado}</Text>
            </View>
          </View>

          {/* Bloco 4: Contagem OPs */}
          <View style={styles.summaryBlock}>
            <MaterialIcons name="format-list-numbered" size={22} color="#2E7D32" />
            <View style={styles.summaryTextContainer}>
              <Text style={styles.summaryLabel}>Na Fila</Text>
              <Text style={[styles.summaryValue, { color: '#2E7D32' }]}>{totalOpsAtivas} OPs</Text>
            </View>
          </View>
        </View>
      </View>

      {/* MODAL CRIAR */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Nova Ordem de Produção</Text>
            <TextInput placeholder="Número OP *" style={styles.input} value={newOp.numero_op} onChangeText={t => setNewOp(p => ({ ...p, numero_op: t }))} />
            <TextInput placeholder="Máquina *" style={styles.input} value={newOp.maquina} onChangeText={t => setNewOp(p => ({ ...p, maquina: t }))} />
            <TextInput placeholder="Quantidade a Produzir (kg) *" keyboardType="numeric" style={styles.input} value={newOp.quantidade_produzir} onChangeText={t => setNewOp(p => ({ ...p, quantidade_produzir: t }))} />
            <TextInput placeholder="Meta de Velocidade (kg/h) *" keyboardType="numeric" style={styles.input} value={newOp.meta_velocidade} onChangeText={t => setNewOp(p => ({ ...p, meta_velocidade: t }))} />
            <TextInput placeholder="Tempo de Setup (minutos)" keyboardType="numeric" style={styles.input} value={newOp.tempo_setup_minutos} onChangeText={t => setNewOp(p => ({ ...p, tempo_setup_minutos: t }))} />
            <TextInput placeholder="Início Previsto (Ex: 22/05 14:00)" style={styles.input} value={newOp.data_hora_inicio} onChangeText={t => setNewOp(p => ({ ...p, data_hora_inicio: t }))} />
            <TextInput placeholder="Perda Estimada Máxima (kg)" keyboardType="numeric" style={styles.input} value={newOp.perda_estimada_kg} onChangeText={t => setNewOp(p => ({ ...p, perda_estimada_kg: t }))} />

            <Text style={styles.labelField}>Prioridade da OP:</Text>
            <View style={styles.prioritySelectorRow}>
              {[1, 2, 3].map(num => (
                <TouchableOpacity
                  key={num}
                  style={[styles.selectorBtn, newOp.prioridade === num.toString() && styles.selectorBtnActive]}
                  onPress={() => setNewOp(p => ({ ...p, prioridade: num.toString() }))}
                >
                  <Text style={[styles.selectorBtnText, newOp.prioridade === num.toString() && { color: '#FFF' }]}>
                    {num === 1 ? '1 — Alta' : num === 2 ? '2 — Média' : '3 — Baixa'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtnsRow}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.saveBtn, { backgroundColor: '#9E9E9E', flex: 1, marginRight: 8 }]}>
                <Text style={styles.btnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddOp} style={[styles.saveBtn, { flex: 1 }]}>
                <Text style={styles.btnText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL EDITAR */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Editar Informações da OP</Text>
            <TextInput placeholder="Número OP" style={styles.input} value={editingOp.numero_op} onChangeText={t => setEditingOp(p => ({ ...p, numero_op: t }))} />
            <TextInput placeholder="Máquina" style={styles.input} value={editingOp.maquina} onChangeText={t => setEditingOp(p => ({ ...p, maquina: t }))} />
            <TextInput placeholder="Quantidade Programada (kg)" keyboardType="numeric" style={styles.input} value={editingOp.quantidade_produzir} onChangeText={t => setEditingOp(p => ({ ...p, quantidade_produzir: t }))} />
            <TextInput placeholder="Meta de Velocidade (kg/h)" keyboardType="numeric" style={styles.input} value={editingOp.meta_velocidade} onChangeText={t => setEditingOp(p => ({ ...p, meta_velocidade: t }))} />
            <TextInput placeholder="Tempo de Setup (minutos)" keyboardType="numeric" style={styles.input} value={editingOp.tempo_setup_minutos} onChangeText={t => setEditingOp(p => ({ ...p, tempo_setup_minutos: t }))} />
            <TextInput placeholder="Início Previsto" style={styles.input} value={editingOp.data_hora_inicio} onChangeText={t => setEditingOp(p => ({ ...p, data_hora_inicio: t }))} />
            <TextInput placeholder="Perda Estimada Max (kg)" keyboardType="numeric" style={styles.input} value={editingOp.perda_estimada_kg} onChangeText={t => setEditingOp(p => ({ ...p, perda_estimada_kg: t }))} />

            <Text style={styles.labelField}>Alterar Prioridade:</Text>
            <View style={styles.prioritySelectorRow}>
              {[1, 2, 3].map(num => (
                <TouchableOpacity
                  key={num}
                  style={[styles.selectorBtn, editingOp.prioridade === num.toString() && styles.selectorBtnActive]}
                  onPress={() => setEditingOp(p => ({ ...p, prioridade: num.toString() }))}
                >
                  <Text style={[styles.selectorBtnText, editingOp.prioridade === num.toString() && { color: '#FFF' }]}>
                    {num === 1 ? '1 — Alta' : num === 2 ? '2 — Média' : '3 — Baixa'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtnsRow}>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={[styles.saveBtn, { backgroundColor: '#9E9E9E', flex: 1, marginRight: 8 }]}>
                <Text style={styles.btnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveFullEdit} style={[styles.saveBtn, { backgroundColor: '#2E7D32', flex: 1 }]}>
                <Text style={styles.btnText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL STATUS */}
      <Modal visible={statusModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Alterar Status</Text>
            {selectedOp && (
              <Text style={styles.modalSubtitle}>OP: {selectedOp.numero_op}</Text>
            )}

            {isUpdating ? (
              <ActivityIndicator size="small" color="#5A189A" style={{ marginVertical: 20 }} />
            ) : (
              STATUS_OPTIONS.map(status => {
                const sc = getStatusConfig(status);
                const isActive = selectedOp?.status === status;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOptionBtn,
                      { backgroundColor: sc.bg },
                      isActive && { borderColor: sc.text, borderWidth: 1.5 },
                    ]}
                    onPress={() => handleUpdateStatus(status)}
                  >
                    <View style={[styles.statusDot, { backgroundColor: sc.text }]} />
                    <Text style={[styles.statusOptionText, { color: sc.text }, isActive && { fontWeight: 'bold' }]}>
                      {status}
                    </Text>
                    {isActive && (
                      <MaterialIcons name="check" size={18} color={sc.text} style={{ marginLeft: 'auto' }} />
                    )}
                  </TouchableOpacity>
                );
              })
            )}

            <TouchableOpacity
              style={{ marginTop: 14, alignSelf: 'center', padding: 10 }}
              onPress={() => setStatusModalVisible(false)}
            >
              <Text style={{ color: '#5A189A', fontWeight: 'bold' }}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  containerWhite: { flex: 1, backgroundColor: '#F5F5F5' },

  headerFila: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingBottom: 10,
    backgroundColor: '#FFF', borderBottomWidth: 0.5, borderBottomColor: '#E0E0E0',
  },
  titleFila: { fontSize: 20, fontWeight: 'bold', color: '#5A189A' },
  headerButtons: { flexDirection: 'row', gap: 8 },
  addBtn: { backgroundColor: '#2E7D32', padding: 8, borderRadius: 8 },
  logoutBtn: { backgroundColor: '#5A189A', padding: 8, borderRadius: 8 },
  logoutText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },

  searchContainer: {
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: '#FFF', borderBottomWidth: 0.5, borderBottomColor: '#E0E0E0',
  },
  searchSection: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0',
    borderRadius: 8, paddingHorizontal: 10, height: 42,
  },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, color: '#333', fontSize: 14 },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 40, fontSize: 14 },

  card: {
    backgroundColor: '#FFF', marginBottom: 10, borderRadius: 12,
    elevation: 1, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },
  selectedCard: { borderWidth: 2, borderColor: '#5A189A' },
  priorityBar: { height: 4 },
  cardInner: { padding: 14 },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  opNumber: { marginLeft: 10, fontWeight: 'bold', fontSize: 16, color: '#212121' },
  statusPill: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusPillText: { fontSize: 11, fontWeight: '600' },

  machineName: { fontSize: 13, color: '#616161', marginBottom: 10 },

  priorityBadge: { marginBottom: 8, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0', paddingBottom: 6 },
  priorityText: { fontSize: 11, color: '#757575', textTransform: 'uppercase', letterSpacing: 0.5 },

  detailsContainer: {
    backgroundColor: '#FAFAFA', padding: 10,
    borderRadius: 8, borderWidth: 0.5, borderColor: '#EEEEEE',
  },
  detailText: { fontSize: 12, color: '#616161', marginBottom: 3 },
  detailBold: { fontWeight: '600', color: '#212121' },
  editAlertText: { fontSize: 10, color: '#7B1FA2', fontStyle: 'italic', marginTop: 6, textAlign: 'right' },

  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 12, alignSelf: 'flex-start',
    paddingVertical: 4, paddingHorizontal: 8,
    borderRadius: 6, borderWidth: 0.5, borderColor: '#FFCDD2',
  },
  deleteBtnText: { color: '#E53935', fontSize: 13 },

  summaryFooterCard: {
    backgroundColor: '#FFF', padding: 16,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 5,
  },
  summaryTitle: { 
    fontSize: 14, fontWeight: 'bold', color: '#424242', 
    marginBottom: 16, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 
  },
  summaryGrid: { 
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 
  },
  summaryBlock: { 
    flexDirection: 'row', alignItems: 'center', 
    width: '48%', backgroundColor: '#FAFAFA', padding: 10, 
    borderRadius: 10, borderWidth: 0.5, borderColor: '#E0E0E0'
  },
  summaryTextContainer: { 
    marginLeft: 10, flex: 1 
  },
  summaryLabel: { 
    fontSize: 11, color: '#757575', fontWeight: '600' 
  },
  summaryValue: { 
    fontSize: 14, fontWeight: '900', marginTop: 2 
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: '#FFF', padding: 20,
    borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%',
  },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: '#212121', marginBottom: 14 },
  modalSubtitle: { fontSize: 13, color: '#757575', marginBottom: 14 },

  input: {
    borderWidth: 0.5, borderColor: '#BDBDBD', marginBottom: 10,
    padding: 11, borderRadius: 8, backgroundColor: '#FAFAFA',
    fontSize: 14, color: '#212121',
  },
  labelField: { fontSize: 13, fontWeight: '600', color: '#616161', marginTop: 4, marginBottom: 6 },

  prioritySelectorRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  selectorBtn: {
    flex: 1, padding: 9, borderWidth: 0.5, borderColor: '#BDBDBD',
    borderRadius: 8, alignItems: 'center', backgroundColor: '#FAFAFA',
  },
  selectorBtnActive: { backgroundColor: '#5A189A', borderColor: '#5A189A' },
  selectorBtnText: { fontSize: 12, color: '#616161', fontWeight: '500' },

  modalBtnsRow: { flexDirection: 'row', marginTop: 4 },
  saveBtn: { backgroundColor: '#5A189A', padding: 13, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },

  statusOptionBtn: {
    flexDirection: 'row', alignItems: 'center',
    padding: 13, borderRadius: 8, marginBottom: 6,
    borderWidth: 0.5, borderColor: '#EEEEEE',
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  statusOptionText: { fontSize: 14 },
});