
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
    <div className="space-y-4">
      <div>
        <span className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider block mb-1">
          TRAO ĐỔI TRỰC TIẾP
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-foreground)]">
          Tin nhắn
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-muted-foreground)] mt-1">
          Trao đổi trực tiếp giữa sinh viên và nhà tuyển dụng theo thời gian thực.
        </p>
      </div>

      {error && (
        <div
          className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 bg-white border border-[var(--color-border)] rounded-xl overflow-hidden min-h-[520px] md:h-[calc(100vh-14rem)]">
        {/* Danh sách cuộc trò chuyện */}
        <aside className="md:col-span-4 border-b md:border-b-0 md:border-r border-[var(--color-border)] flex flex-col bg-[var(--color-background)]/40">
          <div className="px-4 py-3.5 border-b border-[var(--color-border)] bg-white flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-foreground)]">
              Cuộc trò chuyện ({conversations.length})
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[var(--color-border)] max-h-60 md:max-h-none">
            {loading ? (
              <p className="p-4 text-xs text-[var(--color-muted-foreground)]">
                Đang tải...
              </p>
            ) : conversations.length === 0 ? (
              <p className="p-6 text-xs text-center text-[var(--color-muted-foreground)]">
                Chưa có cuộc trò chuyện nào.
              </p>
            ) : (
              conversations.map((conversation) => {
                const isActive = selected === conversation.id;
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    className={`w-full text-left px-4 py-3.5 transition-colors duration-150 cursor-pointer flex items-center justify-between gap-2 ${
                      isActive
                        ? "bg-[var(--color-primary)]/10 border-l-4 border-l-[var(--color-primary)]"
                        : "hover:bg-white"
                    }`}
                    onClick={() => setSelected(conversation.id)}
                  >
                    <strong
                      className={`text-xs font-bold truncate block ${
                        isActive
                          ? "text-[var(--color-primary)]"
                          : "text-[var(--color-foreground)]"
                      }`}
                    >
                      {getConversationName(conversation)}
                    </strong>

                    <small className="text-[11px] text-[var(--color-muted-foreground)] shrink-0">
                      {new Date(conversation.created_at).toLocaleDateString("vi-VN")}
                    </small>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Nội dung cuộc trò chuyện */}
        <section className="md:col-span-8 flex flex-col bg-white min-h-[380px]">
          {selected ? (
            <>
              <div className="px-4 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between gap-3">
                <strong className="text-sm font-bold text-[var(--color-foreground)] truncate">
                  {selectedConversation
                    ? getConversationName(selectedConversation)
                    : `Cuộc trò chuyện #${selected}`}
                </strong>

                <span
                  className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                    connected
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  <RefreshCw size={11} className={!connected ? "animate-spin" : ""} />
                  {connected ? "Đã kết nối" : "Đang kết nối..."}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--color-background)]/30">
                {messages.length === 0 && (
                  <p className="text-xs text-center text-[var(--color-muted-foreground)] py-8">
                    Chưa có tin nhắn nào. Hãy gửi lời chào!
                  </p>
                )}

                {messages.map((message) => {
                  const isMine = myId === message.sender_id;
                  return (
                    <div
                      key={message.id}
                      className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                          isMine
                            ? "bg-[var(--color-primary)] text-white"
                            : "bg-white border border-[var(--color-border)] text-[var(--color-foreground)]"
                        }`}
                      >
                        <div className="whitespace-pre-wrap break-words">{message.content}</div>
                        <small
                          className={`block text-[10px] mt-1 ${
                            isMine ? "text-white/75 text-right" : "text-[var(--color-muted-foreground)]"
                          }`}
                        >
                          {new Date(message.created_at).toLocaleString("vi-VN")}
                        </small>
                      </div>
                    </div>
                  );
                })}

                <div ref={bottomRef} />
              </div>

              <form
                className="p-3 border-t border-[var(--color-border)] bg-white flex items-center gap-2.5"
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
                  className="flex-1 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg px-3.5 py-2.5 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-ring)] transition-colors duration-150"
                />

                <button
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 disabled:opacity-50 transition-colors duration-150 cursor-pointer shrink-0"
                  disabled={sending || !draft.trim() || !connected}
                  type="submit"
                >
                  <Send size={14} />
                  Gửi
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-xs text-[var(--color-muted-foreground)]">
              Chọn một cuộc trò chuyện để bắt đầu.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
