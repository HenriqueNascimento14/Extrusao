import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function Register() {
  const router = useRouter();
  
  // Estados dos campos
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Estado da validação da senha
  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    specialChar: false,
  });

  // Função para formatar o telefone: (99) 99999-9999
  const handlePhoneChange = (text: string) => {
    // Remove tudo que não for número
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;

    if (cleaned.length > 0) {
      if (cleaned.length <= 2) {
        formatted = `(${cleaned}`;
      } else if (cleaned.length <= 7) {
        formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
      } else {
        formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
      }
    }
    setPhone(formatted);
  };

  // Função para validar a senha em tempo real
  const handlePasswordChange = (text: string) => {
    setPassword(text);
    setPasswordCriteria({
      length: text.length >= 8,
      uppercase: /[A-Z]/.test(text),
      lowercase: /[a-z]/.test(text),
      number: /[0-9]/.test(text),
      specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(text),
    });
  };

  const handleRegister = () => {
    // Verifica se todos os critérios da senha são verdadeiros
    const isPasswordValid = Object.values(passwordCriteria).every(Boolean);
    
    if (!isPasswordValid) {
      alert("A senha não atende a todos os requisitos!");
      return;
    }
    
    // Lógica futura de cadastro no banco de dados aqui
    alert("Cadastro simulado com sucesso!");
    router.back(); // Volta para a tela de login
  };

  return (
    <SafeAreaView style={styles.container}>
      <SafeAreaProvider>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            
            {/* Botão de Voltar e Título */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Text style={styles.backButtonText}>← Voltar</Text>
              </TouchableOpacity>
              <Text style={styles.title}>CADASTRAR</Text>
            </View>

            {/* Formulário */}
            <View style={styles.formContainer}>
              
              <Text style={styles.label}>Nome Completo</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: João da Silva"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />

              <Text style={styles.label}>Telefone</Text>
              <TextInput
                style={styles.input}
                placeholder="(00) 00000-0000"
                value={phone}
                onChangeText={handlePhoneChange}
                keyboardType="numeric"
                maxLength={15} // Limita o tamanho para (XX) XXXXX-XXXX
              />

              <Text style={styles.label}>E-mail</Text>
              <TextInput
                style={styles.input}
                placeholder="seuemail@exemplo.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Senha</Text>
              <TextInput
                style={styles.input}
                placeholder="Crie uma senha forte"
                value={password}
                onChangeText={handlePasswordChange}
                secureTextEntry={true}
              />

              {/* Critérios de Validação da Senha */}
              <View style={styles.criteriaContainer}>
                <Text style={styles.criteriaTitle}>Sua senha deve conter:</Text>
                
                <View style={styles.criteriaRow}>
                  <Text style={passwordCriteria.length ? styles.validIcon : styles.invalidIcon}>
                    {passwordCriteria.length ? '✓' : '✕'}
                  </Text>
                  <Text style={passwordCriteria.length ? styles.validText : styles.invalidText}>Pelo menos 8 caracteres</Text>
                </View>

                <View style={styles.criteriaRow}>
                  <Text style={passwordCriteria.uppercase ? styles.validIcon : styles.invalidIcon}>
                    {passwordCriteria.uppercase ? '✓' : '✕'}
                  </Text>
                  <Text style={passwordCriteria.uppercase ? styles.validText : styles.invalidText}>Uma letra maiúscula</Text>
                </View>

                <View style={styles.criteriaRow}>
                  <Text style={passwordCriteria.lowercase ? styles.validIcon : styles.invalidIcon}>
                    {passwordCriteria.lowercase ? '✓' : '✕'}
                  </Text>
                  <Text style={passwordCriteria.lowercase ? styles.validText : styles.invalidText}>Uma letra minúscula</Text>
                </View>

                <View style={styles.criteriaRow}>
                  <Text style={passwordCriteria.number ? styles.validIcon : styles.invalidIcon}>
                    {passwordCriteria.number ? '✓' : '✕'}
                  </Text>
                  <Text style={passwordCriteria.number ? styles.validText : styles.invalidText}>Um número</Text>
                </View>

                <View style={styles.criteriaRow}>
                  <Text style={passwordCriteria.specialChar ? styles.validIcon : styles.invalidIcon}>
                    {passwordCriteria.specialChar ? '✓' : '✕'}
                  </Text>
                  <Text style={passwordCriteria.specialChar ? styles.validText : styles.invalidText}>Um caractere especial (@, !, #, etc.)</Text>
                </View>
              </View>

              {/* Botão Cadastrar */}
              <TouchableOpacity 
                style={[
                  styles.registerButton, 
                  // Desativa visualmente o botão se a senha não estiver 100% válida
                  !Object.values(passwordCriteria).every(Boolean) && styles.registerButtonDisabled
                ]} 
                onPress={handleRegister}
              >
                <Text style={styles.registerButtonText}>CADASTRAR-SE</Text>
              </TouchableOpacity>

            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContainer: {
    padding: 25,
    paddingBottom: 50,
  },
  header: {
    marginTop: 20,
    marginBottom: 30,
  },
  backButton: {
    marginBottom: 15,
  },
  backButtonText: {
    color: '#6C63FF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#333',
    letterSpacing: 1,
  },
  formContainer: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#FFF',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#DDD',
    fontSize: 16,
  },
  criteriaContainer: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  criteriaTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  criteriaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  validIcon: {
    color: '#4CAF50',
    fontWeight: 'bold',
    marginRight: 8,
    fontSize: 16,
  },
  invalidIcon: {
    color: '#F44336',
    fontWeight: 'bold',
    marginRight: 8,
    fontSize: 16,
  },
  validText: {
    color: '#4CAF50',
    fontSize: 14,
  },
  invalidText: {
    color: '#666',
    fontSize: 14,
  },
  registerButton: {
    backgroundColor: '#6C63FF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  registerButtonDisabled: {
    backgroundColor: '#A5A1E5',
  },
  registerButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});