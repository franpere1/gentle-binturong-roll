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
import { showError } from "@/utils/toast";
import PaymentSimulationModal from "./PaymentSimulationModal"; // Importar el nuevo modal de pago

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
  const { createContract, depositFunds, hasActiveOrPendingContract, getLatestContractBetweenUsers } = useContracts();
  const [contractCreated, setContractCreated] = useState(false);
  const [currentContractId, setCurrentContractId] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [chatDisabled, setChatDisabled] = useState(false);
  const [chatDisabledMessage, setChatDisabledMessage] = useState("");

  const isClient = currentUser && currentUser.type === "client";
  const clientHasExistingContract = isClient && hasActiveOrPendingContract(currentUser.id, provider.id);

  useEffect(() => {
    if (isClient && currentUser) {
      const latestContract = getLatestContractBetweenUsers(currentUser.id, provider.id);
      if (latestContract) {
        if (latestContract.status === "finalized") {
          setChatDisabled(true);
          setChatDisabledMessage("Este chat está cerrado porque el contrato ha sido finalizado.");
        } else if (latestContract.status === "cancelled") {
          setChatDisabled(true);
          setChatDisabledMessage("Este chat está cerrado porque el contrato ha sido cancelado.");
        } else {
          setChatDisabled(false);
          setChatDisabledMessage("");
        }
      } else {
        setChatDisabled(false);
        setChatDisabledMessage("");
      }
    } else {
      setChatDisabled(false); // Chat is not disabled if not a client or no current user
      setChatDisabledMessage("");
    }
  }, [currentUser, provider.id, isClient, getLatestContractBetweenUsers]);


  const handleContractService = () => {
    if (!currentUser) {
      showError("Debes iniciar sesión como cliente para contratar un servicio.");
      return;
    }
    if (currentUser.type !== "client") {
      showError("Solo los clientes pueden contratar servicios.");
      return;
    }

    const newContract = createContract(
      currentUser.id,
      provider.id,
      provider.serviceTitle,
      provider.rate
    );

    if (newContract) {
      setCurrentContractId(newContract.id);
      setContractCreated(true);
      setIsPaymentModalOpen(true);
    }
  };

  const handlePaymentConfirmed = () => {
    if (currentContractId) {
      depositFunds(currentContractId);
      onClose();
    }
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
                <span className="font-medium">Tarifa:</span> ${provider.rate.toFixed(2)} USD
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
              {chatDisabled ? (
                <div className="text-center text-gray-500 p-4 border rounded-md bg-gray-50 dark:bg-gray-700">
                  {chatDisabledMessage}
                </div>
              ) : (
                <ChatWindow otherUser={provider} />
              )}
            </div>
            <div className="mt-4">
              {isClient && clientHasExistingContract ? (
                <p className="text-center text-red-500 dark:text-red-400 font-semibold">
                  Ya tienes un contrato pendiente o activo con este proveedor.
                </p>
              ) : !contractCreated ? (
                <Button className="w-full" onClick={handleContractService} disabled={!isClient || chatDisabled}>
                  Contratar Servicio
                </Button>
              ) : (
                <div className="text-center">
                  <p className="mb-2 text-lg font-semibold text-blue-600 dark:text-blue-400">
                    Contrato creado. Por favor, deposita los fondos.
                  </p>
                  <Button className="w-full" onClick={() => setIsPaymentModalOpen(true)} disabled={chatDisabled}>
                    Ir a Pasarela de Pago
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isPaymentModalOpen && (
        <PaymentSimulationModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          serviceTitle={provider.serviceTitle}
          amount={provider.rate}
          onConfirm={handlePaymentConfirmed}
        />
      )}
    </>
  );
};

export default ProviderContactModal;