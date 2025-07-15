import React, { useState, useEffect } from "react";
import { Provider } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ChatWindow from "./ChatWindow";
import { useAuth } from "@/context/AuthContext";
import { useContracts } from "@/context/ContractContext";
import { showError, showSuccess } from "@/utils/toast"; // Keep import for potential future use or if other parts still use it
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProviderContactModalProps {
  provider: Provider;
  isOpen: boolean;
  onClose: () => void;
}

const ProviderContactModal: React.FC<ProviderContactModalProps> = ({
  provider,
  isOpen,
  onClose,
}) => {
  const { currentUser } = useAuth();
  const { createContract, hasActiveOrPendingContract } = useContracts(); // Removed depositFunds
  const navigate = useNavigate();

  const isClient = currentUser && currentUser.type === "client";
  const clientHasExistingContract = isClient && hasActiveOrPendingContract(currentUser.id, provider.id);

  // Función para iniciar el proceso de contratación (crear contrato pendiente)
  const handleInitiateContractProcess = () => {
    if (!currentUser) {
      showError("Debes iniciar sesión como cliente para contratar un servicio.");
      return;
    }
    if (currentUser.type !== "client") {
      showError("Solo los clientes pueden contratar servicios.");
      return;
    }
    
    // Create contract in 'pending' status, passing the provider's suggested rate
    const newContract = createContract(
      currentUser.id,
      provider.id,
      provider.serviceTitle,
      provider.rate || 0 // Pass the initial suggested rate
    );

    if (newContract) {
      onClose(); // Close the provider contact modal
      navigate("/client-dashboard"); // Redirect to client dashboard to see the pending contract
    }
    // createContract already shows an error if it fails (e.g., existing contract)
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px] md:max-w-lg lg:max-w-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Contactar a {provider.name}</DialogTitle>
            <DialogDescription>
              Aquí puedes ver los detalles del servicio y chatear con el proveedor.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Detalles del Proveedor</h3>
              <div className="flex items-center space-x-3">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={provider.profileImage} alt={`${provider.name}'s profile`} />
                  <AvatarFallback>{provider.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p>
                    <span className="font-medium">Nombre:</span> {provider.name}
                  </p>
                  <p>
                    <span className="font-medium">Correo:</span> {provider.email}
                  </p>
                  <p>
                    <span className="font-medium">Estado:</span> {provider.state}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Detalles del Servicio</h3>
              <p>
                <span className="font-medium">Categoría:</span> {provider.category}
              </p>
              <p>
                <span className="font-medium">Título:</span> {provider.serviceTitle}
              </p>
              <p>
                <span className="font-medium">Descripción:</span> {provider.serviceDescription}
              </p>
              <p>
                <span className="font-medium">Tarifa Sugerida:</span> ${provider.rate?.toFixed(2) || '0.00'} USD
              </p>
              {provider.serviceImage && (
                <div className="mt-2">
                  <img
                    src={provider.serviceImage}
                    alt={provider.serviceTitle}
                    className="w-full h-48 object-cover rounded-md shadow-sm"
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Chat con {provider.name}</h3>
              <ChatWindow otherUser={provider} contractStatus="initial_contact" /> {/* Pass 'initial_contact' status */}
            </div>
            <div className="mt-4">
              {isClient && clientHasExistingContract ? (
                <p className="text-center text-red-500 dark:text-red-400 font-semibold">
                  Ya tienes un contrato pendiente o activo con este proveedor.
                </p>
              ) : (
                <Button className="w-full" onClick={handleInitiateContractProcess} disabled={!isClient}>
                  Contratar Servicio
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* PaymentSimulationModal is no longer opened directly from here */}
    </>
  );
};

export default ProviderContactModal;