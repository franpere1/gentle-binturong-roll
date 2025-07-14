import React, { useState, useEffect } from "react";
import {
  Button
} from "@/components/ui/button";
import {
  Input
} from "@/components/ui/input";
import {
  Label
} from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Textarea
} from "@/components/ui/textarea";
import { VENEZUELAN_STATES } from "@/constants/venezuelanStates";
import { ServiceCategory, Provider } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { showError } from "@/utils/toast";

interface ProviderProfileEditorProps {
  onSave: () => void;
  onCancel: () => void;
}

const ProviderProfileEditor: React.FC<ProviderProfileEditorProps> = ({
  onSave,
  onCancel,
}) => {
  const { currentUser, updateUser } = useAuth();
  const provider = currentUser as Provider; // Sabemos que es un proveedor aquí

  const [name, setName] = useState(provider.name);
  const [email, setEmail] = useState(provider.email);
  const [state, setState] = useState(provider.state);
  const [category, setCategory] = useState<ServiceCategory | "">(provider.category);
  const [serviceTitle, setServiceTitle] = useState(provider.serviceTitle);
  const [serviceDescription, setServiceDescription] = useState(provider.serviceDescription);
  const [serviceImage, setServiceImage] = useState(provider.serviceImage || "");
  const [rate, setRate] = useState<number | ''>(provider.rate);

  const serviceCategories: ServiceCategory[] = [
    "Plomería",
    "Construcción",
    "Cerrajería",
    "Limpieza",
    "Mecánico",
    "Electricista",
    "Servicios digitales",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!category) {
      showError("Por favor, selecciona una categoría de servicio.");
      return;
    }
    if (serviceDescription.split(" ").length > 5) {
      showError("La descripción breve no debe exceder las 5 palabras.");
      return;
    }
    if (rate === '' || isNaN(Number(rate)) || Number(rate) < 0) {
      showError("Por favor, introduce una tarifa válida.");
      return;
    }

    const updatedProvider: Provider = {
      ...provider,
      name,
      email,
      state,
      category: category as ServiceCategory,
      serviceTitle,
      serviceDescription,
      serviceImage,
      rate: Number(rate),
    };

    updateUser(updatedProvider);
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="edit-name">Nombre</Label>
        <Input
          id="edit-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="edit-email">Correo Electrónico</Label>
        <Input
          id="edit-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled // Email usually not editable for simplicity in this demo
        />
      </div>
      <div>
        <Label htmlFor="edit-state">Estado</Label>
        <Select value={state} onValueChange={setState} required>
          <SelectTrigger id="edit-state">
            <SelectValue placeholder="Selecciona un estado" />
          </SelectTrigger>
          <SelectContent>
            {VENEZUELAN_STATES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="edit-category">Categoría del Servicio</Label>
        <Select value={category} onValueChange={(value) => setCategory(value as ServiceCategory)} required>
          <SelectTrigger id="edit-category">
            <SelectValue placeholder="Selecciona una categoría" />
          </SelectTrigger>
          <SelectContent>
            {serviceCategories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="edit-service-title">Título del Servicio</Label>
        <Input
          id="edit-service-title"
          type="text"
          value={serviceTitle}
          onChange={(e) => setServiceTitle(e.target.value)}
          placeholder="Ej: Plomero a domicilio"
          required
        />
      </div>
      <div>
        <Label htmlFor="edit-service-description">Descripción Breve (máx. 5 palabras)</Label>
        <Textarea
          id="edit-service-description"
          value={serviceDescription}
          onChange={(e) => setServiceDescription(e.target.value)}
          maxLength={50}
          required
        />
      </div>
      <div>
        <Label htmlFor="edit-service-image">URL de Imagen de Servicio (opcional)</Label>
        <Input
          id="edit-service-image"
          type="text"
          value={serviceImage}
          onChange={(e) => setServiceImage(e.target.value)}
          placeholder="Ej: https://ejemplo.com/imagen.jpg"
        />
      </div>
      <div>
        <Label htmlFor="edit-rate">Tarifa por Servicio (USD)</Label>
        <Input
          id="edit-rate"
          type="number"
          value={rate}
          onChange={(e) => setRate(parseFloat(e.target.value) || '')}
          placeholder="Ej: 50"
          required
          min="0"
          step="0.01"
        />
      </div>
      <div className="flex justify-end space-x-2 mt-6">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Guardar Cambios</Button>
      </div>
    </form>
  );
};

export default ProviderProfileEditor;