/**
 * Hide User Guild Tags – Fixed for Vendetta
 * Robust version with proper error handling
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
if (!pluginStorage.whitelist) {
  pluginStorage.whitelist = [];
}

const shouldHide = (userId?: string): boolean => {
  const list: string[] = pluginStorage.whitelist ?? [];
  return userId ? !list.includes(userId) : true;
};

/* --------------------------------------------------------------- */
/*  Main Plugin                                                     */
/* --------------------------------------------------------------- */
let patches: (() => void)[] = [];

export const onLoad = () => {
  console.log("[HideGuildTags] Starting plugin...");
  
  try {
    // 1. Patch GuildTag badge
    try {
      const GuildTagModule = findByProps("GuildTag");
      if (GuildTagModule?.GuildTag) {
        const unpatch = after("GuildTag", GuildTagModule, (args, res) => {
          try {
            const user = args?.[0]?.user;
            if (user && shouldHide(user.id)) return null;
            return res;
          } catch (e) {
            console.error("[HideGuildTags] GuildTag patch error:", e);
            return res;
          }
        });
        patches.push(unpatch);
        console.log("[HideGuildTags] ✓ Patched GuildTag");
      } else {
        console.warn("[HideGuildTags] ⚠ GuildTag module not found");
      }
    } catch (e) {
      console.error("[HideGuildTags] Failed to patch GuildTag:", e);
    }

    // 2. Patch Username text
    try {
      const UsernameModule = findByProps("Username");
      if (UsernameModule?.Username) {
        const unpatch = after("Username", UsernameModule, (args, res) => {
          try {
            const user = args?.[0]?.user;
            if (res?.props?.guildTag && user && shouldHide(user.id)) {
              res.props.guildTag = null;
            }
            return res;
          } catch (e) {
            console.error("[HideGuildTags] Username patch error:", e);
            return res;
          }
        });
        patches.push(unpatch);
        console.log("[HideGuildTags] ✓ Patched Username");
      } else {
        console.warn("[HideGuildTags] ⚠ Username module not found");
      }
    } catch (e) {
      console.error("[HideGuildTags] Failed to patch Username:", e);
    }

    console.log("[HideGuildTags] ✓ Plugin loaded successfully");
  } catch (e) {
    console.error("[HideGuildTags] Critical load error:", e);
    throw e; // Re-throw to signal load failure
  }
};

export const onUnload = () => {
  console.log("[HideGuildTags] Unloading plugin...");
  
  try {
    patches.forEach((unpatch, i) => {
      try {
        if (typeof unpatch === "function") {
          unpatch();
        }
      } catch (e) {
        console.warn(`[HideGuildTags] Failed to unpatch ${i}:`, e);
      }
    });
    patches = [];
    console.log("[HideGuildTags] ✓ Plugin unloaded cleanly");
  } catch (e) {
    console.error("[HideGuildTags] Unload error:", e);
  }
};

export { Settings as settings };
