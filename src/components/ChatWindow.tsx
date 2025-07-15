import React, { useState, useEffect, useRef } from "react";
import { useChat } from "@/context/ChatContext";
import { useAuth } from "@/context/AuthContext";
import { Message, User } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { showError } from "@/utils/toast"; // Importar showError

interface ChatWindowProps {
  otherUser: User; // El otro usuario con el que se está chateando (proveedor o cliente)
}

const ChatWindow: React.FC<ChatWindowProps> = ({ otherUser }) => {
  const { currentUser } = useAuth();
  const { sendMessage, getMessagesForConversation } = useChat();
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversationMessages = getMessagesForConversation(otherUser.id);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim() && currentUser) {
      let messageToSend = messageInput.trim();
      let numbersMasked = false;

      // Expresión regular para encontrar secuencias de 6 o más dígitos consecutivos
      const consecutiveNumbersRegex = /\d{6,}/g;

      if (consecutiveNumbersRegex.test(messageToSend)) {
        messageToSend = messageToSend.replace(consecutiveNumbersRegex, (match) => {
          numbersMasked = true;
          return '*'.repeat(match.length); // Reemplazar con asteriscos de la misma longitud
        });
      }

      sendMessage(otherUser.id, messageToSend);
      setMessageInput("");

      if (numbersMasked) {
        showError("Se detectaron números consecutivos largos y fueron ocultados para proteger tu privacidad y la de otros usuarios.");
      }
    }
  };

  useEffect(() => {
    // Desplazarse al final de los mensajes cuando se actualizan
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationMessages]);

  if (!currentUser) {
    return <div className="text-center text-gray-500">Inicia sesión para chatear.</div>;
  }

  return (
    <div className="flex flex-col h-[400px] border rounded-md">
      <ScrollArea className="flex-grow p-4 space-y-4">
        {conversationMessages.length === 0 ? (
          <div className="text-center text-gray-500">
            Inicia una conversación con {otherUser.name}.
          </div>
        ) : (
          conversationMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.senderId === currentUser.id ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg ${
                  msg.senderId === currentUser.id
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                }`}
              >
                <p className="text-sm">{msg.text}</p>
                <span className="text-xs opacity-75 mt-1 block">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </ScrollArea>
      <form onSubmit={handleSendMessage} className="flex p-4 border-t">
        <Input
          type="text"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-grow mr-2"
        />
        <Button type="submit">Enviar</Button>
      </form>
    </div>
  );
};

export default ChatWindow;