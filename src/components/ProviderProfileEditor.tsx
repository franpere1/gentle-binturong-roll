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
import { showError, showSuccess } from "@/utils/toast";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, XCircle } from "lucide-react"; // Import XCircle for clearing image
import { cn } from "@/lib/utils";

interface ProviderProfileEditorProps {
  onSave: () => void;
  onCancel: () => void;
}

const ProviderProfileEditor: React.FC<ProviderProfileEditorProps> = ({
  onSave,
  onCancel,
}) => {
  const { currentUser, updateUser } = useAuth();
  const provider = currentUser as Provider;

  const [name, setName] = useState(provider.name);
  const [email, setEmail] = useState(provider.email);
  const [state, setState] = useState(provider.state);
  const [phone, setPhone] = useState(provider.phone || "");
  const [category, setCategory] = useState<ServiceCategory | "">(provider.category);
  const [serviceTitle, setServiceTitle] = useState(provider.serviceTitle);
  const [serviceDescription, setServiceDescription] = useState(provider.serviceDescription);
  const [serviceImageFile, setServiceImageFile] = useState<File | null>(null);
  const [serviceImagePreview, setServiceImagePreview] = useState<string | null>(provider.serviceImage || null);
  const [rate, setRate] = useState<number | ''>(provider.rate);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(provider.profileImage || null);
  const [openCategoryCombobox, setOpenCategoryCombobox] = useState(false);

  // Update local state if currentUser changes (e.g., after a successful update)
  useEffect(() => {
    if (currentUser && currentUser.type === "provider") {
      setName(currentUser.name);
      setEmail(currentUser.email);
      setState(currentUser.state);
      setPhone(currentUser.phone || "");
      setCategory(currentUser.category);
      setServiceTitle(currentUser.serviceTitle);
      setServiceDescription(currentUser.serviceDescription);
      setServiceImagePreview(currentUser.serviceImage || null);
      setServiceImageFile(null);
      setRate(currentUser.rate);
      setProfileImagePreview(currentUser.profileImage || null);
      setProfileImageFile(null);
    }
  }, [currentUser]);

  const serviceCategories: ServiceCategory[] = [
    "Abogado", "Adiestrador canino", "Albañil", "Arquitecto", "Barbero", "Carpintero", "Cerrajero",
    "Chef a domicilio", "Chofer privado", "Clases de idiomas", "Clases de música", "Clases particulares",
    "Contador", "Cuidador de adultos mayores", "Electricista", "Enfermero(a)", "Fumigador", "Herrero",
    "Ingeniero", "Jardinero", "Lavado de autos", "Limpieza de casas", "Limpieza de oficinas",
    "Maquillador", "Manicurista", "Masajista", "Mecánico", "Mesonero", "Motorizado / Delivery",
    "Mudanzas", "Niñera", "Organización de eventos", "Paseador de perros", "Peluquero", "Pintor",
    "Plomero", "Repostero", "Servicios de sistemas", "Servicios digitales", "Servicios electrónica",
    "Técnico de aire acondicionado",
  ].sort();

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        showError("La imagen es demasiado grande. El tamaño máximo es 1MB.");
        setProfileImageFile(null);
        setProfileImagePreview(provider.profileImage || null);
        return;
      }
      setProfileImageFile(file);
      setProfileImagePreview(URL.createObjectURL(file));
      showSuccess("Imagen de perfil seleccionada correctamente.");
    } else {
      setProfileImageFile(null);
      setProfileImagePreview(provider.profileImage || null);
    }
  };

  const handleClearProfileImage = () => {
    setProfileImageFile(null);
    setProfileImagePreview(null);
    const input = document.getElementById("profile-image-upload") as HTMLInputElement;
    if (input) input.value = "";
  };

  const handleServiceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        showError("La imagen del servicio es demasiado grande. El tamaño máximo es 1MB.");
        setServiceImageFile(null);
        setServiceImagePreview(provider.serviceImage || null);
        return;
      }
      setServiceImageFile(file);
      setServiceImagePreview(URL.createObjectURL(file));
      showSuccess("Imagen de servicio seleccionada correctamente.");
    } else {
      setServiceImageFile(null);
      setServiceImagePreview(provider.serviceImage || null);
    }
  };

  const handleClearServiceImage = () => {
    setServiceImageFile(null);
    setServiceImagePreview(null);
    const input = document.getElementById("service-image-upload") as HTMLInputElement;
    if (input) input.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!category) {
      showError("Por favor, selecciona una categoría de servicio.");
      return;
    }
    if (serviceDescription.length > 50) {
      showError("La descripción breve no debe exceder los 50 caracteres.");
      return;
    }
    if (rate === '' || isNaN(Number(rate)) || Number(rate) < 0) {
      showError("Por favor, introduce una tarifa válida.");
      return;
    }

    const updatedProvider: Provider = {
      ...provider,
      name,
      email, // Email update should ideally go through Supabase Auth
      state,
      phone,
      category: category as ServiceCategory,
      serviceTitle,
      serviceDescription,
      serviceImage: serviceImageFile || serviceImagePreview, // Pass the File, or existing URL, or null
      rate: Number(rate),
      profileImage: profileImageFile || profileImagePreview, // Pass the File, or existing URL, or null
    };

    await updateUser(updatedProvider);
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
          disabled // Email changes should be handled via Supabase Auth settings
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
            <Label htmlFor="edit-phone">Número de Teléfono</Label>
            <Input
              id="edit-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej: 0412-1234567"
              required
            />
          </div>
          <div>
            <Label htmlFor="edit-category">Categoría del Servicio</Label>
            <Popover open={openCategoryCombobox} onOpenChange={setOpenCategoryCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCategoryCombobox}
                  className="w-full justify-between"
                >
                  {category
                    ? serviceCategories.find((c) => c === category)
                    : "Selecciona una categoría..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Buscar categoría..." />
                  <CommandList>
                    <CommandEmpty>No se encontró categoría.</CommandEmpty>
                    <CommandGroup>
                      {serviceCategories.map((cat) => (
                        <CommandItem
                          key={cat}
                          value={cat}
                          onSelect={(currentValue) => {
                            setCategory(currentValue === category ? "" : (currentValue as ServiceCategory));
                            setOpenCategoryCombobox(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              category === cat ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {cat}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
            <Label htmlFor="edit-service-description">Descripción Breve (máx. 50 caracteres)</Label>
            <Textarea
              id="edit-service-description"
              value={serviceDescription}
              onChange={(e) => setServiceDescription(e.target.value)}
              maxLength={50}
              required
            />
          </div>
          <div>
            <Label htmlFor="service-image-upload">Subir Imagen de Servicio (opcional, máx. 1MB)</Label>
            <Input
              id="service-image-upload"
              type="file"
              accept="image/*"
              onChange={handleServiceImageChange}
              className="mt-1"
            />
            {serviceImagePreview && (
              <div className="mt-4 flex flex-col items-center relative">
                <Label className="mb-2">Previsualización de Imagen:</Label>
                <img src={serviceImagePreview} alt="Previsualización de Servicio" className="w-32 h-32 object-cover rounded-md border-2 border-gray-300 dark:border-gray-600" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleClearServiceImage}
                  className="absolute top-0 right-0 -mt-2 -mr-2 rounded-full bg-white dark:bg-gray-700 text-red-500 hover:text-red-700"
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            )}
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
          <div>
            <Label htmlFor="profile-image-upload">Subir Imagen de Perfil (máx. 1MB)</Label>
            <Input
              id="profile-image-upload"
              type="file"
              accept="image/*"
              onChange={handleProfileImageChange}
              className="mt-1"
            />
            {profileImagePreview && (
              <div className="mt-4 flex flex-col items-center relative">
                <Label className="mb-2">Previsualización de Imagen:</Label>
                <img src={profileImagePreview} alt="Previsualización de Perfil" className="w-32 h-32 object-cover rounded-full border-2 border-gray-300 dark:border-gray-600" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleClearProfileImage}
                  className="absolute top-0 right-0 -mt-2 -mr-2 rounded-full bg-white dark:bg-gray-700 text-red-500 hover:text-red-700"
                >
                  <XCircle className="h-5 w-5" />
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

    export default ProviderProfileEditor;