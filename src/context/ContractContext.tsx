import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Contract, User } from "@/types";
import { useAuth } from "./AuthContext";
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
  finalizeContractByProvider: (contractId: string) => boolean;
  releaseFunds: (contractId: string) => boolean;
  getContractsForUser: (userId: string) => Contract[];
}

const ContractContext = createContext<ContractContextType | undefined>(undefined);

interface ContractProviderProps {
  children: ReactNode;
}

export const ContractProvider: React.FC<ContractProviderProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>(() => {
    const storedContracts = localStorage.getItem("appContracts");
    return storedContracts ? JSON.parse(storedContracts) : [];
  });

  useEffect(() => {
    localStorage.setItem("appContracts", JSON.stringify(contracts));
  }, [contracts]);

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

    const newContract: Contract = {
      id: `contract-${contracts.length + 1}-${Date.now()}`,
      clientId,
      providerId,
      serviceTitle,
      serviceRate,
      status: "pending",
      clientDeposited: false,
      providerFinalized: false,
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

  const finalizeContractByProvider = (contractId: string): boolean => {
    let success = false;
    setContracts((prev) =>
      prev.map((contract) => {
        if (contract.id === contractId && contract.status === "active" && contract.clientDeposited && !contract.providerFinalized) {
          success = true;
          showSuccess(`Servicio "${contract.serviceTitle}" marcado como finalizado por el proveedor. Esperando confirmación del cliente.`);
          return { ...contract, providerFinalized: true, updatedAt: Date.now() };
        }
        return contract;
      })
    );
    return success;
  };

  const releaseFunds = (contractId: string): boolean => {
    let success = false;
    setContracts((prev) =>
      prev.map((contract) => {
        if (contract.id === contractId && contract.status === "active" && contract.clientDeposited && contract.providerFinalized) {
          const amountToProvider = contract.serviceRate * (1 - contract.commissionRate);
          const commissionAmount = contract.serviceRate * contract.commissionRate;
          showSuccess(
            `Fondos liberados para el servicio "${contract.serviceTitle}". ` +
            `Proveedor recibe $${amountToProvider.toFixed(2)} USD. ` +
            `Comisión de la plataforma: $${commissionAmount.toFixed(2)} USD.`
          );
          success = true;
          return { ...contract, status: "finalized", updatedAt: Date.now() };
        }
        return contract;
      })
    );
    return success;
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
        finalizeContractByProvider,
        releaseFunds,
        getContractsForUser,
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