import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
    import { Contract, User } from "@/types";
    import { useAuth } from "./AuthContext";
    import { useChat } from "./ChatContext";
    import { showSuccess, showError } from "@/utils/toast";
    import { supabase } from "@/lib/supabase"; // Import Supabase client

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

    export const ContractProvider: React.FC<ContractProviderProps> = ({ children }) => {
      const { currentUser } = useAuth();
      const { clearConversationMessages } = useChat();
      const [contracts, setContracts] = useState<Contract[]>([]);

      // Helper to map Supabase contract data to local Contract type
      const mapSupabaseContract = (data: any): Contract => ({
        id: data.id,
        clientId: data.client_id,
        providerId: data.provider_id,
        serviceTitle: data.service_title,
        serviceRate: data.service_rate,
        status: data.status,
        clientDeposited: data.client_deposited,
        clientAction: data.client_action,
        providerAction: data.provider_action,
        commissionRate: data.commission_rate,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        disputeResolution: data.dispute_resolution,
      });

      // Fetch contracts on component mount and when currentUser changes
      useEffect(() => {
        const fetchContracts = async () => {
          if (!currentUser) {
            setContracts([]);
            return;
          }

          const { data, error } = await supabase
            .from('contracts')
            .select('*')
            .or(`client_id.eq.${currentUser.id},provider_id.eq.${currentUser.id}`);

          if (error) {
            console.error("Error fetching contracts:", error);
            return;
          }

          const fetchedContracts: Contract[] = data.map(mapSupabaseContract);
          setContracts(fetchedContracts);
        };

        fetchContracts();

        // Set up real-time subscription for contracts
        const channel = supabase
          .channel('contracts_channel')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'contracts' },
            (payload) => {
              console.log('Contract change received!', payload);
              if (payload.eventType === 'INSERT') {
                setContracts((prev) => [...prev, mapSupabaseContract(payload.new)]);
              } else if (payload.eventType === 'UPDATE') {
                setContracts((prev) =>
                  prev.map((contract) =>
                    contract.id === payload.new.id ? mapSupabaseContract(payload.new) : contract
                  )
                );
              } else if (payload.eventType === 'DELETE') {
                setContracts((prev) =>
                  prev.filter((contract) => contract.id !== payload.old.id)
                );
              }
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }, [currentUser]);

      const hasActiveOrPendingContract = useCallback((clientId: string, providerId: string): boolean => {
        return contracts.some(
          (contract) =>
            contract.clientId === clientId &&
            contract.providerId === providerId &&
            (contract.status === "pending" || contract.status === "offered" || contract.status === "active")
        );
      }, [contracts]);

      const getLatestContractBetweenUsers = useCallback((user1Id: string, user2Id: string): Contract | null => {
        const relevantContracts = contracts.filter(
          (c) =>
            (c.clientId === user1Id && c.providerId === user2Id) ||
            (c.clientId === user2Id && c.providerId === user1Id)
        );
        if (relevantContracts.length === 0) return null;

        relevantContracts.sort((a, b) => b.createdAt - a.createdAt);
        return relevantContracts[0];
      }, [contracts]);

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

        const newContractData = {
          client_id: clientId,
          provider_id: providerId,
          service_title: serviceTitle,
          service_rate: serviceRate,
          status: "pending",
          client_deposited: false,
          client_action: "none",
          provider_action: "none",
          commission_rate: 0.10,
          created_at: Date.now(),
          updated_at: Date.now(),
        };

        const { data, error } = await supabase.from('contracts').insert([newContractData]).select().single();

        if (error) {
          console.error("Error creating contract:", error);
          showError("Error al crear el contrato. Inténtalo de nuevo.");
          return null;
        }

        showSuccess("Contrato creado con éxito. El proveedor ha sido notificado para hacer una oferta.");
        return mapSupabaseContract(data);
      };

      const makeOffer = async (contractId: string, newRate: number) => {
        if (!currentUser) {
          showError("Debes iniciar sesión para hacer una oferta.");
          return;
        }

        const contract = contracts.find(c => c.id === contractId);
        if (!contract || contract.status !== "pending" || contract.providerId !== currentUser.id) {
          showError("No puedes hacer una oferta en este contrato o no tienes permiso.");
          return;
        }

        const { error } = await supabase.from('contracts').update({
          service_rate: newRate,
          status: "offered",
          provider_action: "make_offer",
          updated_at: Date.now(),
        }).eq('id', contractId);

        if (error) {
          console.error("Error making offer:", error);
          showError("Error al enviar la oferta. Inténtalo de nuevo.");
        } else {
          showSuccess(`Oferta de $${newRate.toFixed(2)} USD enviada para el servicio "${contract.serviceTitle}".`);
        }
      };

      const depositFunds = async (contractId: string): Promise<boolean> => {
        if (!currentUser) {
          showError("Debes iniciar sesión para depositar fondos.");
          return false;
        }

        const contract = contracts.find(c => c.id === contractId);
        if (!contract || contract.status !== "offered" || contract.clientDeposited || contract.clientId !== currentUser.id) {
          showError("No puedes depositar fondos en este contrato o ya han sido depositados.");
          return false;
        }

        const { error } = await supabase.from('contracts').update({
          client_deposited: true,
          status: "active",
          client_action: "accept_offer",
          updated_at: Date.now(),
        }).eq('id', contractId);

        if (error) {
          console.error("Error depositing funds:", error);
          showError("Error al depositar fondos. Inténtalo de nuevo.");
          return false;
        } else {
          showSuccess(`Fondos depositados para el servicio "${contract.serviceTitle}". El proveedor ha sido notificado.`);
          return true;
        }
      };

      const handleContractAction = async (contractId: string, actorId: string, actionType: 'finalize' | 'cancel' | 'dispute' | 'cancel_dispute') => {
        console.log(`ContractContext: handleContractAction called for contract ${contractId} by actor ${actorId} with action ${actionType}`);

        const contract = contracts.find(c => c.id === contractId);
        if (!contract) {
          showError("Contrato no encontrado.");
          return;
        }

        let updatedContract = { ...contract, updatedAt: Date.now() };
        let updatePayload: Partial<Contract> = { updated_at: Date.now() };

        // --- Handle immediate cancellation for 'pending' or 'offered' contracts ---
        if (actionType === 'cancel') {
          if (actorId === contract.clientId) {
            if (updatedContract.status === "pending" || (updatedContract.status === "offered" && updatedContract.clientDeposited === false)) {
              updatePayload.status = "cancelled";
              updatePayload.client_action = "cancel";
              showSuccess(`Contrato "${updatedContract.serviceTitle}" cancelado por el cliente.`);
              await clearConversationMessages(updatedContract.clientId, updatedContract.providerId);
              const { error } = await supabase.from('contracts').update(updatePayload).eq('id', contractId);
              if (error) console.error("Error cancelling contract:", error);
              return;
            }
          } else if (actorId === contract.providerId) {
            if (updatedContract.status === "pending" || (updatedContract.status === "offered" && updatedContract.clientDeposited === false)) {
              updatePayload.status = "cancelled";
              updatePayload.provider_action = "cancel";
              showSuccess(`Solicitud de contrato para "${updatedContract.serviceTitle}" rechazada por el proveedor.`);
              await clearConversationMessages(updatedContract.clientId, updatedContract.providerId);
              const { error } = await supabase.from('contracts').update(updatePayload).eq('id', contractId);
              if (error) console.error("Error cancelling contract:", error);
              return;
            }
          }
        }
        // --- End immediate cancellation handling ---

        // --- Handle cancel dispute action (only client can initiate) ---
        if (actionType === 'cancel_dispute') {
          if (actorId === contract.clientId) {
            if (updatedContract.status === "disputed" && updatedContract.clientAction === "dispute") {
              updatePayload.status = "active";
              updatePayload.client_action = "accept_offer";
              showSuccess(`Disputa para el contrato "${updatedContract.serviceTitle}" cancelada. Puedes proceder a finalizar el contrato.`);
              const { error } = await supabase.from('contracts').update(updatePayload).eq('id', contractId);
              if (error) console.error("Error cancelling dispute:", error);
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
              updatePayload.client_action = "dispute";
              updatePayload.status = "disputed";
              showSuccess(`Disputa iniciada para el contrato "${updatedContract.serviceTitle}". Los fondos permanecen retenidos hasta la resolución.`);
              const { error } = await supabase.from('contracts').update(updatePayload).eq('id', contractId);
              if (error) console.error("Error initiating dispute:", error);
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
          updatePayload.client_action = actionType;
        } else if (actorId === contract.providerId) {
          if (updatedContract.providerAction !== "none" && updatedContract.providerAction !== "make_offer") {
            showError("Ya has realizado una acción en este contrato.");
            return;
          }
          updatePayload.provider_action = actionType;
        } else {
          showError("Usuario no autorizado para esta acción.");
          return;
        }

        // Fetch the current state of the contract from DB to ensure we have the latest actions
        const { data: currentContractData, error: fetchError } = await supabase
          .from('contracts')
          .select('*')
          .eq('id', contractId)
          .single();

        if (fetchError || !currentContractData) {
          console.error("Error fetching current contract state:", fetchError);
          showError("Error al obtener el estado actual del contrato.");
          return;
        }

        // Apply the new action to the fetched contract data
        let tempClientAction = currentContractData.client_action;
        let tempProviderAction = currentContractData.provider_action;

        if (actorId === contract.clientId) {
          tempClientAction = actionType;
        } else if (actorId === contract.providerId) {
          tempProviderAction = actionType;
        }

        // 2. Determine the new status based on both parties' actions
        if (tempClientAction === "finalize" && tempProviderAction === "finalize") {
          updatePayload.status = "finalized";
          const amountToProvider = contract.serviceRate * (1 - contract.commissionRate);
          const commissionAmount = contract.serviceRate * contract.commissionRate;
          showSuccess(
            `Contrato "${contract.serviceTitle}" finalizado. ` +
            `Proveedor recibe $${amountToProvider.toFixed(2)} USD. ` +
            `Comisión de la plataforma: $${commissionAmount.toFixed(2)} USD.`
          );
          await clearConversationMessages(contract.clientId, contract.providerId);
        } else if (tempClientAction === "cancel" && tempProviderAction === "cancel") {
          updatePayload.status = "cancelled";
          showSuccess(`Contrato "${contract.serviceTitle}" cancelado por ambas partes. Fondos reembolsados al cliente.`);
          await clearConversationMessages(contract.clientId, contract.providerId);
        } else if (
          (tempClientAction === "finalize" && tempProviderAction === "cancel") ||
          (tempClientAction === "cancel" && tempProviderAction === "finalize")
        ) {
          updatePayload.status = "disputed";
          showError(`Conflicto en el contrato "${contract.serviceTitle}". Se ha iniciado una disputa. Un administrador revisará el caso.`);
        } else if (
          // New condition: Provider cancels an active contract where client has deposited
          actorId === contract.providerId && actionType === 'cancel' &&
          currentContractData.status === "active" && currentContractData.client_deposited &&
          tempClientAction !== "finalize" && tempClientAction !== "dispute" // Client hasn't finalized or disputed yet
        ) {
          updatePayload.status = "cancelled";
          showSuccess(`Contrato "${contract.serviceTitle}" cancelado por el proveedor. Fondos reembolsados al cliente.`);
          await clearConversationMessages(contract.clientId, contract.providerId);
        } else if (
          // New condition: Client cancels an active contract where provider has not finalized
          actorId === contract.clientId && actionType === 'cancel' &&
          currentContractData.status === "active" && currentContractData.client_deposited &&
          tempProviderAction !== "finalize" && tempProviderAction !== "dispute" // Provider hasn't finalized or disputed yet
        ) {
          updatePayload.status = "cancelled";
          showSuccess(`Contrato "${contract.serviceTitle}" cancelado por el cliente. Fondos reembolsados al cliente.`);
          await clearConversationMessages(contract.clientId, contract.providerId);
        } else {
          if (currentContractData.status === "active") {
            showSuccess(`Tu acción de ${actionType === 'finalize' ? 'finalizar' : 'cancelar'} el contrato "${contract.serviceTitle}" ha sido registrada. Esperando la acción de la otra parte.`);
          }
        }

        // Finally, update the contract in Supabase
        const { error } = await supabase.from('contracts').update(updatePayload).eq('id', contractId);
        if (error) {
          console.error("Error updating contract status/actions:", error);
          showError("Error al actualizar el contrato. Inténtalo de nuevo.");
        }
      };

      const resolveDispute = async (contractId: string, resolutionType: 'toClient' | 'toProvider') => {
        console.log(`ContractContext: resolveDispute called for contract ${contractId} with resolution ${resolutionType}`);

        const contract = contracts.find(c => c.id === contractId);
        if (!contract || contract.status !== "disputed") {
          showError("No se puede resolver la disputa en este contrato o no está en disputa.");
          return;
        }

        let message = "";
        if (resolutionType === "toClient") {
          message = `Disputa resuelta para "${contract.serviceTitle}". Fondos (${contract.serviceRate.toFixed(2)} USD) liberados al cliente.`;
        } else {
          const amountToProvider = contract.serviceRate * (1 - contract.commissionRate);
          message = `Disputa resuelta para "${contract.serviceTitle}". Fondos (${amountToProvider.toFixed(2)} USD) liberados al proveedor (menos comisión).`;
        }

        const { error } = await supabase.from('contracts').update({
          status: "finalized_by_dispute",
          dispute_resolution: resolutionType,
          updated_at: Date.now(),
        }).eq('id', contractId);

        if (error) {
          console.error("Error resolving dispute:", error);
          showError("Error al resolver la disputa. Inténtalo de nuevo.");
        } else {
          showSuccess(message);
          await clearConversationMessages(contract.clientId, contract.providerId);
        }
      };

      const getContractsForUser = useCallback((userId: string): Contract[] => {
        return contracts.filter(
          (contract) => contract.clientId === userId || contract.providerId === userId
        );
      }, [contracts]);

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