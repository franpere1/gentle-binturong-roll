import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
    import { Message, User } from "@/types";
    import { useAuth } from "@/context/AuthContext"; // Cambiado de "./AuthContext"

    interface ChatContextType {
      messages: Message[];
      sendMessage: (receiverId: string, text: string) => Promise<void>;
      getMessagesForConversation: (otherUserId: string) => Message[];
      clearConversationMessages: (user1Id: string, user2Id: string) => Promise<void>;
      markMessagesAsRead: (otherUserId: string) => Promise<void>;
      hasUnreadMessages: (otherUserId: string) => boolean;
    }

    const ChatContext = createContext<ChatContextType | undefined>(undefined);

    interface ChatProviderProps {
      children: ReactNode;
    }

    // In-memory storage for messages (simulating a database)
    let inMemoryMessages: Message[] = [];

    export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
      const { currentUser } = useAuth();
      const [allMessages, setAllMessages] = useState<Message[]>(inMemoryMessages);

      // Update local state when inMemoryMessages changes (simulating real-time)
      useEffect(() => {
        setAllMessages(inMemoryMessages);
      }, []); // Only run once on mount, subsequent changes will be direct state updates

      const sendMessage = async (receiverId: string, text: string) => {
        if (!currentUser) {
          console.error("No hay usuario actual para enviar el mensaje.");
          return;
        }

        const newMessage: Message = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          senderId: currentUser.id,
          receiverId: receiverId,
          text,
          timestamp: Date.now(),
          readBy: [], // Initially read by no one
        };

        inMemoryMessages.push(newMessage);
        setAllMessages([...inMemoryMessages]); // Force re-render
        console.log("Message sent (in-memory):", newMessage);
      };

      const getMessagesForConversation = useCallback((otherUserId: string): Message[] => {
        if (!currentUser) return [];
        return allMessages
          .filter(
            (msg) =>
              (msg.senderId === currentUser.id && msg.receiverId === otherUserId) ||
              (msg.senderId === otherUserId && msg.receiverId === currentUser.id)
          )
          .sort((a, b) => a.timestamp - b.timestamp);
      }, [allMessages, currentUser]);

      const clearConversationMessages = async (user1Id: string, user2Id: string) => {
        inMemoryMessages = inMemoryMessages.filter(
          (msg) =>
            !((msg.senderId === user1Id && msg.receiverId === user2Id) ||
              (msg.senderId === user2Id && msg.receiverId === user1Id))
        );
        setAllMessages([...inMemoryMessages]); // Force re-render
        console.log("Conversation messages cleared (in-memory).");
      };

      const markMessagesAsRead = useCallback(async (otherUserId: string) => {
        if (!currentUser) return;

        let updated = false;
        inMemoryMessages = inMemoryMessages.map(msg => {
          if (
            msg.senderId === otherUserId &&
            msg.receiverId === currentUser.id &&
            !msg.readBy?.includes(currentUser.id)
          ) {
            updated = true;
            return {
              ...msg,
              readBy: [...(msg.readBy || []), currentUser.id],
            };
          }
          return msg;
        });

        if (updated) {
          setAllMessages([...inMemoryMessages]); // Force re-render
          console.log("Messages marked as read (in-memory).");
        }
      }, [currentUser]);

      const hasUnreadMessages = useCallback((otherUserId: string): boolean => {
        if (!currentUser) return false;

        return allMessages.some(
          (msg) =>
            msg.senderId === otherUserId &&
            msg.receiverId === currentUser.id &&
            !msg.readBy?.includes(currentUser.id)
        );
      }, [allMessages, currentUser]);

      return (
        <ChatContext.Provider value={{ messages: allMessages, sendMessage, getMessagesForConversation, clearConversationMessages, markMessagesAsRead, hasUnreadMessages }}>
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