import { React } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";

export default function Settings() {
  const [ids, setIds] = React.useState<string[]>(storage.whitelist ?? []);
  const [input, setInput] = React.useState("");

  const save = (newList: string[]) => {
    storage.whitelist = newList;
    setIds([...newList]);
  };

  const addId = () => {
    if (!input.trim()) return;
    if (!ids.includes(input.trim())) {
      save([...ids, input.trim()]);
      setInput("");
    }
  };

  const removeId = (id: string) => {
    save(ids.filter((x) => x !== id));
  };

  return (
    <View style={{ padding: 12 }}>
      <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>
        HideGuildTags Settings
      </Text>

      <Text style={{ color: "gray", marginVertical: 6 }}>
        Add user IDs to keep their guild tags visible.
      </Text>

      <View style={{ flexDirection: "row", marginBottom: 10 }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="User ID"
          placeholderTextColor="#888"
          style={{
            flex: 1,
            backgroundColor: "#202225",
            color: "white",
            padding: 8,
            borderRadius: 6,
          }}
        />
        <TouchableOpacity
          onPress={addId}
          style={{
            backgroundColor: "#5865F2",
            paddingHorizontal: 10,
            marginLeft: 6,
            borderRadius: 6,
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "bold" }}>Add</Text>
        </TouchableOpacity>
      </View>

      {ids.length === 0 ? (
        <Text style={{ color: "gray" }}>No whitelisted users yet.</Text>
      ) : (
        ids.map((id) => (
          <View
            key={id}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              backgroundColor: "#2f3136",
              padding: 8,
              borderRadius: 6,
              marginTop: 6,
            }}
          >
            <Text style={{ color: "white" }}>{id}</Text>
            <TouchableOpacity
              onPress={() => removeId(id)}
              style={{
                backgroundColor: "#ED4245",
                paddingHorizontal: 8,
                borderRadius: 6,
              }}
            >
              <Text style={{ color: "white" }}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}

const { View, Text, TextInput, TouchableOpacity } = React;
