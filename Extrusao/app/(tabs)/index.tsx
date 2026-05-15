import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, StatusBar, Alert } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router'; // Voltamos com o router!

export default function Index() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (username === 'adm' && password === '123') {
      // Usamos 'replace' em vez de 'push' para que o operador não 
      // consiga voltar para a tela de login apertando o botão "Voltar" do celular
      router.replace('/fila'); 
    } else {
      Alert.alert("Acesso Negado", "Usuário ou senha incorretos.");
    }
  };

  return (
    <SafeAreaView style={styles.containerPurple}>
      <SafeAreaProvider style={styles.centerWrapper}>
        <StatusBar barStyle="light-content" backgroundColor="#5A189A" />
        <View style={styles.formContainer}>
          <Text style={styles.loginTitle}>Acesso Operacional</Text>
          <Text style={styles.loginSubtitle}>Entre com suas credenciais</Text>

          <TextInput
            style={styles.input}
            placeholder="Usuário"
            placeholderTextColor="#999"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Senha"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={true}
            keyboardType="numeric"
          />

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>ENTRAR</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  containerPurple: { flex: 1, backgroundColor: '#5A189A' },
  centerWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 25 },
  formContainer: { width: '100%', alignItems: 'center' },
  loginTitle: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', marginBottom: 5 },
  loginSubtitle: { fontSize: 16, color: '#D1C4E9', marginBottom: 35 },
  input: {
    width: '100%', backgroundColor: '#FFFFFF', padding: 18, borderRadius: 12,
    marginBottom: 15, fontSize: 16, color: '#5A189A', fontWeight: 'bold',
  },
  loginButton: {
    width: '100%', backgroundColor: '#FFFFFF', padding: 18, borderRadius: 12,
    alignItems: 'center', marginTop: 10, elevation: 5,
  },
  loginButtonText: { color: '#5A189A', fontSize: 18, fontWeight: 'bold' }
});