import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
    import { Contract, User } from "@/types";
    import { useAuth } from "@/context/AuthContext"; // Cambiado de "./AuthContext"
    import { useChat } from "./ChatContext";
    import { showSuccess, showError } from "@/utils/toast";

    interface ContractContextType {
      contracts: Contract[];
      createContract: (
        clientId: string,
        providerId: string,
        serviceTitle: string,
        serviceRate: number
      ) => Promise<Contract | null>;
      makeOffer: (contractId: string, newRate: number) => Promise<void>;
      depositFunds: (contractId: string) => Promise<boolean>;
      handleContractAction: (contractId: string, actorId: string, actionType: 'finalize' | 'cancel' | 'dispute' | 'cancel_dispute') => Promise<void>;
      resolveDispute: (contractId: string, resolutionType: 'toClient' | 'toProvider') => Promise<void>;
      getContractsForUser: (userId: string) => Contract[];
      hasActiveOrPendingContract: (clientId: string, providerId: string) => boolean;
      getLatestContractBetweenUsers: (user1Id: string, user2Id: string) => Contract | null;
    }

    const ContractContext = createContext<ContractContextType | undefined>(undefined);

    interface ContractProviderProps {
      children: ReactNode;
    }

    // In-memory storage for contracts (simulating a database)
    let inMemoryContracts: Contract[] = [];

    export const ContractProvider: React.FC<ContractProviderProps> = ({ children }) => {
      const { currentUser } = useAuth();
      const { clearConversationMessages } = useChat();
      const [contracts, setContracts] = useState<Contract[]>(inMemoryContracts);

      // Update local state when inMemoryContracts changes (simulating real-time)
      useEffect(() => {
        setContracts(inMemoryContracts);
      }, []); // Only run once on mount, subsequent changes will be direct state updates

      const hasActiveOrPendingContract = useCallback((clientId: string, providerId: string): boolean => {
        return inMemoryContracts.some(
          (contract) =>
            contract.clientId === clientId &&
            contract.providerId === providerId &&
            (contract.status === "pending" || contract.status === "offered" || contract.status === "active")
        );
      }, []);

      const getLatestContractBetweenUsers = useCallback((user1Id: string, user2Id: string): Contract | null => {
        const relevantContracts = inMemoryContracts.filter(
          (c) =>
            (c.clientId === user1Id && c.providerId === user2Id) ||
            (c.clientId === user2Id && c.providerId === user1Id)
        );
        if (relevantContracts.length === 0) return null;

        relevantContracts.sort((a, b) => b.createdAt - a.createdAt);
        return relevantContracts[0];
      }, []);

      const createContract = async (
        clientId: string,
        providerId: string,
        serviceTitle: string,
        serviceRate: number
      ): Promise<Contract | null> => {
        if (!currentUser || currentUser.id !== clientId) {
          showError("Solo el cliente puede crear un contrato.");
          return null;
        }
        if (hasActiveOrPendingContract(clientId, providerId)) {
          showError("Ya tienes un contrato pendiente o activo con este proveedor.");
          return null;
        }

        const newContract: Contract = {
          id: `contract-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          clientId: clientId,
          providerId: providerId,
          serviceTitle: serviceTitle,
          serviceRate: serviceRate,
          status: "pending",
          clientDeposited: false,
          clientAction: "none",
          providerAction: "none",
          commissionRate: 0.10,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        inMemoryContracts.push(newContract);
        setContracts([...inMemoryContracts]); // Force re-render
        showSuccess("Contrato creado con éxito. El proveedor ha sido notificado para hacer una oferta. (Modo Demo)");
        return newContract;
      };

      const makeOffer = async (contractId: string, newRate: number) => {
        if (!currentUser) {
          showError("Debes iniciar sesión para hacer una oferta.");
          return;
        }

        const contractIndex = inMemoryContracts.findIndex(c => c.id === contractId);
        if (contractIndex === -1) {
          showError("Contrato no encontrado.");
          return;
        }
        const contract = inMemoryContracts[contractIndex];

        if (contract.status !== "pending" || contract.providerId !== currentUser.id) {
          showError("No puedes hacer una oferta en este contrato o no tienes permiso.");
          return;
        }

        const updatedContract = {
          ...contract,
          serviceRate: newRate,
          status: "offered",
          providerAction: "make_offer",
          updatedAt: Date.now(),
        };

        inMemoryContracts[contractIndex] = updatedContract;
        setContracts([...inMemoryContracts]); // Force re-render
        showSuccess(`Oferta de $${newRate.toFixed(2)} USD enviada para el servicio "${contract.serviceTitle}". (Modo Demo)`);
      };

      const depositFunds = async (contractId: string): Promise<boolean> => {
        if (!currentUser) {
          showError("Debes iniciar sesión para depositar fondos.");
          return false;
        }

        const contractIndex = inMemoryContracts.findIndex(c => c.id === contractId);
        if (contractIndex === -1) {
          showError("Contrato no encontrado.");
          return false;
        }
        const contract = inMemoryContracts[contractIndex];

        if (contract.status !== "offered" || contract.clientDeposited || contract.clientId !== currentUser.id) {
          showError("No puedes depositar fondos en este contrato o ya han sido depositados.");
          return false;
        }

        const updatedContract = {
          ...contract,
          clientDeposited: true,
          status: "active",
          clientAction: "accept_offer",
          updatedAt: Date.now(),
        };

        inMemoryContracts[contractIndex] = updatedContract;
        setContracts([...inMemoryContracts]); // Force re-render
        showSuccess(`Fondos depositados para el servicio "${contract.serviceTitle}". El proveedor ha sido notificado. (Modo Demo)`);
        return true;
      };

      const handleContractAction = async (contractId: string, actorId: string, actionType: 'finalize' | 'cancel' | 'dispute' | 'cancel_dispute') => {
        console.log(`ContractContext: handleContractAction called for contract ${contractId} by actor ${actorId} with action ${actionType}`);

        const contractIndex = inMemoryContracts.findIndex(c => c.id === contractId);
        if (contractIndex === -1) {
          showError("Contrato no encontrado.");
          return;
        }
        let contract = inMemoryContracts[contractIndex];

        let updatedContract = { ...contract, updatedAt: Date.now() };
        let updatePayload: Partial<Contract> = { updatedAt: Date.now() };

        // --- Handle immediate cancellation for 'pending' or 'offered' contracts ---
        if (actionType === 'cancel') {
          if (actorId === contract.clientId) {
            if (updatedContract.status === "pending" || (updatedContract.status === "offered" && updatedContract.clientDeposited === false)) {
              updatedContract.status = "cancelled";
              updatedContract.clientAction = "cancel";
              showSuccess(`Contrato "${updatedContract.serviceTitle}" cancelado por el cliente. (Modo Demo)`);
              await clearConversationMessages(updatedContract.clientId, updatedContract.providerId);
              inMemoryContracts[contractIndex] = updatedContract;
              setContracts([...inMemoryContracts]);
              return;
            }
          } else if (actorId === contract.providerId) {
            if (updatedContract.status === "pending" || (updatedContract.status === "offered" && updatedContract.clientDeposited === false)) {
              updatedContract.status = "cancelled";
              updatedContract.providerAction = "cancel";
              showSuccess(`Solicitud de contrato para "${updatedContract.serviceTitle}" rechazada por el proveedor. (Modo Demo)`);
              await clearConversationMessages(updatedContract.clientId, updatedContract.providerId);
              inMemoryContracts[contractIndex] = updatedContract;
              setContracts([...inMemoryContracts]);
              return;
            }
          }
        }
        // --- End immediate cancellation handling ---

        // --- Handle cancel dispute action (only client can initiate) ---
        if (actionType === 'cancel_dispute') {
          if (actorId === contract.clientId) {
            if (updatedContract.status === "disputed" && updatedContract.clientAction === "dispute") {
              updatedContract.status = "active";
              updatedContract.clientAction = "accept_offer"; // Revert client action to accepted
              showSuccess(`Disputa para el contrato "${updatedContract.serviceTitle}" cancelada. Puedes proceder a finalizar el contrato. (Modo Demo)`);
              inMemoryContracts[contractIndex] = updatedContract;
              setContracts([...inMemoryContracts]);
              return;
            } else {
              showError("No se puede cancelar la disputa en el estado actual del contrato.");
              return;
            }
          } else if (actorId === contract.providerId) {
            showError("Solo el cliente puede cancelar una disputa.");
            return;
          }
        }

        // If contract is already in a final state (excluding the immediate cancellation above)
        if (updatedContract.status === "finalized" || updatedContract.status === "cancelled" || updatedContract.status === "finalized_by_dispute") {
          showError("Este contrato ya ha sido finalizado o cancelado.");
          return;
        }

        // Handle dispute action (only client can initiate)
        if (actionType === 'dispute') {
          if (actorId === contract.clientId) {
            if (
              updatedContract.status === "active" &&
              updatedContract.clientDeposited &&
              updatedContract.clientAction !== "finalize" &&
              updatedContract.clientAction !== "cancel" &&
              updatedContract.clientAction !== "dispute"
            ) {
              updatedContract.clientAction = "dispute";
              updatedContract.status = "disputed";
              showSuccess(`Disputa iniciada para el contrato "${updatedContract.serviceTitle}". Los fondos permanecen retenidos hasta la resolución. (Modo Demo)`);
              inMemoryContracts[contractIndex] = updatedContract;
              setContracts([...inMemoryContracts]);
              return;
            } else {
              showError("Solo puedes iniciar una disputa en un contrato activo, con fondos depositados, y si no has tomado una acción final (finalizar/cancelar/disputar).");
              return;
            }
          } else if (actorId === contract.providerId) {
            showError("Solo el cliente puede iniciar una disputa.");
            return;
          }
        }

        // If not a dispute, proceed with finalize/cancel logic
        // 1. Record the action of the current actor
        if (actorId === contract.clientId) {
          if (updatedContract.clientAction !== "none" && updatedContract.clientAction !== "accept_offer") {
            showError("Ya has realizado una acción en este contrato.");
            return;
          }
          updatedContract.clientAction = actionType;
        } else if (actorId === contract.providerId) {
          if (updatedContract.providerAction !== "none" && updatedContract.providerAction !== "make_offer") {
            showError("Ya has realizado una acción en este contrato.");
            return;
          }
          updatedContract.providerAction = actionType;
        } else {
          showError("Usuario no autorizado para esta acción.");
          return;
        }

        // 2. Determine the new status based on both parties' actions
        if (updatedContract.clientAction === "finalize" && updatedContract.providerAction === "finalize") {
          updatedContract.status = "finalized";
          const amountToProvider = contract.serviceRate * (1 - contract.commissionRate);
          const commissionAmount = contract.serviceRate * contract.commissionRate;
          showSuccess(
            `Contrato "${contract.serviceTitle}" finalizado. ` +
            `Proveedor recibe $${amountToProvider.toFixed(2)} USD. ` +
            `Comisión de la plataforma: $${commissionAmount.toFixed(2)} USD. (Modo Demo)`
          );
          await clearConversationMessages(contract.clientId, contract.providerId);
        } else if (updatedContract.clientAction === "cancel" && updatedContract.providerAction === "cancel") {
          updatedContract.status = "cancelled";
          showSuccess(`Contrato "${contract.serviceTitle}" cancelado por ambas partes. Fondos reembolsados al cliente. (Modo Demo)`);
          await clearConversationMessages(contract.clientId, contract.providerId);
        } else if (
          (updatedContract.clientAction === "finalize" && updatedContract.providerAction === "cancel") ||
          (updatedContract.clientAction === "cancel" && updatedContract.providerAction === "finalize")
        ) {
          updatedContract.status = "disputed";
          showError(`Conflicto en el contrato "${contract.serviceTitle}". Se ha iniciado una disputa. Un administrador revisará el caso. (Modo Demo)`);
        } else if (
          // New condition: Provider cancels an active contract where client has deposited
          actorId === contract.providerId && actionType === 'cancel' &&
          contract.status === "active" && contract.clientDeposited &&
          updatedContract.clientAction !== "finalize" && updatedContract.clientAction !== "dispute" // Client hasn't finalized or disputed yet
        ) {
          updatedContract.status = "cancelled";
          showSuccess(`Contrato "${contract.serviceTitle}" cancelado por el proveedor. Fondos reembolsados al cliente. (Modo Demo)`);
          await clearConversationMessages(contract.clientId, contract.providerId);
        } else if (
          // New condition: Client cancels an active contract where provider has not finalized
          actorId === contract.clientId && actionType === 'cancel' &&
          contract.status === "active" && contract.clientDeposited &&
          updatedContract.providerAction !== "finalize" && updatedContract.providerAction !== "dispute" // Provider hasn't finalized or disputed yet
        ) {
          updatedContract.status = "cancelled";
          showSuccess(`Contrato "${contract.serviceTitle}" cancelado por el cliente. Fondos reembolsados al cliente. (Modo Demo)`);
          await clearConversationMessages(contract.clientId, contract.providerId);
        } else {
          if (contract.status === "active") {
            showSuccess(`Tu acción de ${actionType === 'finalize' ? 'finalizar' : 'cancelar'} el contrato "${contract.serviceTitle}" ha sido registrada. Esperando la acción de la otra parte. (Modo Demo)`);
          }
        }

        inMemoryContracts[contractIndex] = updatedContract;
        setContracts([...inMemoryContracts]); // Force re-render
      };

      const resolveDispute = async (contractId: string, resolutionType: 'toClient' | 'toProvider') => {
        console.log(`ContractContext: resolveDispute called for contract ${contractId} with resolution ${resolutionType}`);

        const contractIndex = inMemoryContracts.findIndex(c => c.id === contractId);
        if (contractIndex === -1) {
          showError("Contrato no encontrado.");
          return;
        }
        let contract = inMemoryContracts[contractIndex];

        if (contract.status !== "disputed") {
          showError("No se puede resolver la disputa en este contrato o no está en disputa.");
          return;
        }

        let message = "";
        if (resolutionType === "toClient") {
          message = `Disputa resuelta para "${contract.serviceTitle}". Fondos (${contract.serviceRate.toFixed(2)} USD) liberados al cliente. (Modo Demo)`;
        } else {
          const amountToProvider = contract.serviceRate * (1 - contract.commissionRate);
          message = `Disputa resuelta para "${contract.serviceTitle}". Fondos (${amountToProvider.toFixed(2)} USD) liberados al proveedor (menos comisión). (Modo Demo)`;
        }

        const updatedContract = {
          ...contract,
          status: "finalized_by_dispute",
          disputeResolution: resolutionType,
          updatedAt: Date.now(),
        };

        inMemoryContracts[contractIndex] = updatedContract;
        setContracts([...inMemoryContracts]); // Force re-render
        showSuccess(message);
        await clearConversationMessages(contract.clientId, contract.providerId);
      };

      const getContractsForUser = useCallback((userId: string): Contract[] => {
        return inMemoryContracts.filter(
          (contract) => contract.clientId === userId || contract.providerId === userId
        );
      }, []);

      return (
        <ContractContext.Provider
          value={{
            contracts,
            createContract,
            makeOffer,
            depositFunds,
            handleContractAction,
            resolveDispute,
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