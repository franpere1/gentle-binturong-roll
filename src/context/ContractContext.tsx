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
    serviceRate: number // This will be the initial suggested rate
  ) => Contract | null;
  makeOffer: (contractId: string, newRate: number) => void; // New function for provider to make an offer
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

  // Effect to re-load contracts from localStorage when currentUser changes (e.g., after login/logout)
  useEffect(() => {
    console.log("ContractContext: currentUser changed, re-loading contracts from localStorage.");
    const storedContracts = localStorage.getItem("appContracts");
    const latestContracts = storedContracts ? JSON.parse(storedContracts) : [];
    // Only update if the loaded contracts are different to avoid unnecessary re-renders
    if (JSON.stringify(latestContracts) !== JSON.stringify(contracts)) {
      setContracts(latestContracts);
    }
  }, [currentUser]); // Dependency on currentUser

  useEffect(() => {
    localStorage.setItem("appContracts", JSON.stringify(contracts));
  }, [contracts]);

  const hasActiveOrPendingContract = (clientId: string, providerId: string): boolean => {
    return contracts.some(
      (contract) =>
        contract.clientId === clientId &&
        contract.providerId === providerId &&
        (contract.status === "pending" || contract.status === "offered" || contract.status === "active")
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
    serviceRate: number // This is the initial suggested rate from provider's profile
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
      serviceRate, // Initial suggested rate
      status: "pending", // New initial status: waiting for provider's offer
      clientDeposited: false,
      clientAction: "none",
      providerAction: "none",
      commissionRate: 0.10, // 10% de comisión
      createdAt: Date.now(),
      updatedAt: Date.now(),
      disputeResolution: undefined,
    };

    setContracts((prev) => [...prev, newContract]);
    showSuccess("Contrato creado con éxito. El proveedor ha sido notificado para hacer una oferta.");
    return newContract;
  };

  const makeOffer = (contractId: string, newRate: number) => {
    setContracts((prev) =>
      prev.map((contract) => {
        if (contract.id === contractId && contract.status === "pending" && contract.providerId === currentUser?.id) {
          showSuccess(`Oferta de $${newRate.toFixed(2)} USD enviada para el servicio "${contract.serviceTitle}".`);
          return {
            ...contract,
            serviceRate: newRate,
            status: "offered", // New status: provider has made an offer
            providerAction: "make_offer",
            updatedAt: Date.now(),
          };
        }
        return contract;
      })
    );
  };

  const depositFunds = (contractId: string): boolean => {
    let success = false;
    setContracts((prev) =>
      prev.map((contract) => {
        // Funds can only be deposited if the contract is in 'offered' status and client hasn't deposited yet
        if (contract.id === contractId && contract.status === "offered" && !contract.clientDeposited) {
          success = true;
          showSuccess(`Fondos depositados para el servicio "${contract.serviceTitle}". El proveedor ha sido notificado.`);
          return {
            ...contract,
            clientDeposited: true,
            status: "active", // Now it's active
            clientAction: "accept_offer", // Client accepted the offer by depositing
            updatedAt: Date.now()
          };
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

        // --- Handle immediate cancellation for 'pending' or 'offered' contracts ---
        if (actionType === 'cancel') {
          if (actorId === contract.clientId) {
            // Client cancels a pending contract (before provider offer)
            if (updatedContract.status === "pending") {
              showSuccess(`Contrato "${updatedContract.serviceTitle}" cancelado por el cliente.`);
              clearConversationMessages(updatedContract.clientId, updatedContract.providerId);
              return { ...updatedContract, status: "cancelled", clientAction: "cancel" };
            }
            // Client cancels an offered contract (before depositing funds)
            if (updatedContract.status === "offered" && updatedContract.clientDeposited === false) {
              showSuccess(`Oferta para "${updatedContract.serviceTitle}" rechazada y contrato cancelado por el cliente.`);
              clearConversationMessages(updatedContract.clientId, updatedContract.providerId);
              return { ...updatedContract, status: "cancelled", clientAction: "cancel" };
            }
          } else if (actorId === contract.providerId) {
            // Provider cancels a pending contract (rejects client's request)
            if (updatedContract.status === "pending") {
              showSuccess(`Solicitud de contrato para "${updatedContract.serviceTitle}" rechazada por el proveedor.`);
              clearConversationMessages(updatedContract.clientId, updatedContract.providerId);
              return { ...updatedContract, status: "cancelled", providerAction: "cancel" };
            }
            // Provider cancels an offered contract (before client accepts)
            if (updatedContract.status === "offered" && updatedContract.clientDeposited === false) {
              showSuccess(`Oferta para "${updatedContract.serviceTitle}" retirada y contrato cancelado por el proveedor.`);
              clearConversationMessages(updatedContract.clientId, updatedContract.providerId);
              return { ...updatedContract, status: "cancelled", providerAction: "cancel" };
            }
          }
        }
        // --- End immediate cancellation handling ---

        // If contract is already in a final state (excluding the immediate cancellation above)
        if (updatedContract.status === "finalized" || updatedContract.status === "cancelled" || updatedContract.status === "disputed" || updatedContract.status === "finalized_by_dispute") {
          showError("Este contrato ya ha sido finalizado, cancelado o está en disputa.");
          console.log("ContractContext: Contract already in final state, returning original.");
          return contract;
        }

        // Handle dispute action (only client can initiate, and only if active and no prior action)
        if (actionType === 'dispute') {
          if (actorId === contract.clientId) {
            if (updatedContract.status !== "active" || updatedContract.clientAction !== "none") {
              showError("Solo puedes iniciar una disputa en un contrato activo y si no has tomado otra acción.");
              console.log("ContractContext: Client tried to dispute in invalid state, returning original.");
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
          if (updatedContract.clientAction !== "none" && updatedContract.clientAction !== "accept_offer") { // Allow client to finalize/cancel after accepting offer
            showError("Ya has realizado una acción en este contrato.");
            console.log("ContractContext: Client already took action, returning original.");
            return contract;
          }
          updatedContract.clientAction = actionType;
          console.log(`ContractContext: Client action recorded: ${actionType}`);
        } else if (actorId === contract.providerId) {
          if (updatedContract.providerAction !== "none" && updatedContract.providerAction !== "make_offer") { // Allow provider to finalize/cancel after making offer
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

        console.log(`ContractContext: After action recorded - Client Action: ${clientAction}, Provider Action: ${providerAction}`);

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
          // The 'offered' status is handled by depositFunds.
          if (updatedContract.status === "active") { // Only show this message if already active
            showSuccess(`Tu acción de ${actionType === 'finalize' ? 'finalizar' : 'cancelar'} el contrato "${updatedContract.serviceTitle}" ha sido registrada. Esperando la acción de la otra parte.`);
            console.log("ContractContext: Action recorded, waiting for other party.");
          }
        }
        console.log(`ContractContext: After update - Contract ID: ${updatedContract.id}, Client Action: ${updatedContract.clientAction}, Provider Action: ${updatedContract.providerAction}, Status: ${updatedContract.status}`);
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
          return { ...contract, status: "finalized_by_dispute", disputeResolution: resolutionType, updatedAt: Date.now() };
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
        makeOffer, // Add new function to context
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