/**
 *  Hide User Guild Tags – Vendetta
 *  Uses: @vendetta/patcher.after
 */

import { after } from "@vendetta/patcher";
import { findByProps } from "@vendetta/metro";
import { storage } from "@vendetta/storage";
import Settings from "./Settings";

let patches: (() => void)[] = [];

/* --------------------------------------------------------------- */
/*  Storage – whitelist of user IDs that KEEP the tag              */
/* --------------------------------------------------------------- */
storage.whitelist ??= [];

/* --------------------------------------------------------------- */
/*  Helper – should we hide?                                       */
/* --------------------------------------------------------------- */
const shouldHide = (userId?: string): boolean => {
  const list: string[] = storage.whitelist ?? [];
  return userId ? !list.includes(userId) : true;
};

/* --------------------------------------------------------------- */
/*  onLoad – find components and patch                             */
/* --------------------------------------------------------------- */
export const onLoad = () => {
  try {
    /* --------------------- 1. GuildTag badge --------------------- */
    const GuildTagModule = findByProps("GuildTag");
    if (GuildTagModule?.GuildTag) {
      const unpatch = after("GuildTag", GuildTagModule, (args, res) => {
        const user = args?.[0]?.user;
        if (user && shouldHide(user.id)) return null;
        return res;
      });
      patches.push(unpatch);
    } else {
      console.warn("[HideGuildTags] GuildTag component not found");
    }

    /* --------------------- 2. Username text ---------------------- */
    const UsernameModule = findByProps("Username");
    if (UsernameModule?.Username) {
      const unpatch = after("Username", UsernameModule, (args, res) => {
        const user = args?.[0]?.user;
        if (res?.props?.guildTag && user && shouldHide(user.id)) {
          res.props.guildTag = null;  // or delete res.props.guildTag
        }
        return res;
      });
      patches.push(unpatch);
    } else {
      console.warn("[HideGuildTags] Username component not found");
    }

    console.log("[HideGuildTags] Loaded (Vendetta)");
  } catch (e) {
    console.error("[HideGuildTags] Load error:", e);
  }
};

/* --------------------------------------------------------------- */
/*  onUnload – clean up all patches                                */
/* --------------------------------------------------------------- */
export const onUnload = () => {
  patches.forEach(unpatch => {
    try { unpatch(); } catch {}
  });
  patches = [];
  console.log("[HideGuildTags] Unloaded");
};

/* --------------------------------------------------------------- */
/*  Settings UI                                                    */
/* --------------------------------------------------------------- */
export const settings = Settings;
