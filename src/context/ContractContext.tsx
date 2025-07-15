import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Contract, User } from "@/types";
import { useAuth } from "./AuthContext";
import { useChat } from "./ChatContext"; // Importar useChat
import { showSuccess, showError } from "@/utils/toast";

interface ContractContextType {
  contracts: Contract[];
  createContract: (
    clientId: string,
    providerId: string,
    serviceTitle: string,
    serviceRate: number
  ) => Contract | null;
  depositFunds: (contractId: string) => boolean;
  handleContractAction: (contractId: string, actorId: string, actionType: 'finalize' | 'cancel') => void; // Nueva función
  getContractsForUser: (userId: string) => Contract[];
  hasActiveOrPendingContract: (clientId: string, providerId: string) => boolean;
  getLatestContractBetweenUsers: (user1Id: string, user2Id: string) => Contract | null;
}

const ContractContext = createContext<ContractContextType | undefined>(undefined);

interface ContractProviderProps {
  children: ReactNode;
}

export const ContractProvider: React.FC<ContractProviderProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const { clearConversationMessages } = useChat(); // Usar el contexto de chat
  const [contracts, setContracts] = useState<Contract[]>(() => {
    const storedContracts = localStorage.getItem("appContracts");
    return storedContracts ? JSON.parse(storedContracts) : [];
  });

  useEffect(() => {
    localStorage.setItem("appContracts", JSON.stringify(contracts));
  }, [contracts]);

  const hasActiveOrPendingContract = (clientId: string, providerId: string): boolean => {
    return contracts.some(
      (contract) =>
        contract.clientId === clientId &&
        contract.providerId === providerId &&
        (contract.status === "pending" || contract.status === "active")
    );
  };

  const getLatestContractBetweenUsers = (user1Id: string, user2Id: string): Contract | null => {
    const relevantContracts = contracts.filter(
      (c) =>
        (c.clientId === user1Id && c.providerId === user2Id) ||
        (c.clientId === user2Id && c.providerId === user1Id)
    );
    if (relevantContracts.length === 0) return null;

    // Sort by creation date to get the latest
    relevantContracts.sort((a, b) => b.createdAt - a.createdAt);
    return relevantContracts[0];
  };

  const createContract = (
    clientId: string,
    providerId: string,
    serviceTitle: string,
    serviceRate: number
  ): Contract | null => {
    if (!currentUser || currentUser.id !== clientId) {
      showError("Solo el cliente puede crear un contrato.");
      return null;
    }
    if (hasActiveOrPendingContract(clientId, providerId)) {
      showError("Ya tienes un contrato pendiente o activo con este proveedor.");
      return null;
    }

    const newContract: Contract = {
      id: `contract-${contracts.length + 1}-${Date.now()}`,
      clientId,
      providerId,
      serviceTitle,
      serviceRate,
      status: "pending",
      clientDeposited: false,
      clientAction: "none", // Inicializar
      providerAction: "none", // Inicializar
      commissionRate: 0.10, // 10% de comisión
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setContracts((prev) => [...prev, newContract]);
    showSuccess("Contrato creado con éxito. Por favor, deposita los fondos.");
    return newContract;
  };

  const depositFunds = (contractId: string): boolean => {
    let success = false;
    setContracts((prev) =>
      prev.map((contract) => {
        if (contract.id === contractId && contract.status === "pending" && !contract.clientDeposited) {
          success = true;
          showSuccess(`Fondos depositados para el servicio "${contract.serviceTitle}". El proveedor ha sido notificado.`);
          return { ...contract, clientDeposited: true, status: "active", updatedAt: Date.now() };
        }
        return contract;
      })
    );
    return success;
  };

  const handleContractAction = (contractId: string, actorId: string, actionType: 'finalize' | 'cancel') => {
    setContracts((prevContracts) => {
      return prevContracts.map((contract) => {
        if (contract.id !== contractId) {
          return contract;
        }

        let updatedContract = { ...contract, updatedAt: Date.now() };

        // 1. Registrar la acción del actor
        if (actorId === contract.clientId) {
          if (updatedContract.clientAction !== "none") {
            showError("Ya has realizado una acción en este contrato.");
            return contract; // No modificar si ya actuó
          }
          updatedContract.clientAction = actionType;
        } else if (actorId === contract.providerId) {
          if (updatedContract.providerAction !== "none") {
            showError("Ya has realizado una acción en este contrato.");
            return contract; // No modificar si ya actuó
          }
          updatedContract.providerAction = actionType;
        } else {
          showError("Usuario no autorizado para esta acción.");
          return contract;
        }

        // 2. Determinar el nuevo estado del contrato
        const { clientAction, providerAction, status, serviceRate, commissionRate } = updatedContract;

        if (status === "finalized" || status === "cancelled" || status === "disputed") {
          showError("Este contrato ya ha sido finalizado, cancelado o está en disputa.");
          return contract;
        }

        if (clientAction === "finalize" && providerAction === "finalize") {
          updatedContract.status = "finalized";
          const amountToProvider = serviceRate * (1 - commissionRate);
          const commissionAmount = serviceRate * commissionRate;
          showSuccess(
            `Contrato "${updatedContract.serviceTitle}" finalizado. ` +
            `Proveedor recibe $${amountToProvider.toFixed(2)} USD. ` +
            `Comisión de la plataforma: $${commissionAmount.toFixed(2)} USD.`
          );
          clearConversationMessages(updatedContract.clientId, updatedContract.providerId);
        } else if (clientAction === "cancel" && providerAction === "cancel") {
          updatedContract.status = "cancelled";
          showSuccess(`Contrato "${updatedContract.serviceTitle}" cancelado por ambas partes. Fondos reembolsados al cliente.`);
          clearConversationMessages(updatedContract.clientId, updatedContract.providerId);
        } else if (
          (clientAction === "finalize" && providerAction === "cancel") ||
          (clientAction === "cancel" && providerAction === "finalize")
        ) {
          updatedContract.status = "disputed";
          showError(`Conflicto en el contrato "${updatedContract.serviceTitle}". Se ha iniciado una disputa. Un administrador revisará el caso.`);
        } else if (actionType === 'cancel' && updatedContract.clientDeposited) {
            // If one party cancels and the other hasn't acted yet, and funds are deposited, it's a cancellation.
            // This covers cases where client cancels active contract, or provider cancels active contract.
            // If client cancels a pending contract, it's handled by the first condition.
            if (
                (actorId === contract.clientId && providerAction === "none") ||
                (actorId === contract.providerId && clientAction === "none")
            ) {
                updatedContract.status = "cancelled";
                showSuccess(`Contrato "${updatedContract.serviceTitle}" cancelado. Fondos reembolsados al cliente.`);
                clearConversationMessages(updatedContract.clientId, updatedContract.providerId);
            } else {
                // One party cancelled, other has not acted yet, but contract is not active (e.g., pending)
                showSuccess(`Tu acción de ${actionType === 'finalize' ? 'finalizar' : 'cancelar'} el contrato "${updatedContract.serviceTitle}" ha sido registrada. Esperando la acción de la otra parte.`);
            }
        } else {
          // Acción registrada, esperando a la otra parte o contrato aún pendiente de depósito
          showSuccess(`Tu acción de ${actionType === 'finalize' ? 'finalizar' : 'cancelar'} el contrato "${updatedContract.serviceTitle}" ha sido registrada. Esperando la acción de la otra parte.`);
        }

        return updatedContract;
      });
    });
  };

  const getContractsForUser = (userId: string): Contract[] => {
    return contracts.filter(
      (contract) => contract.clientId === userId || contract.providerId === userId
    );
  };

  return (
    <ContractContext.Provider
      value={{
        contracts,
        createContract,
        depositFunds,
        handleContractAction,
        getContractsForUser,
        hasActiveOrPendingContract,
        getLatestContractBetweenUsers,
      }}
    >
      {children}
    </ContractContext.Provider>
  );
};

export const useContracts = () => {
  const context = useContext(ContractContext);
  if (context === undefined) {
    throw new Error("useContracts debe ser usado dentro de un ContractProvider");
  }
  return context;
};