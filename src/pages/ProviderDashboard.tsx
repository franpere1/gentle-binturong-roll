import React, { useState, useMemo, useEffect } from "react";
import Header from "@/components/Header";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useAuth } from "@/context/AuthContext";
import { useContracts } from "@/context/ContractContext";
import { Provider, Contract } from "@/types";
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

const ProviderDashboard: React.FC = () => {
  const { currentUser, findUserById } = useAuth();
  const { getContractsForUser, handleContractAction, contracts } = useContracts(); // Añadir contracts del contexto
  const provider = currentUser as Provider;
  const [isEditing, setIsEditing] = useState(false);
  const [searchTermContracts, setSearchTermContracts] = useState("");

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

    // Sort: active contracts first, then by creation date (most recent)
    filteredContracts.sort((a, b) => {
      // Prioritize contracts that are 'active' and waiting for provider action (client has finalized)
      const aIsReadyForProviderFinalize = a.status === "active" && a.clientDeposited && a.clientAction === "finalize" && a.providerAction === "none";
      const bIsReadyForProviderFinalize = b.status === "active" && b.clientDeposited && b.clientAction === "finalize" && b.providerAction === "none";

      if (aIsReadyForProviderFinalize && !bIsReadyForProviderFinalize) return -1;
      if (!aIsReadyForProviderFinalize && bIsReadyForProviderFinalize) return 1;

      // Then prioritize contracts that are 'active' and waiting for client action (provider has finalized)
      const aIsProviderFinalizedWaitingClient = a.status === "active" && a.clientDeposited && a.providerAction === "finalize" && a.clientAction === "none";
      const bIsProviderFinalizedWaitingClient = b.status === "active" && b.clientDeposited && b.providerAction === "finalize" && b.clientAction === "none";

      if (aIsProviderFinalizedWaitingClient && !bIsProviderFinalizedWaitingClient) return -1;
      if (!aIsProviderFinalizedWaitingClient && bIsProviderFinalizedWaitingClient) return 1;

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
  }, [providerContracts, searchTermContracts, findUserById, contracts]); // Add 'contracts' to dependencies

  // Calculate accumulated earnings
  const accumulatedEarnings = providerContracts.reduce((total, contract) => {
    if (contract.status === "finalized") {
      return total + (contract.serviceRate * (1 - contract.commissionRate));
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
                const clientUser = findUserById(contract.clientId);
                const canProviderFinalize = contract.status === "active" && contract.clientDeposited && contract.providerAction === "none" && contract.clientAction !== "cancel";
                const canProviderCancel = (contract.status === "pending" || contract.status === "active") && contract.providerAction === "none" && contract.clientAction !== "finalize";
                const providerHasActed = contract.providerAction !== "none";

                let statusText = "";
                let statusColorClass = "";

                switch (contract.status) {
                  case "pending":
                    statusText = "Pendiente de pago del cliente";
                    statusColorClass = "text-yellow-600";
                    break;
                  case "active":
                    if (contract.providerAction === "finalize" && contract.clientAction === "none") {
                      statusText = "Activo (Esperando confirmación del cliente)";
                      statusColorClass = "text-blue-600";
                    } else if (contract.clientAction === "finalize" && contract.providerAction === "none") {
                      statusText = "Activo (Cliente finalizó, esperando tu confirmación)";
                      statusColorClass = "text-blue-600";
                    } else if (contract.providerAction === "cancel" && contract.clientAction === "none") {
                      statusText = "Cancelación iniciada (Esperando cliente)";
                      statusColorClass = "text-red-600";
                    } else if (contract.clientAction === "cancel" && contract.providerAction === "none") {
                      statusText = "Cancelación iniciada por cliente (Esperando tu acción)";
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
                        {contract.providerAction === "none" ? "Ninguna" : contract.providerAction === "finalize" ? "Finalizar" : "Cancelar"}
                      </p>
                      <p className="mb-1">
                        <span className="font-medium">Acción Cliente:</span>{" "}
                        {contract.clientAction === "none" ? "Ninguna" : contract.clientAction === "finalize" ? "Finalizar" : "Cancelar"}
                      </p>
                      <div className="flex flex-col gap-2 mt-4">
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
                        {providerHasActed && contract.status === "active" && (
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
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default ProviderDashboard;