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
import { showError, showSuccess } from "@/utils/toast"; // Import showSuccess
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
import { Check, ChevronsUpDown } from "lucide-react";
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
  const provider = currentUser as Provider; // Sabemos que es un proveedor aquí

  const [name, setName] = useState(provider.name);
  const [email, setEmail] = useState(provider.email);
  const [state, setState] = useState(provider.state);
  const [phone, setPhone] = useState(provider.phone || ""); // Nuevo estado para el teléfono
  const [category, setCategory] = useState<ServiceCategory | "">(provider.category);
  const [serviceTitle, setServiceTitle] = useState(provider.serviceTitle);
  const [serviceDescription, setServiceDescription] = useState(provider.serviceDescription);
  const [serviceImage, setServiceImage] = useState(provider.serviceImage || ""); // Changed to string for base64
  const [rate, setRate] = useState<number | ''>(provider.rate);
  const [profileImage, setProfileImage] = useState(provider.profileImage || "");
  const [openCategoryCombobox, setOpenCategoryCombobox] = useState(false); // State for combobox open/close

  const serviceCategories: ServiceCategory[] = [
    "Abogado",
    "Adiestrador canino",
    "Albañil",
    "Arquitecto",
    "Barbero",
    "Carpintero",
    "Cerrajero",
    "Chef a domicilio",
    "Chofer privado",
    "Clases de idiomas",
    "Clases de música",
    "Clases particulares",
    "Contador",
    "Cuidador de adultos mayores",
    "Electricista",
    "Enfermero(a)",
    "Fumigador",
    "Herrero",
    "Ingeniero",
    "Jardinero",
    "Lavado de autos",
    "Limpieza de casas",
    "Limpieza de oficinas",
    "Maquillador",
    "Manicurista",
    "Masajista",
    "Mecánico",
    "Mesonero",
    "Motorizado / Delivery",
    "Mudanzas",
    "Niñera",
    "Organización de eventos",
    "Paseador de perros",
    "Peluquero",
    "Pintor",
    "Plomero",
    "Repostero",
    "Servicios de sistemas",
    "Servicios digitales",
    "Servicios electrónica",
    "Técnico de aire acondicionado",
  ].sort(); // Ensure alphabetical order

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit
        showError("La imagen es demasiado grande. El tamaño máximo es 1MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
        showSuccess("Imagen de perfil seleccionada correctamente.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadProfileImage = () => {
    if (profileImage) {
      const link = document.createElement('a');
      link.href = profileImage;
      link.download = `${name}_profile_image.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSuccess("Imagen de perfil descargada.");
    } else {
      showError("No hay imagen de perfil para descargar.");
    }
  };

  const handleServiceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit
        showError("La imagen del servicio es demasiado grande. El tamaño máximo es 1MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setServiceImage(reader.result as string);
        showSuccess("Imagen de servicio seleccionada correctamente.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadServiceImage = () => {
    if (serviceImage) {
      const link = document.createElement('a');
      link.href = serviceImage;
      link.download = `${serviceTitle || 'service'}_image.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSuccess("Imagen de servicio descargada.");
    } else {
      showError("No hay imagen de servicio para descargar.");
    }
  };

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
      phone, // Incluir el teléfono en la actualización
      category: category as ServiceCategory,
      serviceTitle,
      serviceDescription,
      serviceImage,
      rate: Number(rate),
      profileImage,
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
        <Label htmlFor="service-image-upload">Subir Imagen de Servicio (opcional, máx. 1MB)</Label>
        <Input
          id="service-image-upload"
          type="file"
          accept="image/*"
          onChange={handleServiceImageChange}
          className="mt-1"
        />
        {serviceImage && (
          <div className="mt-4 flex flex-col items-center">
            <Label className="mb-2">Previsualización de Imagen:</Label>
            <img src={serviceImage} alt="Previsualización de Servicio" className="w-32 h-32 object-cover rounded-md border-2 border-gray-300 dark:border-gray-600" />
            <Button type="button" variant="outline" onClick={handleDownloadServiceImage} className="mt-4">
              Descargar Imagen Actual
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
        {profileImage && (
          <div className="mt-4 flex flex-col items-center">
            <Label className="mb-2">Previsualización de Imagen:</Label>
            <img src={profileImage} alt="Previsualización de Perfil" className="w-32 h-32 object-cover rounded-full border-2 border-gray-300 dark:border-gray-600" />
            <Button type="button" variant="outline" onClick={handleDownloadProfileImage} className="mt-4">
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

export default ProviderProfileEditor;