import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PaymentSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceTitle: string;
  initialAmount: number; // Renombrado para indicar que es el monto sugerido
  onConfirm: (finalAmount: number) => void; // Ahora pasa el monto final
}

const PaymentSimulationModal: React.FC<PaymentSimulationModalProps> = ({
  isOpen,
  onClose,
  serviceTitle,
  initialAmount,
  onConfirm,
}) => {
  const [negotiatedAmount, setNegotiatedAmount] = useState<number | string>(initialAmount);

  const handleConfirmPayment = () => {
    const finalAmount = parseFloat(String(negotiatedAmount));
    if (isNaN(finalAmount) || finalAmount <= 0) {
      // Aquí se podría añadir un toast de error si el monto no es válido
      return;
    }
    onConfirm(finalAmount);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Simulación de Pasarela de Pago</DialogTitle>
          <DialogDescription>
            Estás a punto de depositar fondos para el servicio. Puedes ajustar el monto si es necesario.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-lg">
            <span className="font-semibold">Servicio:</span> {serviceTitle}
          </p>
          <div>
            <Label htmlFor="payment-amount">Monto a Pagar (USD)</Label>
            <Input
              id="payment-amount"
              type="number"
              value={negotiatedAmount}
              onChange={(e) => setNegotiatedAmount(e.target.value)}
              placeholder="Ingresa el monto"
              required
              min="0.01"
              step="0.01"
              className="mt-1"
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            (Este es un pago simulado. No se realizará ninguna transacción real.)
          </p>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleConfirmPayment} className="w-full" disabled={!negotiatedAmount || parseFloat(String(negotiatedAmount)) <= 0}>
            Confirmar Pago
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentSimulationModal;