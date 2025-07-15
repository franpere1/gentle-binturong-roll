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
    import { Client } from "@/types";
    import { useAuth } from "@/context/AuthContext";
    import { showError, showSuccess } from "@/utils/toast";

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
      const [profileImage, setProfileImage] = useState(client.profileImage || "");

      // Update local state if currentUser changes (e.g., after a successful update)
      useEffect(() => {
        if (currentUser && currentUser.type === "client") {
          setName(currentUser.name);
          setEmail(currentUser.email);
          setState(currentUser.state);
          setPhone(currentUser.phone || "");
          setProfileImage(currentUser.profileImage || "");
        }
      }, [currentUser]);

      const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
          if (file.size > 1024 * 1024) {
            showError("La imagen es demasiado grande. El tamaño máximo es 1MB.");
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
            setProfileImage(reader.result as string);
            showSuccess("Imagen seleccionada correctamente.");
          };
          reader.readAsDataURL(file);
        }
      };

      const handleDownloadImage = () => {
        if (profileImage) {
          const link = document.createElement('a');
          link.href = profileImage;
          link.download = `${name}_profile_image.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          showSuccess("Imagen descargada.");
        } else {
          showError("No hay imagen de perfil para descargar.");
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
          profileImage,
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
            <Label htmlFor="profile-image-upload">Subir Imagen de Perfil (máx. 1MB)</Label>
            <Input
              id="profile-image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="mt-1"
            />
            {profileImage && (
              <div className="mt-4 flex flex-col items-center">
                <Label className="mb-2">Previsualización de Imagen:</Label>
                <img src={profileImage} alt="Previsualización de Perfil" className="w-32 h-32 object-cover rounded-full border-2 border-gray-300 dark:border-gray-600" />
                <Button type="button" variant="outline" onClick={handleDownloadImage} className="mt-4">
                  Descargar Imagen Actual
                </Button>
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