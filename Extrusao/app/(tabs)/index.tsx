import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Image } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);

  const handleLogin = () => {
    // Lógica futura de autenticação
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <SafeAreaProvider>
        
        {/* Título Superior */}
        <View style={styles.header}>
          <Text style={styles.title}>EXTRUSÃO</Text>
        </View>

        {/* Imagem Central */}
        <View style={styles.imageContainer}>
          <Image 
            source={require('../../assets/images/logo.png')}
            style={styles.mainImage}
            resizeMode="contain"
          />
        </View>

        {/* Área de Botões */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>ENTRAR</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => router.push('/register')} 
            style={styles.registerButton}
          >
            <Text style={styles.registerButtonText}>CADASTRAR-SE</Text>
          </TouchableOpacity>
        </View>

        {/* Modal de Aviso (PostgreSQL) */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(!modalVisible)}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <Text style={styles.modalText}>Login em desenvolvimento!</Text>
              <Text style={styles.modalSubText}>A integração com o banco de dados PostgreSQL será implementada em breve.</Text>
              <TouchableOpacity
                style={styles.buttonClose}
                onPress={() => setModalVisible(!modalVisible)}
              >
                <Text style={styles.textStyle}>Entendi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </SafeAreaProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 25,
  },
  header: {
    alignItems: 'center',
    marginTop: 50,
  },
  title: {
    fontSize: 42,
    fontWeight: '900', // Bem negrito
    color: '#333',
    letterSpacing: 2,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainImage: {
    width: '85%',
    height: 250,
  },
  buttonContainer: {
    width: '100%',
    paddingBottom: 30,
  },
  loginButton: {
    backgroundColor: '#6C63FF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 3, // Sombra leve no Android
    shadowColor: '#000', // Sombra no iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerButton: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6C63FF',
  },
  registerButtonText: {
    color: '#6C63FF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Estilos do Modal
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 25,
    padding: 35,
    alignItems: 'center',
    width: '80%',
  },
  buttonClose: {
    backgroundColor: '#6C63FF',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 30,
    marginTop: 20,
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubText: {
    textAlign: 'center',
    color: '#666',
    lineHeight: 22,
  }
});