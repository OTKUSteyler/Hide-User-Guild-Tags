/**
 * Hide User Guild Tags – Complete Version
 * Hides guild tags in: Messages, DMs, Member Lists, Profiles, etc.
 */
import { after } from "@vendetta/patcher";
import { findByProps, findByName } from "@vendetta/metro";
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
    // 1. Patch GuildTag badge component (messages, profiles, etc.)
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

    // 2. Patch Username component (contains guildTag prop)
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

    // 3. Patch UserProfile (profile modal/popout)
    try {
      const UserProfileModule = findByProps("UserProfile");
      if (UserProfileModule?.UserProfile) {
        const unpatch = after("UserProfile", UserProfileModule, (args, res) => {
          try {
            const user = args?.[0]?.user;
            if (res?.props?.guildTag && user && shouldHide(user.id)) {
              res.props.guildTag = null;
            }
            // Also check for nested guildTag in profile sections
            if (res?.props?.children) {
              const removeGuildTags = (children: any): any => {
                if (!children) return children;
                if (Array.isArray(children)) {
                  return children.map(removeGuildTags).filter(c => {
                    return !(c?.type?.name === "GuildTag" || c?.props?.isGuildTag);
                  });
                }
                if (children?.props) {
                  if (children.props.guildTag) children.props.guildTag = null;
                  if (children.props.children) {
                    children.props.children = removeGuildTags(children.props.children);
                  }
                }
                return children;
              };
              res.props.children = removeGuildTags(res.props.children);
            }
            return res;
          } catch (e) {
            console.error("[HideGuildTags] UserProfile patch error:", e);
            return res;
          }
        });
        patches.push(unpatch);
        console.log("[HideGuildTags] ✓ Patched UserProfile");
      } else {
        console.warn("[HideGuildTags] ⚠ UserProfile module not found");
      }
    } catch (e) {
      console.error("[HideGuildTags] Failed to patch UserProfile:", e);
    }

    // 4. Patch Member List (server member list)
    try {
      const MemberListItemModule = findByProps("MemberListItem");
      if (MemberListItemModule?.MemberListItem) {
        const unpatch = after("MemberListItem", MemberListItemModule, (args, res) => {
          try {
            const user = args?.[0]?.user;
            if (res?.props?.guildTag && user && shouldHide(user.id)) {
              res.props.guildTag = null;
            }
            return res;
          } catch (e) {
            console.error("[HideGuildTags] MemberListItem patch error:", e);
            return res;
          }
        });
        patches.push(unpatch);
        console.log("[HideGuildTags] ✓ Patched MemberListItem");
      } else {
        console.warn("[HideGuildTags] ⚠ MemberListItem module not found");
      }
    } catch (e) {
      console.error("[HideGuildTags] Failed to patch MemberListItem:", e);
    }

    // 5. Patch PrivateChannel (DM user list)
    try {
      const PrivateChannelModule = findByProps("PrivateChannel");
      if (PrivateChannelModule?.PrivateChannel) {
        const unpatch = after("PrivateChannel", PrivateChannelModule, (args, res) => {
          try {
            const user = args?.[0]?.user;
            if (res?.props?.guildTag && user && shouldHide(user.id)) {
              res.props.guildTag = null;
            }
            return res;
          } catch (e) {
            console.error("[HideGuildTags] PrivateChannel patch error:", e);
            return res;
          }
        });
        patches.push(unpatch);
        console.log("[HideGuildTags] ✓ Patched PrivateChannel");
      } else {
        console.warn("[HideGuildTags] ⚠ PrivateChannel module not found");
      }
    } catch (e) {
      console.error("[HideGuildTags] Failed to patch PrivateChannel:", e);
    }

    // 6. Patch UserPopout (hover profile card)
    try {
      const UserPopoutModule = findByProps("UserPopout");
      if (UserPopoutModule?.UserPopout) {
        const unpatch = after("UserPopout", UserPopoutModule, (args, res) => {
          try {
            const user = args?.[0]?.user;
            if (res?.props?.guildTag && user && shouldHide(user.id)) {
              res.props.guildTag = null;
            }
            return res;
          } catch (e) {
            console.error("[HideGuildTags] UserPopout patch error:", e);
            return res;
          }
        });
        patches.push(unpatch);
        console.log("[HideGuildTags] ✓ Patched UserPopout");
      } else {
        console.warn("[HideGuildTags] ⚠ UserPopout module not found");
      }
    } catch (e) {
      console.error("[HideGuildTags] Failed to patch UserPopout:", e);
    }

    // 7. Patch Message component (in case guildTag appears in messages)
    try {
      const MessageModule = findByProps("Message", "default");
      if (MessageModule?.default) {
        const unpatch = after("default", MessageModule, (args, res) => {
          try {
            const message = args?.[0];
            const user = message?.author;
            if (res?.props?.guildTag && user && shouldHide(user.id)) {
              res.props.guildTag = null;
            }
            return res;
          } catch (e) {
            console.error("[HideGuildTags] Message patch error:", e);
            return res;
          }
        });
        patches.push(unpatch);
        console.log("[HideGuildTags] ✓ Patched Message");
      } else {
        console.warn("[HideGuildTags] ⚠ Message module not found");
      }
    } catch (e) {
      console.error("[HideGuildTags] Failed to patch Message:", e);
    }

    console.log("[HideGuildTags] ✓ Plugin loaded successfully");
    console.log(`[HideGuildTags] Applied ${patches.length} patches`);
  } catch (e) {
    console.error("[HideGuildTags] Critical load error:", e);
    throw e;
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
