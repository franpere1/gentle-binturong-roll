import React, { useMemo, useState, useEffect } from "react";
    import Header from "@/components/Header";
    import { MadeWithDyad } from "@/components/made-with-dyad";
    import { useAuth } from "@/context/AuthContext";
    import { useContracts } from "@/context/ContractContext";
    import { Contract, Client, Provider } from "@/types";
    import { Button } from "@/components/ui/button";
    import {
      Card,
      CardContent,
      CardDescription,
      CardHeader,
      CardTitle,
    } from "@/components/ui/card";
    import { Input } from "@/components/ui/input";
    import { showError, showSuccess } from "@/utils/toast";

    const INITIAL_DISPLAY_LIMIT = 4;
    const LOAD_MORE_AMOUNT = 10;

    const AdminDashboard: React.FC = () => {
      const { currentUser, findUserById, getAllProviders } = useAuth();
      const { contracts, resolveDispute } = useContracts();
      const [searchTermDisputes, setSearchTermDisputes] = useState("");
      const [activeDisputesLimit, setActiveDisputesLimit] = useState(INITIAL_DISPLAY_LIMIT);
      const [resolvedDisputesLimit, setResolvedDisputesLimit] = useState(INITIAL_DISPLAY_LIMIT);
      const [allUsers, setAllUsers] = useState<Map<string, Client | Provider | User>>(new Map());

      // Fetch all users (clients and providers) to display names in contracts
      useEffect(() => {
        const fetchUsers = async () => {
          const providers = await getAllProviders();
          // For clients, we'd need a similar getAllClients function or fetch all users
          // For simplicity, let's assume findUserById can fetch any user type
          const usersMap = new Map<string, Client | Provider | User>();
          providers.forEach(p => usersMap.set(p.id, p));
          // Add current user if not already there (e.g., admin itself)
          if (currentUser) {
            usersMap.set(currentUser.id, currentUser);
          }
          // Note: This won't fetch all clients unless explicitly done.
          // For a full solution, you'd fetch all users or fetch clients on demand.
          setAllUsers(usersMap);
        };
        fetchUsers();
      }, [getAllProviders, currentUser]);

      // Calculate Held Funds
      const heldFunds = useMemo(() => {
        return contracts.reduce((total, contract) => {
          if (contract.clientDeposited && (contract.status === "active" || contract.status === "disputed")) {
            return total + contract.serviceRate;
          }
          return total;
        }, 0);
      }, [contracts]);

      // Calculate Total Commissions Earned
      const totalCommissions = useMemo(() => {
        return contracts.reduce((total, contract) => {
          if (contract.status === "finalized") {
            return total + (contract.serviceRate * contract.commissionRate);
          }
          if (contract.status === "finalized_by_dispute" && contract.disputeResolution === "toProvider") {
            return total + (contract.serviceRate * contract.commissionRate);
          }
          return total;
        }, 0);
      }, [contracts]);

      // Combined list of all relevant contracts (disputed and finalized_by_dispute)
      const allRelevantContracts = useMemo(() => {
        const lowerCaseSearchTerm = searchTermDisputes.toLowerCase();
        return contracts.filter(contract =>
          (contract.status === "disputed" || contract.status === "finalized_by_dispute") &&
          (contract.serviceTitle.toLowerCase().includes(lowerCaseSearchTerm) ||
           (allUsers.get(contract.clientId)?.name.toLowerCase() || "").includes(lowerCaseSearchTerm) ||
           (allUsers.get(contract.providerId)?.name.toLowerCase() || "").includes(lowerCaseSearchTerm))
        );
      }, [contracts, searchTermDisputes, allUsers]);

      // Separate and sort for display
      const sortedDisputedContracts = useMemo(() => {
        let filtered = allRelevantContracts.filter(contract => contract.status === "disputed");
        filtered.sort((a, b) => b.createdAt - a.createdAt);
        return filtered;
      }, [allRelevantContracts]);

      const sortedResolvedDisputes = useMemo(() => {
        let filtered = allRelevantContracts.filter(contract => contract.status === "finalized_by_dispute");
        filtered.sort((a, b) => b.updatedAt - a.updatedAt);
        return filtered;
      }, [allRelevantContracts]);

      // Apply limits for display
      const displayedDisputedContracts = useMemo(() => {
        return sortedDisputedContracts.slice(0, activeDisputesLimit);
      }, [sortedDisputedContracts, activeDisputesLimit]);

      const displayedResolvedDisputes = useMemo(() => {
        return sortedResolvedDisputes.slice(0, resolvedDisputesLimit);
      }, [sortedResolvedDisputes, resolvedDisputesLimit]);

      const handleLoadMoreActiveDisputes = () => {
        setActiveDisputesLimit(prevLimit => prevLimit + LOAD_MORE_AMOUNT);
      };

      const handleLoadMoreResolvedDisputes = () => {
        setResolvedDisputesLimit(prevLimit => prevLimit + LOAD_MORE_AMOUNT);
      };

      const handleResolveToProvider = async (contract: Contract) => {
        if (currentUser?.type === "admin") {
          await resolveDispute(contract.id, "toProvider");
        } else {
          showError("Solo un administrador puede resolver disputas.");
        }
      };

      const handleResolveToClient = async (contract: Contract) => {
        if (currentUser?.type === "admin") {
          await resolveDispute(contract.id, "toClient");
        } else {
          showError("Solo un administrador puede resolver disputas.");
        }
      };

      if (currentUser?.type !== "admin") {
        return (
          <div className="min-h-screen flex flex-col">
            <Header />
            <div className="flex-grow flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
              <div className="text-center p-4">
                <h1 className="text-4xl font-bold mb-4 text-gray-800 dark:text-gray-100">
                  Acceso Denegado
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300">
                  Solo los administradores pueden acceder a este panel.
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
                Panel de Administración
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 text-center mb-8">
                Gestiona los contratos en disputa y revisa las resoluciones.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card className="bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700">
                  <CardHeader>
                    <CardTitle className="text-blue-800 dark:text-blue-200">Fondos Retenidos</CardTitle>
                    <CardDescription className="text-blue-600 dark:text-blue-400">
                      Dinero en custodia para contratos activos o en disputa.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-4xl font-bold text-blue-800 dark:text-blue-200">
                      ${heldFunds.toFixed(2)} USD
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700">
                  <CardHeader>
                    <CardTitle className="text-green-800 dark:text-green-200">Comisiones Obtenidas</CardTitle>
                    <CardDescription className="text-green-600 dark:text-green-400">
                      Ganancias de la plataforma por servicios finalizados.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-4xl font-bold text-green-800 dark:text-green-200">
                      ${totalCommissions.toFixed(2)} USD
                    </p>
                  </CardContent>
                </Card>
              </div>

              <h2 className="text-2xl font-bold mb-4 text-center">Disputas Activas</h2>
              <div className="mb-6">
                <Input
                  type="text"
                  placeholder="Buscar disputas por título de servicio, cliente o proveedor..."
                  value={searchTermDisputes}
                  onChange={(e) => setSearchTermDisputes(e.target.value)}
                  className="w-full"
                />
              </div>
              {displayedDisputedContracts.length === 0 && searchTermDisputes !== "" ? (
                <p className="text-center text-gray-600 dark:text-gray-400">
                  No se encontraron disputas activas que coincidan con tu búsqueda.
                </p>
              ) : displayedDisputedContracts.length === 0 && searchTermDisputes === "" ? (
                <p className="text-center text-gray-600 dark:text-gray-400">
                  No hay contratos en disputa actualmente.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {displayedDisputedContracts.map((contract) => {
                    const client = allUsers.get(contract.clientId) as Client | undefined;
                    const provider = allUsers.get(contract.providerId) as Provider | undefined;

                    const amountToProvider = contract.serviceRate * (1 - contract.commissionRate);
                    const commissionAmount = contract.serviceRate * contract.commissionRate;

                    return (
                      <Card key={contract.id} className="flex flex-col">
                        <CardHeader>
                          <CardTitle>{contract.serviceTitle}</CardTitle>
                          <CardDescription>
                            <span className="font-medium">ID Contrato:</span> {contract.id}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-2">
                          <p>
                            <span className="font-medium">Monto en Disputa:</span> ${contract.serviceRate.toFixed(2)} USD
                          </p>
                          <p>
                            <span className="font-medium">Cliente:</span> {client?.name || "Desconocido"}
                            {client?.phone && <span className="ml-2 text-sm text-gray-500">(Tel: {client.phone})</span>}
                          </p>
                          <p>
                            <span className="font-medium">Proveedor:</span> {provider?.name || "Desconocido"}
                            {provider?.phone && <span className="ml-2 text-sm text-gray-500">(Tel: {provider.phone})</span>}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            (Comisión de la plataforma: ${commissionAmount.toFixed(2)} USD)
                          </p>
                          <div className="flex flex-col gap-2 mt-4">
                            <Button
                              className="w-full bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleResolveToProvider(contract)}
                            >
                              Liberar Fondos al Proveedor (${amountToProvider.toFixed(2)} USD)
                            </Button>
                            <Button
                              className="w-full bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => handleResolveToClient(contract)}
                            >
                              Liberar Fondos al Cliente (${contract.serviceRate.toFixed(2)} USD)
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
              {displayedDisputedContracts.length < sortedDisputedContracts.length && (
                <div className="text-center mt-6">
                  <Button onClick={handleLoadMoreActiveDisputes} variant="outline">
                    Cargar más disputas ({sortedDisputedContracts.length - displayedDisputedContracts.length} restantes)
                  </Button>
                </div>
              )}

              <h2 className="text-2xl font-bold mt-8 mb-4 text-center">Historial de Disputas Resueltas</h2>
              {displayedResolvedDisputes.length === 0 && searchTermDisputes !== "" ? (
                <p className="text-center text-gray-600 dark:text-gray-400">
                  No se encontraron disputas resueltas que coincidan con tu búsqueda.
                </p>
              ) : displayedResolvedDisputes.length === 0 && searchTermDisputes === "" ? (
                <p className="text-center text-gray-600 dark:text-gray-400">
                  No hay disputas resueltas aún.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {displayedResolvedDisputes.map((contract) => {
                    const client = allUsers.get(contract.clientId) as Client | undefined;
                    const provider = allUsers.get(contract.providerId) as Provider | undefined;

                    const resolutionText = contract.disputeResolution === 'toClient'
                      ? `Fondos liberados al Cliente ($${contract.serviceRate.toFixed(2)} USD)`
                      : `Fondos liberados al Proveedor ($${(contract.serviceRate * (1 - contract.commissionRate)).toFixed(2)} USD)`;
                    const resolutionColor = contract.disputeResolution === 'toClient' ? 'text-red-600' : 'text-green-600';

                    return (
                      <Card key={contract.id} className="flex flex-col opacity-80">
                        <CardHeader>
                          <CardTitle>{contract.serviceTitle}</CardTitle>
                          <CardDescription>
                            <span className="font-medium">ID Contrato:</span> {contract.id}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-2">
                          <p>
                            <span className="font-medium">Monto Original:</span> ${contract.serviceRate.toFixed(2)} USD
                          </p>
                          <p>
                            <span className="font-medium">Cliente:</span> {client?.name || "Desconocido"}
                          </p>
                          <p>
                            <span className="font-medium">Proveedor:</span> {provider?.name || "Desconocido"}
                          </p>
                          <p className="font-medium">
                            Fecha de Resolución: {new Date(contract.updatedAt).toLocaleDateString()}
                          </p>
                          <p className={`font-semibold ${resolutionColor}`}>
                            Resolución: {resolutionText}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
              {displayedResolvedDisputes.length < sortedResolvedDisputes.length && (
                <div className="text-center mt-6">
                  <Button onClick={handleLoadMoreResolvedDisputes} variant="outline">
                    Cargar más disputas ({sortedResolvedDisputes.length - displayedResolvedDisputes.length} restantes)
                  </Button>
                </div>
              )}
            </div>
          </div>
          <MadeWithDyad />
        </div>
      );
    };

    export default AdminDashboard;