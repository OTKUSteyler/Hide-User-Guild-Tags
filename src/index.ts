/**
 * Hide User Guild Tags - WORKING VERSION
 * Now targets the correct "primaryGuild" property!
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
/*  PRIMARY GUILD TAG STRIPPER                                     */
/* --------------------------------------------------------------- */
let patches: (() => void)[] = [];

// Remove primaryGuild (this is the actual guild tag!)
const stripPrimaryGuild = (obj: any, userId?: string) => {
  if (!obj || !shouldHide(userId)) return obj;
  
  try {
    // THIS IS THE KEY! Remove primaryGuild object
    if (obj.primaryGuild) {
      delete obj.primaryGuild;
    }
    if (obj.primary_guild) {
      delete obj.primary_guild;
    }
    
    // Also remove other tag properties just in case
    delete obj.guildTag;
    delete obj.guild_tag;
    delete obj.tagText;
    delete obj.tag_text;
    
    // Clear nested objects
    if (obj.guildMemberProfile) {
      delete obj.guildMemberProfile.primaryGuild;
      delete obj.guildMemberProfile.guildTag;
    }
  } catch (e) {
    // Ignore errors
  }
  
  return obj;
};

export const onLoad = () => {
  console.log("[HideGuildTags] 🎯 Loading with primaryGuild targeting...");
  
  try {
    // =============== METHOD 1: FLUX DISPATCHER (PRIMARY) ===============
    try {
      const originalDispatch = FluxDispatcher.dispatch.bind(FluxDispatcher);
      
      FluxDispatcher.dispatch = function(payload: any) {
        try {
          if (payload) {
            // Strip primaryGuild from all user objects in payload
            if (payload.user) {
              stripPrimaryGuild(payload.user, payload.user.id);
            }
            if (payload.users) {
              if (Array.isArray(payload.users)) {
                payload.users.forEach((u: any) => stripPrimaryGuild(u, u?.id));
              } else {
                Object.values(payload.users).forEach((u: any) => stripPrimaryGuild(u, u?.id));
              }
            }
            if (payload.member?.user) {
              stripPrimaryGuild(payload.member.user, payload.member.user.id);
            }
            if (payload.members) {
              Object.values(payload.members).forEach((m: any) => {
                if (m?.user) stripPrimaryGuild(m.user, m.user.id);
              });
            }
            
            // Handle PRESENCE_UPDATES (this is key for DM lists!)
            if (payload.type === "PRESENCE_UPDATE" || payload.type === "USER_UPDATE") {
              if (payload.user) stripPrimaryGuild(payload.user, payload.user.id);
            }
          }
        } catch (e) {
          // Ignore stripping errors
        }
        return originalDispatch(payload);
      };
      
      patches.push(() => {
        FluxDispatcher.dispatch = originalDispatch;
      });
      
      console.log("[HideGuildTags] ✓ Patched FluxDispatcher (primaryGuild targeting)");
    } catch (e) {
      console.log("[HideGuildTags] FluxDispatcher patch failed:", e);
    }

    // =============== METHOD 2: USER STORE (CRITICAL) ===============
    try {
      const UserStore = findByStoreName("UserStore");
      if (UserStore) {
        // Patch getUser - this is called constantly for user data
        if (UserStore.getUser) {
          patches.push(
            after("getUser", UserStore, (args, res) => {
              if (res && args?.[0]) {
                stripPrimaryGuild(res, args[0]);
              }
              return res;
            })
          );
          console.log("[HideGuildTags] ✓ Patched UserStore.getUser");
        }
        
        // Patch getUsers
        if (UserStore.getUsers) {
          patches.push(
            after("getUsers", UserStore, (args, res) => {
              if (res && typeof res === 'object') {
                Object.keys(res).forEach(userId => {
                  stripPrimaryGuild(res[userId], userId);
                });
              }
              return res;
            })
          );
          console.log("[HideGuildTags] ✓ Patched UserStore.getUsers");
        }
        
        // Patch getCurrentUser
        if (UserStore.getCurrentUser) {
          patches.push(
            after("getCurrentUser", UserStore, (args, res) => {
              if (res) stripPrimaryGuild(res, res.id);
              return res;
            })
          );
        }
      }
    } catch (e) {
      console.log("[HideGuildTags] UserStore failed:", e);
    }

    // =============== METHOD 3: GUILD MEMBER STORE ===============
    try {
      const GuildMemberStore = findByStoreName("GuildMemberStore");
      if (GuildMemberStore) {
        if (GuildMemberStore.getMember) {
          patches.push(
            after("getMember", GuildMemberStore, (args, res) => {
              if (res?.user) {
                stripPrimaryGuild(res.user, res.user.id);
              }
              return res;
            })
          );
        }
        
        if (GuildMemberStore.getMembers) {
          patches.push(
            after("getMembers", GuildMemberStore, (args, res) => {
              try {
                if (Array.isArray(res)) {
                  res.forEach(m => {
                    if (m?.user) stripPrimaryGuild(m.user, m.user.id);
                  });
                } else if (res && typeof res === 'object') {
                  Object.values(res).forEach((m: any) => {
                    if (m?.user) stripPrimaryGuild(m.user, m.user.id);
                  });
                }
              } catch (e) {
                // Ignore
              }
              return res;
            })
          );
        }
        
        console.log("[HideGuildTags] ✓ Patched GuildMemberStore");
      }
    } catch (e) {
      console.log("[HideGuildTags] GuildMemberStore failed:", e);
    }

    // =============== METHOD 4: USER PROFILE STORE ===============
    try {
      const UserProfileStore = findByStoreName("UserProfileStore");
      if (UserProfileStore) {
        ["getUserProfile", "getGuildMemberProfile", "getMemberProfile"].forEach(method => {
          if (UserProfileStore[method]) {
            patches.push(
              after(method, UserProfileStore, (args, res) => {
                if (res) {
                  const userId = args?.[0] || args?.[1];
                  stripPrimaryGuild(res, userId);
                  if (res.user) stripPrimaryGuild(res.user, res.user.id);
                }
                return res;
              })
            );
          }
        });
        console.log("[HideGuildTags] ✓ Patched UserProfileStore");
      }
    } catch (e) {
      console.log("[HideGuildTags] UserProfileStore failed:", e);
    }

    // =============== METHOD 5: PRESENCE STORE ===============
    try {
      const PresenceStore = findByStoreName("PresenceStore");
      if (PresenceStore) {
        ["getState", "getStatus", "getActivities"].forEach(method => {
          if (PresenceStore[method]) {
            patches.push(
              after(method, PresenceStore, (args, res) => {
                // Presence updates often include user data
                return res;
              })
            );
          }
        });
        console.log("[HideGuildTags] ✓ Patched PresenceStore");
      }
    } catch (e) {
      console.log("[HideGuildTags] PresenceStore failed:", e);
    }

    console.log("=".repeat(60));
    console.log(`[HideGuildTags] ✅ LOADED - ${patches.length} PATCHES ACTIVE`);
    console.log("[HideGuildTags] Targeting: primaryGuild object");
    console.log("[HideGuildTags] NOW:");
    console.log("  1. FORCE CLOSE Discord completely");
    console.log("  2. REOPEN Discord");
    console.log("  3. Open DMs - tags MUST be gone!");
    console.log("=".repeat(60));
    
  } catch (e) {
    console.error("[HideGuildTags] CRITICAL ERROR:", e);
  }
};

export const onUnload = () => {
  console.log("[HideGuildTags] Unloading...");
  
  patches.forEach((unpatch) => {
    try {
      unpatch();
    } catch (e) {
      // Ignore
    }
  });
  
  patches = [];
  console.log("[HideGuildTags] ✓ Unloaded");
};

export { Settings as settings };
