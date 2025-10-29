/**
 * Hide User Guild Tags - FIXED NUCLEAR VERSION
 * No JSON.parse patching (was causing crashes)
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
/*  SAFE PATCHES                                                   */
/* --------------------------------------------------------------- */
let patches: (() => void)[] = [];

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
  } catch (e) {
    // Ignore errors
  }
  
  return obj;
};

export const onLoad = () => {
  console.log("[HideGuildTags] 🚀 Loading SAFE nuclear version...");
  
  try {
    // =============== METHOD 1: FLUX DISPATCHER ===============
    try {
      const originalDispatch = FluxDispatcher.dispatch.bind(FluxDispatcher);
      
      FluxDispatcher.dispatch = function(payload: any) {
        try {
          if (payload) {
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
        } catch (e) {
          // Ignore stripping errors
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

    // =============== METHOD 2: GUILD MEMBER STORE ===============
    try {
      const GuildMemberStore = findByStoreName("GuildMemberStore");
      if (GuildMemberStore) {
        if (GuildMemberStore.getMember) {
          patches.push(
            after("getMember", GuildMemberStore, (args, res) => 
              stripTags(res, args?.[1])
            )
          );
        }
        
        if (GuildMemberStore.getMembers) {
          patches.push(
            after("getMembers", GuildMemberStore, (args, res) => {
              try {
                if (Array.isArray(res)) {
                  res.forEach(m => stripTags(m, m?.userId || m?.user?.id));
                } else if (res && typeof res === 'object') {
                  Object.values(res).forEach((m: any) => stripTags(m, m?.userId || m?.user?.id));
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

    // =============== METHOD 4: MUTUAL GUILDS ===============
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

    // =============== METHOD 5: TAG FUNCTIONS ===============
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
                } catch (e) {
                  // Not patchable
                }
              }
            });
          }
        } catch (e) {
          // Module not found
        }
      });
      console.log("[HideGuildTags] ✓ Patched tag functions");
    } catch (e) {
      console.log("[HideGuildTags] Tag functions failed:", e);
    }

    // =============== METHOD 6: RELATIONSHIP STORE ===============
    try {
      const RelationshipStore = findByStoreName("RelationshipStore");
      if (RelationshipStore) {
        ["getRelationships", "getFriendIDs", "getNickname"].forEach(method => {
          if (RelationshipStore[method]) {
            patches.push(
              after(method, RelationshipStore, (args, res) => {
                try {
                  if (res && typeof res === 'object') {
                    Object.keys(res).forEach(userId => {
                      if (shouldHide(userId)) {
                        stripTags(res[userId], userId);
                      }
                    });
                  }
                } catch (e) {
                  // Ignore
                }
                return res;
              })
            );
          }
        });
        console.log("[HideGuildTags] ✓ Patched RelationshipStore");
      }
    } catch (e) {
      console.log("[HideGuildTags] RelationshipStore failed:", e);
    }

    console.log("=".repeat(50));
    console.log(`[HideGuildTags] ✅ LOADED - ${patches.length} PATCHES`);
    console.log("[HideGuildTags] NEXT STEPS:");
    console.log("  1. FORCE CLOSE Discord (swipe from recents)");
    console.log("  2. REOPEN Discord");
    console.log("  3. Check if tags are hidden");
    console.log("=".repeat(50));
    
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
