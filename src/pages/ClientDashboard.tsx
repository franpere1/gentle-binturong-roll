import React, { useState } from "react";
import Header from "@/components/Header";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useAuth } from "@/context/AuthContext";
import { Client } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ClientProfileEditor from "@/components/ClientProfileEditor"; // Importar el nuevo componente

const ClientDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const client = currentUser as Client; // Sabemos que es un cliente aquí
  const [isEditing, setIsEditing] = useState(false);

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
      <div className="flex-grow flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <div className="w-full max-w-2xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md text-gray-800 dark:text-gray-100">
          <h1 className="text-3xl font-bold mb-6 text-center">
            Bienvenido, {client.name} (Cliente)
          </h1>

          <div className="grid grid-cols-1 gap-6 mb-8">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Tu Perfil</h2>
              <p className="mb-2">
                <span className="font-medium">Correo:</span> {client.email}
              </p>
              <p className="mb-2">
                <span className="font-medium">Estado:</span> {client.state}
              </p>
            </div>
          </div>

          <div className="text-center">
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
      <MadeWithDyad />
    </div>
  );
};

export default ClientDashboard;