import { React, ReactNative as RN } from "@vendetta/metro/common";
import { useProxy } from "@vendetta/storage";
import { storage } from "@vendetta/plugin";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { Forms } from "@vendetta/ui/components";

const { FormRow, FormSection, FormInput } = Forms;

interface PluginStorage {
  whitelist?: string[];
}

export default () => {
  useProxy(storage);
  const pluginStorage = storage as PluginStorage;

  if (!pluginStorage.whitelist) {
    pluginStorage.whitelist = [];
  }

  const [userId, setUserId] = React.useState("");

  const addUser = () => {
    if (!userId.trim()) return;
    
    if (!pluginStorage.whitelist.includes(userId.trim())) {
      pluginStorage.whitelist.push(userId.trim());
      setUserId("");
    }
  };

  const removeUser = (id: string) => {
    pluginStorage.whitelist = pluginStorage.whitelist.filter(u => u !== id);
  };

  return (
    <RN.ScrollView style={{ flex: 1 }}>
      <FormSection title="Whitelist Users">
        <FormRow
          label="Add User ID"
          subLabel="Enter user ID to whitelist (show their guild tags)"
          trailing={
            <RN.TouchableOpacity onPress={addUser}>
              <RN.Text style={{ color: "#5865F2" }}>Add</RN.Text>
            </RN.TouchableOpacity>
          }
        />
        <FormInput
          value={userId}
          onChange={setUserId}
          placeholder="User ID"
        />
      </FormSection>

      <FormSection title="Whitelisted Users">
        {pluginStorage.whitelist.length === 0 ? (
          <FormRow label="No users whitelisted" />
        ) : (
          pluginStorage.whitelist.map((id) => (
            <FormRow
              key={id}
              label={id}
              trailing={
                <RN.TouchableOpacity onPress={() => removeUser(id)}>
                  <RN.Text style={{ color: "#ED4245" }}>Remove</RN.Text>
                </RN.TouchableOpacity>
              }
            />
          ))
        )}
      </FormSection>
    </RN.ScrollView>
  );
};
