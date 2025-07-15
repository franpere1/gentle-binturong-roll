import React from "react";
import Logo from "./Logo";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom"; // Importar useNavigate

const Header: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate(); // Inicializar useNavigate

  const handleLogout = () => {
    logout();
    navigate("/auth"); // Redirigir a la página de autenticación después de cerrar sesión
  };

  const getDashboardPath = () => {
    if (!currentUser) return "/";
    if (currentUser.type === "client") return "/client-dashboard";
    if (currentUser.type === "provider") return "/provider-dashboard";
    if (currentUser.type === "admin") return "/admin-dashboard"; // Ruta para el admin
    return "/";
  };

  return (
    <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <Link to={getDashboardPath()}>
        <Logo />
      </Link>
      {currentUser ? (
        <div className="flex items-center space-x-4">
          <span className="text-gray-700 dark:text-gray-300">
            Hola, {currentUser.name} ({currentUser.type === "client" ? "Cliente" : currentUser.type === "provider" ? "Proveedor" : "Administrador"})
          </span>
          <Button onClick={handleLogout} variant="outline"> {/* Usar handleLogout */}
            Cerrar Sesión
          </Button>
        </div>
      ) : (
        <Link to="/auth">
          <Button variant="default">Iniciar Sesión / Registrarse</Button>
        </Link>
      )}
    </header>
  );
};

export default Header;