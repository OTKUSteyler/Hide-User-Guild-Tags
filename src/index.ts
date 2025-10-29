/**
 * Hide User Guild Tags – Mobile Vendetta Version
 * Designed for React Native (Android/iOS)
 */
import { after } from "@vendetta/patcher";
import { findByProps, findByName, findByDisplayName } from "@vendetta/metro";
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
  console.log("[HideGuildTags] Starting mobile plugin...");
  
  try {
    // Mobile Discord uses different component names
    // Try finding by display name (React Native components)
    
    // 1. Try GuildTag by display name
    try {
      const GuildTagComponent = findByDisplayName("GuildTag");
      if (GuildTagComponent) {
        const unpatch = after("render", GuildTagComponent.prototype, function(args, res) {
          try {
            const userId = this.props?.user?.id || this.props?.userId;
            if (userId && shouldHide(userId)) return null;
            return res;
          } catch (e) {
            return res;
          }
        });
        patches.push(unpatch);
        console.log("[HideGuildTags] ✓ Patched GuildTag component");
      } else {
        console.warn("[HideGuildTags] ⚠ GuildTag component not found");
      }
    } catch (e) {
      console.log("[HideGuildTags] GuildTag patch failed:", e);
    }

    // 2. Try by type/name property
    try {
      const GuildTagByName = findByName("GuildTag");
      if (GuildTagByName) {
        const unpatch = after("type", GuildTagByName, (args, res) => {
          try {
            const userId = args?.[0]?.user?.id || args?.[0]?.userId;
            if (userId && shouldHide(userId)) return null;
            return res;
          } catch (e) {
            return res;
          }
        });
        patches.push(unpatch);
        console.log("[HideGuildTags] ✓ Patched GuildTag by name");
      }
    } catch (e) {
      console.log("[HideGuildTags] GuildTag name search failed");
    }

    // 3. Search for components that render guild tags
    try {
      const components = findByProps("GuildBadge", "default");
      if (components?.GuildBadge) {
        const unpatch = after("GuildBadge", components, (args, res) => {
          try {
            const userId = args?.[0]?.userId || args?.[0]?.user?.id;
            if (userId && shouldHide(userId)) return null;
            return res;
          } catch (e) {
            return res;
          }
        });
        patches.push(unpatch);
        console.log("[HideGuildTags] ✓ Patched GuildBadge");
      }
    } catch (e) {
      console.log("[HideGuildTags] GuildBadge patch failed");
    }

    // 4. Patch the User component that might contain guild tags
    try {
      const UserComponent = findByDisplayName("User");
      if (UserComponent) {
        const unpatch = after("render", UserComponent.prototype, function(args, res) {
          try {
            // Remove guildTag from props if it exists
            if (res?.props) {
              const userId = this.props?.user?.id || this.props?.userId;
              if (userId && shouldHide(userId) && res.props.guildTag) {
                res.props.guildTag = null;
              }
            }
            return res;
          } catch (e) {
            return res;
          }
        });
        patches.push(unpatch);
        console.log("[HideGuildTags] ✓ Patched User component");
      }
    } catch (e) {
      console.log("[HideGuildTags] User component patch failed");
    }

    // 5. Try patching any component that has guildTag in props
    try {
      const modules = findByProps("default");
      if (modules?.default?.prototype?.render) {
        const originalRender = modules.default.prototype.render;
        modules.default.prototype.render = function(...args: any[]) {
          const result = originalRender.apply(this, args);
          try {
            if (result?.props?.guildTag) {
              const userId = this.props?.user?.id || this.props?.userId;
              if (userId && shouldHide(userId)) {
                result.props.guildTag = null;
              }
            }
          } catch (e) {
            // Ignore errors
          }
          return result;
        };
        patches.push(() => {
          modules.default.prototype.render = originalRender;
        });
        console.log("[HideGuildTags] ✓ Patched default component renders");
      }
    } catch (e) {
      console.log("[HideGuildTags] Default component patch failed");
    }

    // 6. Try finding modules that contain "guildTag" text
    try {
      const guildTagModules = findByProps("guildTag");
      if (guildTagModules) {
        console.log("[HideGuildTags] Found guildTag module with keys:", Object.keys(guildTagModules));
        
        // Try patching any function in this module
        Object.keys(guildTagModules).forEach(key => {
          if (typeof guildTagModules[key] === 'function') {
            try {
              const unpatch = after(key, guildTagModules, (args, res) => {
                try {
                  const userId = args?.[0]?.userId || args?.[0]?.user?.id || args?.[0];
                  if (userId && shouldHide(userId)) return null;
                  return res;
                } catch (e) {
                  return res;
                }
              });
              patches.push(unpatch);
              console.log(`[HideGuildTags] ✓ Patched guildTag.${key}`);
            } catch (e) {
              // Function not patchable
            }
          }
        });
      }
    } catch (e) {
      console.log("[HideGuildTags] guildTag module search failed");
    }

    console.log("[HideGuildTags] ✓ Plugin loaded");
    console.log(`[HideGuildTags] Applied ${patches.length} patches`);
    
    if (patches.length === 0) {
      console.warn("[HideGuildTags] ⚠ WARNING: No patches applied!");
      console.warn("[HideGuildTags] Guild tags will still be visible.");
      console.warn("[HideGuildTags] Please report this to the developer.");
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
