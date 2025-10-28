import { React } from "@vendetta/metro/common";
import { View, TextInput, Text, TouchableOpacity, ScrollView } from "react-native";
import { storage } from "@vendetta/plugin";

export default function Settings() {
  const [input, setInput] = React.useState("");
  const [whitelist, setWhitelist] = React.useState<string[]>(storage.whitelist ?? []);

  const addUser = () => {
    if (!input.trim()) return;
    const newList = [...whitelist, input.trim()];
    storage.whitelist = newList;
    setWhitelist(newList);
    setInput("");
  };

  const removeUser = (id: string) => {
    const newList = whitelist.filter((x) => x !== id);
    storage.whitelist = newList;
    setWhitelist(newList);
  };

  return (
    <ScrollView style={{ padding: 12 }}>
      <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>
        HideGuildTags Settings
      </Text>
      <Text style={{ color: "gray", marginBottom: 10 }}>
        Add user IDs you want to exclude from hiding guild tags.
      </Text>

      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Enter user ID..."
          placeholderTextColor="gray"
          style={{
            flex: 1,
            backgroundColor: "#202225",
            color: "white",
            padding: 8,
            borderRadius: 8,
            marginRight: 8,
          }}
        />
        <TouchableOpacity
          onPress={addUser}
          style={{
            backgroundColor: "#5865F2",
            padding: 10,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "white", fontWeight: "bold" }}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: 15 }}>
        {whitelist.length === 0 ? (
          <Text style={{ color: "gray" }}>No users whitelisted yet.</Text>
        ) : (
          whitelist.map((id) => (
            <View
              key={id}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#2f3136",
                padding: 10,
                borderRadius: 8,
                marginTop: 5,
              }}
            >
              <Text style={{ color: "white" }}>{id}</Text>
              <TouchableOpacity
                onPress={() => removeUser(id)}
                style={{ backgroundColor: "#ED4245", padding: 6, borderRadius: 6 }}
              >
                <Text style={{ color: "white" }}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
