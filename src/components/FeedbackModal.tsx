import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Contract, FeedbackType } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { showSuccess, showError } from "@/utils/toast";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract;
  providerName: string;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  contract,
  providerName,
}) => {
  const { currentUser, addFeedbackToProvider } = useAuth();
  const [selectedRating, setSelectedRating] = useState<FeedbackType | null>(null);
  const [comment, setComment] = useState("");

  const handleSaveFeedback = () => {
    if (!selectedRating) {
      showError("Por favor, selecciona una calificación.");
      return;
    }
    if (comment.trim().split(" ").length > 20) {
      showError("El comentario no debe exceder las 20 palabras.");
      return;
    }

    if (currentUser && currentUser.id === contract.clientId) {
      addFeedbackToProvider(
        contract.providerId,
        selectedRating,
        comment.trim()
      );
      showSuccess("¡Gracias por tu feedback!");
      onClose();
    } else {
      showError("Solo el cliente que contrató puede dejar feedback.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Dejar Feedback para {providerName}</DialogTitle>
          <DialogDescription>
            Ayúdanos a mejorar calificando el servicio de {providerName}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <Label className="mb-2 block">Calificación:</Label>
            <RadioGroup
              onValueChange={(value: FeedbackType) => setSelectedRating(value)}
              value={selectedRating || ""}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={FeedbackType.Positive} id="rating-positive" />
                <Label htmlFor="rating-positive">Positivo</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={FeedbackType.Neutral} id="rating-neutral" />
                <Label htmlFor="rating-neutral">Neutro</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={FeedbackType.Negative} id="rating-negative" />
                <Label htmlFor="rating-negative">Negativo</Label>
              </div>
            </RadioGroup>
          </div>
          <div>
            <Label htmlFor="feedback-comment" className="mb-2 block">Comentario (máx. 20 palabras):</Label>
            <Textarea
              id="feedback-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={120} // Aproximadamente 20 palabras
              placeholder="Escribe tu comentario aquí..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSaveFeedback} disabled={!selectedRating || comment.trim() === ""}>
            Enviar Feedback
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackModal;