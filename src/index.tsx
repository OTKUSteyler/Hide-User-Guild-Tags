import { before, after } from "@vendetta/patcher";
import { findByProps } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import Settings from "./Settings";

let patches: (() => void)[] = [];

function shouldHide(userId?: string): boolean {
  const whitelist = storage.whitelist ?? [];
  return userId ? !whitelist.includes(userId) : true;
}

export const onLoad = () => {
  try {
    storage.whitelist ??= [];

    const GuildTagModule = findByProps("GuildTag");
    if (GuildTagModule?.GuildTag) {
      const unpatch = after("GuildTag", GuildTagModule, (args, res: any) => {
        const user = args?.[0]?.user;
        if (user && shouldHide(user.id)) return null;
        return res;
      });
      patches.push(unpatch);
    } else {
      console.warn("[HideGuildTags] GuildTag component not found.");
    }

    const MessageUsername = findByProps("Username");
    if (MessageUsername?.Username) {
      const unpatch = after("Username", MessageUsername, (args, res: any) => {
        const user = args?.[0]?.user;
        if (res && user && shouldHide(user.id)) {
          if (res.props?.guildTag) res.props.guildTag = null;
        }
        return res;
      });
      patches.push(unpatch);
    } else {
      console.warn("[HideGuildTags] Username component not found.");
    }

    console.log("[HideGuildTags] Loaded successfully");
  } catch (e) {
    console.error("[HideGuildTags] Error during load:", e);
  }
};

export const onUnload = () => {
  for (const un of patches) try { un(); } catch {}
  patches = [];
  console.log("[HideGuildTags] Unloaded.");
};

export const settings = Settings;
