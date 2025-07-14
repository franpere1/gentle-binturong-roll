import React from "react";
import { Provider } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ChatWindow from "./ChatWindow";

interface ProviderContactModalProps {
  provider: Provider;
  isOpen: boolean;
  onClose: () => void;
}

const ProviderContactModal: React.FC<ProviderContactModalProps> = ({
  provider,
  isOpen,
  onClose,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] md:max-w-lg lg:max-w-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Contactar a {provider.name}</DialogTitle>
          <DialogDescription>
            Aquí puedes ver los detalles del servicio y chatear con el proveedor.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Detalles del Proveedor</h3>
            <p>
              <span className="font-medium">Nombre:</span> {provider.name}
            </p>
            <p>
              <span className="font-medium">Correo:</span> {provider.email}
            </p>
            <p>
              <span className="font-medium">Estado:</span> {provider.state}
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Detalles del Servicio</h3>
            <p>
              <span className="font-medium">Categoría:</span> {provider.category}
            </p>
            <p>
              <span className="font-medium">Título:</span> {provider.serviceTitle}
            </p>
            <p>
              <span className="font-medium">Descripción:</span> {provider.serviceDescription}
            </p>
            <p>
              <span className="font-medium">Tarifa:</span> ${provider.rate.toFixed(2)} USD
            </p>
            {provider.serviceImage && (
              <div className="mt-2">
                <img
                  src={provider.serviceImage}
                  alt={provider.serviceTitle}
                  className="w-full h-48 object-cover rounded-md shadow-sm"
                />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Chat con {provider.name}</h3>
            <ChatWindow otherUser={provider} />
          </div>
          {/* Este botón será funcional en la siguiente etapa */}
          <Button className="w-full mt-4">Contratar Servicio (Próximamente)</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProviderContactModal;