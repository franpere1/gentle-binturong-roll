import React, {
      createContext,
      useContext,
      useState,
      ReactNode,
      useEffect,
      useCallback,
    } from "react";
    import { Client, Provider, User, Feedback, FeedbackType, Admin } from "@/types";
    import { showSuccess, showError } from "@/utils/toast";
    import { supabase } from "@/lib/supabase"; // Import Supabase client

    interface AuthContextType {
      currentUser: User | null;
      isLoading: boolean;
      login: (user: User) => void;
      logout: () => void;
      registerClient: (client: Client) => Promise<boolean>;
      registerProvider: (provider: Provider) => Promise<boolean>;
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

    export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
      const [currentUser, setCurrentUser] = useState<User | null>(null);
      const [isLoading, setIsLoading] = useState(true);

      // Function to fetch user from Supabase by ID
      const fetchUserById = useCallback(async (id: string): Promise<User | undefined> => {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
          console.error("Error fetching user by ID:", error);
          return undefined;
        }
        if (data) {
          // Map Supabase data to User type
          return {
            id: data.id,
            name: data.name,
            email: data.email,
            password: data.password,
            state: data.state,
            type: data.type as User['type'],
            createdAt: data.created_at,
            profileImage: data.profile_image,
            phone: data.phone,
            category: data.category,
            serviceTitle: data.service_title,
            serviceDescription: data.service_description,
            serviceImage: data.service_image,
            rate: data.rate,
            feedback: data.feedback || [],
            starRating: data.star_rating || 0,
          } as User;
        }
        return undefined;
      }, []);

      // Function to fetch user from Supabase by email
      const findUserByEmail = useCallback(async (email: string): Promise<User | undefined> => {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error("Error finding user by email:", error);
          return undefined;
        }
        if (data) {
          return {
            id: data.id,
            name: data.name,
            email: data.email,
            password: data.password,
            state: data.state,
            type: data.type as User['type'],
            createdAt: data.created_at,
            profileImage: data.profile_image,
            phone: data.phone,
            category: data.category,
            serviceTitle: data.service_title,
            serviceDescription: data.service_description,
            serviceImage: data.service_image,
            rate: data.rate,
            feedback: data.feedback || [],
            starRating: data.star_rating || 0,
          } as User;
        }
        return undefined;
      }, []);

      useEffect(() => {
        const loadCurrentUser = async () => {
          setIsLoading(true);
          const storedUserId = localStorage.getItem("currentUserId");
          if (storedUserId) {
            const user = await fetchUserById(storedUserId);
            if (user) {
              // Ensure admin type is correct if it's the default admin
              if (user.email === "admin@admin.com" && user.type !== "admin") {
                console.warn("Correcting admin user type from Supabase.");
                const correctedAdmin = { ...user, type: "admin" };
                setCurrentUser(correctedAdmin);
                await updateUser(correctedAdmin); // Persist correction to DB
              } else {
                setCurrentUser(user);
              }
            } else {
              localStorage.removeItem("currentUserId");
            }
          } else {
            // Ensure default admin exists in DB
            const adminExists = await findUserByEmail("admin@admin.com");
            if (!adminExists) {
              const adminUser: Admin = {
                id: "user-admin-1", // This ID will be overwritten by Supabase's UUID
                name: "Admin",
                email: "admin@admin.com",
                password: "kilmanjaro",
                state: "Distrito Capital",
                type: "admin",
                createdAt: Date.now(),
              };
              const { data, error } = await supabase.from('users').insert([
                {
                  name: adminUser.name,
                  email: adminUser.email,
                  password: adminUser.password,
                  state: adminUser.state,
                  type: adminUser.type,
                  created_at: adminUser.createdAt,
                }
              ]).select();
              if (error) {
                console.error("Error creating default admin:", error);
              } else {
                console.log("Default admin created:", data[0]);
              }
            }
          }
          setIsLoading(false);
        };

        loadCurrentUser();
      }, [fetchUserById, findUserByEmail]);

      const login = async (user: User) => {
        setCurrentUser(user);
        localStorage.setItem("currentUserId", user.id);
        showSuccess(`Bienvenido, ${user.name}!`);
      };

      const logout = () => {
        setCurrentUser(null);
        localStorage.removeItem("currentUserId");
        showSuccess("Sesión cerrada correctamente.");
      };

      const registerClient = async (client: Client): Promise<boolean> => {
        const existingUser = await findUserByEmail(client.email);
        if (existingUser) {
          showError("Este correo electrónico ya está registrado.");
          return false;
        }

        const { data, error } = await supabase.from('users').insert([
          {
            name: client.name,
            email: client.email,
            password: client.password,
            state: client.state,
            phone: client.phone,
            type: "client",
            created_at: Date.now(),
            profile_image: client.profileImage,
          }
        ]).select().single();

        if (error) {
          console.error("Error registering client:", error);
          showError("Error al registrar cliente. Inténtalo de nuevo.");
          return false;
        }

        const newUser: Client = {
          id: data.id,
          name: data.name,
          email: data.email,
          password: data.password,
          state: data.state,
          phone: data.phone,
          type: "client",
          createdAt: data.created_at,
          profileImage: data.profile_image,
        };
        setCurrentUser(newUser);
        localStorage.setItem("currentUserId", newUser.id);
        showSuccess("Registro de cliente exitoso. ¡Ahora estás logeado!");
        return true;
      };

      const registerProvider = async (provider: Provider): Promise<boolean> => {
        const existingUser = await findUserByEmail(provider.email);
        if (existingUser) {
          showError("Este correo electrónico ya está registrado.");
          return false;
        }

        const { data, error } = await supabase.from('users').insert([
          {
            name: provider.name,
            email: provider.email,
            password: provider.password,
            state: provider.state,
            phone: provider.phone,
            type: "provider",
            category: provider.category,
            service_title: provider.serviceTitle,
            service_description: provider.serviceDescription,
            service_image: provider.serviceImage,
            rate: provider.rate,
            feedback: [],
            star_rating: 0,
            created_at: Date.now(),
            profile_image: provider.profileImage,
          }
        ]).select().single();

        if (error) {
          console.error("Error registering provider:", error);
          showError("Error al registrar proveedor. Inténtalo de nuevo.");
          return false;
        }

        const newUser: Provider = {
          id: data.id,
          name: data.name,
          email: data.email,
          password: data.password,
          state: data.state,
          phone: data.phone,
          type: "provider",
          category: data.category,
          serviceTitle: data.service_title,
          serviceDescription: data.service_description,
          serviceImage: data.service_image,
          rate: data.rate,
          feedback: data.feedback || [],
          starRating: data.star_rating || 0,
          createdAt: data.created_at,
          profileImage: data.profile_image,
        };
        setCurrentUser(newUser);
        localStorage.setItem("currentUserId", newUser.id);
        showSuccess("Registro de proveedor exitoso. ¡Ahora estás logeado!");
        return true;
      };

      const updateUser = async (updatedUser: User) => {
        const { error } = await supabase.from('users').update({
          name: updatedUser.name,
          email: updatedUser.email,
          state: updatedUser.state,
          phone: (updatedUser as Client).phone || (updatedUser as Provider).phone || null,
          profile_image: updatedUser.profileImage || null,
          category: (updatedUser as Provider).category || null,
          service_title: (updatedUser as Provider).serviceTitle || null,
          service_description: (updatedUser as Provider).serviceDescription || null,
          service_image: (updatedUser as Provider).serviceImage || null,
          rate: (updatedUser as Provider).rate || null,
          feedback: (updatedUser as Provider).feedback || [],
          star_rating: (updatedUser as Provider).starRating || 0,
        }).eq('id', updatedUser.id);

        if (error) {
          console.error("Error updating user:", error);
          showError("Error al actualizar la información.");
        } else {
          setCurrentUser(updatedUser);
          showSuccess("Información actualizada correctamente.");
        }
      };

      const getAllProviders = async (): Promise<Provider[]> => {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('type', 'provider');

        if (error) {
          console.error("Error fetching providers:", error);
          return [];
        }
        return data.map(p => ({
          id: p.id,
          name: p.name,
          email: p.email,
          password: p.password, // Should not be sent to client in real app
          state: p.state,
          type: p.type as "provider",
          createdAt: p.created_at,
          profileImage: p.profile_image,
          phone: p.phone,
          category: p.category,
          serviceTitle: p.service_title,
          serviceDescription: p.service_description,
          serviceImage: p.service_image,
          rate: p.rate,
          feedback: p.feedback || [],
          starRating: p.star_rating || 0,
        })) as Provider[];
      };

      const addFeedbackToProvider = async (
        providerId: string,
        type: FeedbackType,
        comment: string
      ) => {
        const provider = await fetchUserById(providerId) as Provider;
        if (!provider) {
          showError("Proveedor no encontrado.");
          return;
        }

        const currentFeedback = provider.feedback || [];
        const newFeedback: Feedback = {
          id: `feedback-${currentFeedback.length + 1}-${Date.now()}`, // ID is client-side for now
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

        await updateUser(updatedProvider); // This will also update the current user if it's the provider
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
            findUserById: fetchUserById,
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