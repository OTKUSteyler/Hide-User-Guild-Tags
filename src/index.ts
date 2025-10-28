/**
 *  HideUserGuildTags – Revenge template
 *  -------------------------------------------------
 *  • Uses @revenge/patcher  → patch(component, name, fn)
 *  • Uses @revenge/metro    → findByProps / findByName
 *  • Uses @revenge/storage  → persistent storage
 *  -------------------------------------------------
 */

import { patch } from "@revenge/patcher";
import { findByProps } from "@revenge/metro";
import { storage } from "@revenge/storage";
import Settings from "./Settings";

/* --------------------------------------------------------------- */
/*  Storage – whitelist of user IDs that KEEP the guild tag        */
/* --------------------------------------------------------------- */
storage.whitelist ??= [];

/* --------------------------------------------------------------- */
/*  Helper – should we hide the tag for this user?                 */
/* --------------------------------------------------------------- */
function shouldHide(userId?: string): boolean {
  const list: string[] = storage.whitelist ?? [];
  return userId ? !list.includes(userId) : true;
}

/* --------------------------------------------------------------- */
/*  Patch array – collect unpatch functions for clean unload       */
/* --------------------------------------------------------------- */
let patches: (() => void)[] = [];

/* --------------------------------------------------------------- */
/*  onLoad – find components & apply patches                       */
/* --------------------------------------------------------------- */
export const onLoad = () => {
  try {
    /* ---------- 1. GuildTag badge (the little icon) ---------- */
    const GuildTagMod = findByProps("GuildTag");
    if (GuildTagMod?.GuildTag) {
      const unpatch = patch(GuildTagMod, "GuildTag", (args, res) => {
        const user = args?.[0]?.user;
        if (user && shouldHide(user.id)) return null;   // hide whole badge
        return res;
      });
      patches.push(unpatch);
    } else {
      console.warn("[HideGuildTags] GuildTag component not found");
    }

    /* ---------- 2. Username text (contains guildTag prop) ---------- */
    const UsernameMod = findByProps("Username");
    if (UsernameMod?.Username) {
      const unpatch = patch(UsernameMod, "Username", (args, res) => {
        const user = args?.[0]?.user;
        if (res?.props?.guildTag && user && shouldHide(user.id)) {
          delete res.props.guildTag;   // strip the prop
        }
        return res;
      });
      patches.push(unpatch);
    } else {
      console.warn("[HideGuildTags] Username component not found");
    }

    console.log("[HideGuildTags] Plugin loaded");
  } catch (e) {
    console.error("[HideGuildTags] Load error:", e);
  }
};

/* --------------------------------------------------------------- */
/*  onUnload – remove every patch                                 */
/* --------------------------------------------------------------- */
export const onUnload = () => {
  patches.forEach(fn => {
    try { fn(); } catch {}
  });
  patches = [];
  console.log("[HideGuildTags] Plugin unloaded");
};

/* --------------------------------------------------------------- */
/*  Settings UI – exported so Revenge can show it                 */
/* --------------------------------------------------------------- */
export const settings = Settings;
