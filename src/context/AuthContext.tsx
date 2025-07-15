import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { Client, Provider, User, Feedback, FeedbackType, Admin } from "@/types";
import { showSuccess, showError } from "@/utils/toast";

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean; // Nuevo estado de carga
  login: (user: User) => void;
  logout: () => void;
  registerClient: (client: Client) => boolean;
  registerProvider: (provider: Provider) => boolean;
  findUserByEmail: (email: string) => User | undefined;
  findUserById: (id: string) => User | undefined; // Nueva función para buscar por ID
  updateUser: (user: User) => void;
  getAllProviders: () => Provider[];
  addFeedbackToProvider: (
    providerId: string,
    type: FeedbackType,
    comment: string
  ) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    const storedUsers = localStorage.getItem("appUsers");
    const initialUsers = storedUsers ? JSON.parse(storedUsers) : [];

    // Add default admin user if not already present
    const adminExists = initialUsers.some((user: User) => user.email === "admin@admin.com");
    if (!adminExists) {
      const adminUser: Admin = {
        id: "user-admin-1",
        name: "Admin",
        email: "admin@admin.com",
        password: "kilmanjaro",
        state: "Distrito Capital", // Default state for admin
        type: "admin",
        createdAt: Date.now(),
      };
      initialUsers.push(adminUser);
    }
    return initialUsers;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Inicialmente cargando

  useEffect(() => {
    // Cargar currentUser desde localStorage al montar el componente
    const storedCurrentUser = localStorage.getItem("currentUser");
    if (storedCurrentUser) {
      setCurrentUser(JSON.parse(storedCurrentUser));
    }
    setIsLoading(false); // Una vez cargado (o no encontrado), se termina la carga
  }, []); // Se ejecuta solo una vez al montar

  useEffect(() => {
    localStorage.setItem("appUsers", JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (!isLoading) { // Solo guardar en localStorage si ya se terminó la carga inicial
      if (currentUser) {
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
      } else {
        localStorage.removeItem("currentUser");
      }
    }
  }, [currentUser, isLoading]);

  const findUserByEmail = (email: string) => {
    return users.find((user) => user.email === email);
  };

  const findUserById = (id: string) => {
    return users.find((user) => user.id === id);
  };

  const login = (user: User) => {
    setCurrentUser(user);
    showSuccess(`Bienvenido, ${user.name}!`);
  };

  const logout = () => {
    setCurrentUser(null);
    showSuccess("Sesión cerrada correctamente.");
  };

  const registerClient = (client: Client) => {
    if (findUserByEmail(client.email)) {
      showError("Este correo electrónico ya está registrado.");
      return false;
    }
    const newUser = { ...client, id: `user-${users.length + 1}`, createdAt: Date.now() }; // Add createdAt
    setUsers((prevUsers) => [...prevUsers, newUser]);
    setCurrentUser(newUser); // Log in the new client immediately
    showSuccess("Registro de cliente exitoso. ¡Ahora estás logeado!");
    return true;
  };

  const registerProvider = (provider: Provider) => {
    if (findUserByEmail(provider.email)) {
      showError("Este correo electrónico ya está registrado.");
      return false;
    }
    const newUser = { ...provider, id: `user-${users.length + 1}`, feedback: [], starRating: 0, createdAt: Date.now() }; // Add createdAt
    setUsers((prevUsers) => [...prevUsers, newUser]);
    setCurrentUser(newUser); // Log in the new provider immediately
    showSuccess("Registro de proveedor exitoso. ¡Ahora estás logeado!");
    return true;
  };

  const updateUser = (updatedUser: User) => {
    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.id === updatedUser.id ? updatedUser : user
      )
    );
    if (currentUser && currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
    showSuccess("Información actualizada correctamente.");
  };

  const getAllProviders = (): Provider[] => {
    return users.filter((user) => user.type === "provider") as Provider[];
  };

  const addFeedbackToProvider = (
    providerId: string,
    type: FeedbackType,
    comment: string
  ) => {
    setUsers((prevUsers) =>
      prevUsers.map((user) => {
        if (user.id === providerId && user.type === "provider") {
          const provider = user as Provider;
          // Asegurarse de que provider.feedback sea un array antes de usarlo
          const currentFeedback = provider.feedback || []; 
          const newFeedback: Feedback = {
            id: `feedback-${currentFeedback.length + 1}-${Date.now()}`,
            clientId: currentUser!.id, // Asumimos que currentUser existe y es el cliente
            providerId: provider.id,
            type,
            comment,
            timestamp: Date.now(),
          };

          const updatedFeedback = [...currentFeedback, newFeedback];
          const positiveCount = updatedFeedback.filter(
            (f) => f.type === FeedbackType.Positive
          ).length;
          // La calificación por estrellas se basa en la cantidad de feedback positivo
          // Por ejemplo, 1 estrella por cada 5 feedbacks positivos, hasta un máximo de 5 estrellas.
          const newStarRating = Math.min(5, Math.floor(positiveCount / 5));

          return {
            ...provider,
            feedback: updatedFeedback,
            starRating: newStarRating,
          };
        }
        return user;
      })
    );
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading, // Proporcionar el estado de carga
        login,
        logout,
        registerClient,
        registerProvider,
        findUserByEmail,
        findUserById, // Añadir la nueva función al contexto
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