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

  const [newOp, setNewOp] = useState({
    numero_op: '',
    maquina: '',
  });

  // GET
  const fetchOps = async () => {
    try {
      setLoading(true);
      const res = await api.get('/Ops');
      setOps(res.data);
    } catch {
      Alert.alert('Erro', 'Falha ao carregar OPs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOps();
  }, []);

  const toggleSelection = (id: string) => {
    setSelectedOps(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/Ops/${id}`);
      setOps(prev => prev.filter(op => op.id !== id));
    } catch {
      Alert.alert('Erro', 'Falha ao deletar');
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedOp) return;

    try {
      setIsUpdating(true);

      await api.put(`/Ops/${selectedOp.id}`, {
        ...selectedOp,
        status,
      });

      setOps(prev =>
        prev.map(op =>
          op.id === selectedOp.id
            ? { ...op, status }
            : op
        )
      );

      setStatusModalVisible(false);
      setSelectedOp(null);

    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddOp = async () => {
    if (!newOp.numero_op || !newOp.maquina) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    try {
      const res = await api.post('/Ops', {
        numero_op: newOp.numero_op,
        maquina: newOp.maquina,
        estrutura: 'Padrão',
        espessura: 100,
        largura_cm: 120,
        tempo_setup_minutos: 30,
        tempo_producao_horas: 1,
        status: 'Pendente',
        observacao: '',
      });

      setOps(prev => [res.data, ...prev]);
      setModalVisible(false);
      setNewOp({ numero_op: '', maquina: '' });

    } catch {
      Alert.alert('Erro', 'Não salvou no MockAPI');
    }
  };

  const handleLogout = () => router.replace('/');

  return (
    <SafeAreaView style={styles.containerWhite}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.headerFila}>
        <Text style={styles.titleFila}>Fila de Produção</Text>

        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setModalVisible(true)}
          >
            <MaterialIcons name="add" size={20} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
          >
            <Text style={styles.logoutText}>SAIR</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* LIST */}
      {loading ? (
        <ActivityIndicator size="large" color="#5A189A" />
      ) : (
        <FlatList
          data={ops}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => {
            const selected = selectedOps.includes(item.id);

            return (
              <View style={[styles.card, selected && styles.selectedCard]}>

                {/* HEADER CARD */}
                <View style={styles.cardHeader}>

                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Checkbox
                      value={selected}
                      onValueChange={() => toggleSelection(item.id)}
                    />

                    <Text style={styles.opNumber}>
                      {item.numero_op}
                    </Text>

                    {/* STATUS VISUAL */}
                    <Text style={styles.status}>
                      {item.status}
                    </Text>
                  </View>

                  {/* SETA STATUS */}
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedOp(item);
                      setStatusModalVisible(true);
                    }}
                  >
                    <MaterialIcons name="keyboard-arrow-down" size={26} color="#5A189A" />
                  </TouchableOpacity>

                </View>

                <Text style={styles.machineName}>
                  {item.maquina}
                </Text>

                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Text style={{ color: 'red', marginTop: 5 }}>Excluir</Text>
                </TouchableOpacity>

              </View>
            );
          }}
        />
      )}

      {/* MODAL ADD */}
      <Modal visible={modalVisible} transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TextInput
              placeholder="Número OP"
              style={styles.input}
              value={newOp.numero_op}
              onChangeText={t => setNewOp(prev => ({ ...prev, numero_op: t }))}
            />

            <TextInput
              placeholder="Máquina"
              style={styles.input}
              value={newOp.maquina}
              onChangeText={t => setNewOp(prev => ({ ...prev, maquina: t }))}
            />

            <TouchableOpacity onPress={handleAddOp} style={styles.saveBtn}>
              <Text style={styles.btnText}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL STATUS */}
      <Modal visible={statusModalVisible} transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>

            <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>
              Alterar Status
            </Text>

            {STATUS_OPTIONS.map(status => (
              <TouchableOpacity
                key={status}
                style={styles.statusBtn}
                onPress={() => handleUpdateStatus(status)}
              >
                <Text>{status}</Text>
              </TouchableOpacity>
            ))}

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

/* CSS */
const styles = StyleSheet.create({

  containerWhite: { flex: 1, backgroundColor: '#F8F9FA' },

  headerFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },

  titleFila: { fontSize: 20, fontWeight: 'bold', color: '#5A189A' },

  headerButtons: { flexDirection: 'row' },

  addBtn: { backgroundColor: '#00C853', padding: 8, borderRadius: 8, marginRight: 10 },

  logoutBtn: { backgroundColor: '#5A189A', padding: 8, borderRadius: 8 },

  logoutText: { color: '#FFF' },

  card: { backgroundColor: '#FFF', padding: 15, marginBottom: 10, borderRadius: 12 },

  selectedCard: { borderWidth: 2, borderColor: '#5A189A' },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },

  opNumber: { marginLeft: 10, fontWeight: 'bold' },

  status: {
    marginLeft: 10,
    fontSize: 12,
    color: '#5A189A',
    fontWeight: 'bold'
  },

  machineName: { marginTop: 5, color: '#333' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },

  modalContainer: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
  },

  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    marginBottom: 10,
    padding: 10,
    borderRadius: 8,
  },

  saveBtn: {
    backgroundColor: '#5A189A',
    padding: 12,
    borderRadius: 8,
  },

  btnText: { color: '#FFF', textAlign: 'center' },

  statusBtn: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: '#EEE'
  }
});