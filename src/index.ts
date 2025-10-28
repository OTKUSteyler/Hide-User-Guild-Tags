import { before, after } from "@vendetta/patcher";
import { findByProps } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";

let patches: (() => void)[] = [];

export default {
  onLoad() {
    try {
      // Hide guild tags in user profiles
      const UserTag = findByProps("GuildTag");
      const GuildTagComponent = UserTag?.GuildTag;
      if (GuildTagComponent) {
        patches.push(after("GuildTag", UserTag, () => null));
      }

      // Remove guild-related data from profile badges
      const ProfileBadges = findByProps("UserProfileBadges");
      if (ProfileBadges?.UserProfileBadges) {
        patches.push(
          before("UserProfileBadges", ProfileBadges, (args) => {
            if (args[0]?.user?.guildMember) {
              args[0].user.guildMember = null;
            }
          })
        );
      }

      // Hide guild tags in member list
      const MemberListItem = findByProps("MemberListItem");
      if (MemberListItem?.MemberListItem) {
        patches.push(
          after("MemberListItem", MemberListItem, (_, res: any) => {
            if (!res) return res;
            if (res.props?.subtitle) res.props.subtitle = null;
            return res;
          })
        );
      }

      // Hide guild tags from usernames in chat
      const MessageUsername = findByProps("Username");
      if (MessageUsername?.Username) {
        patches.push(
          after("Username", MessageUsername, (_, res: any) => {
            if (!res) return res;
            if (res.props?.guildTag) res.props.guildTag = null;
            return res;
          })
        );
      }

      console.log("[HideGuildTags] Plugin loaded successfully");
    } catch (error) {
      console.error("[HideGuildTags] Failed to load:", error);
    }
  },

  onUnload() {
    for (const unpatch of patches) {
      try {
        unpatch();
      } catch {}
    }
    patches = [];
    console.log("[HideGuildTags] Plugin unloaded");
  },
};
