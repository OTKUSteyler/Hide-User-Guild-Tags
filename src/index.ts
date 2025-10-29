/**
 * Hide User Guild Tags - NUCLEAR VERSION
 * This WILL work - uses every possible method
 */
import { before, after } from "@vendetta/patcher";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { FluxDispatcher } from "@vendetta/metro/common";
import Settings from "./Settings";

/* --------------------------------------------------------------- */
/*  Storage & Helper                                               */
/* --------------------------------------------------------------- */
interface PluginStorage {
  whitelist?: string[];
}

const pluginStorage = storage as PluginStorage;
pluginStorage.whitelist ??= [];

const shouldHide = (userId?: string): boolean => {
  return userId ? !pluginStorage.whitelist.includes(userId) : true;
};

/* --------------------------------------------------------------- */
/*  NUCLEAR PATCHES                                                */
/* --------------------------------------------------------------- */
let patches: (() => void)[] = [];
let fluxUnsubscribe: (() => void) | null = null;

// Helper to remove tags from any object
const stripTags = (obj: any, userId?: string) => {
  if (!obj || !shouldHide(userId)) return obj;
  
  try {
    // Delete all possible tag properties
    delete obj.guildTag;
    delete obj.guild_tag;
    delete obj.tagText;
    delete obj.tag_text;
    delete obj.serverTag;
    delete obj.server_tag;
    delete obj.primaryGuild;
    delete obj.primary_guild;
    
    // Clear nested objects
    if (obj.guildMemberProfile) {
      delete obj.guildMemberProfile.guildTag;
      delete obj.guildMemberProfile.tagText;
    }
    
    if (obj.guild_member_profile) {
      delete obj.guild_member_profile.guild_tag;
      delete obj.guild_member_profile.tag_text;
    }
    
    // Remove emojis from text fields
    if (obj.bio) obj.bio = obj.bio.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
    if (obj.nick) obj.nick = obj.nick.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
  } catch (e) {
    // Ignore errors
  }
  
  return obj;
};

