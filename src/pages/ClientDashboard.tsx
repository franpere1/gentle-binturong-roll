import React, { useState, useEffect, useMemo } from "react";
import Header from "@/components/Header";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useAuth } from "@/context/AuthContext";
import { useContracts } from "@/context/ContractContext";
import { Client, Provider, Contract } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import ClientProfileEditor from "@/components/ClientProfileEditor";
import ProviderContactModal from "@/components/ProviderContactModal";
import ContractCompletionModal from "@/components/ContractCompletionModal";
import FeedbackModal from "@/components/FeedbackModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ClientDashboard: React.FC = () => {
  const { currentUser, getAllProviders } = useAuth();
  const { getContractsForUser, handleContractAction, contracts } = useContracts(); // Añadir contracts del contexto
  const client = currentUser as Client;
  const [isEditing, setIsEditing] = useState(false);
  const [searchTermProviders, setSearchTermProviders] = useState("");
  const [searchTermContracts, setSearchTermContracts] = useState("");
  const [displayedProviders, setDisplayedProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isCompletionModalOpen, setIsCompletionModal] = useState(false);
  const [contractToFinalize, setContractToFinalize] = useState<Contract | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackData, setFeedbackData] = useState<{ contract: Contract; providerName: string } | null>(null);

  const allProviders = getAllProviders();
  const clientContracts = client ? getContractsForUser(client.id) : [];

  // Logic for displaying providers (existing functionality)
  useEffect(() => {
    const lowerCaseSearchTerm = searchTermProviders.toLowerCase();
    let results: Provider[] = [];

    if (lowerCaseSearchTerm === "") {
      results = [...allProviders]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 6);
    } else {
      results = allProviders.filter(
        (provider) =>
          provider.name.toLowerCase().includes(lowerCaseSearchTerm) ||
          provider.category.toLowerCase().includes(lowerCaseSearchTerm) ||
          provider.serviceTitle.toLowerCase().includes(lowerCaseSearchTerm) ||
          provider.serviceDescription.toLowerCase().includes(lowerCaseSearchTerm) ||
          provider.state.toLowerCase().includes(lowerCaseSearchTerm)
      );
    }
    setDisplayedProviders(results);
  }, [searchTermProviders, allProviders]);

  // Logic for displaying contracts (new functionality)
  const displayedContracts = useMemo(() => {
    const lowerCaseSearchTerm = searchTermContracts.toLowerCase();
    let filteredContracts = clientContracts.filter(contract => {
      const provider = allProviders.find(p => p.id === contract.providerId);
      const providerName = provider ? provider.name.toLowerCase() : "";
      return (
        contract.serviceTitle.toLowerCase().includes(lowerCaseSearchTerm) ||
        providerName.includes(lowerCaseSearchTerm)
      );
    });

    // Sort: active contracts first, then by creation date (most recent)
    filteredContracts.sort((a, b) => {
      // Prioritize contracts that are 'active' and waiting for client action (provider has finalized)
      const aIsReadyForClientFinalize = a.status === "active" && a.clientDeposited && a.providerAction === "finalize" && a.clientAction === "none";
      const bIsReadyForClientFinalize = b.status === "active" && b.clientDeposited && b.providerAction === "finalize" && b.clientAction === "none";

      if (aIsReadyForClientFinalize && !bIsReadyForClientFinalize) return -1;
      if (!aIsReadyForClientFinalize && bIsReadyForClientFinalize) return 1;

      // Then prioritize contracts that are 'active' and waiting for provider action (client has finalized)
      const aIsClientFinalizedWaitingProvider = a.status === "active" && a.clientDeposited && a.clientAction === "finalize" && a.providerAction === "none";
      const bIsClientFinalizedWaitingProvider = b.status === "active" && b.clientDeposited && b.clientAction === "finalize" && b.providerAction === "none";

      if (aIsClientFinalizedWaitingProvider && !bIsClientFinalizedWaitingProvider) return -1;
      if (!aIsClientFinalizedWaitingProvider && bIsClientFinalizedWaitingProvider) return 1;

      // Then prioritize 'active' contracts where no one has acted yet
      const aIsPurelyActive = a.status === "active" && a.clientDeposited && a.clientAction === "none" && a.providerAction === "none";
      const bIsPurelyActive = b.status === "active" && b.clientDeposited && b.clientAction === "none" && b.providerAction === "none";

      if (aIsPurelyActive && !bIsPurelyActive) return -1;
      if (!aIsPurelyActive && bIsPurelyActive) return 1;

      // Then prioritize 'pending' contracts
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;

      // Then sort by creation date (most recent first)
      return b.createdAt - a.createdAt;
    });

    // Take only the last 3
    return filteredContracts.slice(0, 3);
  }, [clientContracts, searchTermContracts, allProviders, contracts]); // Add 'contracts' to dependencies to re-evaluate on contract changes

  // Effect to open feedback modal if a contract just became finalized
  useEffect(() => {
    if (contractToFinalize && contractToFinalize.status === "finalized" && !isFeedbackModalOpen) {
      const provider = allProviders.find(p => p.id === contractToFinalize.providerId);
      if (provider) {
        setFeedbackData({ contract: contractToFinalize, providerName: provider.name });
        setIsFeedbackModalOpen(true);
        setContractToFinalize(null); // Clear after opening feedback
      }
    }
  }, [contracts, contractToFinalize, isFeedbackModalOpen, allProviders]);


  const handleContactProvider = (provider: Provider) => {
    setSelectedProvider(provider);
    setIsContactModalOpen(true);
  };

  const handleFinalizeContractClick = (contract: Contract) => {
    setContractToFinalize(contract);
    setIsCompletionModalOpen(true);
  };

  const handleCancelContract = (contractId: string) => {
    if (currentUser) {
      handleContractAction(contractId, currentUser.id, 'cancel');
    }
  };

  if (!client) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
          <div className="text-center p-4">
            <h1 className="text-4xl font-bold mb-4 text-gray-800 dark:text-gray-100">
              Cargando información del cliente...
            </h1>
          </div>
        </div>
        <MadeWithDyad />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-grow flex flex-col items-center bg-gray-100 dark:bg-gray-900 p-4">
        <div className="w-full max-w-4xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md text-gray-800 dark:text-gray-100 mb-8">
          <h1 className="text-3xl font-bold mb-6 text-center">
            Bienvenido, {client.name} (Cliente)
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="flex flex-col items-center md:items-start">
              <h2 className="text-2xl font-semibold mb-4">Tu Perfil</h2>
              <Avatar className="w-24 h-24 mb-4">
                <AvatarImage src={client.profileImage} alt={`${client.name}'s profile`} />
                <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <p className="mb-2">
                <span className="font-medium">Correo:</span> {client.email}
              </p>
              <p className="mb-2">
                <span className="font-medium">Estado:</span> {client.state}
              </p>
            </div>
            <div className="flex items-center justify-center md:justify-end">
              <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogTrigger asChild>
                  <Button variant="default">Editar Información</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] md:max-w-lg lg:max-w-xl overflow-y-auto max-h-[90vh]">
                  <DialogHeader>
                    <DialogTitle>Editar Perfil de Cliente</DialogTitle>
                    <DialogDescription>
                      Realiza cambios en tu perfil aquí. Haz clic en guardar cuando hayas terminado.
                    </DialogDescription>
                  </DialogHeader>
                  <ClientProfileEditor
                    onSave={() => setIsEditing(false)}
                    onCancel={() => setIsEditing(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <div className="w-full max-w-4xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md text-gray-800 dark:text-gray-100 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-center">Mis Contratos</h2>
          <div className="mb-6">
            <Input
              type="text"
              placeholder="Buscar contratos por título de servicio o nombre del proveedor..."
              value={searchTermContracts}
              onChange={(e) => setSearchTermContracts(e.target.value)}
              className="w-full"
            />
          </div>
          {displayedContracts.length === 0 && searchTermContracts !== "" ? (
            <p className="text-center text-gray-600 dark:text-gray-400">
              No se encontraron contratos que coincidan con tu búsqueda.
            </p>
          ) : displayedContracts.length === 0 && searchTermContracts === "" ? (
            <p className="text-center text-gray-600 dark:text-gray-400">
              No tienes contratos activos.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedContracts.map((contract) => {
                const provider = allProviders.find(p => p.id === contract.providerId);
                const canClientFinalize = contract.status === "active" && contract.clientDeposited && contract.providerAction === "finalize" && contract.clientAction === "none";
                const canClientCancel = (contract.status === "pending" || contract.status === "active") && contract.clientAction === "none" && contract.providerAction !== "finalize";
                const clientHasActed = contract.clientAction !== "none";

                let statusText = "";
                let statusColorClass = "";

                switch (contract.status) {
                  case "pending":
                    statusText = "Pendiente de pago";
                    statusColorClass = "text-yellow-600";
                    break;
                  case "active":
                    if (contract.clientAction === "finalize" && contract.providerAction === "none") {
                      statusText = "Activo (Esperando confirmación del proveedor)";
                      statusColorClass = "text-blue-600";
                    } else if (contract.providerAction === "finalize" && contract.clientAction === "none") {
                      statusText = "Activo (Proveedor finalizó, esperando tu confirmación)";
                      statusColorClass = "text-blue-600";
                    } else if (contract.clientAction === "cancel" && contract.providerAction === "none") {
                      statusText = "Cancelación iniciada (Esperando proveedor)";
                      statusColorClass = "text-red-600";
                    } else if (contract.providerAction === "cancel" && contract.clientAction === "none") {
                      statusText = "Cancelación iniciada por proveedor (Esperando tu acción)";
                      statusColorClass = "text-red-600";
                    } else {
                      statusText = "Activo";
                      statusColorClass = "text-blue-600";
                    }
                    break;
                  case "finalized":
                    statusText = "Finalizado";
                    statusColorClass = "text-green-600";
                    break;
                  case "cancelled":
                    statusText = "Cancelado";
                    statusColorClass = "text-red-600";
                    break;
                  case "disputed":
                    statusText = "En Disputa";
                    statusColorClass = "text-orange-600";
                    break;
                  default:
                    statusText = "Desconocido";
                    statusColorClass = "text-gray-500";
                }

                return (
                  <Card key={contract.id} className="flex flex-col">
                    <CardHeader>
                      <CardTitle>{contract.serviceTitle}</CardTitle>
                      <CardDescription>
                        <span className="font-medium">Proveedor:</span> {provider ? provider.name : "Desconocido"}
                      </CardDescription>
                      <CardDescription>
                        Estado:{" "}
                        <span className={`font-semibold ${statusColorClass}`}>
                          {statusText}
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="mb-1">
                        <span className="font-medium">Tarifa:</span> ${contract.serviceRate.toFixed(2)} USD
                      </p>
                      <p className="mb-1">
                        <span className="font-medium">Depósito Cliente:</span>{" "}
                        {contract.clientDeposited ? "Sí" : "No"}
                      </p>
                      <p className="mb-1">
                        <span className="font-medium">Tu Acción:</span>{" "}
                        {contract.clientAction === "none" ? "Ninguna" : contract.clientAction === "finalize" ? "Finalizar" : "Cancelar"}
                      </p>
                      <p className="mb-1">
                        <span className="font-medium">Acción Proveedor:</span>{" "}
                        {contract.providerAction === "none" ? "Ninguna" : contract.providerAction === "finalize" ? "Finalizar" : "Cancelar"}
                      </p>
                      <div className="flex flex-col gap-2 mt-4">
                        {canClientFinalize && (
                          <Button className="w-full" onClick={() => handleFinalizeContractClick(contract)}>
                            Finalizar Contrato
                          </Button>
                        )}
                        {canClientCancel && (
                          <Button variant="outline" className="w-full" onClick={() => handleCancelContract(contract.id)}>
                            Cancelar Contrato
                          </Button>
                        )}
                        {clientHasActed && contract.status === "active" && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                            Esperando acción de la otra parte.
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="w-full max-w-4xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md text-gray-800 dark:text-gray-100">
          <h2 className="text-2xl font-bold mb-4 text-center">Buscar Servicios</h2>
          <div className="mb-6">
            <Input
              type="text"
              placeholder="Buscar proveedores por nombre, categoría, título, descripción o estado..."
              value={searchTermProviders}
              onChange={(e) => setSearchTermProviders(e.target.value)}
              className="w-full"
            />
          </div>

          {displayedProviders.length === 0 && searchTermProviders !== "" ? (
            <p className="text-center text-gray-600 dark:text-gray-400">
              No se encontraron servicios que coincidan con tu búsqueda.
            </p>
          ) : displayedProviders.length === 0 && searchTermProviders === "" ? (
            <p className="text-center text-gray-600 dark:text-gray-400">
              No hay proveedores registrados aún.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedProviders.map((provider) => (
                <Card key={provider.id} className="flex flex-col">
                  {provider.serviceImage && (
                    <img
                      src={provider.serviceImage}
                      alt={provider.serviceTitle}
                      className="w-full h-40 object-cover rounded-t-lg"
                    />
                  )}
                  <CardHeader>
                    <div className="flex items-center space-x-3 mb-2">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={provider.profileImage} alt={`${provider.name}'s profile`} />
                        <AvatarFallback>{provider.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <CardTitle>{provider.serviceTitle}</CardTitle>
                    </div>
                    <CardDescription className="text-gray-600 dark:text-gray-400">
                      {provider.serviceDescription}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="mb-1">
                      <span className="font-medium">Proveedor:</span> {provider.name}
                    </p>
                    <p className="mb-1">
                      <span className="font-medium">Categoría:</span> {provider.category}
                    </p>
                    <p className="mb-1">
                      <span className="font-medium">Estado:</span> {provider.state}
                    </p>
                    <p className="mb-1 text-lg font-bold text-green-600 dark:text-green-400">
                      ${provider.rate.toFixed(2)} USD
                    </p>
                    <Button className="mt-4 w-full" onClick={() => handleContactProvider(provider)}>Contactar</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      {selectedProvider && (
        <ProviderContactModal
          provider={selectedProvider}
          isOpen={isContactModalOpen}
          onClose={() => setIsContactModalOpen(false)}
        />
      )}
      {isCompletionModalOpen && contractToFinalize && (
        <ContractCompletionModal
          isOpen={isCompletionModalOpen}
          onClose={() => setIsCompletionModal(false)}
          contract={contractToFinalize}
          providerName={allProviders.find(p => p.id === contractToFinalize.providerId)?.name || "Desconocido"}
          onFeedbackProvided={handleFeedbackProvided}
        />
      )}
      {isFeedbackModalOpen && feedbackData && (
        <FeedbackModal
          isOpen={isFeedbackModalOpen}
          onClose={() => setIsFeedbackModalOpen(false)}
          contract={feedbackData.contract}
          providerName={feedbackData.providerName}
        />
      )}
      <MadeWithDyad />
    </div>
  );
};

export default ClientDashboard;