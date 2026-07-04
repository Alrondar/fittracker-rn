import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>🎉 Добро пожаловать!</Text>
      <Text style={styles.subtext}>Вы успешно вошли</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#faf5ff' },
  text: { fontSize: 24, fontWeight: 'bold' },
  subtext: { fontSize: 16, color: '#6b7280', marginTop: 8 },
});