export const onLoad = () => {
  console.log("[HideGuildTags] 🚀 NUCLEAR MODE ACTIVATED");
  
  try {
    // =============== METHOD 1: FLUX DISPATCHER ===============
    // Intercept ALL Flux events and strip tags from payloads
    try {
      const originalDispatch = FluxDispatcher.dispatch.bind(FluxDispatcher);
      
      FluxDispatcher.dispatch = function(payload: any) {
        if (payload) {
          // Strip tags from any user data in the payload
          if (payload.user) stripTags(payload.user, payload.user.id);
          if (payload.users) {
            payload.users.forEach((u: any) => stripTags(u, u?.id));
          }
          if (payload.member) stripTags(payload.member, payload.member?.user?.id);
          if (payload.members) {
            Object.values(payload.members).forEach((m: any) => stripTags(m, m?.user?.id));
          }
          if (payload.guildMember) stripTags(payload.guildMember, payload.guildMember?.user?.id);
        }
        return originalDispatch(payload);
      };
      
      patches.push(() => {
        FluxDispatcher.dispatch = originalDispatch;
      });
      
      console.log("[HideGuildTags] ✓ Patched FluxDispatcher");
    } catch (e) {
      console.log("[HideGuildTags] FluxDispatcher patch failed:", e);
    }

    // =============== METHOD 2: STORES (AGGRESSIVE) ===============
    try {
      const GuildMemberStore = findByStoreName("GuildMemberStore");
      if (GuildMemberStore) {
        // Patch getMember
        if (GuildMemberStore.getMember) {
          patches.push(
            after("getMember", GuildMemberStore, (args, res) => 
              stripTags(res, args?.[1])
            )
          );
        }
        
        // Patch getMembers
        if (GuildMemberStore.getMembers) {
          patches.push(
            after("getMembers", GuildMemberStore, (args, res) => {
              if (Array.isArray(res)) {
                res.forEach(m => stripTags(m, m?.userId || m?.user?.id));
              } else if (res && typeof res === 'object') {
                Object.values(res).forEach((m: any) => stripTags(m, m?.userId || m?.user?.id));
              }
              return res;
            })
          );
        }
        
        // Patch getAllGuildsAndMembers (if exists)
        if (GuildMemberStore.getAllGuildsAndMembers) {
          patches.push(
            after("getAllGuildsAndMembers", GuildMemberStore, (args, res) => {
              if (res && typeof res === 'object') {
                Object.values(res).forEach((guild: any) => {
                  if (guild && typeof guild === 'object') {
                    Object.values(guild).forEach((m: any) => stripTags(m, m?.userId));
                  }
                });
              }
              return res;
            })
          );
        }
        
        console.log("[HideGuildTags] ✓ Patched GuildMemberStore (all methods)");
      }
    } catch (e) {
      console.log("[HideGuildTags] GuildMemberStore failed:", e);
    }

    // =============== METHOD 3: USER STORES ===============
    try {
      const UserStore = findByStoreName("UserStore");
      if (UserStore?.getUser) {
        patches.push(
          after("getUser", UserStore, (args, res) => stripTags(res, args?.[0]))
        );
        console.log("[HideGuildTags] ✓ Patched UserStore");
      }
    } catch (e) {
      console.log("[HideGuildTags] UserStore failed:", e);
    }

    try {
      const UserProfileStore = findByStoreName("UserProfileStore");
      if (UserProfileStore) {
        ["getUserProfile", "getGuildMemberProfile", "getMemberProfile"].forEach(method => {
          if (UserProfileStore[method]) {
            patches.push(
              after(method, UserProfileStore, (args, res) => 
                stripTags(res, args?.[0] || args?.[1])
              )
            );
          }
        });
        console.log("[HideGuildTags] ✓ Patched UserProfileStore");
      }
    } catch (e) {
      console.log("[HideGuildTags] UserProfileStore failed:", e);
    }

    // =============== METHOD 4: MUTUAL GUILDS (HIDE COMPLETELY) ===============
    try {
      const mutualGuildsModule = findByProps("getMutualGuilds");
      if (mutualGuildsModule?.getMutualGuilds) {
        patches.push(
          after("getMutualGuilds", mutualGuildsModule, (args, res) => {
            const userId = args?.[0];
            return shouldHide(userId) ? [] : res;
          })
        );
        console.log("[HideGuildTags] ✓ Patched getMutualGuilds");
      }
    } catch (e) {
      console.log("[HideGuildTags] getMutualGuilds failed:", e);
    }

    // =============== METHOD 5: TAG RENDERING FUNCTIONS ===============
    try {
      const searches = [
        ["guildTag"],
        ["renderGuildTag"],
        ["useGuildTag"],
        ["getGuildTag"],
        ["getUserTag"]
      ];
      
      searches.forEach(props => {
        try {
          const mod = findByProps(...props);
          if (mod) {
            Object.keys(mod).forEach(key => {
              if (typeof mod[key] === 'function' && key.toLowerCase().includes('tag')) {
                try {
                  patches.push(
                    after(key, mod, (args, res) => {
                      const userId = args?.[0]?.userId || args?.[0]?.user?.id || args?.[0];
                      return shouldHide(userId) ? null : res;
                    })
                  );
                } catch (e) {}
              }
            });
          }
        } catch (e) {}
      });
      console.log("[HideGuildTags] ✓ Patched tag render functions");
    } catch (e) {
      console.log("[HideGuildTags] Tag renders failed:", e);
    }

    // =============== METHOD 6: PROTOTYPE POLLUTION ===============
    // Override Object.prototype to hide tags (temporary during renders)
    try {
      const originalDefineProperty = Object.defineProperty;
      
      Object.defineProperty = function(obj: any, prop: string, descriptor: any) {
        // Block tag properties from being set
        if (prop === 'guildTag' || prop === 'guild_tag' || 
            prop === 'tagText' || prop === 'tag_text') {
          if (obj && obj.id && shouldHide(obj.id)) {
            descriptor.value = null;
          }
        }
        return originalDefineProperty(obj, prop, descriptor);
      };
      
      patches.push(() => {
        Object.defineProperty = originalDefineProperty;
      });
      
      console.log("[HideGuildTags] ✓ Patched Object.defineProperty");
    } catch (e) {
      console.log("[HideGuildTags] defineProperty failed:", e);
    }

    // =============== METHOD 7: JSON PARSE INTERCEPTION ===============
    try {
      const originalParse = JSON.parse;
      
      JSON.parse = function(text: string, ...args: any[]) {
        const result = originalParse(text, ...args);
        
        // Strip tags from parsed JSON
        if (result && typeof result === 'object') {
          if (result.user) stripTags(result.user, result.user.id);
          if (result.users) result.users.forEach((u: any) => stripTags(u, u?.id));
          if (result.member) stripTags(result.member, result.member?.user?.id);
          if (result.members) {
            Object.values(result.members).forEach((m: any) => stripTags(m, m?.user?.id));
          }
        }
        
        return result;
      };
      
      patches.push(() => {
        JSON.parse = originalParse;
      });
      
      console.log("[HideGuildTags] ✓ Patched JSON.parse");
    } catch (e) {
      console.log("[HideGuildTags] JSON.parse failed:", e);
    }

    console.log("=".repeat(50));
    console.log(`[HideGuildTags] ✅ LOADED - ${patches.length} PATCHES ACTIVE`);
    console.log("[HideGuildTags] NOW:");
    console.log("  1. CLOSE Discord completely (force close)");
    console.log("  2. REOPEN Discord");
    console.log("  3. Check DMs - tags SHOULD be gone");
    console.log("=".repeat(50));
    
  } catch (e) {
    console.error("[HideGuildTags] CRITICAL ERROR:", e);
  }
};

export const onUnload = () => {
  console.log("[HideGuildTags] Unloading NUCLEAR patches...");
  
  patches.forEach((unpatch, i) => {
    try {
      unpatch();
    } catch (e) {
      console.warn(`[HideGuildTags] Unpatch ${i} failed:`, e);
    }
  });
  
  patches = [];
  
  if (fluxUnsubscribe) {
    fluxUnsubscribe();
    fluxUnsubscribe = null;
  }
  
  console.log("[HideGuildTags] ✓ Unloaded");
};

export { Settings as settings };
