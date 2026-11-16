import { apiRequest } from "./api";

export interface ChatConversation {
  id: number;
  student_id: number;
  employer_id: number;
  created_at: string;
  display_name?: string | null;
}
export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  created_at: string;
}
export const chatApi = {
  conversations: () => apiRequest<{ conversations: ChatConversation[] }>("/chat/conversations", {}, true),
  messages: (id: number) => apiRequest<{ messages: ChatMessage[] }>(`/chat/conversations/${id}/messages`, {}, true),
  create: (employerId: number) => apiRequest<{ conversationId: number }>("/chat/conversations", {method:"POST", body:JSON.stringify({employerId})}, true),
};
