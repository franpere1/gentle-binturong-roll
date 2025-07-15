import React, { useState, useMemo, useEffect } from "react";
import Header from "@/components/Header";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useAuth } from "@/context/AuthContext";
import { useContracts } from "@/context/ContractContext";
import { Provider, Contract, Client } from "@/types"; // Import Client type
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import ProviderProfileEditor from "@/components/ProviderProfileEditor";
import { Star } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import MakeOfferModal from "@/components/MakeOfferModal"; // Import the new modal
import ChatWindow from "@/components/ChatWindow"; // Import ChatWindow

const ProviderDashboard: React.FC = () => {
  const { currentUser, findUserById } = useAuth();
  const { getContractsForUser, handleContractAction, makeOffer, contracts } = useContracts(); // Add makeOffer
  const provider = currentUser as Provider;
  const [isEditing, setIsEditing] = useState(false);
  const [searchTermContracts, setSearchTermContracts] = useState("");
  const [isMakeOfferModalOpen, setIsMakeOfferModalOpen] = useState(false); // State for offer modal
  const [contractToOffer, setContractToOffer] = useState<Contract | null>(null); // State to hold contract for offer
  const [isContractChatModalOpen, setIsContractChatModalOpen] = useState(false); // New state for contract chat modal
  const [chattingWithClient, setChattingWithClient] = useState<Client | null>(null); // New state for client in chat

  const providerContracts = provider ? getContractsForUser(provider.id) : [];

  // Logic for displaying contracts
  const displayedContracts = useMemo(() => {
    const lowerCaseSearchTerm = searchTermContracts.toLowerCase();
    let filteredContracts = providerContracts.filter(contract => {
      const client = findUserById(contract.clientId);
      const clientName = client ? client.name.toLowerCase() : "";
      return (
        contract.serviceTitle.toLowerCase().includes(lowerCaseSearchTerm) ||
        clientName.includes(lowerCaseSearchTerm)
      );
    });

    // Sort: pending contracts (waiting for offer) first, then offered (waiting for client acceptance),
    // then active contracts (waiting for provider finalize), then by creation date (most recent)
    filteredContracts.sort((a, b) => {
      // 1. Prioritize 'pending' contracts (waiting for provider's offer)
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;

      // 2. Then prioritize 'offered' contracts (provider made offer, waiting for client to accept/deposit)
      if (a.status === "offered" && b.status !== "offered") return -1;
      if (a.status !== "offered" && b.status === "offered") return 1;

      // 3. Then prioritize 'active' contracts where client has deposited and provider needs to finalize
      const aIsReadyForProviderFinalize = a.status === "active" && a.clientDeposited && a.clientAction === "finalize" && a.providerAction === "none";
      const bIsReadyForProviderFinalize = b.status === "active" && b.clientDeposited && b.clientAction === "finalize" && b.providerAction === "none";

      if (aIsReadyForProviderFinalize && !bIsReadyForProviderFinalize) return -1;
      if (!aIsReadyForProviderFinalize && bIsReadyForProviderFinalize) return 1;

      // 4. Then prioritize 'active' contracts where provider has finalized and waiting for client
      const aIsProviderFinalizedWaitingClient = a.status === "active" && a.clientDeposited && a.providerAction === "finalize" && a.clientAction !== "finalize" && a.clientAction !== "cancel" && a.clientAction !== "dispute";
      const bIsProviderFinalizedWaitingClient = b.status === "active" && b.clientDeposited && b.providerAction === "finalize" && b.clientAction !== "finalize" && b.clientAction !== "cancel" && b.clientAction !== "dispute";

      if (aIsProviderFinalizedWaitingClient && !bIsProviderFinalizedWaitingClient) return -1;
      if (!aIsProviderFinalizedWaitingClient && bIsProviderFinalizedWaitingClient) return 1;

      // 5. Then prioritize 'active' contracts where no one has acted yet (after client deposit)
      const aIsPurelyActive = a.status === "active" && a.clientDeposited && a.clientAction === "accept_offer" && a.providerAction === "none";
      const bIsPurelyActive = b.status === "active" && b.clientDeposited && a.clientAction === "accept_offer" && b.providerAction === "none";

      if (aIsPurelyActive && !bIsPurelyActive) return -1;
      if (!aIsPurelyActive && bIsPurelyActive) return 1;

      // Then sort by creation date (most recent first)
      return b.createdAt - a.createdAt;
    });

    // Take only the last 3
    return filteredContracts.slice(0, 3);
  }, [providerContracts, searchTermContracts, findUserById, contracts]);

  // Calculate accumulated earnings
  const accumulatedEarnings = providerContracts.reduce((total, contract) => {
    if (contract.status === "finalized" || contract.status === "finalized_by_dispute") {
      // If finalized by dispute to provider, add the amount minus commission
      if (contract.status === "finalized_by_dispute" && contract.disputeResolution === "toProvider") {
        return total + (contract.serviceRate * (1 - contract.commissionRate));
      } else if (contract.status === "finalized") {
        return total + (contract.serviceRate * (1 - contract.commissionRate));
      }
    }
    return total;
  }, 0);

  const handleFinalizeService = (contractId: string) => {
    if (currentUser) {
      handleContractAction(contractId, currentUser.id, 'finalize');
    }
  };

  const handleCancelContract = (contractId: string) => {
    if (currentUser) {
      handleContractAction(contractId, currentUser.id, 'cancel');
    }
  };

  const handleMakeOfferClick = (contract: Contract) => {
    setContractToOffer(contract);
    setIsMakeOfferModalOpen(true);
  };

  const handleConfirmOffer = (contractId: string, newRate: number) => {
    makeOffer(contractId, newRate);
    setIsMakeOfferModalOpen(false);
    setContractToOffer(null);
  };

  const handleChatWithClient = (clientId: string) => {
    const client = findUserById(clientId) as Client | undefined;
    if (client) {
      setChattingWithClient(client);
      setIsContractChatModalOpen(true);
    }
  };

  if (!provider) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
          <div className="text-center p-4">
            <h1 className="text-4xl font-bold mb-4 text-gray-800 dark:text-gray-100">
              Cargando información del proveedor...
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
        <div className="w-full max-w-2xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md text-gray-800 dark:text-gray-100 mb-8">
          <h1 className="text-3xl font-bold mb-6 text-center">
            Bienvenido, {provider.name} (Proveedor)
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="flex flex-col items-center md:items-start">
              <h2 className="text-2xl font-semibold mb-4">Tu Perfil</h2>
              <Avatar className="w-24 h-24 mb-4">
                <AvatarImage src={provider.profileImage} alt={`${provider.name}'s profile`} />
                <AvatarFallback>{provider.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <p className="mb-2">
                <span className="font-medium">Correo:</span> {provider.email}
              </p>
              <p className="mb-2">
                <span className="font-medium">Estado:</span> {provider.state}
              </p>
              <p className="mb-2 text-lg font-bold text-green-600 dark:text-green-400">
                <span className="font-medium">Ganancias Acumuladas:</span> ${accumulatedEarnings.toFixed(2)} USD
              </p>
              <div className="mt-4">
                <h3 className="text-xl font-semibold mb-2">Calificación:</h3>
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-6 w-6 ${
                        i < provider.starRating ? "text-yellow-500 fill-yellow-500" : "text-gray-300 dark:text-gray-600"
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-lg font-medium">
                    ({provider.starRating} / 5 estrellas)
                  </span>
                </div>
                {(provider.feedback || []).length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Comentarios Recientes:</h4>
                    <ScrollArea className="h-40 w-full rounded-md border p-4">
                      <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
                        {(provider.feedback || []).reverse().map((f, index) => (
                          <li key={index}>
                            <span className={`font-medium ${
                              f.type === "positive" ? "text-green-600" :
                              f.type === "negative" ? "text-red-600" : "text-gray-500"
                            }`}>
                              {f.type === "positive" ? "Positivo" : f.type === "negative" ? "Negativo" : "Neutro"}
                            </span>: "{f.comment}"
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-semibold mb-4">Tu Servicio</h2>
              <p className="mb-2">
                <span className="font-medium">Categoría:</span> {provider.category}
              </p>
              <p className="mb-2">
                <span className="font-medium">Título:</span> {provider.serviceTitle}
              </p>
              <p className="mb-2">
                <span className="font-medium">Descripción:</span> {provider.serviceDescription}
              </p>
              <p className="mb-2">
                <span className="font-medium">Tarifa:</span> ${provider.rate?.toFixed(2) || '0.00'} USD
              </p>
              {provider.serviceImage && (
                <div className="mt-4">
                  <span className="font-medium block mb-2">Imagen del Servicio:</span>
                  <img
                    src={provider.serviceImage}
                    alt="Imagen del Servicio"
                    className="w-full h-48 object-cover rounded-md shadow-sm"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="text-center">
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
              <DialogTrigger asChild>
                <Button variant="default">Editar Información</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] md:max-w-lg lg:max-w-xl overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Editar Perfil de Proveedor</DialogTitle>
                  <DialogDescription>
                    Realiza cambios en tu perfil aquí. Haz clic en guardar cuando hayas terminado.
                  </DialogDescription>
                </DialogHeader>
                <ProviderProfileEditor
                  onSave={() => setIsEditing(false)}
                  onCancel={() => setIsEditing(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="w-full max-w-4xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md text-gray-800 dark:text-gray-100">
          <h2 className="text-2xl font-bold mb-4 text-center">Mis Contratos</h2>
          <div className="mb-6">
            <Input
              type="text"
              placeholder="Buscar contratos por título de servicio o nombre del cliente..."
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
                const clientUser = findUserById(contract.clientId) as Client | undefined; // Cast to Client
                
                // Provider can make an offer if contract is pending and no offer has been made
                const canProviderMakeOffer = contract.status === "pending" && contract.providerAction === "none";
                
                // Provider can finalize if contract is active, client has deposited, and provider hasn't finalized their side yet
                const canProviderFinalize = 
                  contract.status === "active" && 
                  contract.clientDeposited && 
                  contract.providerAction !== "finalize" && // Provider has not yet finalized
                  contract.providerAction !== "cancel" && // Provider has not yet cancelled
                  contract.clientAction !== "cancel" && // Client has not cancelled
                  contract.clientAction !== "dispute"; // Client has not disputed
                
                // Provider can cancel if:
                // Contract is active, client has deposited, and provider hasn't finalized or disputed
                const canProviderCancel = 
                  (contract.status === "pending" && contract.providerAction === "none") || // Pending, no action yet
                  (contract.status === "offered" && contract.providerAction === "make_offer" && contract.clientAction === "none") || // Offered, provider made offer, client hasn't accepted/cancelled
                  (contract.status === "active" && contract.clientDeposited && contract.providerAction !== "finalize" && contract.providerAction !== "cancel" && contract.clientAction !== "dispute" && contract.clientAction !== "finalize");

                // Provider can chat if contract is active or disputed and client has deposited
                const canProviderChat = (contract.status === "active" || contract.status === "disputed") && contract.clientDeposited;

                let statusText = "";
                let statusColorClass = "";

                switch (contract.status) {
                  case "pending":
                    statusText = "Pendiente (Esperando tu oferta)";
                    statusColorClass = "text-yellow-600";
                    break;
                  case "offered":
                    statusText = "Ofertado (Esperando aceptación del cliente)";
                    statusColorClass = "text-purple-600";
                    break;
                  case "active":
                    if (contract.clientDeposited && contract.clientAction === "finalize" && contract.providerAction === "none") {
                      statusText = "Activo (Cliente finalizó, esperando tu confirmación)";
                      statusColorClass = "text-blue-600";
                    } else if (contract.clientDeposited && contract.clientAction === "accept_offer" && contract.providerAction === "none") {
                      statusText = "Activo (Cliente aceptó, esperando tu acción)";
                      statusColorClass = "text-blue-600";
                    } else if (contract.providerAction === "finalize" && contract.clientAction !== "finalize" && contract.clientAction !== "cancel" && contract.clientAction !== "dispute") {
                      statusText = "Activo (Esperando confirmación del cliente)";
                      statusColorClass = "text-blue-600";
                    } else if (contract.clientAction === "cancel" && contract.providerAction === "none") {
                      statusText = "Cancelación iniciada por cliente (Esperando tu acción)";
                      statusColorClass = "text-red-600";
                    } else if (contract.providerAction === "cancel" && contract.clientAction === "none") {
                      statusText = "Cancelación iniciada (Esperando cliente)";
                      statusColorClass = "text-red-600";
                    } else if (contract.clientAction === "dispute") {
                      statusText = "En Disputa (Iniciada por cliente)";
                      statusColorClass = "text-orange-600";
                    }
                    else {
                      statusText = "Activo (En curso)"; // Fallback for other active states
                      statusColorClass = "text-blue-600";
                    }
                    break;
                  case "finalized":
                    statusText = "Finalizado";
                    statusColorClass = "text-green-600";
                    break;
                  case "cancelled":
                    if (contract.clientAction === "cancel" && contract.providerAction !== "cancel") {
                      statusText = "Cancelado por el cliente";
                    } else if (contract.providerAction === "cancel" && contract.clientAction !== "cancel") {
                      statusText = "Cancelado por ti";
                    } else if (contract.clientAction === "cancel" && contract.providerAction === "cancel") {
                      statusText = "Cancelado por ambas partes";
                    } else {
                      statusText = "Cancelado"; // Fallback
                    }
                    statusColorClass = "text-red-600";
                    break;
                  case "disputed":
                    statusText = "En Disputa (Esperando resolución)";
                    statusColorClass = "text-orange-600";
                    break;
                  case "finalized_by_dispute":
                    statusText = "Finalizado por Disputa (Admin)";
                    statusColorClass = "text-purple-600";
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
                        <span className="font-medium">Cliente:</span> {clientUser ? clientUser.name : "Desconocido"}
                      </CardDescription>
                      <CardDescription>
                        <span className="font-medium">Fecha:</span> {new Date(contract.createdAt).toLocaleDateString()}
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
                        {contract.providerAction === "none" ? "Pendiente" : contract.providerAction === "make_offer" ? "Oferta Enviada" : contract.providerAction === "finalize" ? "Finalizar" : "Cancelar"}
                      </p>
                      <p className="mb-1">
                        <span className="font-medium">Acción Cliente:</span>{" "}
                        {contract.clientAction === "none" ? "Pendiente" : contract.clientAction === "accept_offer" ? "Oferta Aceptada" : contract.clientAction === "finalize" ? "Finalizar" : contract.clientAction === "cancel" ? "Cancelar" : "Disputar"}
                      </p>
                      <div className="flex flex-col gap-2 mt-4">
                        {canProviderMakeOffer && (
                          <Button className="w-full" onClick={() => handleMakeOfferClick(contract)}>
                            Hacer Oferta
                          </Button>
                        )}
                        {canProviderFinalize && (
                          <Button className="w-full" onClick={() => handleFinalizeService(contract.id)}>
                            Finalizar Contrato
                          </Button>
                        )}
                        {canProviderCancel && (
                          <Button variant="outline" className="w-full" onClick={() => handleCancelContract(contract.id)}>
                            Cancelar Contrato
                          </Button>
                        )}
                        {canProviderChat && clientUser && (
                          <Button className="w-full" onClick={() => handleChatWithClient(clientUser.id)}>
                            Chatear
                          </Button>
                        )}
                        {/* Display message if provider has acted or is waiting for client to act first */}
                        {!canProviderMakeOffer && !canProviderFinalize && !canProviderCancel && !canProviderChat && contract.status !== "finalized" && contract.status !== "cancelled" && contract.status !== "disputed" && contract.status !== "finalized_by_dispute" && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                            {contract.providerAction !== "none" ? "Esperando acción de la otra parte." : "Esperando acción del cliente."}
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
      </div>
      {contractToOffer && (
        <MakeOfferModal
          isOpen={isMakeOfferModalOpen}
          onClose={() => setIsMakeOfferModalOpen(false)}
          contractId={contractToOffer.id}
          serviceTitle={contractToOffer.serviceTitle}
          initialRate={contractToOffer.serviceRate}
          onConfirmOffer={handleConfirmOffer}
        />
      )}
      {isContractChatModalOpen && chattingWithClient && (
        <Dialog open={isContractChatModalOpen} onOpenChange={setIsContractChatModalOpen}>
          <DialogContent className="sm:max-w-[425px] md:max-w-lg lg:max-w-2xl overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Chat con {chattingWithClient.name}</DialogTitle>
              <DialogDescription>
                Conversación sobre el contrato activo. Los números no serán enmascarados aquí.
              </DialogDescription>
            </DialogHeader>
            <ChatWindow otherUser={chattingWithClient} allowNumbers={true} />
          </DialogContent>
        </Dialog>
      )}
      <MadeWithDyad />
    </div>
  );
};

export default ProviderDashboard;