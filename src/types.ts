/**
 * FitCycle State and API Interfaces
 */

export type MealType = "Hamburguesa" | "Salchipapa" | "Pizza" | "Sushi" | "Perro Caliente" | "Sándwich Callejero" | "Arepa";

export interface SemanalInfo {
  semana: number;
  cena_novio: MealType | null;
  cena_novia: MealType | null;
  cena: MealType | null; // Unified select
  extra: boolean;
  castigo_task?: string; // Auto-generated healthy penalty task
  castigo_completed?: boolean; // Whether they completed the healthy corrective penance
}

export interface FitCycleState {
  current_week: number;
  cycle_start_date: string | null; // Real calendar start date
  history: SemanalInfo[];
}

export interface FaseActual {
  semana: number;
  estado_hoy_titulo: "Zona Segura" | "Zona de Bloqueo";
  estado_hoy_color: "celeste" | "rojo";
  mensaje_motivacional: string;
}

export interface BloqueosActivos {
  salchipapa: boolean;
  extra_helado: boolean;
}

export interface Inventario {
  hamburguesa: number;
  salchipapa: number;
  pizza: number;
  sushi: number;
  otra_comida: number;
  extras: number;
}

export interface CalendarioSemana {
  semana: number;
  estado: "completada" | "permitido_con_extra" | "permitido_sin_extra" | "bloqueado" | "sin_registro";
  cena: MealType | null;
  extra: boolean;
}

export interface FitCycleAPIResponse {
  fase_actual: FaseActual;
  bloqueos_activos: BloqueosActivos;
  opciones_permitidas: MealType[];
  inventario: Inventario;
  calendario_prediccion: { semana: number; estado: string }[];
}
