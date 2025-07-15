import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { VENEZUELAN_STATES } from "@/constants/venezuelanStates";
import { ServiceCategory } from "@/types";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import { MadeWithDyad } from "@/components/made-with-dyad";
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
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const Auth: React.FC = () => {
  const [activeTab, setActiveTab] = useState("login");

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-grow flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800 dark:text-gray-100">
            Bienvenido a TE LO HAGO
          </h2>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="client-register">Cliente</TabsTrigger>
              <TabsTrigger value="provider-register">Proveedor</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <LoginForm />
            </TabsContent>
            <TabsContent value="client-register">
              <ClientRegistrationForm />
            </TabsContent>
            <TabsContent value="provider-register">
              <ProviderRegistrationForm />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <MadeWithDyad />
    </div>
  );
};

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, findUserByEmail } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = findUserByEmail(email);
    if (user && user.password === password) {
      login(user);
      if (user.type === "client") {
        navigate("/client-dashboard");
      } else {
        navigate("/provider-dashboard");
      }
    } else {
      showError("Credenciales incorrectas.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div>
        <Label htmlFor="login-email">Correo Electrónico</Label>
        <Input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="login-password">Contraseña</Label>
        <Input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full">
        Iniciar Sesión
      </Button>
    </form>
  );
};

const ClientRegistrationForm: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState("");
  const [password, setPassword] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const { registerClient } = useAuth();
  const navigate = useNavigate();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = registerClient({ id: "", name, email, state, password, type: "client", profileImage });
    if (success) {
      navigate("/client-dashboard");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div>
        <Label htmlFor="client-name">Nombre</Label>
        <Input
          id="client-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="client-email">Correo Electrónico</Label>
        <Input
          id="client-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="client-state">Estado</Label>
        <Select value={state} onValueChange={setState} required>
          <SelectTrigger id="client-state">
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
        <Label htmlFor="client-profile-image">Subir Imagen de Perfil (opcional, máx. 1MB)</Label>
        <Input
          id="client-profile-image"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="mt-1"
        />
        {profileImage && (
          <div className="mt-4 flex flex-col items-center">
            <Label className="mb-2">Previsualización de Imagen:</Label>
            <img src={profileImage} alt="Previsualización de Perfil" className="w-24 h-24 object-cover rounded-full border-2 border-gray-300 dark:border-gray-600" />
          </div>
        )}
      </div>
      <div>
        <Label htmlFor="client-password">Contraseña</Label>
        <Input
          id="client-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full">
        Registrar Cliente
      </Button>
    </form>
  );
};

const ProviderRegistrationForm: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState("");
  const [category, setCategory] = useState<ServiceCategory | "">("");
  const [serviceTitle, setServiceTitle] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [serviceImage, setServiceImage] = useState(""); // Changed to string for base64
  const [password, setPassword] = useState("");
  const [rate, setRate] = useState<number | ''>('');
  const [profileImage, setProfileImage] = useState("");
  const [openCategoryCombobox, setOpenCategoryCombobox] = useState(false); // State for combobox open/close

  const { registerProvider } = useAuth();
  const navigate = useNavigate();

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

    const success = registerProvider({
      id: "",
      name,
      email,
      state,
      password,
      type: "provider",
      category: category as ServiceCategory,
      serviceTitle,
      serviceDescription,
      serviceImage,
      rate: Number(rate),
      profileImage,
    });
    if (success) {
      navigate("/provider-dashboard");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div>
        <Label htmlFor="provider-name">Nombre</Label>
        <Input
          id="provider-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="provider-email">Correo Electrónico</Label>
        <Input
          id="provider-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="provider-state">Estado</Label>
        <Select value={state} onValueChange={setState} required>
          <SelectTrigger id="provider-state">
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
        <Label htmlFor="provider-category">Categoría del Servicio</Label>
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
        <Label htmlFor="provider-service-title">Título del Servicio</Label>
        <Input
          id="provider-service-title"
          type="text"
          value={serviceTitle}
          onChange={(e) => setServiceTitle(e.target.value)}
          placeholder="Ej: Plomero a domicilio"
          required
        />
      </div>
      <div>
        <Label htmlFor="provider-service-description">Descripción Breve (máx. 5 palabras)</Label>
        <Textarea
          id="provider-service-description"
          value={serviceDescription}
          onChange={(e) => setServiceDescription(e.target.value)}
          maxLength={50}
          required
        />
      </div>
      <div>
        <Label htmlFor="provider-service-image-upload">Subir Imagen de Servicio (opcional, máx. 1MB)</Label>
        <Input
          id="provider-service-image-upload"
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
        <Label htmlFor="provider-rate">Tarifa por Servicio (USD)</Label>
        <Input
          id="provider-rate"
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
        <Label htmlFor="provider-profile-image">Subir Imagen de Perfil (opcional, máx. 1MB)</Label>
        <Input
          id="provider-profile-image"
          type="file"
          accept="image/*"
          onChange={handleProfileImageChange}
          className="mt-1"
        />
        {profileImage && (
          <div className="mt-4 flex flex-col items-center">
            <Label className="mb-2">Previsualización de Imagen:</Label>
            <img src={profileImage} alt="Previsualización de Perfil" className="w-24 h-24 object-cover rounded-full border-2 border-gray-300 dark:border-gray-600" />
          </div>
        )}
      </div>
      <div>
        <Label htmlFor="provider-password">Contraseña</Label>
        <Input
          id="provider-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full">
        Registrar Proveedor
      </Button>
    </form>
  );
};

export default Auth;