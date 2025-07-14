import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { Client, Provider, User } from "@/types";
import { showSuccess, showError } from "@/utils/toast";

interface AuthContextType {
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;
  registerClient: (client: Client) => boolean;
  registerProvider: (provider: Provider) => boolean;
  findUserByEmail: (email: string) => User | undefined;
  updateUser: (user: User) => void;
  getAllProviders: () => Provider[]; // Nueva función para obtener todos los proveedores
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    // Load users from local storage on initial load
    const storedUsers = localStorage.getItem("appUsers");
    return storedUsers ? JSON.parse(storedUsers) : [];
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    // Load current user from local storage on initial load
    const storedCurrentUser = localStorage.getItem("currentUser");
    return storedCurrentUser ? JSON.parse(storedCurrentUser) : null;
  });

  useEffect(() => {
    // Save users to local storage whenever the users state changes
    localStorage.setItem("appUsers", JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    // Save current user to local storage whenever currentUser state changes
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
    const newUser = { ...provider, id: `user-${users.length + 1}` };
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
    // If the updated user is the current logged-in user, update currentUser state
    if (currentUser && currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
    showSuccess("Información actualizada correctamente.");
  };

  const getAllProviders = (): Provider[] => {
    return users.filter((user) => user.type === "provider") as Provider[];
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
        getAllProviders, // Añadir getAllProviders al contexto
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