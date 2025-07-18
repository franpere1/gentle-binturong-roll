import React, { useState, useEffect, useMemo } from "react";
    import Header from "@/components/Header";
    import { MadeWithDyad } from "@/components/made-with-dyad";
    import { useAuth } from "@/context/AuthContext";
    import { useContracts } from "@/context/ContractContext";
    import { useChat } from "@/context/ChatContext";
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
    import ContractCompletionModal from "@/components/ContractCompletionModal";
    import PaymentSimulationModal from "@/components/PaymentSimulationModal";
    import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
    import ChatWindow from "@/components/ChatWindow";
    import { showError } from "@/utils/toast";

    const ClientDashboard: React.FC = () => {
      const { currentUser, getAllProviders, findUserById, isLoading: authLoading } = useAuth();
      const { getContractsForUser, handleContractAction, depositFunds, contracts, createContract } = useContracts();
      const { hasUnreadMessages } = useChat();
      
      const client = useMemo(() => {
        if (!authLoading && currentUser && currentUser.type === "client") {
          return currentUser as Client;
        }
        return null;
      }, [authLoading, currentUser]);

      const [isEditing, setIsEditing] = useState(false);
      const [searchTermProviders, setSearchTermProviders] = useState("");
      const [searchTermContracts, setSearchTermContracts] = useState("");
      const [allProviders, setAllProviders] = useState<Provider[]>([]); // State to store all providers
      const [displayedProviders, setDisplayedProviders] = useState<Provider[]>([]);
      const [isCompletionModalOpen, setIsCompletionModal] = useState(false);
      const [contractToFinalize, setContractToFinalize] = useState<Contract | null>(null);
      const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
      const [contractToPay, setContractToPay] = useState<Contract | null>(null);
      const [isContractChatModalOpen, setIsContractChatModalOpen] = useState(false);
      const [chattingWithProvider, setChattingWithProvider] = useState<Provider | null>(null);
      const [chatContractStatus, setChatContractStatus] = useState<Contract['status'] | 'initial_contact' | undefined>(undefined);

      // Fetch all providers once
      useEffect(() => {
        const fetchProviders = async () => {
          const providers = await getAllProviders();
          setAllProviders(providers);
        };
        fetchProviders();
      }, [getAllProviders]);

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

        // Sort: offered contracts (waiting for client acceptance) first, then active contracts (waiting for client finalize),
        // then pending contracts (waiting for provider offer), then by creation date (most recent)
        filteredContracts.sort((a, b) => {
          // 1. Prioritize 'offered' contracts (waiting for client to accept/deposit)
          if (a.status === "offered" && b.status !== "offered") return -1;
          if (a.status !== "offered" && b.status === "offered") return 1;

          // 2. Then prioritize 'active' contracts where provider has finalized and client needs to finalize
          const aIsReadyForClientFinalize = a.status === "active" && a.clientDeposited && a.providerAction === "finalize" && a.clientAction !== "finalize" && a.clientAction !== "cancel" && a.clientAction !== "dispute";
          const bIsReadyForClientFinalize = b.status === "active" && b.clientDeposited && b.providerAction === "finalize" && b.clientAction !== "finalize" && b.clientAction !== "cancel" && b.clientAction !== "dispute";

          if (aIsReadyForClientFinalize && !bIsReadyForClientFinalize) return -1;
          if (!aIsReadyForClientFinalize && bIsReadyForClientFinalize) return 1;

          // 3. Then prioritize 'active' contracts where client has finalized and waiting for provider
          const aIsClientFinalizedWaitingProvider = a.status === "active" && a.clientDeposited && a.clientAction === "finalize" && a.providerAction === "none";
          const bIsClientFinalizedWaitingProvider = b.status === "active" && b.clientDeposited && a.clientAction === "finalize" && b.providerAction === "none";

          if (aIsClientFinalizedWaitingProvider && !bIsClientFinalizedWaitingProvider) return -1;
          if (!aIsClientFinalizedWaitingProvider && bIsClientFinalizedWaitingProvider) return 1;

          // 4. Then prioritize 'pending' contracts (waiting for provider offer)
          if (a.status === "pending" && b.status !== "pending") return -1;
          if (a.status !== "pending" && b.status === "pending") return 1;

          // Then sort by creation date (most recent first)
          return b.createdAt - a.createdAt;
        });

        // Take only the last 3
        return filteredContracts.slice(0, 3);
      }, [clientContracts, searchTermContracts, allProviders, contracts]);

      const handleSolicitarServicio = async (provider: Provider) => {
        if (!currentUser || currentUser.type !== "client") {
          showError("Debes iniciar sesión como cliente para solicitar un servicio.");
          return;
        }

        const newContract = await createContract(
          currentUser.id,
          provider.id,
          provider.serviceTitle,
          provider.rate || 0
        );

        if (newContract) {
          // createContract already shows a success toast.
          // The contracts list in the dashboard should automatically update due to useContracts context.
        }
      };

      const handleAcceptOfferClick = (contract: Contract) => {
        setContractToPay(contract);
        setIsPaymentModalOpen(true);
      };

      const handlePaymentConfirmed = async (finalAmount: number) => {
        if (contractToPay) {
          const depositSuccess = await depositFunds(contractToPay.id);
          if (depositSuccess) {
            // The depositFunds function already updates the contract status to 'active' and shows success toast
          }
          setContractToPay(null);
        }
        setIsPaymentModalOpen(false);
      };

      const handleFinalizeContractClick = (contract: Contract) => {
        console.log("ClientDashboard: 'Finalizar Contrato' button clicked for contract:", contract.id);
        setContractToFinalize(contract);
        setIsCompletionModal(true);
        console.log("ClientDashboard: isCompletionModalOpen set to true. contractToFinalize:", contract.id);
      };

      const handleCancelContract = async (contractId: string) => {
        if (currentUser) {
          await handleContractAction(contractId, currentUser.id, 'cancel');
        }
      };

      const handleDisputeContract = async (contractId: string) => {
        if (currentUser) {
          await handleContractAction(contractId, currentUser.id, 'dispute');
        }
      };

      const handleCancelDispute = async (contractId: string) => {
        if (currentUser) {
          await handleContractAction(contractId, currentUser.id, 'cancel_dispute');
        }
      };

      const handleChatWithProvider = (contract: Contract) => {
        const provider = allProviders.find(p => p.id === contract.providerId);
        if (provider) {
          setChattingWithProvider(provider);
          setChatContractStatus(contract.status);
          setIsContractChatModalOpen(true);
        }
      };

      if (authLoading) {
        return (
          <div className="min-h-screen flex flex-col">
            <Header />
            <div className="flex-grow flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
              <div className="text-center p-4">
                <h1 className="text-4xl font-bold mb-4 text-gray-800 dark:text-gray-100">
                  Cargando información del usuario...
                </h1>
              </div>
            </div>
            <MadeWithDyad />
          </div>
        );
      }

      if (!client) {
        return (
          <div className="min-h-screen flex flex-col">
            <Header />
            <div className="flex-grow flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
              <div className="text-center p-4">
                <h1 className="text-4xl font-bold mb-4 text-gray-800 dark:text-gray-100">
                  Acceso Denegado
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300">
                  Solo los clientes pueden acceder a este panel.
                </p>
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
                    const hasNewMessages = provider ? hasUnreadMessages(provider.id) : false;

                    const canClientAcceptOffer = contract.status === "offered" && contract.clientAction === "none";

                    const canClientFinalize =
                      contract.status === "active" &&
                      contract.clientDeposited &&
                      contract.providerAction === "finalize" &&
                      contract.clientAction !== "finalize" &&
                      contract.clientAction !== "cancel" &&
                      contract.clientAction !== "dispute";

                    const canClientCancel =
                      (contract.status === "pending" && contract.clientAction === "none") ||
                      (contract.status === "offered" && contract.clientAction === "none") ||
                      (contract.status === "active" && contract.clientDeposited && contract.providerAction === "cancel" && contract.clientAction === "none");

                    const canClientDispute =
                      contract.status === "active" &&
                      contract.clientDeposited &&
                      contract.clientAction !== "finalize" &&
                      contract.clientAction !== "cancel" &&
                      contract.clientAction !== "dispute";

                    const canClientCancelDispute = contract.status === "disputed" && contract.clientAction === "dispute";

                    const isWaitingForProviderAction =
                      contract.status === "active" &&
                      contract.clientDeposited &&
                      contract.clientAction === "accept_offer" &&
                      contract.providerAction === "none";

                    const canClientChat = (contract.status === "pending" || contract.status === "offered" || contract.status === "active" || contract.status === "disputed");

                    let statusText = "";
                    let statusColorClass = "";

                    switch (contract.status) {
                      case "pending":
                        statusText = "Pendiente (Esperando oferta del proveedor)";
                        statusColorClass = "text-yellow-600";
                        break;
                      case "offered":
                        statusText = "Oferta Recibida (Esperando tu aceptación)";
                        statusColorClass = "text-purple-600";
                        break;
                      case "active":
                        if (isWaitingForProviderAction) {
                          statusText = "Activo (Esperando respuesta del proveedor)";
                          statusColorClass = "text-blue-600";
                        } else if (contract.clientAction === "finalize" && contract.providerAction === "none") {
                          statusText = "Activo (Esperando confirmación del proveedor)";
                          statusColorClass = "text-blue-600";
                        } else if (contract.providerAction === "finalize" && contract.clientAction !== "finalize" && contract.clientAction !== "cancel" && contract.clientAction !== "dispute") {
                          statusText = "Activo (Proveedor finalizó, esperando tu confirmación)";
                          statusColorClass = "text-blue-600";
                        } else if (contract.clientAction === "cancel" && contract.providerAction === "none") {
                          statusText = "Cancelación iniciada (Esperando proveedor)";
                          statusColorClass = "text-red-600";
                        } else if (contract.providerAction === "cancel" && contract.clientAction === "none") {
                          statusText = "Cancelación iniciada por proveedor (Esperando tu acción)";
                          statusColorClass = "text-red-600";
                        } else if (contract.clientAction === "dispute") {
                          statusText = "En Disputa (Iniciada por ti)";
                          statusColorClass = "text-orange-600";
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
                        if (contract.clientAction === "cancel" && contract.providerAction !== "cancel") {
                          statusText = "Cancelado por ti";
                        } else if (contract.providerAction === "cancel" && contract.clientAction !== "cancel") {
                          statusText = "Cancelado por el proveedor";
                        } else if (contract.clientAction === "cancel" && contract.providerAction === "cancel") {
                          statusText = "Cancelado por ambas partes";
                        } else {
                          statusText = "Cancelado";
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
                            {contract.clientAction === "none" ? "Pendiente" : contract.clientAction === "accept_offer" ? "Oferta Aceptada" : contract.clientAction === "finalize" ? "Finalizar" : contract.clientAction === "cancel" ? "Cancelar" : "Disputar"}
                          </p>
                          <p className="mb-1">
                            <span className="font-medium">Acción Proveedor:</span>{" "}
                            {contract.providerAction === "none" ? "Pendiente" : contract.providerAction === "make_offer" ? "Oferta Enviada" : contract.providerAction === "finalize" ? "Finalizar" : "Cancelar"}
                          </p>
                          <div className="flex flex-col gap-2 mt-4">
                            {canClientAcceptOffer && (
                              <Button className="w-full" onClick={() => handleAcceptOfferClick(contract)}>
                                Aceptar Oferta y Pagar
                              </Button>
                            )}
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
                            {canClientChat && provider && (
                              <Button
                                className={`w-full ${hasNewMessages ? 'btn-new-message-pulse' : ''}`}
                                onClick={() => handleChatWithProvider(contract)}
                              >
                                {hasNewMessages ? 'Mensaje Nuevo' : 'Chatear'}
                              </Button>
                            )}
                            {canClientDispute && (
                              <Button variant="destructive" className="w-full" onClick={() => handleDisputeContract(contract.id)}>
                                Disputar
                              </Button>
                            )}
                            {canClientCancelDispute && (
                              <Button variant="outline" className="w-full bg-yellow-500 hover:bg-yellow-600 text-white" onClick={() => handleCancelDispute(contract.id)}>
                                Cancelar Disputa
                              </Button>
                            )}
                            {!canClientAcceptOffer && !canClientFinalize && !canClientCancel && !canClientDispute && !canClientCancelDispute && !canClientChat && contract.status !== "finalized" && contract.status !== "cancelled" && contract.status !== "disputed" && contract.status !== "finalized_by_dispute" && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                                {isWaitingForProviderAction ? "Esperando acción del proveedor." : "Esperando acción de la otra parte."}
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
                          ${provider.rate.toFixed(2)} USD (Tarifa Sugerida)
                        </p>
                        <Button className="mt-4 w-full" onClick={() => handleSolicitarServicio(provider)}>Solicitar Servicio</Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
          {isCompletionModalOpen && contractToFinalize && (
            <ContractCompletionModal
              isOpen={isCompletionModalOpen}
              onClose={() => {
                console.log("ClientDashboard: ContractCompletionModal closed.");
                setIsCompletionModal(false);
                setContractToFinalize(null);
              }}
              contract={contractToFinalize}
              providerName={allProviders.find(p => p.id === contractToFinalize.providerId)?.name || "Desconocido"}
            />
          )}
          {isPaymentModalOpen && contractToPay && (
            <PaymentSimulationModal
              isOpen={isPaymentModalOpen}
              onClose={() => setIsPaymentModalOpen(false)}
              serviceTitle={contractToPay.serviceTitle}
              negotiatedServiceRate={contractToPay.serviceRate} // Pass the negotiated service rate
              onConfirm={handlePaymentConfirmed}
            />
          )}
          {isContractChatModalOpen && chattingWithProvider && (
            <Dialog open={isContractChatModalOpen} onOpenChange={setIsContractChatModalOpen}>
              <DialogContent className="sm:max-w-[425px] md:max-w-lg lg:max-w-2xl overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Chat con {chattingWithProvider.name}</DialogTitle>
                  <DialogDescription>
                    {chatContractStatus === "pending" || chatContractStatus === "offered" || chatContractStatus === "initial_contact"
                      ? "Conversación previa al pago. Los números y palabras numéricas sensibles serán enmascarados para proteger tu privacidad."
                      : "Conversación sobre el contrato activo. Los números no serán enmascarados aquí."}
                  </DialogDescription>
                </DialogHeader>
                <ChatWindow otherUser={chattingWithProvider} contractStatus={chatContractStatus} />
              </DialogContent>
            </Dialog>
          )}
          <MadeWithDyad />
        </div>
      );
    };

    export default ClientDashboard;