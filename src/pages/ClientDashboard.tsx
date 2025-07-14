import React from "react";
import Header from "@/components/Header";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useAuth } from "@/context/AuthContext";

const ClientDashboard: React.FC = () => {
  const { currentUser } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-grow flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <div className="text-center p-4">
          <h1 className="text-4xl font-bold mb-4 text-gray-800 dark:text-gray-100">
            Bienvenido, {currentUser?.name} (Cliente)
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Este es tu dashboard de cliente. Aquí podrás buscar proveedores y gestionar tus contratos.
          </p>
        </div>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default ClientDashboard;