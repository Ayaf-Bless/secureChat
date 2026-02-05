import React, { useEffect, useMemo, useState } from "react";
import { ChatList } from "./components/ChatList";
import { MessageView } from "./components/MessageView";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { loadChats, loadMoreChats, upsertChat } from "./store/chatsSlice";
import {
  loadMessages,
  searchMessages,
  setActiveChat,
} from "./store/messagesSlice";
import { SyncClient } from "./services/syncClient";

const syncClient = new SyncClient();

export const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const chats = useAppSelector((state) => state.chats.items);
  const chatOffset = useAppSelector((state) => state.chats.offset);
  const activeChatId = useAppSelector((state) => state.messages.activeChatId);
  const messages = useAppSelector((state) =>
    activeChatId ? (state.messages.byChat[activeChatId] ?? []) : [],
  );
  const connection = useAppSelector((state) => state.connection);
  const [search, setSearch] = useState("");
  const [apiReady, setApiReady] = useState(!!window.secureApi);

  useEffect(() => {
    if (!window.secureApi) {
      console.error("Secure API is missing. Preload script might have failed.");
      return;
    }
    window.secureApi.seedIfEmpty().then(() => dispatch(loadChats(50)));
    syncClient.connect();
    const unsubscribe = window.secureApi.onChatUpdated((chat) => {
      dispatch(upsertChat(chat));
    });
    return () => {
      unsubscribe();
    };
  }, [dispatch]);

  if (!apiReady) {
    return (
      <div className="app">
        <div className="empty" style={{ flexDirection: "column", gap: 16 }}>
          <h2>Application Error</h2>
          <p>Secure API is not available.</p>
          <p className="text-secondary">
            This usually means the preload script failed to run.
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (activeChatId) {
      dispatch(loadMessages({ chatId: activeChatId, limit: 50 }));
      window.secureApi.markRead(activeChatId);
    }
  }, [activeChatId, dispatch]);

  const handleSelectChat = (chatId: string) => {
    dispatch(setActiveChat(chatId));
  };

  const handleLoadMoreChats = () => {
    dispatch(loadMoreChats({ limit: 50, offset: chatOffset }));
  };

  const handleLoadOlder = () => {
    if (!activeChatId || messages.length === 0) return;
    const oldest = messages[messages.length - 1];
    dispatch(
      loadMessages({ chatId: activeChatId, limit: 50, beforeTs: oldest.ts }),
    );
  };

  const handleSearch = () => {
    if (!activeChatId) return;
    if (search.trim().length === 0) {
      dispatch(loadMessages({ chatId: activeChatId, limit: 50 }));
      return;
    }
    dispatch(searchMessages({ chatId: activeChatId, query: search }));
  };

  const selectedChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId),
    [chats, activeChatId],
  );

  return (
    <div className="app">
      <header className="app-header">
        <h1>Secure Messenger Desktop</h1>
        <ConnectionStatus
          status={connection.status}
          lastHeartbeatAt={connection.lastHeartbeatAt}
        />
        <button className="secondary" onClick={() => syncClient.simulateDrop()}>
          Simulate connection drop
        </button>
        <button
          className="secondary"
          onClick={() =>
            window.secureApi.seed().then(() => dispatch(loadChats(50)))
          }
        >
          Reseed data
        </button>
      </header>
      <main className="app-main">
        <section className="chat-panel">
          <div className="panel-header">
            <h2>Chats</h2>
            <button onClick={handleLoadMoreChats}>Load more</button>
          </div>
          <ChatList
            chats={chats}
            selectedId={activeChatId}
            onSelect={handleSelectChat}
          />
        </section>
        <section className="message-panel">
          <div className="panel-header">
            <h2>{selectedChat ? selectedChat.title : "Select a chat"}</h2>
            <div className="search">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search in chat"
              />
              <button onClick={handleSearch}>Search</button>
            </div>
          </div>
          {activeChatId ? (
            <MessageView messages={messages} onLoadOlder={handleLoadOlder} />
          ) : (
            <div className="empty">No chat selected.</div>
          )}
        </section>
      </main>
    </div>
  );
};
