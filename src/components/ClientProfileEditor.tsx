import React, { useState, useEffect } from "react";
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
import { Client, ImageSource } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { showError, showSuccess } from "@/utils/toast";
import { fileToBase64 } from "@/lib/utils"; // Import the utility

interface ClientProfileEditorProps {
  onSave: () => void;
  onCancel: () => void;
}

const ClientProfileEditor: React.FC<ClientProfileEditorProps> = ({
  onSave,
  onCancel,
}) => {
  const { currentUser, updateUser, findUserByEmail } = useAuth();
  const client = currentUser as Client;

  const [name, setName] = useState(client.name);
  const [email, setEmail] = useState(client.email);
  const [state, setState] = useState(client.state);
  const [phone, setPhone] = useState(client.phone || "");
  const [profileImage, setProfileImage] = useState<ImageSource>(client.profileImage); // State for profile image

  // Update local state if currentUser changes (e.g., after a successful update)
  useEffect(() => {
    if (currentUser && currentUser.type === "client") {
      setName(currentUser.name);
      setEmail(currentUser.email);
      setState(currentUser.state);
      setPhone(currentUser.phone || "");
      setProfileImage(currentUser.profileImage);
    }
  }, [currentUser]);

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const base64 = await fileToBase64(file, 200, 200); // Resize for profile image
      if (base64) {
        setProfileImage(base64);
      } else {
        showError("Error al cargar la imagen de perfil.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Supabase Auth handles email uniqueness for auth.users table.
    // We still check public.users to ensure profile data consistency.
    const existingUser = await findUserByEmail(email);
    if (existingUser && existingUser.id !== client.id) {
      showError("Este correo electrónico ya está en uso por otra cuenta.");
      return;
    }

    const updatedClient: Client = {
      ...client,
      name,
      email, // Email update should ideally go through Supabase Auth
      state,
      phone,
      profileImage, // Use the state value
    };

    await updateUser(updatedClient);
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
          disabled // Email changes should be handled via Supabase Auth settings
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
      <div>
        <Label htmlFor="edit-client-phone">Número de Teléfono</Label>
        <Input
          id="edit-client-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Ej: 0412-1234567"
          required
        />
      </div>
      <div>
        <Label htmlFor="edit-profile-image">Foto de Perfil</Label>
        <Input
          id="edit-profile-image"
          type="file"
          accept="image/*"
          onChange={handleProfileImageChange}
          className="mt-1"
        />
        {profileImage && (
          <div className="mt-2">
            <img src={profileImage} alt="Vista previa del perfil" className="w-24 h-24 rounded-full object-cover" />
          </div>
        )}
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