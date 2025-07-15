import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
    import { Message, User } from "@/types";
    import { useAuth } from "./AuthContext";
    import { supabase } from "@/lib/supabase"; // Import Supabase client

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

    export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
      const { currentUser } = useAuth();
      const [allMessages, setAllMessages] = useState<Message[]>([]);

      // Fetch messages on component mount and when currentUser changes
      useEffect(() => {
        const fetchMessages = async () => {
          if (!currentUser) {
            setAllMessages([]);
            return;
          }

          const { data, error } = await supabase
            .from('messages')
            .select('*')
            .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);

          if (error) {
            console.error("Error fetching messages:", error);
            return;
          }

          const fetchedMessages: Message[] = data.map(msg => ({
            id: msg.id,
            senderId: msg.sender_id,
            receiverId: msg.receiver_id,
            text: msg.text,
            timestamp: msg.timestamp,
            readBy: msg.read_by || [],
          }));
          setAllMessages(fetchedMessages);
        };

        fetchMessages();

        // Set up real-time subscription for messages
        const channel = supabase
          .channel('messages_channel')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'messages' },
            (payload) => {
              console.log('Change received!', payload);
              if (payload.eventType === 'INSERT') {
                const newMessage: Message = {
                  id: payload.new.id,
                  senderId: payload.new.sender_id,
                  receiverId: payload.new.receiver_id,
                  text: payload.new.text,
                  timestamp: payload.new.timestamp,
                  readBy: payload.new.read_by || [],
                };
                setAllMessages((prev) => [...prev, newMessage]);
              } else if (payload.eventType === 'UPDATE') {
                const updatedMessage: Message = {
                  id: payload.new.id,
                  senderId: payload.new.sender_id,
                  receiverId: payload.new.receiver_id,
                  text: payload.new.text,
                  timestamp: payload.new.timestamp,
                  readBy: payload.new.read_by || [],
                };
                setAllMessages((prev) =>
                  prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg))
                );
              } else if (payload.eventType === 'DELETE') {
                setAllMessages((prev) =>
                  prev.filter((msg) => msg.id !== payload.old.id)
                );
              }
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }, [currentUser]);

      const sendMessage = async (receiverId: string, text: string) => {
        if (!currentUser) {
          console.error("No hay usuario actual para enviar el mensaje.");
          return;
        }

        const { data, error } = await supabase.from('messages').insert([
          {
            sender_id: currentUser.id,
            receiver_id: receiverId,
            text,
            timestamp: Date.now(),
            read_by: [],
          }
        ]).select().single();

        if (error) {
          console.error("Error sending message:", error);
        } else {
          // Message will be added via real-time subscription, no need to manually update state here
          console.log("Message sent and inserted into DB:", data);
        }
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
        const { error } = await supabase
          .from('messages')
          .delete()
          .or(`(sender_id.eq.${user1Id},receiver_id.eq.${user2Id}),(sender_id.eq.${user2Id},receiver_id.eq.${user1Id})`);

        if (error) {
          console.error("Error clearing conversation messages:", error);
        } else {
          // Messages will be removed via real-time subscription
          console.log("Conversation messages cleared from DB.");
        }
      };

      const markMessagesAsRead = useCallback(async (otherUserId: string) => {
        if (!currentUser) return;

        const unreadMessages = allMessages.filter(
          (msg) =>
            msg.senderId === otherUserId &&
            msg.receiverId === currentUser.id &&
            !msg.readBy?.includes(currentUser.id)
        );

        if (unreadMessages.length > 0) {
          const messageIdsToUpdate = unreadMessages.map(msg => msg.id);
          const { error } = await supabase
            .from('messages')
            .update({ read_by: supabase.fn.arrayAppend('read_by', currentUser.id) })
            .in('id', messageIdsToUpdate);

          if (error) {
            console.error("Error marking messages as read:", error);
          } else {
            // Messages will be updated via real-time subscription
            console.log("Messages marked as read in DB.");
          }
        }
      }, [allMessages, currentUser]);

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