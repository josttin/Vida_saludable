import { FitCycleState, FitCycleAPIResponse, MealType, SemanalInfo, BloqueosActivos, Inventario } from "./types";

export const INITIAL_INVENTORY = {
  hamburguesa: 2.0,
  salchipapa: 1.0,
  pizza: 2.0,
  sushi: 1.0,
  perro_caliente: 1.0,
  sandwich_callejero: 1.0,
  arepa: 1.0,
  extras: 4.0
};

export function getInitialState(): FitCycleState {
  const history: SemanalInfo[] = [];
  for (let i = 1; i <= 8; i++) {
    history.push({
      semana: i,
      cena_novio: null,
      cena_novia: null,
      cena: null,
      extra: false,
      castigo_task: undefined,
      castigo_completed: false
    });
  }
  return {
    current_week: 1,
    cycle_start_date: null,
    history
  };
}

/**
 * Scientific and evidence-based fit recovery tasks ("Castigos") to remediate high-fat/sodium spikes
 */
export function calculateCastigo(novio: MealType | null, novia: MealType | null, extra: boolean): string | null {
  if (!novio && !novia && !extra) return null;

  const combined = [novio, novia].filter(Boolean) as MealType[];
  const hasHeavyGrasa = combined.some(m => m === "Salchipapa" || m === "Perro Caliente" || m === "Sándwich Callejero");
  const hasModerateGrasa = combined.some(m => m === "Hamburguesa" || m === "Pizza" || m === "Arepa");
  const hasSushiOnly = combined.every(m => m === "Sushi") && combined.length > 0;

  let baseTask = "";

  if (hasHeavyGrasa) {
    baseTask = "🚨 Protocolo de Choque Sódico: Realizar 45 min de cardio LISS (Caminata inclinada) en ayunas lunes, martes y miércoles, más beber 4.5 litros de agua diarios por 3 días para drenar retención celular.";
  } else if (hasModerateGrasa) {
    baseTask = "⚡ Drenaje Glucogénico: Recortar carbohidratos simples el lunes (sólo proteínas y crucíferos), más entrenamiento de piernas de altas repeticiones el miércoles para re-sensibilizar receptores de insulina.";
  } else if (hasSushiOnly) {
    baseTask = "🟢 Racha Limpia: Realizar 30 min de cardio habitual los días lunes o martes para maximizar la oxidación de grasas posterior y acelerar el vaciado de jugos gástricos.";
  } else {
    baseTask = "👟 Reactivación de Déficit: Rutina habitual de cardio LISS (35 minutos) el lunes por la mañana.";
  }

  if (extra) {
    baseTask += " 🍧 [Ajuste de Insulina]: Evitar edulcorantes/estevia por 4 días para calmar receptores de dopamina, más 15 min de Cardio HIIT post-pescar hoy lunes.";
  }

  return baseTask;
}

