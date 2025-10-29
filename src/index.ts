/**
 * Hide User Guild Tags - Direct Approach
 * Patches at the data level to prevent tags from rendering
 */
import { before, after } from "@vendetta/patcher";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import Settings from "./Settings";

/* --------------------------------------------------------------- */
/*  Storage & Helper                                               */
/* --------------------------------------------------------------- */
interface PluginStorage {
  whitelist?: string[];
}

const pluginStorage = storage as PluginStorage;

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
  console.log("[HideGuildTags] Loading for Revenge/Vendetta mobile...");
  
  try {
    // Patch 1: GuildMemberStore - BEFORE the data is returned
    try {
      const GuildMemberStore = findByStoreName("GuildMemberStore");
      if (GuildMemberStore?.getMember) {
        patches.push(
          before("getMember", GuildMemberStore, (args) => {
            // args[0] = guildId, args[1] = userId
            const userId = args?.[1];
            if (userId && shouldHide(userId)) {
              // Store the original userId for later
              args._hideTag = true;
            }
          })
        );
        
        patches.push(
          after("getMember", GuildMemberStore, (args, res) => {
            if (args._hideTag && res) {
              // Remove all tag-related properties
              delete res.guildTag;
              delete res.guild_tag;
              delete res.tagText;
              delete res.tag_text;
              if (res.bio) res.bio = res.bio.replace(/[\u{1F300}-\u{1F9FF}]/gu, '');
              if (res.nick) res.nick = res.nick.replace(/[\u{1F300}-\u{1F9FF}]/gu, '');
            }
            return res;
          })
        );
        console.log("[HideGuildTags] ✓ Patched GuildMemberStore.getMember (before + after)");
      }
    } catch (e) {
      console.error("[HideGuildTags] GuildMemberStore.getMember failed:", e);
    }

    // Patch 2: UserStore - Patch user objects directly
    try {
      const UserStore = findByStoreName("UserStore");
      if (UserStore?.getUser) {
        patches.push(
          after("getUser", UserStore, (args, res) => {
            if (res && args?.[0] && shouldHide(args[0])) {
              // Remove tag from user object
              if (res.guildMemberProfile) {
                delete res.guildMemberProfile.guildTag;
                delete res.guildMemberProfile.tagText;
              }
            }
            return res;
          })
        );
        console.log("[HideGuildTags] ✓ Patched UserStore.getUser");
      }
    } catch (e) {
      console.error("[HideGuildTags] UserStore patch failed:", e);
    }

    // Patch 3: UserProfileStore - Remove tags from profiles
    try {
      const UserProfileStore = findByStoreName("UserProfileStore");
      if (UserProfileStore) {
        const profileMethods = ["getUserProfile", "getGuildMemberProfile", "getMemberProfile"];
        
        profileMethods.forEach(method => {
          if (UserProfileStore[method]) {
            patches.push(
              after(method, UserProfileStore, (args, res) => {
                if (res) {
                  const userId = args?.[0] || args?.[1];
                  if (userId && shouldHide(userId)) {
                    delete res.guildTag;
                    delete res.guild_tag;
                    delete res.tagText;
                    delete res.tag_text;
                  }
                }
                return res;
              })
            );
            console.log(`[HideGuildTags] ✓ Patched UserProfileStore.${method}`);
          }
        });
      }
    } catch (e) {
      console.error("[HideGuildTags] UserProfileStore patch failed:", e);
    }

    // Patch 4: Find module that has getMutualGuilds (shows shared servers)
    try {
      const mutualGuildsModule = findByProps("getMutualGuilds");
      if (mutualGuildsModule?.getMutualGuilds) {
        patches.push(
          after("getMutualGuilds", mutualGuildsModule, (args, res) => {
            const userId = args?.[0];
            // Return empty array to hide all mutual guilds/tags
            if (userId && shouldHide(userId)) {
              return [];
            }
            return res;
          })
        );
        console.log("[HideGuildTags] ✓ Patched getMutualGuilds");
      }
    } catch (e) {
      console.error("[HideGuildTags] getMutualGuilds patch failed:", e);
    }

    // Patch 5: Find and patch anything that renders or returns guild tags
    try {
      const possibleModules = [
        { props: ["guildTag"], name: "guildTag module" },
        { props: ["renderGuildTag"], name: "renderGuildTag module" },
        { props: ["useGuildTag"], name: "useGuildTag hook" },
        { props: ["getGuildTag"], name: "getGuildTag module" }
      ];

      possibleModules.forEach(({ props, name }) => {
        try {
          const mod = findByProps(...props);
          if (mod) {
            Object.keys(mod).forEach(key => {
              if (typeof mod[key] === 'function' && key.toLowerCase().includes('tag')) {
                try {
                  patches.push(
                    after(key, mod, (args, res) => {
                      const userId = args?.[0]?.userId || args?.[0]?.user?.id || args?.[0];
                      if (userId && shouldHide(userId)) return null;
                      return res;
                    })
                  );
                  console.log(`[HideGuildTags] ✓ Patched ${name}.${key}`);
                } catch (e) {
                  // Function not patchable
                }
              }
            });
          }
        } catch (e) {
          // Module not found
        }
      });
    } catch (e) {
      console.error("[HideGuildTags] Additional module patching failed:", e);
    }

    // Patch 6: Nuclear option - patch all getUserTag-like functions
    try {
      const tagFunctions = findByProps("getUserTag", "getGuildMemberTag");
      if (tagFunctions) {
        Object.keys(tagFunctions).forEach(key => {
          if (typeof tagFunctions[key] === 'function' && key.toLowerCase().includes('tag')) {
            try {
              patches.push(
                after(key, tagFunctions, (args, res) => {
                  const userId = args?.[0] || args?.[1];
                  if (userId && shouldHide(userId)) return null;
                  return res;
                })
              );
              console.log(`[HideGuildTags] ✓ Patched ${key}`);
            } catch (e) {
              // Not patchable
            }
          }
        });
      }
    } catch (e) {
      // Module not found
    }

    console.log("[HideGuildTags] ✓ Plugin loaded successfully");
    console.log(`[HideGuildTags] Applied ${patches.length} patches`);
    
    if (patches.length > 0) {
      console.log("[HideGuildTags] 🎉 Patches applied! Try:");
      console.log("  1. Close and reopen DMs");
      console.log("  2. Switch between servers");
      console.log("  3. Refresh member lists");
    } else {
      console.warn("[HideGuildTags] ⚠ No patches applied - tags will still show");
    }
    
  } catch (e) {
    console.error("[HideGuildTags] Critical error:", e);
  }
};

export const onUnload = () => {
  console.log("[HideGuildTags] Unloading...");
  
  try {
    patches.forEach((unpatch, i) => {
      try {
        unpatch();
      } catch (e) {
        console.warn(`[HideGuildTags] Failed to unpatch ${i}:`, e);
      }
    });
    patches = [];
    console.log("[HideGuildTags] ✓ Unloaded cleanly");
  } catch (e) {
    console.error("[HideGuildTags] Unload error:", e);
  }
};

export { Settings as settings };
