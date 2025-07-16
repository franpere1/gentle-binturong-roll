import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
    import { Contract, User } from "@/types";
    import { useAuth } from "@/context/AuthContext";
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

    const LOCAL_STORAGE_CONTRACTS_KEY = "te_lo_hago_contracts";

    // IDs de usuarios de demostración del AuthContext
    const DEMO_CLIENT_ID = "client-456";
    const DEMO_PROVIDER_ID = "provider-789";
    const DEMO_ADMIN_ID = "admin-123"; // Aunque el admin no tiene contratos, es bueno tenerlo referenciado

    // Contratos de demostración para poblar el dashboard del admin
    const defaultContracts: Contract[] = [
      {
        id: "contract-demo-1",
        clientId: DEMO_CLIENT_ID,
        providerId: DEMO_PROVIDER_ID,
        serviceTitle: "Reparación de Fuga de Agua",
        serviceRate: 75.00,
        status: "finalized", // Para comisiones obtenidas
        clientDeposited: true,
        clientAction: "finalize",
        providerAction: "finalize",
        commissionRate: 0.10,
        createdAt: Date.now() - 500000,
        updatedAt: Date.now() - 400000,
        disputeResolution: undefined,
      },
      {
        id: "contract-demo-2",
        clientId: DEMO_CLIENT_ID,
        providerId: DEMO_PROVIDER_ID,
        serviceTitle: "Instalación de Lámpara",
        serviceRate: 40.00,
        status: "active", // Para fondos retenidos
        clientDeposited: true,
        clientAction: "accept_offer",
        providerAction: "none",
        commissionRate: 0.10,
        createdAt: Date.now() - 300000,
        updatedAt: Date.now() - 200000,
        disputeResolution: undefined,
      },
      {
        id: "contract-demo-3",
        clientId: DEMO_CLIENT_ID,
        providerId: DEMO_PROVIDER_ID,
        serviceTitle: "Mantenimiento de Jardín",
        serviceRate: 60.00,
        status: "disputed", // Para fondos retenidos y disputas activas
        clientDeposited: true,
        clientAction: "dispute",
        providerAction: "finalize", // Proveedor finalizó, cliente disputó
        commissionRate: 0.10,
        createdAt: Date.now() - 150000,
        updatedAt: Date.now() - 100000,
        disputeResolution: undefined,
      },
      {
        id: "contract-demo-4",
        clientId: DEMO_CLIENT_ID,
        providerId: DEMO_PROVIDER_ID,
        serviceTitle: "Clase de Guitarra",
        serviceRate: 30.00,
        status: "finalized_by_dispute", // Para disputas resueltas
        clientDeposited: true,
        clientAction: "dispute",
        providerAction: "finalize",
        commissionRate: 0.10,
        createdAt: Date.now() - 700000,
        updatedAt: Date.now() - 600000,
        disputeResolution: "toProvider", // Resuelta a favor del proveedor
      },
    ];

    // Helper to load contracts from localStorage
    const loadContractsFromLocalStorage = (): Contract[] => {
      try {
        const storedContracts = localStorage.getItem(LOCAL_STORAGE_CONTRACTS_KEY);
        if (storedContracts) {
          return JSON.parse(storedContracts);
        }
      } catch (error) {
        console.error("Error loading contracts from localStorage:", error);
      }
      return [];
    };

    // Helper to save contracts to localStorage
    const saveContractsToLocalStorage = (contracts: Contract[]) => {
      try {
        localStorage.setItem(LOCAL_STORAGE_CONTRACTS_KEY, JSON.stringify(contracts));
      } catch (error) {
        console.error("Error saving contracts to localStorage:", error);
      }
    };

    export const ContractProvider: React.FC<ContractProviderProps> = ({ children }) => {
      const { currentUser } = useAuth();
      const { clearConversationMessages } = useChat();
      // Initialize contracts state with data from localStorage or defaults
      const [contracts, setContracts] = useState<Contract[]>(() => {
        let initialContracts = loadContractsFromLocalStorage();
        
        // Create a map to track existing contracts by ID to avoid duplicates
        const existingContractMap = new Map<string, Contract>(
          initialContracts.map(contract => [contract.id, contract])
        );

        // Add default contracts if they don't already exist in the loaded data
        defaultContracts.forEach(defaultContract => {
          if (!existingContractMap.has(defaultContract.id)) {
            existingContractMap.set(defaultContract.id, defaultContract);
          }
        });

        // Convert map back to array
        const finalContracts = Array.from(existingContractMap.values());
        saveContractsToLocalStorage(finalContracts); // Save the merged list
        return finalContracts;
      });

      // Function to update contracts state and save to localStorage
      const updateAndSaveContracts = useCallback((newContracts: Contract[]) => {
        setContracts(newContracts);
        saveContractsToLocalStorage(newContracts);
      }, []);

      const hasActiveOrPendingContract = useCallback((clientId: string, providerId: string): boolean => {
        return contracts.some( // Use the state variable 'contracts'
          (contract) =>
            contract.clientId === clientId &&
            contract.providerId === providerId &&
            (contract.status === "pending" || contract.status === "offered" || contract.status === "active")
        );
      }, [contracts]); // Depend on 'contracts' state

      const getLatestContractBetweenUsers = useCallback((user1Id: string, user2Id: string): Contract | null => {
        const relevantContracts = contracts.filter( // Use the state variable 'contracts'
          (c) =>
            (c.clientId === user1Id && c.providerId === user2Id) ||
            (c.clientId === user2Id && c.providerId === user1Id)
        );
        if (relevantContracts.length === 0) return null;

        relevantContracts.sort((a, b) => b.createdAt - a.createdAt);
        return relevantContracts[0];
      }, [contracts]); // Depend on 'contracts' state

      const createContract = async (
        clientId: string,
        providerId: string,
        serviceTitle: string,
        serviceRate: number
      ): Promise<Contract | null> => {
        if (!currentUser) {
          showError("Debes iniciar sesión para crear un contrato.");
          return null;
        }
        if (currentUser.id !== clientId) {
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

        updateAndSaveContracts([...contracts, newContract]); // Use updateAndSaveContracts
        showSuccess("Contrato creado con éxito. El proveedor ha sido notificado para hacer una oferta. (Modo Demo)");
        return newContract;
      };

      const makeOffer = async (contractId: string, newRate: number) => {
        if (!currentUser) {
          showError("Debes iniciar sesión para hacer una oferta.");
          return;
        }

        const contractIndex = contracts.findIndex(c => c.id === contractId); // Use contracts state
        if (contractIndex === -1) {
          showError("Contrato no encontrado.");
          return;
        }
        const contract = contracts[contractIndex]; // Use contracts state

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

        const newContracts = [...contracts]; // Create a new array
        newContracts[contractIndex] = updatedContract;
        updateAndSaveContracts(newContracts); // Use updateAndSaveMessages
        showSuccess(`Oferta de $${newRate.toFixed(2)} USD enviada para el servicio "${contract.serviceTitle}". (Modo Demo)`);
      };

      const depositFunds = async (contractId: string): Promise<boolean> => {
        if (!currentUser) {
          showError("Debes iniciar sesión para depositar fondos.");
          return false;
        }

        const contractIndex = contracts.findIndex(c => c.id === contractId); // Use contracts state
        if (contractIndex === -1) {
          showError("Contrato no encontrado.");
          return false;
        }
        const contract = contracts[contractIndex]; // Use contracts state

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

        const newContracts = [...contracts]; // Create a new array
        newContracts[contractIndex] = updatedContract;
        updateAndSaveContracts(newContracts); // Use updateAndSaveMessages
        showSuccess(`Fondos depositados para el servicio "${contract.serviceTitle}". El proveedor ha sido notificado. (Modo Demo)`);
        return true;
      };

      const handleContractAction = async (contractId: string, actorId: string, actionType: 'finalize' | 'cancel' | 'dispute' | 'cancel_dispute') => {
        console.log(`ContractContext: handleContractAction called for contract ${contractId} by actor ${actorId} with action ${actionType}`);

        const contractIndex = contracts.findIndex(c => c.id === contractId); // Use contracts state
        if (contractIndex === -1) {
          showError("Contrato no encontrado.");
          return;
        }
        let contract = contracts[contractIndex]; // Use contracts state

        let updatedContract = { ...contract, updatedAt: Date.now() };
        // let updatePayload: Partial<Contract> = { updatedAt: Date.now() }; // This variable is not used

        // --- Handle immediate cancellation for 'pending' or 'offered' contracts ---
        if (actionType === 'cancel') {
          if (actorId === contract.clientId) {
            if (updatedContract.status === "pending" || (updatedContract.status === "offered" && updatedContract.clientDeposited === false)) {
              updatedContract.status = "cancelled";
              updatedContract.clientAction = "cancel";
              showSuccess(`Contrato "${updatedContract.serviceTitle}" cancelado por el cliente. (Modo Demo)`);
              await clearConversationMessages(updatedContract.clientId, updatedContract.providerId);
              const newContracts = [...contracts];
              newContracts[contractIndex] = updatedContract;
              updateAndSaveContracts(newContracts);
              return;
            }
          } else if (actorId === contract.providerId) {
            if (updatedContract.status === "pending" || (updatedContract.status === "offered" && updatedContract.clientDeposited === false)) {
              updatedContract.status = "cancelled";
              updatedContract.providerAction = "cancel";
              showSuccess(`Solicitud de contrato para "${updatedContract.serviceTitle}" rechazada por el proveedor. (Modo Demo)`);
              await clearConversationMessages(updatedContract.clientId, updatedContract.providerId);
              const newContracts = [...contracts];
              newContracts[contractIndex] = updatedContract;
              updateAndSaveContracts(newContracts);
              return;
            }
          }
        }
        // --- End immediate cancellation handling ---

        // --- Handle cancel dispute action ---
        if (actionType === 'cancel_dispute') {
          if (actorId === contract.clientId) {
            if (updatedContract.status === "disputed" && updatedContract.clientAction === "dispute") {
              updatedContract.status = "active";
              updatedContract.clientAction = "accept_offer"; // Revert client action to accepted
              showSuccess(`Disputa para el contrato "${updatedContract.serviceTitle}" cancelada por el cliente. Puedes proceder a finalizar el contrato. (Modo Demo)`);
              const newContracts = [...contracts];
              newContracts[contractIndex] = updatedContract;
              updateAndSaveContracts(newContracts);
              return;
            } else {
              showError("No se puede cancelar la disputa en el estado actual del contrato o no eres el iniciador.");
              return;
            }
          } else if (actorId === contract.providerId) {
            if (updatedContract.status === "disputed" && updatedContract.providerAction === "dispute") {
              updatedContract.status = "active";
              updatedContract.providerAction = "finalize"; // Revert provider action to finalize
              showSuccess(`Disputa para el contrato "${updatedContract.serviceTitle}" cancelada por el proveedor. Puedes proceder a finalizar el contrato. (Modo Demo)`);
              const newContracts = [...contracts];
              newContracts[contractIndex] = updatedContract;
              updateAndSaveContracts(newContracts);
              return;
            } else {
              showError("No se puede cancelar la disputa en el estado actual del contrato o no eres el iniciador.");
              return;
            }
          }
        }

        // If contract is already in a final state (excluding the immediate cancellation above)
        if (updatedContract.status === "finalized" || updatedContract.status === "cancelled" || updatedContract.status === "finalized_by_dispute") {
          showError("Este contrato ya ha sido finalizado o cancelado.");
          return;
        }

        // Handle dispute action
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
              showSuccess(`Disputa iniciada por el cliente para el contrato "${updatedContract.serviceTitle}". Los fondos permanecen retenidos hasta la resolución. (Modo Demo)`);
              const newContracts = [...contracts];
              newContracts[contractIndex] = updatedContract;
              updateAndSaveContracts(newContracts);
              return;
            } else {
              showError("El cliente solo puede iniciar una disputa en un contrato activo, con fondos depositados, y si no ha tomado una acción final (finalizar/cancelar/disputar).");
              return;
            }
          } else if (actorId === contract.providerId) {
            if (
              updatedContract.status === "active" &&
              updatedContract.clientDeposited &&
              updatedContract.providerAction === "finalize" && // Provider must have finalized first
              updatedContract.clientAction !== "finalize" &&
              updatedContract.clientAction !== "cancel" &&
              updatedContract.clientAction !== "dispute"
            ) {
              updatedContract.providerAction = "dispute"; // Provider's action becomes dispute
              updatedContract.status = "disputed"; // Contract status becomes disputed
              showSuccess(`Disputa iniciada por el proveedor para el contrato "${updatedContract.serviceTitle}". Los fondos permanecen retenidos hasta la resolución. (Modo Demo)`);
              const newContracts = [...contracts];
              newContracts[contractIndex] = updatedContract;
              updateAndSaveContracts(newContracts);
              return;
            } else {
              showError("El proveedor solo puede iniciar una disputa en un contrato activo, con fondos depositados, después de haber finalizado el servicio y si el cliente no ha finalizado, cancelado o disputado.");
              return;
            }
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

        const newContracts = [...contracts];
        newContracts[contractIndex] = updatedContract;
        updateAndSaveContracts(newContracts); // Use updateAndSaveMessages
      };

      const resolveDispute = async (contractId: string, resolutionType: 'toClient' | 'toProvider') => {
        console.log(`ContractContext: resolveDispute called for contract ${contractId} with resolution ${resolutionType}`);

        const contractIndex = contracts.findIndex(c => c.id === contractId); // Use contracts state
        if (contractIndex === -1) {
          showError("Contrato no encontrado.");
          return;
        }
        let contract = contracts[contractIndex]; // Use contracts state

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

        const newContracts = [...contracts];
        newContracts[contractIndex] = updatedContract;
        updateAndSaveContracts(newContracts); // Use updateAndSaveMessages
        showSuccess(message);
        await clearConversationMessages(contract.clientId, contract.providerId);
      };

      const getContractsForUser = useCallback((userId: string): Contract[] => {
        return contracts.filter( // Use contracts state
          (contract) => contract.clientId === userId || contract.providerId === userId
        );
      }, [contracts]); // Depend on 'contracts' state

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