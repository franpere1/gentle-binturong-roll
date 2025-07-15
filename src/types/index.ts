export type ServiceCategory =
  | "Abogado"
  | "Adiestrador canino"
  | "Albañil"
  | "Arquitecto"
  | "Barbero"
  | "Carpintero"
  | "Cerrajero"
  | "Chef a domicilio"
  | "Chofer privado"
  | "Clases de idiomas"
  | "Clases de música"
  | "Clases particulares"
  | "Contador"
  | "Cuidador de adultos mayores"
  | "Electricista"
  | "Enfermero(a)"
  | "Fumigador"
  | "Herrero"
  | "Ingeniero"
  | "Jardinero"
  | "Lavado de autos"
  | "Limpieza de casas"
  | "Limpieza de oficinas"
  | "Maquillador"
  | "Manicurista"
  | "Masajista"
  | "Mecánico"
  | "Mesonero"
  | "Motorizado / Delivery"
  | "Mudanzas"
  | "Niñera"
  | "Organización de eventos"
  | "Paseador de perros"
  | "Peluquero"
  | "Pintor"
  | "Plomero"
  | "Repostero"
  | "Servicios de sistemas"
  | "Servicios digitales"
  | "Servicios electrónica"
  | "Técnico de aire acondicionado";

export interface User {
  id: string;
  name: string;
  email: string;
  state: string;
  password?: string; // Password will not be stored in plain text in a real app, but for demo, it's fine.
  createdAt: number; // Nuevo campo para la fecha de creación
  profileImage?: string; // Nuevo campo para la URL de la imagen de perfil
}

export interface Client extends User {
  type: "client";
}

export enum FeedbackType {
  Positive = "positive",
  Negative = "negative",
  Neutral = "neutral",
}

export interface Feedback {
  id: string;
  clientId: string;
  providerId: string;
  type: FeedbackType;
  comment: string;
  timestamp: number;
}

export interface Provider extends User {
  type: "provider";
  category: ServiceCategory;
  serviceTitle: string;
  serviceDescription: string;
  serviceImage?: string; // Base64 string or URL for demo
  rate: number; // Nuevo campo para la tarifa del servicio
  feedback: Feedback[]; // Array para almacenar el feedback
  starRating: number; // Calificación por estrellas calculada
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
  serviceTitle: string; // Título del servicio contratado
  serviceRate: number;  // Tarifa del servicio contratado
  status: "pending" | "active" | "finalized" | "cancelled";
  clientDeposited: boolean;
  providerFinalized: boolean;
  commissionRate: number; // e.g., 0.10 for 10%
  createdAt: number;
  updatedAt: number;
}