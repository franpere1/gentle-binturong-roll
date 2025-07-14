import React, { useState, useEffect } from "react";
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
import ContractCompletionModal from "@/components/ContractCompletionModal"; // Importar el nuevo modal

const ClientDashboard: React.FC = () => {
  const { currentUser, getAllProviders } = useAuth();
  const { getContractsForUser, releaseFunds } = useContracts();
  const client = currentUser as Client;
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false); // Nuevo estado para el modal de finalización
  const [contractToFinalize, setContractToFinalize] = useState<Contract | null>(null); // Estado para el contrato a finalizar

  const allProviders = getAllProviders();
  const clientContracts = client ? getContractsForUser(client.id) : [];

  useEffect(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const results = allProviders.filter(
      (provider) =>
        provider.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        provider.category.toLowerCase().includes(lowerCaseSearchTerm) ||
        provider.serviceTitle.toLowerCase().includes(lowerCaseSearchTerm) ||
        provider.serviceDescription.toLowerCase().includes(lowerCaseSearchTerm) ||
        provider.state.toLowerCase().includes(lowerCaseSearchTerm)
    );
    setFilteredProviders(results);
  }, [searchTerm, allProviders]);

  const handleContactProvider = (provider: Provider) => {
    setSelectedProvider(provider);
    setIsContactModalOpen(true);
  };

  const handleCloseContract = (contract: Contract) => {
    setContractToFinalize(contract);
    setIsCompletionModalOpen(true);
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
            <div>
              <h2 className="text-2xl font-semibold mb-4">Tu Perfil</h2>
              <p className="mb-2">
                <span className="font-medium">Correo:</span> {client.email}
              </p>
              <p className="mb-2">
                <span className="font-medium">Estado:</span> {client.state}
              </p>
            </div>
            <div className="flex items-center justify-center">
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
          {clientContracts.length === 0 ? (
            <p className="text-center text-gray-600 dark:text-gray-400">
              No tienes contratos activos.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clientContracts.map((contract) => {
                const provider = allProviders.find(p => p.id === contract.providerId);
                return (
                  <Card key={contract.id} className="flex flex-col">
                    <CardHeader>
                      <CardTitle>{contract.serviceTitle}</CardTitle>
                      <CardDescription>
                        <span className="font-medium">Proveedor:</span> {provider ? provider.name : "Desconocido"}
                      </CardDescription>
                      <CardDescription>
                        Estado:{" "}
                        <span
                          className={`font-semibold ${
                            contract.status === "pending"
                              ? "text-yellow-600"
                              : contract.status === "active"
                              ? "text-blue-600"
                              : contract.status === "finalized"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {contract.status === "pending" && "Pendiente de pago"}
                          {contract.status === "active" && "Activo"}
                          {contract.status === "finalized" && "Finalizado"}
                          {contract.status === "cancelled" && "Cancelado"}
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
                        <span className="font-medium">Proveedor Finalizó:</span>{" "}
                        {contract.providerFinalized ? "Sí" : "No"}
                      </p>
                      {contract.status === "active" && contract.clientDeposited && contract.providerFinalized && (
                        <Button className="mt-4 w-full" onClick={() => handleCloseContract(contract)}>
                          Cerrar Contrato
                        </Button>
                      )}
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          {filteredProviders.length === 0 && searchTerm !== "" ? (
            <p className="text-center text-gray-600 dark:text-gray-400">
              No se encontraron servicios que coincidan con tu búsqueda.
            </p>
          ) : filteredProviders.length === 0 && searchTerm === "" ? (
            <p className="text-center text-gray-600 dark:text-gray-400">
              No hay proveedores registrados aún.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProviders.map((provider) => (
                <Card key={provider.id} className="flex flex-col">
                  {provider.serviceImage && (
                    <img
                      src={provider.serviceImage}
                      alt={provider.serviceTitle}
                      className="w-full h-40 object-cover rounded-t-lg"
                    />
                  )}
                  <CardHeader>
                    <CardTitle>{provider.serviceTitle}</CardTitle>
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
      {contractToFinalize && (
        <ContractCompletionModal
          isOpen={isCompletionModalOpen}
          onClose={() => setIsCompletionModalOpen(false)}
          contract={contractToFinalize}
          providerName={allProviders.find(p => p.id === contractToFinalize.providerId)?.name || "Desconocido"}
        />
      )}
      <MadeWithDyad />
    </div>
  );
};

export default ClientDashboard;