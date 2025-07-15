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
  handleContractAction: (contractId: string, actorId: string, actionType: 'finalize' | 'cancel' | 'dispute') => void; // Nueva función
  resolveDispute: (contractId: string, resolutionType: 'toClient' | 'toProvider') => void; // Nueva función para admin
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

  const handleContractAction = (contractId: string, actorId: string, actionType: 'finalize' | 'cancel' | 'dispute') => {
    console.log(`ContractContext: handleContractAction called for contract ${contractId} by actor ${actorId} with action ${actionType}`);
    setContracts((prevContracts) => {
      return prevContracts.map((contract) => {
        if (contract.id !== contractId) {
          return contract;
        }

        let updatedContract = { ...contract, updatedAt: Date.now() };

        // Check if contract is already in a final state
        if (updatedContract.status === "finalized" || updatedContract.status === "cancelled" || updatedContract.status === "disputed" || updatedContract.status === "finalized_by_dispute") {
          showError("Este contrato ya ha sido finalizado, cancelado o está en disputa.");
          console.log("ContractContext: Contract already in final state, returning original.");
          return contract;
        }

        // Handle dispute action first
        if (actionType === 'dispute') {
          if (actorId === contract.clientId) {
            if (updatedContract.clientAction === "dispute") {
              showError("Ya has iniciado una disputa para este contrato.");
              console.log("ContractContext: Client already initiated dispute, returning original.");
              return contract;
            }
            updatedContract.clientAction = "dispute";
            updatedContract.status = "disputed";
            showSuccess(`Disputa iniciada para el contrato "${updatedContract.serviceTitle}". Los fondos permanecen retenidos hasta la resolución.`);
            clearConversationMessages(updatedContract.clientId, updatedContract.providerId);
            console.log("ContractContext: Dispute initiated by client.");
            return updatedContract;
          } else if (actorId === contract.providerId) {
            showError("Solo el cliente puede iniciar una disputa.");
            console.log("ContractContext: Provider tried to initiate dispute, denied.");
            return contract;
          }
        }

        // If not a dispute, proceed with finalize/cancel logic
        // 1. Record the action of the current actor
        if (actorId === contract.clientId) {
          if (updatedContract.clientAction !== "none") {
            showError("Ya has realizado una acción en este contrato.");
            console.log("ContractContext: Client already took action, returning original.");
            return contract;
          }
          updatedContract.clientAction = actionType;
          console.log(`ContractContext: Client action recorded: ${actionType}`);
        } else if (actorId === contract.providerId) {
          if (updatedContract.providerAction !== "none") {
            showError("Ya has realizado una acción en este contrato.");
            console.log("ContractContext: Provider already took action, returning original.");
            return contract;
          }
          updatedContract.providerAction = actionType;
          console.log(`ContractContext: Provider action recorded: ${actionType}`);
        } else {
          showError("Usuario no autorizado para esta acción.");
          console.log("ContractContext: Unauthorized user action, returning original.");
          return contract;
        }

        // 2. Determine the new status based on both parties' actions
        const { clientAction, providerAction, clientDeposited } = updatedContract;

        if (clientAction === "finalize" && providerAction === "finalize") {
          updatedContract.status = "finalized";
          const amountToProvider = updatedContract.serviceRate * (1 - updatedContract.commissionRate);
          const commissionAmount = updatedContract.serviceRate * updatedContract.commissionRate;
          showSuccess(
            `Contrato "${updatedContract.serviceTitle}" finalizado. ` +
            `Proveedor recibe $${amountToProvider.toFixed(2)} USD. ` +
            `Comisión de la plataforma: $${commissionAmount.toFixed(2)} USD.`
          );
          clearConversationMessages(updatedContract.clientId, updatedContract.providerId);
          console.log("ContractContext: Contract finalized by both parties.");
        } else if (clientAction === "cancel" && providerAction === "cancel") {
          updatedContract.status = "cancelled";
          showSuccess(`Contrato "${updatedContract.serviceTitle}" cancelado por ambas partes. Fondos reembolsados al cliente.`);
          clearConversationMessages(updatedContract.clientId, updatedContract.providerId);
          console.log("ContractContext: Contract cancelled by both parties.");
        } else if (
          (clientAction === "finalize" && providerAction === "cancel") ||
          (clientAction === "cancel" && providerAction === "finalize")
        ) {
          // This is now the automatic dispute if actions conflict, but client can also initiate directly
          updatedContract.status = "disputed";
          showError(`Conflicto en el contrato "${updatedContract.serviceTitle}". Se ha iniciado una disputa. Un administrador revisará el caso.`);
          console.log("ContractContext: Conflict detected, contract disputed.");
        } else {
          // If client has deposited funds and contract is still pending, it becomes active.
          // Otherwise, the status remains as is, and we just show a message about the action being recorded.
          if (clientDeposited && updatedContract.status === "pending") {
              updatedContract.status = "active";
              console.log("ContractContext: Contract status changed from pending to active due to client deposit.");
          }
          showSuccess(`Tu acción de ${actionType === 'finalize' ? 'finalizar' : 'cancelar'} el contrato "${updatedContract.serviceTitle}" ha sido registrada. Esperando la acción de la otra parte.`);
          console.log("ContractContext: Action recorded, waiting for other party.");
        }

        return updatedContract;
      });
    });
  };

  const resolveDispute = (contractId: string, resolutionType: 'toClient' | 'toProvider') => {
    console.log(`ContractContext: resolveDispute called for contract ${contractId} with resolution ${resolutionType}`);
    setContracts((prevContracts) => {
      return prevContracts.map((contract) => {
        if (contract.id === contractId && contract.status === "disputed") {
          let message = "";
          if (resolutionType === "toClient") {
            message = `Disputa resuelta para "${contract.serviceTitle}". Fondos (${contract.serviceRate.toFixed(2)} USD) liberados al cliente.`;
          } else {
            const amountToProvider = contract.serviceRate * (1 - contract.commissionRate);
            message = `Disputa resuelta para "${contract.serviceTitle}". Fondos (${amountToProvider.toFixed(2)} USD) liberados al proveedor (menos comisión).`;
          }
          showSuccess(message);
          clearConversationMessages(contract.clientId, contract.providerId); // Clear chat on dispute resolution
          console.log("ContractContext: Dispute resolved.");
          return { ...contract, status: "finalized_by_dispute", updatedAt: Date.now() };
        }
        return contract;
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
        resolveDispute, // Añadir la nueva función al contexto
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