/**
 * Hide User Guild Tags – Fixed for ShiggyCord/Vendetta
 * Fixes: Exposes 'patcher' property for unload compatibility
 */

import { after } from "@vendetta/patcher";
import { findByProps } from "@vendetta/metro";
import { storage } from "@vendetta/storage";
import Settings from "./Settings";

// Expose 'patcher' as an object for the loader (holds unpatch functions)
const patcher = { patches: [] as (() => void)[] };

/* --------------------------------------------------------------- */
/*  Storage & Helper (unchanged)                                   */
/* --------------------------------------------------------------- */
storage.whitelist ??= [];

const shouldHide = (userId?: string): boolean => {
  const list: string[] = storage.whitelist ?? [];
  return userId ? !list.includes(userId) : true;
};

/* --------------------------------------------------------------- */
/*  onLoad – Apply patches safely                                   */
/* --------------------------------------------------------------- */
export const onLoad = () => {
  try {
    // 1. GuildTag badge
    const GuildTagModule = findByProps("GuildTag");
    if (GuildTagModule?.GuildTag) {
      const unpatch = after("GuildTag", GuildTagModule, (args, res) => {
        const user = args?.[0]?.user;
        if (user && shouldHide(user.id)) return null;
        return res;
      });
      patcher.patches.push(unpatch);
      console.log("[HideGuildTags] Patched GuildTag");
    } else {
      console.warn("[HideGuildTags] GuildTag not found");
    }

    // 2. Username text
    const UsernameModule = findByProps("Username");
    if (UsernameModule?.Username) {
      const unpatch = after("Username", UsernameModule, (args, res) => {
        const user = args?.[0]?.user;
        if (res?.props?.guildTag && user && shouldHide(user.id)) {
          res.props.guildTag = null;
        }
        return res;
      });
      patcher.patches.push(unpatch);
      console.log("[HideGuildTags] Patched Username");
    } else {
      console.warn("[HideGuildTags] Username not found");
    }

    console.log("[HideGuildTags] Loaded successfully");
  } catch (e) {
    console.error("[HideGuildTags] Load error:", e);
  }
};

/* --------------------------------------------------------------- */
/*  onUnload – Robust cleanup (no crash on missing refs)           */
/* --------------------------------------------------------------- */
export const onUnload = () => {
  try {
    // Use the exposed patcher.patches for cleanup
    patcher.patches.forEach((unpatch, i) => {
      try {
        if (typeof unpatch === 'function') unpatch();
      } catch (e) {
        console.warn(`[HideGuildTags] Failed to unpatch ${i}:`, e);
      }
    });
    patcher.patches = [];  // Clear for next load
    console.log("[HideGuildTags] Unloaded cleanly");
  } catch (e) {
    console.error("[HideGuildTags] Unload error (ignored):", e);
  }
};

/* --------------------------------------------------------------- */
/*  Export patcher for loader access                               */
/* --------------------------------------------------------------- */
export { patcher };

/* --------------------------------------------------------------- */
/*  Settings UI (unchanged)                                        */
/* --------------------------------------------------------------- */
export const settings = Settings;
