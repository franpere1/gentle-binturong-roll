import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Message, User } from "@/types";
import { useAuth } from "./AuthContext"; // Para obtener el usuario actual

interface ChatContextType {
  messages: Message[];
  sendMessage: (receiverId: string, text: string) => void;
  getMessagesForConversation: (otherUserId: string) => Message[];
  clearConversationMessages: (user1Id: string, user2Id: string) => void; // Nueva función
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const [allMessages, setAllMessages] = useState<Message[]>(() => {
    // Cargar mensajes desde el almacenamiento local al inicio
    const storedMessages = localStorage.getItem("appMessages");
    return storedMessages ? JSON.parse(storedMessages) : [];
  });

  useEffect(() => {
    // Guardar mensajes en el almacenamiento local cada vez que cambian
    localStorage.setItem("appMessages", JSON.stringify(allMessages));
  }, [allMessages]);

  const sendMessage = (receiverId: string, text: string) => {
    if (!currentUser) {
      console.error("No hay usuario actual para enviar el mensaje.");
      return;
    }

    const newMessage: Message = {
      id: `msg-${allMessages.length + 1}-${Date.now()}`,
      senderId: currentUser.id,
      receiverId: receiverId,
      text,
      timestamp: Date.now(),
    };

    setAllMessages((prevMessages) => [...prevMessages, newMessage]);
  };

  const getMessagesForConversation = (otherUserId: string): Message[] => {
    if (!currentUser) return [];
    return allMessages
      .filter(
        (msg) =>
          (msg.senderId === currentUser.id && msg.receiverId === otherUserId) ||
          (msg.senderId === otherUserId && msg.receiverId === currentUser.id)
      )
      .sort((a, b) => a.timestamp - b.timestamp);
  };

  const clearConversationMessages = (user1Id: string, user2Id: string) => {
    setAllMessages((prevMessages) =>
      prevMessages.filter(
        (msg) =>
          !(
            (msg.senderId === user1Id && msg.receiverId === user2Id) ||
            (msg.senderId === user2Id && msg.receiverId === user1Id)
          )
      )
    );
  };

  return (
    <ChatContext.Provider value={{ messages: allMessages, sendMessage, getMessagesForConversation, clearConversationMessages }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat debe ser usado dentro de un ChatProvider");
  }
  return context;
};