import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PaymentSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceTitle: string;
  amount: number;
  onConfirm: () => void;
}

const PaymentSimulationModal: React.FC<PaymentSimulationModalProps> = ({
  isOpen,
  onClose,
  serviceTitle,
  amount,
  onConfirm,
}) => {
  const handleConfirmPayment = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Simulación de Pasarela de Pago</DialogTitle>
          <DialogDescription>
            Estás a punto de depositar fondos para el servicio.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-lg">
            <span className="font-semibold">Servicio:</span> {serviceTitle}
          </p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            Total a Pagar: ${amount.toFixed(2)} USD
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            (Este es un pago simulado. No se realizará ninguna transacción real.)
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