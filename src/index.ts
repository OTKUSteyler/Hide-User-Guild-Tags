import { before, after } from "@vendetta/patcher";
import { findByProps } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { React } from "@vendetta/metro/common";
import Settings from "./Settings";

let patches: (() => void)[] = [];

/** Checks if user should be hidden or not */
function shouldHideUser(userId?: string): boolean {
  if (!userId) return true;
  const whitelist = storage.whitelist ?? [];
  return !whitelist.includes(userId);
}

export const onLoad = () => {
  try {
    // Hide guild tags in user profiles
    const UserTag = findByProps("GuildTag");
    const GuildTagComponent = UserTag?.GuildTag;
    if (GuildTagComponent) {
      patches.push(
        after("GuildTag", UserTag, (args, res: any) => {
          const user = args?.[0]?.user;
          if (user && !shouldHideUser(user.id)) return res;
          return null;
        })
      );
    }

    // Remove guild-related data from profile badges
    const ProfileBadges = findByProps("UserProfileBadges");
    if (ProfileBadges?.UserProfileBadges) {
      patches.push(
        before("UserProfileBadges", ProfileBadges, (args) => {
          const user = args?.[0]?.user;
          if (user && shouldHideUser(user.id) && user.guildMember) {
            args[0].user.guildMember = null;
          }
        })
      );
    }

    // Hide guild tags in member list
    const MemberListItem = findByProps("MemberListItem");
    if (MemberListItem?.MemberListItem) {
      patches.push(
        after("MemberListItem", MemberListItem, (args, res: any) => {
          const user = args?.[0]?.user;
          if (res && user && shouldHideUser(user.id)) {
            if (res.props?.subtitle) res.props.subtitle = null;
          }
          return res;
        })
      );
    }

    // Hide guild tags from usernames in chat
    const MessageUsername = findByProps("Username");
    if (MessageUsername?.Username) {
      patches.push(
        after("Username", MessageUsername, (args, res: any) => {
          const user = args?.[0]?.user;
          if (res && user && shouldHideUser(user.id)) {
            if (res.props?.guildTag) res.props.guildTag = null;
          }
          return res;
        })
      );
    }

    if (!storage.whitelist) storage.whitelist = [];
    console.log("[HideGuildTags] Plugin loaded successfully");
  } catch (error) {
    console.error("[HideGuildTags] Failed to load:", error);
  }
};

export const onUnload = () => {
  for (const unpatch of patches) {
    try {
      unpatch();
    } catch {}
  }
  patches = [];
  console.log("[HideGuildTags] Plugin unloaded");
};

export const settings = Settings;
