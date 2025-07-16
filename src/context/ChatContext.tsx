import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
    import { Message, User } from "@/types";
    import { useAuth } from "@/context/AuthContext";

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

    const LOCAL_STORAGE_MESSAGES_KEY = "te_lo_hago_messages";

    // Helper to load messages from localStorage
    const loadMessagesFromLocalStorage = (): Message[] => {
      try {
        const storedMessages = localStorage.getItem(LOCAL_STORAGE_MESSAGES_KEY);
        if (storedMessages) {
          return JSON.parse(storedMessages);
        }
      } catch (error) {
        console.error("Error loading messages from localStorage:", error);
      }
      return [];
    };

    // Helper to save messages to localStorage
    const saveMessagesToLocalStorage = (messages: Message[]) => {
      try {
        localStorage.setItem(LOCAL_STORAGE_MESSAGES_KEY, JSON.stringify(messages));
      } catch (error) {
        console.error("Error saving messages to localStorage:", error);
      }
    };

    export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
      const { currentUser } = useAuth();
      // Initialize messages state with data from localStorage
      const [allMessages, setAllMessages] = useState<Message[]>(() => loadMessagesFromLocalStorage());

      // Function to update messages state and save to localStorage
      const updateAndSaveMessages = useCallback((newMessages: Message[]) => {
        setAllMessages(newMessages);
        saveMessagesToLocalStorage(newMessages);
      }, []);

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

        updateAndSaveMessages([...allMessages, newMessage]); // Use updateAndSaveMessages
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
        const newMessages = allMessages.filter( // Use allMessages state
          (msg) =>
            !((msg.senderId === user1Id && msg.receiverId === user2Id) ||
              (msg.senderId === user2Id && msg.receiverId === user1Id))
        );
        updateAndSaveMessages(newMessages); // Use updateAndSaveMessages
        console.log("Conversation messages cleared (in-memory).");
      };

      const markMessagesAsRead = useCallback(async (otherUserId: string) => {
        if (!currentUser) return;

        let updated = false;
        const newMessages = allMessages.map(msg => { // Use allMessages state
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
          updateAndSaveMessages(newMessages); // Use updateAndSaveMessages
          console.log("Messages marked as read (in-memory).");
        }
      }, [allMessages, currentUser]); // Depend on allMessages state

      const hasUnreadMessages = useCallback((otherUserId: string): boolean => {
        if (!currentUser) return false;

        return allMessages.some( // Use allMessages state
          (msg) =>
            msg.senderId === otherUserId &&
            msg.receiverId === currentUser.id &&
            !msg.readBy?.includes(currentUser.id)
        );
      }, [allMessages, currentUser]); // Depend on allMessages state

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