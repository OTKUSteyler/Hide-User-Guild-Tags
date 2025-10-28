/**
 * Hide User Guild Tags – Revenge (from Vendetta fork)
 * Compatible with Discord 300.18+ (Oct 2025)
 */

import { patch } from "@revenge/patcher";
import { findByPropsLazy, findByCodeLazy, chunks } from "@revenge/metro";
import { storage } from "@revenge/storage";
import Settings from "./Settings";

let patches: (() => void)[] = [];

storage.whitelist ??= [];

const shouldHide = (userId?: string) => {
  const list: string[] = storage.whitelist ?? [];
  return userId ? !list.includes(userId) : true;
};

// Chunk scanner for minified 300.x modules
const findModuleByStrings = (strings: string[]) => {
  for (const chunk of chunks()) {
    for (const m of chunk) {
      if (strings.every(s => m.toString().includes(s))) return m;
    }
  }
  return null;
};

export const onLoad = () => {
  try {
    // 1. Patch UserGuildTag (updated name in 300.x)
    let GuildTagMod = findByPropsLazy(["UserGuildTag", "renderGuildTag"]);
    if (!GuildTagMod) {
      GuildTagMod = findModuleByStrings(["UserGuildTag", "user?.id", "guild_id"]);
    }
    if (GuildTagMod?.default || GuildTagMod?.UserGuildTag) {
      const target = GuildTagMod.default || GuildTagMod.UserGuildTag;
      const unpatch = patch(target, "type" in target ? "type" : "default", (args, res) => {
        const user = args[0]?.user || args[0]?.props?.user;
        if (user && shouldHide(user.id)) return null;
        return res;
      });
      patches.push(unpatch);
      console.log("[HideGuildTags] Patched UserGuildTag");
    } else {
      console.warn("[HideGuildTags] UserGuildTag not found");
    }

    // 2. Patch MessageUsername (updated in 300.x)
    let UsernameMod = findByPropsLazy(["MessageUsername", "renderTag"]);
    if (!UsernameMod) {
      UsernameMod = findModuleByStrings(["MessageUsername", "guildTag", "user.id"]);
    }
    if (UsernameMod?.default || UsernameMod?.MessageUsername) {
      const target = UsernameMod.default || UsernameMod.MessageUsername;
      const unpatch = patch(target, "type" in target ? "type" : "default", (args, res) => {
        const user = args[0]?.user || args[0]?.props?.user;
        if (res?.props?.guildTag && user && shouldHide(user.id)) {
          res.props.guildTag = null;
        }
        return res;
      });
      patches.push(unpatch);
      console.log("[HideGuildTags] Patched MessageUsername");
    } else {
      console.warn("[HideGuildTags] MessageUsername not found");
    }

    console.log("[HideGuildTags] Loaded in Revenge");
  } catch (e) {
    console.error("[HideGuildTags] Load error:", e);
  }
};

export const onUnload = () => {
  patches.forEach(fn => { try { fn(); } catch {} });
  patches = [];
  console.log("[HideGuildTags] Unloaded");
};

export const settings = Settings;
