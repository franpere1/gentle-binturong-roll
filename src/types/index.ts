export type ServiceCategory =
  | "Plomería"
  | "Construcción"
  | "Cerrajería"
  | "Limpieza"
  | "Mecánico"
  | "Electricista"
  | "Servicios digitales";

export interface User {
  id: string;
  name: string;
  email: string;
  state: string;
  password?: string; // Password will not be stored in plain text in a real app, but for demo, it's fine.
}

export interface Client extends User {
  type: "client";
}

export interface Provider extends User {
  type: "provider";
  category: ServiceCategory;
  serviceTitle: string;
  serviceDescription: string;
  serviceImage?: string; // Base64 string or URL for demo
  rate: number; // Nuevo campo para la tarifa del servicio
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
}

export interface Contract {
  id: string;
  clientId: string;
  providerId: string;
  status: "pending" | "active" | "finalized" | "cancelled";
  clientDeposited: boolean;
  providerFinalized: boolean;
  commissionRate: number; // e.g., 0.10 for 10%
  createdAt: number;
  updatedAt: number;
}