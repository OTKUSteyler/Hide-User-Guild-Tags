import { React, ReactNative as RN } from "@vendetta/metro/common";
import { useProxy } from "@vendetta/storage";
import { storage } from "@vendetta/plugin";

const { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } = RN;

interface PluginStorage {
  whitelist?: string[];
}

export default function Settings() {
  useProxy(storage);
  const pluginStorage = storage as PluginStorage;

  if (!pluginStorage.whitelist) {
    pluginStorage.whitelist = [];
  }

  const [userId, setUserId] = React.useState("");

  const addUser = () => {
    const trimmedId = userId.trim();
    if (!trimmedId) return;
    
    if (!pluginStorage.whitelist.includes(trimmedId)) {
      pluginStorage.whitelist.push(trimmedId);
      setUserId("");
    }
  };

  const removeUser = (id: string) => {
    pluginStorage.whitelist = pluginStorage.whitelist.filter(u => u !== id);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: "#1e1e1e",
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: "#b9bbbe",
      marginBottom: 8,
      textTransform: "uppercase",
    },
    card: {
      backgroundColor: "#2f3136",
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
    },
    input: {
      backgroundColor: "#202225",
      color: "#dcddde",
      borderRadius: 4,
      padding: 12,
      fontSize: 16,
      marginBottom: 8,
    },
    button: {
      backgroundColor: "#5865f2",
      borderRadius: 4,
      padding: 12,
      alignItems: "center",
    },
    buttonDisabled: {
      backgroundColor: "#4e5058",
    },
    buttonText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "600",
    },
    userRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: "#2f3136",
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
    },
    userId: {
      color: "#dcddde",
      fontSize: 16,
      flex: 1,
    },
    removeButton: {
      backgroundColor: "#ed4245",
      borderRadius: 4,
      padding: 8,
      paddingHorizontal: 12,
    },
    removeButtonText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "600",
    },
    emptyText: {
      color: "#72767d",
      fontSize: 14,
      textAlign: "center",
      padding: 16,
    },
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add User to Whitelist</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            value={userId}
            onChangeText={setUserId}
            placeholder="Enter User ID"
            placeholderTextColor="#72767d"
          />
          <TouchableOpacity
            style={[styles.button, !userId.trim() && styles.buttonDisabled]}
            onPress={addUser}
            disabled={!userId.trim()}
          >
            <Text style={styles.buttonText}>Add User</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Whitelisted Users ({pluginStorage.whitelist.length})
        </Text>
        {pluginStorage.whitelist.length === 0 ? (
          <Text style={styles.emptyText}>
            No users whitelisted{"\n"}Guild tags hidden for all users
          </Text>
        ) : (
          pluginStorage.whitelist.map((id) => (
            <View key={id} style={styles.userRow}>
              <Text style={styles.userId}>{id}</Text>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeUser(id)}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
