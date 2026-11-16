
import { useEffect, useRef, useState } from "react";
import { Send, RefreshCw } from "lucide-react";
import { tokenStore } from "../services/api";
import { createChatSocket } from "../services/socket";
import { chatApi } from "../services/chat";
import type { ChatConversation, ChatMessage } from "../services/chat";
import type { Socket } from "socket.io-client";
import { useSearchParams } from "react-router-dom";

export default function ChatPage() {
  const [searchParams] = useSearchParams();
  const requestedConversationId = Number(searchParams.get("conversation"));
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [myId, setMyId] = useState<number | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const selectedRef = useRef<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Lấy cuộc trò chuyện đang được chọn
  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selected
  );

  // Hiển thị tên công ty hoặc tên ứng viên
  const getConversationName = (conversation: ChatConversation) => {
    return (
      conversation.display_name?.trim() ||
      `Cuộc trò chuyện #${conversation.id}`
    );
  };

  // Khởi tạo kết nối và lấy danh sách cuộc trò chuyện
  useEffect(() => {
    const token = tokenStore.get();

    if (!token) {
      setError("Vui lòng đăng nhập lại.");
      setLoading(false);
      return;
    }

    try {
      const payload = JSON.parse(
        atob(
          token
            .split(".")[1]
            .replace(/-/g, "+")
            .replace(/_/g, "/")
        )
      );

      if (Number.isSafeInteger(payload.id)) {
        setMyId(payload.id);
      }
    } catch {
      // Không ảnh hưởng đến xác thực phía server
    }

    let active = true;

    chatApi
      .conversations()
      .then((data) => {
        if (!active) return;

        const list = data.conversations || [];

        setConversations(list);
        const requested = list.find(c => c.id === requestedConversationId);
        setSelected(requested?.id ?? list[0]?.id ?? null);
      })
      .catch((e) => {
        if (active) {
          setError(e.message || "Không tải được cuộc trò chuyện");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const socket = createChatSocket(token);
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);

      if (selectedRef.current) {
        socket.emit("join_conversation", selectedRef.current);
      }
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("receive_message", (message: ChatMessage) => {
      if (message.conversation_id !== selectedRef.current) return;

      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;

        return [...prev, message].sort((a, b) => a.id - b.id);
      });
    });

    socket.on("chat_error", (e: { message?: string }) => {
      setError(e.message || "Lỗi chat");
    });

    socket.on("connect_error", (e) => {
      setConnected(false);
      setError(`Không kết nối được chat: ${e.message}`);
    });

    socket.connect();

    return () => {
      active = false;
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Lấy lịch sử tin nhắn khi chọn cuộc trò chuyện
  useEffect(() => {
    selectedRef.current = selected;
    setMessages([]);
    setError("");

    if (!selected) return;

    let active = true;
    const socket = socketRef.current;

    if (socket?.connected) {
      socket.emit("join_conversation", selected);
    }

    chatApi
      .messages(selected)
      .then((data) => {
        if (!active) return;

        setMessages((prev) => {
          const map = new Map<number, ChatMessage>();

          for (const message of [...(data.messages || []), ...prev]) {
            map.set(message.id, message);
          }

          return [...map.values()].sort((a, b) => a.id - b.id);
        });
      })
      .catch((e) => {
        if (active) {
          setError(e.message || "Không tải được tin nhắn");
        }
      });

    return () => {
      active = false;
    };
  }, [selected]);

  // Tự động cuộn xuống tin nhắn mới
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // Gửi tin nhắn qua Socket.IO
  function send() {
    const content = draft.trim();
    const socket = socketRef.current;

    if (!selected || !content || sending) return;

    if (content.length > 5000) {
      setError("Tin nhắn tối đa 5000 ký tự");
      return;
    }

    if (!socket?.connected) {
      setError("Mất kết nối realtime. Hãy thử lại.");
      return;
    }

    setSending(true);
    setError("");

    socket.emit(
      "send_message",
      { conversationId: selected, content },
      (response: {
        success: boolean;
        message?: ChatMessage | string;
      }) => {
        setSending(false);

        if (!response?.success) {
          setError(
            typeof response?.message === "string"
              ? response.message
              : "Không gửi được tin nhắn"
          );
          return;
        }

        setDraft("");

        if (
          response.message &&
          typeof response.message !== "string" &&
          response.message.conversation_id === selectedRef.current
        ) {
          const newMessage = response.message;

          setMessages((prev) =>
            prev.some((m) => m.id === newMessage.id)
              ? prev
              : [...prev, newMessage]
          );
        }
      }
    );
  }

  return (
    <div className="sj-chat-page">
      <h1>Tin nhắn</h1>

      <p className="muted">
        Trao đổi trực tiếp giữa sinh viên và nhà tuyển dụng.
      </p>

      {error && (
        <div className="sj-chat-error" role="alert">
          {error}
        </div>
      )}

      <div className="sj-chat-layout">
        {/* Danh sách cuộc trò chuyện */}
        <aside className="sj-chat-list">
          <h3>Cuộc trò chuyện</h3>

          {loading ? (
            <p>Đang tải...</p>
          ) : conversations.length === 0 ? (
            <p className="muted">
              Chưa có cuộc trò chuyện.
            </p>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.id}
                className={`sj-chat-item ${
                  selected === conversation.id ? "active" : ""
                }`}
                onClick={() => setSelected(conversation.id)}
              >
                <strong>
                  {getConversationName(conversation)}
                </strong>

                <small>
                  {new Date(
                    conversation.created_at
                  ).toLocaleDateString("vi-VN")}
                </small>
              </button>
            ))
          )}
        </aside>

        {/* Nội dung cuộc trò chuyện */}
        <section className="sj-chat-main">
          {selected ? (
            <>
              <div className="sj-chat-header">
                <strong>
                  {selectedConversation
                    ? getConversationName(selectedConversation)
                    : `Cuộc trò chuyện #${selected}`}
                </strong>

                <span>
                  <RefreshCw size={14} />
                  {connected ? "Đã kết nối" : "Đang kết nối..."}
                </span>
              </div>

              <div className="sj-chat-messages">
                {messages.length === 0 && (
                  <p className="muted">
                    Chưa có tin nhắn.
                  </p>
                )}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`sj-chat-bubble ${
                      myId === message.sender_id ? "mine" : ""
                    }`}
                  >
                    <div>{message.content}</div>

                    <small>
                      {new Date(
                        message.created_at
                      ).toLocaleString("vi-VN")}
                    </small>
                  </div>
                ))}

                <div ref={bottomRef} />
              </div>

              <form
                className="sj-chat-compose"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <input
                  aria-label="Nội dung tin nhắn"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Nhập tin nhắn..."
                  maxLength={5000}
                />

                <button
                  className="btn btn-primary"
                  disabled={
                    sending || !draft.trim() || !connected
                  }
                  type="submit"
                >
                  <Send size={16} />
                  Gửi
                </button>
              </form>
            </>
          ) : (
            <div className="sj-chat-empty">
              Chọn một cuộc trò chuyện để bắt đầu.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
