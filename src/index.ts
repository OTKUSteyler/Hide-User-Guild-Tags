/**
 * Hide User Guild Tags - Revenge/Vendetta Mobile
 * Hides the emoji + server name tags next to usernames
 */
import { after } from "@vendetta/patcher";
import { findByProps, findByName, findByDisplayName, findByStoreName } from "@vendetta/metro";
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
    // Strategy 1: Patch the GuildMemberStore to return null for guild tags
    try {
      const GuildMemberStore = findByStoreName("GuildMemberStore");
      if (GuildMemberStore) {
        // Patch getMember
        if (GuildMemberStore.getMember) {
          const unpatch = after("getMember", GuildMemberStore, (args, res) => {
            try {
              const userId = args?.[1];
              if (res && userId && shouldHide(userId)) {
                if (res.nick) res.nick = res.nick.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
              }
              return res;
            } catch (e) {
              return res;
            }
          });
          patches.push(unpatch);
          console.log("[HideGuildTags] ✓ Patched GuildMemberStore.getMember");
        }
        
        // Patch getMembers
        if (GuildMemberStore.getMembers) {
          const unpatch = after("getMembers", GuildMemberStore, (args, res) => {
            try {
              if (Array.isArray(res)) {
                res.forEach(member => {
                  if (member && member.userId && shouldHide(member.userId)) {
                    if (member.nick) {
                      member.nick = member.nick.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
                    }
                  }
                });
              }
              return res;
            } catch (e) {
              return res;
            }
          });
          patches.push(unpatch);
          console.log("[HideGuildTags] ✓ Patched GuildMemberStore.getMembers");
        }
      }
    } catch (e) {
      console.log("[HideGuildTags] GuildMemberStore patch failed:", e);
    }

    // Strategy 2: Patch getUserTag or getGuildMemberAvatarURL
    try {
      const UserProfileStore = findByStoreName("UserProfileStore");
      if (UserProfileStore) {
        const methods = ["getUserProfile", "getGuildMemberProfile"];
        
        methods.forEach(method => {
          if (UserProfileStore[method]) {
            const unpatch = after(method, UserProfileStore, (args, res) => {
              try {
                const userId = typeof args[0] === 'string' ? args[0] : args[1];
                if (res && userId && shouldHide(userId)) {
                  if (res.guildTag) res.guildTag = null;
                  if (res.tagText) res.tagText = null;
                }
                return res;
              } catch (e) {
                return res;
              }
            });
            patches.push(unpatch);
            console.log(`[HideGuildTags] ✓ Patched UserProfileStore.${method}`);
          }
        });
      }
    } catch (e) {
      console.log("[HideGuildTags] UserProfileStore patch failed");
    }

    // Strategy 3: Find and patch any component that renders guild tags
    try {
      // Search for modules containing "guildTag" or "GuildTag"
      const guildTagModule = findByProps("guildTag", "mutualGuilds");
      if (guildTagModule) {
        console.log("[HideGuildTags] Found guildTag module:", Object.keys(guildTagModule));
        
        Object.keys(guildTagModule).forEach(key => {
          if (typeof guildTagModule[key] === 'function' && key.includes("Tag")) {
            try {
              const unpatch = after(key, guildTagModule, (args, res) => {
                try {
                  const userId = args?.[0]?.userId || args?.[0]?.user?.id || args?.[0];
                  if (userId && shouldHide(userId)) return null;
                  return res;
                } catch (e) {
                  return res;
                }
              });
              patches.push(unpatch);
              console.log(`[HideGuildTags] ✓ Patched ${key}`);
            } catch (e) {
              // Not patchable
            }
          }
        });
      }
    } catch (e) {
      console.log("[HideGuildTags] guildTag module patch failed");
    }

    // Strategy 4: Patch the actual React component that renders tags
    try {
      const possibleNames = ["GuildTag", "ServerTag", "UserTag", "MutualGuildTag"];
      
      possibleNames.forEach(name => {
        try {
          const Component = findByDisplayName(name);
          if (Component && Component.prototype && Component.prototype.render) {
            const unpatch = after("render", Component.prototype, function(args, res) {
              try {
                const userId = this.props?.userId || this.props?.user?.id;
                if (userId && shouldHide(userId)) return null;
                return res;
              } catch (e) {
                return res;
              }
            });
            patches.push(unpatch);
            console.log(`[HideGuildTags] ✓ Patched ${name} component`);
          }
        } catch (e) {
          // Component not found
        }
      });
    } catch (e) {
      console.log("[HideGuildTags] Component patching failed");
    }

    // Strategy 5: Patch props directly in any component that has guildTag prop
    try {
      const UserRowModule = findByProps("UserRow", "default");
      if (UserRowModule?.UserRow) {
        const unpatch = after("UserRow", UserRowModule, (args, res) => {
          try {
            if (res?.props) {
              const userId = args?.[0]?.user?.id || args?.[0]?.userId;
              if (userId && shouldHide(userId)) {
                if (res.props.guildTag) res.props.guildTag = null;
                if (res.props.subText && typeof res.props.subText === 'string') {
                  // Remove emoji from subtext
                  res.props.subText = res.props.subText.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
                }
              }
            }
            return res;
          } catch (e) {
            return res;
          }
        });
        patches.push(unpatch);
        console.log("[HideGuildTags] ✓ Patched UserRow");
      }
    } catch (e) {
      console.log("[HideGuildTags] UserRow patch failed");
    }

    console.log("[HideGuildTags] ✓ Plugin loaded successfully");
    console.log(`[HideGuildTags] Applied ${patches.length} patches`);
    
    if (patches.length === 0) {
      console.warn("[HideGuildTags] ⚠ WARNING: No patches applied!");
      console.warn("[HideGuildTags] Guild tags will still be visible.");
      console.warn("[HideGuildTags] Try running the debug version to find modules.");
    } else {
      console.log("[HideGuildTags] 🎉 Try opening DMs or member lists to see if tags are hidden!");
    }
    
  } catch (e) {
    console.error("[HideGuildTags] Critical load error:", e);
  }
};

export const onUnload = () => {
  console.log("[HideGuildTags] Unloading...");
  
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
    console.log("[HideGuildTags] ✓ Unloaded cleanly");
  } catch (e) {
    console.error("[HideGuildTags] Unload error:", e);
  }
};

export { Settings as settings };
