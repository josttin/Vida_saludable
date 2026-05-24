/**
 * FitCycle State and API Interfaces
 * Modernized for dynamic history-based blocking, analytics, and suggestions.
 */

export type MealType = "Hamburguesa" | "Salchipapa" | "Pizza" | "Sushi" | "Perro Caliente" | "Sándwich Callejero" | "Arepa" | "Pollo Broaster";

export interface SemanalInfo {
  semana: number;
  cena_novio: MealType | null;
  cena_novia: MealType | null;
  cena: MealType | null; // Consolidated main choice
  extra: boolean;
  share_mode?: "mitad_mitad" | "cada_uno" | null; // Half and half or each their own
  infraction_detected?: boolean; // True if they broke consecutive/combination rules
  infraction_details?: string;   // Explained reason
}

export interface FitCycleState {
  current_week: number;
  cycle_start_date: string | null; // ISO date of the first meal registered
  history: SemanalInfo[];
}

export interface SmartSugestion {
  title: string;
  type: "same_meal" | "change_meal" | "clean_balance";
  message: string;
}

export interface FitCycleCalculatedData {
  activeWeek: number;
  stateTitle: string;
  stateColor: "celeste" | "rojo" | "amarillo";
  bloqueos_activos: {
    salchipapa: boolean;
    extra_helado: boolean;
    hamburguesa_pizza_penalty: boolean; // Dynamic penalty restricting heavy favorites
  };
  opciones_permitidas: MealType[];
  sugerencia: SmartSugestion;
}
