import { Forms } from "@vendetta/ui";
import { storage } from "@vendetta/storage";
import { getAssetId } from "@vendetta/ui/assets";

const { Form, FormSection, FormRow, FormInput, FormDivider } = Forms;

export default function Settings() {
  const [input, setInput] = React.useState("");

  const add = () => {
    const id = input.trim();
    if (!id) return;
    const list = storage.whitelist ?? [];
    if (!list.includes(id)) {
      storage.whitelist = [...list, id];
    }
    setInput("");
  };

  const remove = (id: string) => {
    storage.whitelist = (storage.whitelist ?? []).filter(x => x !== id);
  };

  return (
    <Form>
      <FormSection title="Whitelist User IDs (keep tag)">
        <FormRow
          label="Add ID"
          trailing={<FormInput placeholder="123456789012345678" value={input} onChange={setInput} />}
          onPress={add}
        />
        <FormDivider />
        {(storage.whitelist ?? []).map(id => (
          <FormRow
            key={id}
            label={id}
            trailing={<Forms.FormIcon source={getAssetId("ic_close")} />}
            onPress={() => remove(id)}
          />
        ))}
      </FormSection>
    </Form>
  );
}
