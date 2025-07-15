import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { Client, Provider, User, Feedback, FeedbackType } from "@/types";
import { showSuccess, showError } from "@/utils/toast";

interface AuthContextType {
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;
  registerClient: (client: Client) => boolean;
  registerProvider: (provider: Provider) => boolean;
  findUserByEmail: (email: string) => User | undefined;
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
    return storedUsers ? JSON.parse(storedUsers) : [];
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const storedCurrentUser = localStorage.getItem("currentUser");
    return storedCurrentUser ? JSON.parse(storedCurrentUser) : null;
  });

  useEffect(() => {
    localStorage.setItem("appUsers", JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("currentUser");
    }
  }, [currentUser]);

  const findUserByEmail = (email: string) => {
    return users.find((user) => user.email === email);
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
    const newUser = { ...client, id: `user-${users.length + 1}` };
    setUsers((prevUsers) => [...prevUsers, newUser]);
    showSuccess("Registro de cliente exitoso. ¡Ahora puedes iniciar sesión!");
    return true;
  };

  const registerProvider = (provider: Provider) => {
    if (findUserByEmail(provider.email)) {
      showError("Este correo electrónico ya está registrado.");
      return false;
    }
    const newUser = { ...provider, id: `user-${users.length + 1}`, feedback: [], starRating: 0 };
    setUsers((prevUsers) => [...prevUsers, newUser]);
    showSuccess("Registro de proveedor exitoso. ¡Ahora puedes iniciar sesión!");
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
        login,
        logout,
        registerClient,
        registerProvider,
        findUserByEmail,
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