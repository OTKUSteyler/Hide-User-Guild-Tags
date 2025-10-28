/**
 * Hide User Guild Tags – Fixed for Vendetta
 * Properly structured plugin with correct imports and exports
 */
import { after } from "@vendetta/patcher";
import { findByProps } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import Settings from "./Settings";

/* --------------------------------------------------------------- */
/*  Storage & Helper                                               */
/* --------------------------------------------------------------- */
interface PluginStorage {
  whitelist?: string[];
}

const pluginStorage = storage as PluginStorage;

// Initialize whitelist if it doesn't exist
pluginStorage.whitelist ??= [];

const shouldHide = (userId?: string): boolean => {
  const list: string[] = pluginStorage.whitelist ?? [];
  return userId ? !list.includes(userId) : true;
};

/* --------------------------------------------------------------- */
/*  Plugin Export (Standard Vendetta Structure)                    */
/* --------------------------------------------------------------- */
export default {
  onLoad: () => {
    const patches: (() => void)[] = [];

    try {
      // 1. Patch GuildTag badge
      const GuildTagModule = findByProps("GuildTag");
      if (GuildTagModule?.GuildTag) {
        patches.push(
          after("GuildTag", GuildTagModule, (args, res) => {
            const user = args?.[0]?.user;
            if (user && shouldHide(user.id)) return null;
            return res;
          })
        );
        console.log("[HideGuildTags] Patched GuildTag");
      } else {
        console.warn("[HideGuildTags] GuildTag not found");
      }

      // 2. Patch Username text
      const UsernameModule = findByProps("Username");
      if (UsernameModule?.Username) {
        patches.push(
          after("Username", UsernameModule, (args, res) => {
            const user = args?.[0]?.user;
            if (res?.props?.guildTag && user && shouldHide(user.id)) {
              res.props.guildTag = null;
            }
            return res;
          })
        );
        console.log("[HideGuildTags] Patched Username");
      } else {
        console.warn("[HideGuildTags] Username not found");
      }

      console.log("[HideGuildTags] Loaded successfully");
    } catch (e) {
      console.error("[HideGuildTags] Load error:", e);
    }

    // Return cleanup function
    return () => {
      try {
        patches.forEach((unpatch, i) => {
          try {
            if (typeof unpatch === "function") unpatch();
          } catch (e) {
            console.warn(`[HideGuildTags] Failed to unpatch ${i}:`, e);
          }
        });
        console.log("[HideGuildTags] Unloaded cleanly");
      } catch (e) {
        console.error("[HideGuildTags] Unload error (ignored):", e);
      }
    };
  },

  settings: Settings,
};
