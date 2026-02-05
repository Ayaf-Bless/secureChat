import React from "react";
import { FixedSizeList as List } from "react-window";
import type { ChatRow } from "../../../electron/db";

export type ChatListProps = {
  chats: ChatRow[];
  selectedId: string | null;
  onSelect: (chatId: string) => void;
};

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  selectedId,
  onSelect,
}) => {
  const Row = ({
    index,
    style,
  }: {
    index: number;
    style: React.CSSProperties;
  }) => {
    const chat = chats[index];
    return (
      <div
        style={style}
        className={`chat-row ${selectedId === chat.id ? "active" : ""}`}
        onClick={() => onSelect(chat.id)}
      >
        <div className="chat-avatar-placeholder" />
        <div className="chat-content">
          <div className="chat-row-top">
            <span className="chat-title">{chat.title}</span>
            <span className="chat-time">
              {new Date(chat.lastMessageAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div className="chat-meta">
            <span className="chat-preview">Latest message preview...</span>
            {chat.unreadCount > 0 && (
              <span className="chat-unread">{chat.unreadCount}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <List height={600} itemCount={chats.length} itemSize={72} width="100%">
      {Row}
    </List>
  );
};
