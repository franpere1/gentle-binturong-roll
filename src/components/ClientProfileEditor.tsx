import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VENEZUELAN_STATES } from "@/constants/venezuelanStates";
import { Client } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { showError } from "@/utils/toast";

interface ClientProfileEditorProps {
  onSave: () => void;
  onCancel: () => void;
}

const ClientProfileEditor: React.FC<ClientProfileEditorProps> = ({
  onSave,
  onCancel,
}) => {
  const { currentUser, updateUser, findUserByEmail } = useAuth();
  const client = currentUser as Client; // Sabemos que es un cliente aquí

  const [name, setName] = useState(client.name);
  const [email, setEmail] = useState(client.email);
  const [state, setState] = useState(client.state);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation for email uniqueness (excluding current user's email)
    const existingUser = findUserByEmail(email);
    if (existingUser && existingUser.id !== client.id) {
      showError("Este correo electrónico ya está en uso por otra cuenta.");
      return;
    }

    const updatedClient: Client = {
      ...client,
      name,
      email,
      state,
    };

    updateUser(updatedClient);
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="edit-client-name">Nombre</Label>
        <Input
          id="edit-client-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="edit-client-email">Correo Electrónico</Label>
        <Input
          id="edit-client-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled // Email usually not editable for simplicity in this demo
        />
      </div>
      <div>
        <Label htmlFor="edit-client-state">Estado</Label>
        <Select value={state} onValueChange={setState} required>
          <SelectTrigger id="edit-client-state">
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
      <div className="flex justify-end space-x-2 mt-6">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Guardar Cambios</Button>
      </div>
    </form>
  );
};

export default ClientProfileEditor;