export function calculateFitCycle(state: FitCycleState): FitCycleAPIResponse {
  const { current_week, cycle_start_date, history } = state;

  // 1. Calculate automatized current week based on date if initialized
  let calculatedWeekNum = current_week;
  if (cycle_start_date) {
    const startDate = new Date(cycle_start_date);
    const now = new Date();
    const diffMs = now.getTime() - startDate.getTime();
    if (diffMs > 0) {
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      calculatedWeekNum = Math.min(8, Math.max(1, Math.floor(diffDays / 7) + 1));
    }
  }

  const activeWeek = Math.min(8, Math.max(1, calculatedWeekNum));

  // 2. Compute portion consumption
  let hamburguesasConsumed = 0;
  let salchipapasConsumed = 0;
  let pizzasConsumed = 0;
  let sushisConsumed = 0;
  let perrosConsumed = 0;
  let sandwichesConsumed = 0;
  let arepasConsumed = 0;
  let extrasConsumed = 0;

  history.forEach((h) => {
    const meals = [h.cena_novio, h.cena_novia].filter(Boolean) as MealType[];
    
    meals.forEach((meal) => {
      // Each partner meal counts as 0.5 cycle portions
      if (meal === "Hamburguesa") hamburguesasConsumed += 0.5;
      else if (meal === "Salchipapa") salchipapasConsumed += 0.5;
      else if (meal === "Pizza") pizzasConsumed += 0.5;
      else if (meal === "Sushi") sushisConsumed += 0.5;
      else if (meal === "Perro Caliente") perrosConsumed += 0.5;
      else if (meal === "Sándwich Callejero") sandwichesConsumed += 0.5;
      else if (meal === "Arepa") arepasConsumed += 0.5;
    });

    if (h.extra) extrasConsumed++;
  });

  const inventario: Inventario = {
    hamburguesa: Math.max(0, INITIAL_INVENTORY.hamburguesa - hamburguesasConsumed),
    salchipapa: Math.max(0, INITIAL_INVENTORY.salchipapa - salchipapasConsumed),
    pizza: Math.max(0, INITIAL_INVENTORY.pizza - pizzasConsumed),
    sushi: Math.max(0, INITIAL_INVENTORY.sushi - sushisConsumed),
    otra_comida: Math.max(0, INITIAL_INVENTORY.perro_caliente - perrosConsumed + INITIAL_INVENTORY.sandwich_callejero - sandwichesConsumed + INITIAL_INVENTORY.arepa - arepasConsumed), // Sum of other items for UI mapping or backward-compatibility
    extras: Math.max(0, INITIAL_INVENTORY.extras - extrasConsumed),
  };

  // Custom detailed inventory for new products:
  const inventario_detallado = {
    hamburguesa: Math.max(0, INITIAL_INVENTORY.hamburguesa - hamburguesasConsumed),
    salchipapa: Math.max(0, INITIAL_INVENTORY.salchipapa - salchipapasConsumed),
    pizza: Math.max(0, INITIAL_INVENTORY.pizza - pizzasConsumed),
    sushi: Math.max(0, INITIAL_INVENTORY.sushi - sushisConsumed),
    perro_caliente: Math.max(0, INITIAL_INVENTORY.perro_caliente - perrosConsumed),
    sandwich_callejero: Math.max(0, INITIAL_INVENTORY.sandwich_callejero - sandwichesConsumed),
    arepa: Math.max(0, INITIAL_INVENTORY.arepa - arepasConsumed),
    extras: Math.max(0, INITIAL_INVENTORY.extras - extrasConsumed)
  };

  // 3. Consecutivity and restrictions check
  const previousWeekInfo = history.find(h => h.semana === activeWeek - 1);
  const hadSalchipapaLastWeek = previousWeekInfo ? (previousWeekInfo.cena_novio === "Salchipapa" || previousWeekInfo.cena_novia === "Salchipapa") : false;
  const extraHeladoBlocked = previousWeekInfo ? previousWeekInfo.extra : false;

  const currentWeekInfo = history.find(h => h.semana === activeWeek);
  const currentWeekHasSalchipapa = currentWeekInfo ? (currentWeekInfo.cena_novio === "Salchipapa" || currentWeekInfo.cena_novia === "Salchipapa") : false;
  const currentWeekHasExtra = currentWeekInfo ? currentWeekInfo.extra : false;

  const bloqueos_activos: BloqueosActivos = {
    salchipapa: hadSalchipapaLastWeek || currentWeekHasExtra,
    extra_helado: extraHeladoBlocked || currentWeekHasSalchipapa
  };

  // Permitted options (having remaining stock and not violating harsh locks)
  const opciones_permitidas: MealType[] = [];
  if (inventario_detallado.hamburguesa > 0) opciones_permitidas.push("Hamburguesa");
  if (inventario_detallado.pizza > 0) opciones_permitidas.push("Pizza");
  if (inventario_detallado.sushi > 0) opciones_permitidas.push("Sushi");
  if (inventario_detallado.perro_caliente > 0) opciones_permitidas.push("Perro Caliente");
  if (inventario_detallado.sandwich_callejero > 0) opciones_permitidas.push("Sándwich Callejero");
  if (inventario_detallado.arepa > 0) opciones_permitidas.push("Arepa");

  if (inventario_detallado.salchipapa > 0 && !hadSalchipapaLastWeek && !currentWeekHasExtra) {
    opciones_permitidas.push("Salchipapa");
  }

  // 4. Determine state title
  const hasPenanceThisWeek = previousWeekInfo ? (previousWeekInfo.cena_novio !== null || previousWeekInfo.cena_novia !== null) : false;
  const estado_hoy_titulo = hasPenanceThisWeek ? "Zona de Bloqueo" : "Zona Segura";
  const estado_hoy_color = hasPenanceThisWeek ? "rojo" : "celeste";

  const mensaje_motivacional = cycle_start_date 
    ? `Semana ${activeWeek} en curso. Defiende el esfuerzo semanal lunes a viernes con agua y disciplina.`
    : "Pareja, registren su primer fin de semana de comida para iniciar automáticamente el cronograma de 8 semanas.";

  // Predictions format
  const calendario_prediccion = history.map((h) => {
    const isCompleted = h.cena_novio !== null || h.cena_novia !== null;
    return {
      semana: h.semana,
      estado: isCompleted ? "completada" : (h.semana === activeWeek ? "permitido_con_extra" : "sin_registro")
    };
  });

  return {
    fase_actual: {
      semana: activeWeek,
      estado_hoy_titulo: estado_hoy_titulo as any,
      estado_hoy_color: estado_hoy_color as any,
      mensaje_motivacional
    },
    bloqueos_activos,
    opciones_permitidas,
    inventario,
    calendario_prediccion: calendario_prediccion as any
  };
}

