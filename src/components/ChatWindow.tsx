import React, { useState, useEffect, useRef } from "react";
import { useChat } from "@/context/ChatContext";
import { useAuth } from "@/context/AuthContext";
import { Message, User, Contract } from "@/types"; // Import Contract type
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { showError } from "@/utils/toast"; // Importar showError

interface ChatWindowProps {
  otherUser: User; // El otro usuario con el que se está chateando (proveedor o cliente)
  contractStatus?: Contract['status'] | 'initial_contact'; // New prop for contract status or initial contact
}

const ChatWindow: React.FC<ChatWindowProps> = ({ otherUser, contractStatus }) => {
  const { currentUser } = useAuth();
  const { sendMessage, getMessagesForConversation } = useChat();
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversationMessages = getMessagesForConversation(otherUser.id);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim() && currentUser) {
      let messageToSend = messageInput.trim();
      let masked = false;

      // Determine if it's a pre-payment chat (pending, offered, or initial contact)
      const isPrePaymentChat = contractStatus === "pending" || contractStatus === "offered" || contractStatus === "initial_contact";

      if (isPrePaymentChat) {
        // Rule 1: More than 3 consecutive digits
        const consecutiveNumbersRegex = /\d{4,}/g; // 4 or more digits
        if (consecutiveNumbersRegex.test(messageToSend)) {
          messageToSend = messageToSend.replace(consecutiveNumbersRegex, (match) => {
            masked = true;
            return '*'.repeat(match.length);
          });
        }

        // Rule 2: Two consecutive words that indicate numbers
        const numberWords = [
          "cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
          "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve",
          "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa",
          "cien", "ciento", "mil", "millón", "millones"
        ];
        const numberWordsPattern = numberWords.join("|");
        const twoNumberWordsRegex = new RegExp(`\\b(${numberWordsPattern})\\s+(${numberWordsPattern})\\b`, 'gi');

        if (twoNumberWordsRegex.test(messageToSend)) {
          messageToSend = messageToSend.replace(twoNumberWordsRegex, (match) => {
            masked = true;
            return '*'.repeat(match.length); // Replace with asterisks of same length
          });
        }
      }

      sendMessage(otherUser.id, messageToSend);
      setMessageInput("");

      if (masked) {
        showError("Se detectó información sensible (números o palabras numéricas) y fue ocultada para proteger tu privacidad y la de otros usuarios antes de que se realice el pago.");
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