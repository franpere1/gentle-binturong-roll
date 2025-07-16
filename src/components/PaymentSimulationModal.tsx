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
import { showError } from "@/utils/toast"; // Import showError for validation

interface PaymentSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceTitle: string;
  negotiatedServiceRate: number; // Changed prop name to reflect it's the base rate
  onConfirm: (finalAmount: number) => void; // This finalAmount is the negotiated service rate
}

const PaymentSimulationModal: React.FC<PaymentSimulationModalProps> = ({
  isOpen,
  onClose,
  serviceTitle,
  negotiatedServiceRate, // Changed prop name
  onConfirm,
}) => {
  // New states for simulated card details
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");

  // Calculate the total amount the client pays, including the 5% commission
  const CLIENT_PAYMENT_ADDITIONAL_COMMISSION_PERCENTAGE = 0.05;
  const clientPaymentAmount = negotiatedServiceRate * (1 + CLIENT_PAYMENT_ADDITIONAL_COMMISSION_PERCENTAGE);

  const handleConfirmPayment = () => {
    // Basic validation for simulation
    if (!cardNumber || !expiryDate || !cvv || !cardholderName) {
      showError("Por favor, completa todos los datos de la tarjeta.");
      return;
    }
    if (cardNumber.replace(/\s/g, '').length !== 16 || !/^\d+$/.test(cardNumber.replace(/\s/g, ''))) {
      showError("Número de tarjeta inválido (debe tener 16 dígitos).");
      return;
    }
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiryDate)) {
      showError("Fecha de vencimiento inválida (MM/AA).");
      return;
    }
    if (cvv.length !== 3 || !/^\d+$/.test(cvv)) {
      showError("CVV inválido (debe tener 3 dígitos).");
      return;
    }

    // The `onConfirm` callback should receive the original negotiated service rate,
    // as that's what's stored in the contract. The client's extra payment is a fee.
    onConfirm(negotiatedServiceRate);
    onClose();
  };

  // Function to format card number with spaces
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, ''); // Remove non-digits
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || ''; // Add space every 4 digits
    return formatted.substring(0, 19); // Max 16 digits + 3 spaces = 19 characters
  };

  // Function to format expiry date with slash
  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, ''); // Remove non-digits
    if (cleaned.length > 2) {
      return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
    }
    return cleaned;
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
            <Label htmlFor="payment-amount" className="text-center block mb-2">Monto del Servicio (USD)</Label>
            <Input
              id="payment-amount"
              type="number"
              value={negotiatedServiceRate.toFixed(2)} // Display negotiated rate
              readOnly
              className="mt-1 font-bold text-lg text-center"
            />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            (Incluye una comisión del 5% para la plataforma)
          </p>
          <div className="text-center text-2xl font-bold text-blue-600 dark:text-blue-400">
            Total a Pagar: ${clientPaymentAmount.toFixed(2)} USD
          </div>

          <div className="space-y-3 mt-4">
            <h3 className="text-md font-semibold text-center">Datos de la Tarjeta (Simulados)</h3>
            <div>
              <Label htmlFor="card-number">Número de Tarjeta</Label>
              <Input
                id="card-number"
                type="text"
                inputMode="numeric"
                pattern="[0-9\s]{13,19}"
                autoComplete="cc-number"
                maxLength={19}
                placeholder="XXXX XXXX XXXX XXXX"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiry-date">Fecha de Vencimiento (MM/AA)</Label>
                <Input
                  id="expiry-date"
                  type="text"
                  inputMode="numeric"
                  pattern="(0[1-9]|1[0-2])\/\d{2}"
                  maxLength={5}
                  placeholder="MM/AA"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{3}"
                  maxLength={3}
                  placeholder="XXX"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="cardholder-name">Nombre del Titular</Label>
              <Input
                id="cardholder-name"
                type="text"
                autoComplete="cc-name"
                placeholder="Nombre en la tarjeta"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                required
              />
            </div>
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