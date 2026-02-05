import React, { useMemo } from "react";
import type { MessageRow } from "../../../electron/db";

export type MessageViewProps = {
  messages: MessageRow[];
  onLoadOlder: () => void;
};

export const MessageView: React.FC<MessageViewProps> = ({
  messages,
  onLoadOlder,
}) => {
  const listRef = React.useRef<HTMLDivElement>(null);
  const sorted = useMemo(
    () => [...messages].sort((a, b) => a.ts - b.ts),
    [messages],
  );

  // Auto-scroll to bottom on messages change
  // Note: In a production app, we would preserve scroll position when loading older messages
  // and only auto-scroll if the user was already near the bottom.
  React.useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [sorted]);

  return (
    <div className="message-view">
      <div className="message-list" ref={listRef}>
        <button
          className="secondary"
          onClick={onLoadOlder}
          style={{ alignSelf: "center", marginBottom: 16 }}
        >
          Load older messages
        </button>
        {sorted.map((message) => (
          <div key={message.id} className="message-row">
            <div className="message-header">
              <span className="message-sender">{message.sender}</span>
              <span className="message-time">
                {new Date(message.ts).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="message-body">{message.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
