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
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  registerClient: (clientData: Omit<Client, "id" | "createdAt" | "type">) => Promise<boolean>;
  registerProvider: (providerData: Omit<Provider, "id" | "createdAt" | "type" | "feedback" | "starRating">) => Promise<boolean>;
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

  // Function to fetch user profile from public.users by Supabase Auth ID
  const fetchUserProfile = useCallback(async (id: string): Promise<User | undefined> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("Error fetching user profile:", error);
      return undefined;
    }
    if (data) {
      return {
        id: data.id,
        name: data.name,
        email: data.email,
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

  // Function to find user profile by email (used for checking existence before registration)
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
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setIsLoading(true);
        if (session?.user) {
          // User is logged in via Supabase Auth
          const userProfile = await fetchUserProfile(session.user.id);
          if (userProfile) {
            setCurrentUser(userProfile);
          } else {
            // This case should ideally not happen if registration is successful
            // but handles if profile data is missing for some reason
            console.warn("Supabase Auth user found, but no profile in public.users.");
            setCurrentUser(null);
            await supabase.auth.signOut(); // Force logout if profile is missing
          }
        } else {
          // User is logged out
          setCurrentUser(null);
        }
        setIsLoading(false);
      }
    );

    // Initial check for session
    const getSession = async () => {
      setIsLoading(true);
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session?.user) {
        const userProfile = await fetchUserProfile(session.user.id);
        if (userProfile) {
          setCurrentUser(userProfile);
        } else {
          console.warn("Initial session found, but no profile in public.users.");
          await supabase.auth.signOut();
        }
      }
      setIsLoading(false);
    };

    getSession();

    // Ensure default admin exists
    const ensureAdmin = async () => {
      const adminProfile = await findUserByEmail("admin@admin.com");
      if (!adminProfile) {
        // Create admin user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: "admin@admin.com",
          password: "kilmanjaro", // In a real app, this should be an env var or more secure
        });

        if (authError) {
          console.error("Error signing up default admin in Supabase Auth:", authError.message);
          return;
        }

        if (authData.user) {
          // Insert admin profile into public.users
          const { error: profileError } = await supabase.from('users').insert([
            {
              name: "Admin",
              email: "admin@admin.com",
              state: "Distrito Capital",
              type: "admin",
              created_at: Date.now(),
            }
          ]);
          if (profileError) {
            console.error("Error creating default admin profile:", profileError);
          } else {
            console.log("Default admin created and profile added.");
          }
        }
      }
    };
    ensureAdmin();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchUserProfile, findUserByEmail]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showError(`Error al iniciar sesión: ${error.message}`);
    } else if (data.user) {
      const userProfile = await fetchUserProfile(data.user.id);
      if (userProfile) {
        setCurrentUser(userProfile);
        showSuccess(`Bienvenido, ${userProfile.name}!`);
      } else {
        showError("No se encontró el perfil de usuario. Por favor, contacta a soporte.");
        await supabase.auth.signOut(); // Log out if profile is missing
      }
    }
    setIsLoading(false);
  };

  const logout = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError(`Error al cerrar sesión: ${error.message}`);
    } else {
      setCurrentUser(null);
      showSuccess("Sesión cerrada correctamente.");
    }
    setIsLoading(false);
  };

  const registerClient = async (clientData: Omit<Client, "id" | "createdAt" | "type">): Promise<boolean> => {
    setIsLoading(true);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: clientData.email,
      password: clientData.password || "", // Password is required by Supabase Auth
    });

    if (authError) {
      showError(`Error al registrar cliente: ${authError.message}`);
      setIsLoading(false);
      return false;
    }

    if (authData.user) {
      const { error: profileError } = await supabase.from('users').insert([
        {
          name: clientData.name,
          email: clientData.email,
          state: clientData.state,
          phone: clientData.phone,
          type: "client",
          created_at: Date.now(),
          profile_image: clientData.profileImage,
        }
      ]);

      if (profileError) {
        console.error("Error inserting client profile:", profileError);
        showError("Error al registrar cliente. Inténtalo de nuevo.");
        // Optionally, delete the auth user if profile creation fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        setIsLoading(false);
        return false;
      }

      const newUserProfile = await fetchUserProfile(authData.user.id);
      if (newUserProfile) {
        setCurrentUser(newUserProfile);
        showSuccess("Registro de cliente exitoso. ¡Ahora estás logeado!");
        setIsLoading(false);
        return true;
      }
    }
    setIsLoading(false);
    return false;
  };

  const registerProvider = async (providerData: Omit<Provider, "id" | "createdAt" | "type" | "feedback" | "starRating">): Promise<boolean> => {
    setIsLoading(true);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: providerData.email,
      password: providerData.password || "", // Password is required by Supabase Auth
    });

    if (authError) {
      showError(`Error al registrar proveedor: ${authError.message}`);
      setIsLoading(false);
      return false;
    }

    if (authData.user) {
      const { error: profileError } = await supabase.from('users').insert([
        {
          name: providerData.name,
          email: providerData.email,
          state: providerData.state,
          phone: providerData.phone,
          type: "provider",
          category: providerData.category,
          service_title: providerData.serviceTitle,
          service_description: providerData.serviceDescription,
          service_image: providerData.serviceImage,
          rate: providerData.rate,
          feedback: [],
          star_rating: 0,
          created_at: Date.now(),
          profile_image: providerData.profileImage,
        }
      ]);

      if (profileError) {
        console.error("Error inserting provider profile:", profileError);
        showError("Error al registrar proveedor. Inténtalo de nuevo.");
        // Optionally, delete the auth user if profile creation fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        setIsLoading(false);
        return false;
      }

      const newProviderProfile = await fetchUserProfile(authData.user.id);
      if (newProviderProfile) {
        setCurrentUser(newProviderProfile);
        showSuccess("Registro de proveedor exitoso. ¡Ahora estás logeado!");
        setIsLoading(false);
        return true;
      }
    }
    setIsLoading(false);
    return false;
  };

  const updateUser = async (updatedUser: User) => {
    setIsLoading(true);
    const { error } = await supabase.from('users').update({
      name: updatedUser.name,
      email: updatedUser.email, // Email update should ideally go through Supabase Auth
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
    setIsLoading(false);
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
    const provider = await fetchUserProfile(providerId) as Provider;
    if (!provider) {
      showError("Proveedor no encontrado.");
      return;
    }

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
    // Calculate star rating based on positive feedback count
    const positiveCount = updatedFeedback.filter(
      (f) => f.type === FeedbackType.Positive
    ).length;
    // Simple star rating logic: 1 star for every 5 positive feedbacks, max 5 stars
    const newStarRating = Math.min(5, Math.floor(positiveCount / 5));


    const updatedProvider: Provider = {
      ...provider,
      feedback: updatedFeedback,
      starRating: newStarRating,
    };

    await updateUser(updatedProvider);
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
        findUserById: fetchUserProfile,
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