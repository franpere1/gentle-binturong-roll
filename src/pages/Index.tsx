import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";
import { MadeWithDyad } from "@/components/made-with-dyad";

const Index = () => {
  const navigate = useNavigate();
  const { currentUser, isLoading } = useAuth(); // Obtener el estado de carga

  useEffect(() => {
    if (!isLoading) { // Solo redirigir una vez que la carga haya terminado
      if (currentUser) {
        if (currentUser.type === "client") {
          navigate("/client-dashboard");
        } else if (currentUser.type === "provider") {
          navigate("/provider-dashboard");
        } else if (currentUser.type === "admin") { // Redirigir al admin
          navigate("/admin-dashboard");
        }
      } else {
        navigate("/auth");
      }
    }
  }, [currentUser, isLoading, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-grow flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center p-4">
          <h1 className="text-4xl font-bold mb-4 text-gray-800 dark:text-gray-100">
            {isLoading ? "Cargando..." : "Cargando 'TE LO HAGO'... "}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            {isLoading ? "Por favor espera." : "Redirigiendo a la página de inicio de sesión o a tu dashboard."}
          </p>
        </div>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;