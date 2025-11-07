import { User, Notification } from '../models/index.js';

/**
 * Extract mentions from content (@username)
 * Returns array of unique usernames mentioned
 */
export function extractMentions(content) {
  if (!content) return [];

  // Regex to match @username (alphanumeric, underscore, hyphen)
  const mentionRegex = /@([\w-]+)/g;
  const matches = content.matchAll(mentionRegex);

  const usernames = new Set();
  for (const match of matches) {
    usernames.add(match[1].toLowerCase());
  }

  return Array.from(usernames);
}

/**
 * Resolve usernames to user objects
 * Returns array of { userId, username }
 */
export async function resolveMentions(usernames) {
  if (!usernames || usernames.length === 0) return [];

  try {
    // Find users by name (case-insensitive)
    const users = await User.find({
      name: { $in: usernames.map(u => new RegExp(`^${u}$`, 'i')) }
    }).select('_id name email').lean();

    return users.map(user => ({
      userId: user._id,
      username: user.name
    }));
  } catch (error) {
    console.error('Error resolving mentions:', error);
    return [];
  }
}

/**
 * Create notifications for mentioned users
 */
export async function createMentionNotifications(mentions, context) {
  if (!mentions || mentions.length === 0) return;

  const { authorId, authorUid, threadId, commentId, type, threadTitle } = context;

  try {
    // Get UIDs for mentioned users
    const mentionedUserIds = mentions
      .filter(mention => mention.userId.toString() !== authorId.toString()) // Don't notify self
      .map(m => m.userId);

    if (mentionedUserIds.length === 0) return;

    const mentionedUsers = await User.find({ _id: { $in: mentionedUserIds } })
      .select('uid name').lean();

    const notifications = mentionedUsers.map(user => ({
      uid: user.uid,
      type: 'forum_mention',
      title: type === 'thread' ? 'Te mencionaron en un hilo' : 'Te mencionaron en un comentario',
      message: `Te mencionaron en: ${threadTitle || 'un hilo del foro'}`,
      data: {
        threadId: threadId.toString(),
        commentId: commentId ? commentId.toString() : null,
        mentionedBy: authorUid
      },
      read: false
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  } catch (error) {
    console.error('Error creating mention notifications:', error);
  }
}

/**
 * Process content and extract mentions
 * Returns { mentions, resolved mentions }
 */
export async function processMentions(content) {
  const usernames = extractMentions(content);
  const resolved = await resolveMentions(usernames);

  return {
    usernames,
    mentions: resolved
  };
}
