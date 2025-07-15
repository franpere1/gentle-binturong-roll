import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Contract } from "@/types";
import { useContracts } from "@/context/ContractContext";

interface ContractCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract;
  providerName: string;
  onFeedbackProvided: (contract: Contract, providerName: string) => void; // Nueva prop
}

const ContractCompletionModal: React.FC<ContractCompletionModalProps> = ({
  isOpen,
  onClose,
  contract,
  providerName,
  onFeedbackProvided,
}) => {
  const { releaseFunds } = useContracts();

  const handleConfirmCompletion = () => {
    if (releaseFunds(contract.id)) {
      onFeedbackProvided(contract, providerName); // Llamar a la nueva prop
    }
    onClose();
  };

  const amountToProvider = contract.serviceRate * (1 - contract.commissionRate);
  const commissionAmount = contract.serviceRate * contract.commissionRate;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Finalizar Contrato y Liberar Fondos</DialogTitle>
          <DialogDescription>
            Confirma que el servicio ha sido completado satisfactoriamente.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-lg">
            <span className="font-semibold">Servicio:</span> {contract.serviceTitle}
          </p>
          <p className="text-lg">
            <span className="font-semibold">Proveedor:</span> {providerName}
          </p>
          <p className="text-lg">
            <span className="font-semibold">Tarifa Total:</span> ${contract.serviceRate.toFixed(2)} USD
          </p>
          <p className="text-lg text-green-600 dark:text-green-400">
            <span className="font-semibold">Monto a Liberar al Proveedor:</span> ${amountToProvider.toFixed(2)} USD
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            (Comisión de la plataforma: ${commissionAmount.toFixed(2)} USD)
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Al confirmar, los fondos serán liberados al proveedor. Esta acción no se puede deshacer.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmCompletion}>
            Confirmar y Liberar Fondos
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContractCompletionModal;