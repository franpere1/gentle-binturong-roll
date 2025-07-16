import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useEffect,
} from "react";
import { Client, Provider, User, Feedback, FeedbackType, Admin, ImageSource } from "@/types";
import { showSuccess, showError } from "@/utils/toast";

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  registerClient: (clientData: Omit<Client, "id" | "createdAt" | "type" | "profileImage"> & { password?: string }) => Promise<boolean>;
  registerProvider: (providerData: Omit<Provider, "id" | "createdAt" | "type" | "feedback" | "starRating" | "profileImage" | "serviceImage"> & { password?: string }) => Promise<boolean>;
  findUserByEmail: (email: string) => Promise<User | undefined>;
  findUserById: (id: string) => Promise<User | undefined>;
  updateUser: (user: User) => Promise<void>;
  getAllProviders: () => Promise<Provider[]>;
  addFeedbackToProvider: (
    providerId: string,
    type: FeedbackType,
    comment: string
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const LOCAL_STORAGE_USERS_KEY = "te_lo_hago_users";
const LOCAL_STORAGE_CURRENT_USER_ID_KEY = "te_lo_hago_current_user_id";

// Default users for initial setup
const defaultAdmin: Admin = {
  id: "admin-123",
  name: "Admin",
  email: "admin@admin.com",
  state: "Distrito Capital",
  type: "admin",
  createdAt: Date.now() - 100000,
  profileImage: null,
};

const defaultClient: Client = {
  id: "client-456",
  name: "Cliente Demo",
  email: "client@example.com",
  state: "Miranda",
  type: "client",
  createdAt: Date.now() - 90000,
  profileImage: null,
  phone: "0412-1234567",
};

const defaultProvider: Provider = {
  id: "provider-789",
  name: "Proveedor Demo",
  email: "provider@example.com",
  state: "Carabobo",
  type: "provider",
  createdAt: Date.now() - 80000,
  profileImage: null,
  phone: "0414-7654321",
  category: "Plomero",
  serviceTitle: "Servicio de Plomería Rápida",
  serviceDescription: "Reparaciones de tuberías y fugas.",
  serviceImage: null,
  rate: 45.00,
  feedback: [],
  starRating: 4,
};

// Helper to load users from localStorage
const loadUsersFromLocalStorage = (): (Client | Provider | Admin)[] => {
  try {
    const storedUsers = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
    if (storedUsers) {
      return JSON.parse(storedUsers);
    }
  } catch (error) {
    console.error("Error loading users from localStorage:", error);
  }
  return [];
};

// Helper to save users to localStorage
const saveUsersToLocalStorage = (users: (Client | Provider | Admin)[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));
  } catch (error) {
    console.error("Error saving users to localStorage:", error);
  }
};

// Initialize in-memory users (this will be the mutable array)
let inMemoryUsers: (Client | Provider | Admin)[] = loadUsersFromLocalStorage();

// If no users are loaded, populate with defaults and save
if (inMemoryUsers.length === 0) {
  inMemoryUsers.push(defaultAdmin, defaultClient, defaultProvider);
  saveUsersToLocalStorage(inMemoryUsers);
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load current user from localStorage on initial mount
  useEffect(() => {
    const storedUserId = localStorage.getItem(LOCAL_STORAGE_CURRENT_USER_ID_KEY);
    if (storedUserId) {
      const user = inMemoryUsers.find(u => u.id === storedUserId);
      if (user) {
        setCurrentUser(user);
        showSuccess(`Bienvenido de nuevo, ${user.name}! (Modo Demo)`);
      }
    }
    setIsLoading(false);
  }, []);

  const findUserByEmail = useCallback(async (email: string): Promise<User | undefined> => {
    return inMemoryUsers.find(user => user.email === email);
  }, []);

  const findUserById = useCallback(async (id: string): Promise<User | undefined> => {
    return inMemoryUsers.find(user => user.id === id);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    const user = inMemoryUsers.find(u => u.email === email);

    if (user) {
      // Simplified password check for demo purposes
      if ((email === "admin@admin.com" && password === "kilmanjaro") ||
          (email === "client@example.com" && password === "password") ||
          (email === "provider@example.com" && password === "password")) {
        setCurrentUser(user);
        localStorage.setItem(LOCAL_STORAGE_CURRENT_USER_ID_KEY, user.id); // Save current user ID
        showSuccess(`Bienvenido, ${user.name}! (Modo Demo)`);
        setIsLoading(false);
        return true;
      } else {
        showError("Credenciales incorrectas.");
      }
    } else {
      showError("Usuario no encontrado.");
    }
    setIsLoading(false);
    return false;
  };

  const logout = async () => {
    setIsLoading(true);
    setCurrentUser(null);
    localStorage.removeItem(LOCAL_STORAGE_CURRENT_USER_ID_KEY); // Clear current user ID
    showSuccess("Sesión cerrada correctamente.");
    setIsLoading(false);
  };

  const registerClient = async (clientData: Omit<Client, "id" | "createdAt" | "type" | "profileImage"> & { password?: string }): Promise<boolean> => {
    setIsLoading(true);
    if (inMemoryUsers.some(u => u.email === clientData.email)) {
      showError("Este correo electrónico ya está registrado.");
      setIsLoading(false);
      return false;
    }

    const newClient: Client = {
      id: `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: clientData.name,
      email: clientData.email,
      state: clientData.state,
      phone: clientData.phone,
      type: "client",
      createdAt: Date.now(),
      profileImage: null,
    };
    inMemoryUsers.push(newClient);
    saveUsersToLocalStorage(inMemoryUsers); // Save updated users
    setCurrentUser(newClient);
    localStorage.setItem(LOCAL_STORAGE_CURRENT_USER_ID_KEY, newClient.id); // Save current user ID
    showSuccess("Registro de cliente exitoso. ¡Ahora estás logeado! (Modo Demo)");
    setIsLoading(false);
    return true;
  };

  const registerProvider = async (providerData: Omit<Provider, "id" | "createdAt" | "type" | "feedback" | "starRating" | "profileImage" | "serviceImage"> & { password?: string }): Promise<boolean> => {
    setIsLoading(true);
    if (inMemoryUsers.some(u => u.email === providerData.email)) {
      showError("Este correo electrónico ya está registrado.");
      setIsLoading(false);
      return false;
    }

    const newProvider: Provider = {
      id: `provider-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: providerData.name,
      email: providerData.email,
      state: providerData.state,
      phone: providerData.phone,
      type: "provider",
      category: providerData.category,
      serviceTitle: providerData.serviceTitle,
      serviceDescription: providerData.serviceDescription,
      serviceImage: null,
      rate: providerData.rate,
      feedback: [],
      starRating: 0,
      createdAt: Date.now(),
      profileImage: null,
    };
    inMemoryUsers.push(newProvider);
    saveUsersToLocalStorage(inMemoryUsers); // Save updated users
    setCurrentUser(newProvider);
    localStorage.setItem(LOCAL_STORAGE_CURRENT_USER_ID_KEY, newProvider.id); // Save current user ID
    showSuccess("Registro de proveedor exitoso. ¡Ahora estás logeado! (Modo Demo)");
    setIsLoading(false);
    return true;
  };

  const updateUser = async (updatedUser: User) => {
    setIsLoading(true);
    const index = inMemoryUsers.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
      inMemoryUsers[index] = updatedUser as Client | Provider | Admin;
      saveUsersToLocalStorage(inMemoryUsers); // Save updated users
      setCurrentUser(updatedUser); // Update current user state
      showSuccess("Información actualizada correctamente. (Modo Demo)");
    } else {
      showError("Error al actualizar la información. Usuario no encontrado. (Modo Demo)");
    }
    setIsLoading(false);
  };

  const getAllProviders = async (): Promise<Provider[]> => {
    return inMemoryUsers.filter((user): user is Provider => user.type === "provider");
  };

  const addFeedbackToProvider = async (
    providerId: string,
    type: FeedbackType,
    comment: string
  ) => {
    const providerIndex = inMemoryUsers.findIndex(u => u.id === providerId && u.type === "provider");
    if (providerIndex === -1) {
      showError("Proveedor no encontrado para añadir feedback.");
      return;
    }

    const provider = inMemoryUsers[providerIndex] as Provider;
    const currentFeedback = provider.feedback || [];
    const newFeedback: Feedback = {
      id: `feedback-${currentFeedback.length + 1}-${Date.now()}`,
      clientId: currentUser!.id,
      providerId: provider.id,
      type,
      comment,
      timestamp: Date.now(),
    };

    const updatedFeedback = [...currentFeedback, newFeedback];
    const positiveCount = updatedFeedback.filter(
      (f) => f.type === FeedbackType.Positive
    ).length;
    const newStarRating = Math.min(5, Math.floor(positiveCount / 5));

    const updatedProvider: Provider = {
      ...provider,
      feedback: updatedFeedback,
      starRating: newStarRating,
    };

    inMemoryUsers[providerIndex] = updatedProvider; // Update in-memory array
    saveUsersToLocalStorage(inMemoryUsers); // Save updated users
    // If the updated provider is the current user, update currentUser state
    if (currentUser?.id === providerId) {
      setCurrentUser(updatedProvider);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        login,
        logout,
        registerClient,
        registerProvider,
        findUserByEmail,
        findUserById,
        updateUser,
        getAllProviders,
        addFeedbackToProvider,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};