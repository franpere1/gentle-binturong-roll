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
import { Lock } from "lucide-react"; // Import Lock icon

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
  // El monto negociado ahora siempre será el initialAmount, ya que no es editable
  const negotiatedAmount = initialAmount;

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
          <DialogTitle className="flex items-center justify-center gap-2">
            <Lock className="h-5 w-5 text-green-600" />
            Simulación de Pasarela de Pago
          </DialogTitle>
          <DialogDescription className="text-center">
            Estás a punto de depositar fondos para el servicio. El monto es el acordado con el proveedor.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-lg text-center">
            <span className="font-semibold">Servicio:</span> {serviceTitle}
          </p>
          <div>
            <Label htmlFor="payment-amount" className="text-center block mb-2">Monto a Pagar (USD)</Label>
            <Input
              id="payment-amount"
              type="number"
              value={negotiatedAmount.toFixed(2)} // Mostrar con 2 decimales
              readOnly // Hacer el campo de solo lectura
              className="mt-1 font-bold text-lg text-center" // Estilo para resaltar que es fijo
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            (Este es un pago simulado. No se realizará ninguna transacción real.)
          </p>
          <p className="text-xs text-green-700 dark:text-green-300 text-center flex items-center justify-center gap-1">
            <Lock className="h-3 w-3" /> Transacción segura y encriptada
          </p>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleConfirmPayment} className="w-full">
            Confirmar Pago
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentSimulationModal;