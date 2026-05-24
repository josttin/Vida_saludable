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

// Help generate initial state with 12 weeks to secure infinite support out of the gate
export function getInitialState(): FitCycleState {
  const history: SemanalInfo[] = [];
  for (let i = 1; i <= 12; i++) {
    history.push({
      semana: i,
      cena_novio: null,
      cena_novia: null,
      cena: null,
      extra: false,
      castigo_task: undefined,
      castigo_completed: false,
      infraction_detected: false,
      infraction_details: ""
    });
  }
  return {
    current_week: 1,
    cycle_start_date: null,
    history
  };
}

/**
 * Ensures a history array is continuously updated with upcoming weeks so the dashboard is eternal.
 */
export function ensureWeeksExist(history: SemanalInfo[], activeWeek: number): SemanalInfo[] {
  const updated = [...history];
  const maxWeek = updated.reduce((max, h) => Math.max(max, h.semana), 0);
  const targetMax = Math.max(activeWeek + 4, 12); // Always leave at least 4 future weeks visible
  
  if (maxWeek < targetMax) {
    for (let w = maxWeek + 1; w <= targetMax; w++) {
      updated.push({
        semana: w,
        cena_novio: null,
        cena_novia: null,
        cena: null,
        extra: false,
        castigo_task: undefined,
        castigo_completed: false,
        infraction_detected: false,
        infraction_details: ""
      });
    }
  }
  return updated;
}

/**
 * Technical medical-metabolic corrective physical tasks ("Castigos Clínicos") to reset glycogen levels
 */
export function calculateCastigo(novio: MealType | null, novia: MealType | null, extra: boolean, isDoubleLock: boolean = false): string | null {
  if (!novio && !novia && !extra) return null;

  const combined = [novio, novia].filter(Boolean) as MealType[];
  const hasHeavyGrasa = combined.some(m => m === "Salchipapa" || m === "Perro Caliente" || m === "Sándwich Callejero");
  
  let baseTask = "";

  if (hasHeavyGrasa) {
    baseTask = "🚨 Protocolo Sódico Intensivo: Realizar 45 min de cardio LISS (caminata inclinada) en ayunas lunes, martes y miércoles, más hidratación de 4.5L diarios para limpiar receptores.";
  } else {
    baseTask = "⚡ Resensibilización de Insulina: Recortar carbohidratos simples el lunes y realizar entrenamiento de piernas de altas repeticiones el miércoles para re-sensibilizar receptores.";
  }

  if (extra) {
    baseTask += " 🍧 [Bloqueo Dopamínico]: Evitar edulcorantes artificiales de lunes a jueves para resetear antojos dulces.";
  }

  if (isDoubleLock) {
    baseTask += " 🔒 [Doble Castigo Activo]: Se ha infringido una restricción de planificación de fin de semana. Como compensadora metabólica, tienen DOBLE semana de bloqueo consecutivo de salchipapas y dulces.";
  }

  return baseTask;
}

/**
 * Computes all rules, checks for Fri-Sun infractions, and applies penalties to upcoming weeks & stock.
 */
export function calculateFitCycle(state: FitCycleState): FitCycleAPIResponse {
  const { current_week, cycle_start_date, history } = state;

  // 1. Calculate automatized current week based on date if initialized
  let activeWeek = current_week;
  if (cycle_start_date) {
    const startDate = new Date(cycle_start_date);
    const now = new Date();
    const diffMs = now.getTime() - startDate.getTime();
    if (diffMs > 0) {
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      activeWeek = Math.max(1, Math.floor(diffDays / 7) + 1);
    }
  }

  // 2. Compute 8-week block / epoch for modular stock calculations
  // Weeks 1-8 is block 1, Weeks 9-16 is block 2, Weeks 17-24 is block 3...
  const currentBlockIndex = Math.floor((activeWeek - 1) / 8) + 1;
  const blockStartWeek = (currentBlockIndex - 1) * 8 + 1;
  const blockEndWeek = currentBlockIndex * 8;

  // Assemble history with infractions flagged dynamically from past weeks up to the present
  // To evaluate infractions, we iterate from Week 1 to current/future weeks:
  let totalInfractionsInCurrentBlock = 0;
  let doubleLockActiveForSubsequentWeeks = false;
  let doubleLockWeeksRemaining = 0; // Counts how many upcoming weeks are double-locked

  // Temporary list to process consecutive blocks
  const processedWeeks = history.map((w) => {
    const weekNum = w.semana;
    const isCurrentOrPast = weekNum <= activeWeek;
    
    // Check if previous week had items
    const prevWeek = history.find(h => h.semana === weekNum - 1);
    const hadSalchipapaLastWeek = prevWeek ? (prevWeek.cena_novio === "Salchipapa" || prevWeek.cena_novia === "Salchipapa") : false;
    const hadExtraLastWeek = prevWeek ? prevWeek.extra : false;

    // Check infractions
    let infraction_detected = false;
    let infraction_details = "";

    // If they actually ate something ("Viernes, Sábado o Domingo"), let's check if they bypassed limits:
    if (isCurrentOrPast) {
      const meals = [w.cena_novio, w.cena_novia].filter(Boolean) as MealType[];
      
      // 1. Consecutivity infraction: Ate Salchipapa consecutively
      if (hadSalchipapaLastWeek && meals.includes("Salchipapa")) {
        infraction_detected = true;
        infraction_details += "• Consumo consecutivo prohibido de Salchipapa. ";
      }

      // 2. Consecutivity sweet extra transgression:
      if (hadExtraLastWeek && w.extra) {
        infraction_detected = true;
        infraction_details += "• Racha de Dulce consecutiva violada. ";
      }

      // 3. Mutual exclusion transgression (Salchipapa + Extra sweet in same week)
      if (meals.includes("Salchipapa") && w.extra) {
        infraction_detected = true;
        infraction_details += "• Combinación prohibida de Salchipapa y Dulce Extra en el mismo fin de semana. ";
      }
    }

    if (infraction_detected) {
      w.infraction_detected = true;
      w.infraction_details = infraction_details;
      
      // If infraction occurs in the current active 8-week block, increment penalty counts
      if (weekNum >= blockStartWeek && weekNum <= blockEndWeek) {
        totalInfractionsInCurrentBlock++;
        // Trigger a 2-week double lockout!
        doubleLockActiveForSubsequentWeeks = true;
        doubleLockWeeksRemaining = 2;
      }
    } else {
      w.infraction_detected = false;
      w.infraction_details = "";
      
      if (doubleLockWeeksRemaining > 0 && weekNum > activeWeek - 2) {
        doubleLockWeeksRemaining--;
      } else {
        doubleLockActiveForSubsequentWeeks = false;
      }
    }

    return w;
  });

  // Calculate consumed items inside the CURRENT 8-WEEK STOCK BLOCK
  let hamburguesasConsumed = 0;
  let salchipapasConsumed = 0;
  let pizzasConsumed = 0;
  let sushisConsumed = 0;
  let perrosConsumed = 0;
  let sandwichesConsumed = 0;
  let arepasConsumed = 0;
  let extrasConsumed = 0;

  history.forEach((h) => {
    // Only count within the bounds of the current active 8-week block
    if (h.semana >= blockStartWeek && h.semana <= blockEndWeek) {
      const meals = [h.cena_novio, h.cena_novia].filter(Boolean) as MealType[];
      meals.forEach((meal) => {
        if (meal === "Hamburguesa") hamburguesasConsumed += 0.5;
        else if (meal === "Salchipapa") salchipapasConsumed += 0.5;
        else if (meal === "Pizza") pizzasConsumed += 0.5;
        else if (meal === "Sushi") sushisConsumed += 0.5;
        else if (meal === "Perro Caliente") perrosConsumed += 0.5;
        else if (meal === "Sándwich Callejero") sandwichesConsumed += 0.5;
        else if (meal === "Arepa") arepasConsumed += 0.5;
      });

      if (h.extra) extrasConsumed += 1.0;
    }
  });

  // METABOLIC PENALTY: Every infraction subtracts 0.5 portion from of ALL favorite stocks in the current active block!
  const stockPenalty = totalInfractionsInCurrentBlock * 0.5;

  const inventario: Inventario = {
    hamburguesa: Math.max(0, INITIAL_INVENTORY.hamburguesa - hamburguesasConsumed - stockPenalty),
    salchipapa: Math.max(0, INITIAL_INVENTORY.salchipapa - salchipapasConsumed),
    pizza: Math.max(0, INITIAL_INVENTORY.pizza - pizzasConsumed - stockPenalty),
    sushi: Math.max(0, INITIAL_INVENTORY.sushi - sushisConsumed - stockPenalty),
    otra_comida: Math.max(0, INITIAL_INVENTORY.perro_caliente - perrosConsumed + INITIAL_INVENTORY.sandwich_callejero - sandwichesConsumed + INITIAL_INVENTORY.arepa - arepasConsumed),
    extras: Math.max(0, INITIAL_INVENTORY.extras - extrasConsumed)
  };

  // Detailed remaining stock
  const inventario_detallado = {
    hamburguesa: Math.max(0, INITIAL_INVENTORY.hamburguesa - hamburguesasConsumed - stockPenalty),
    salchipapa: Math.max(0, INITIAL_INVENTORY.salchipapa - salchipapasConsumed),
    pizza: Math.max(0, INITIAL_INVENTORY.pizza - pizzasConsumed - stockPenalty),
    sushi: Math.max(0, INITIAL_INVENTORY.sushi - sushisConsumed - stockPenalty),
    perro_caliente: Math.max(0, INITIAL_INVENTORY.perro_caliente - perrosConsumed),
    sandwich_callejero: Math.max(0, INITIAL_INVENTORY.sandwich_callejero - sandwichesConsumed),
    arepa: Math.max(0, INITIAL_INVENTORY.arepa - arepasConsumed),
    extras: Math.max(0, INITIAL_INVENTORY.extras - extrasConsumed)
  };

  // 3. Check for lockouts affecting the current active week
  const previousWeekInfo = history.find(h => h.semana === activeWeek - 1);
  const hadSalchipapaLastWeek = previousWeekInfo ? (previousWeekInfo.cena_novio === "Salchipapa" || previousWeekInfo.cena_novia === "Salchipapa") : false;
  const extraHeladoBlocked = previousWeekInfo ? previousWeekInfo.extra : false;

  const currentWeekInfo = history.find(h => h.semana === activeWeek);
  const currentWeekHasSalchipapa = currentWeekInfo ? (currentWeekInfo.cena_novio === "Salchipapa" || currentWeekInfo.cena_novia === "Salchipapa") : false;
  const currentWeekHasExtra = currentWeekInfo ? currentWeekInfo.extra : false;

  // If a double lock is active or any infraction has happened nearby, lock them out!
  const hasDoubleLockActive = totalInfractionsInCurrentBlock > 0;

  const bloqueos_activos: BloqueosActivos = {
    salchipapa: hadSalchipapaLastWeek || currentWeekHasExtra || hasDoubleLockActive,
    extra_helado: extraHeladoBlocked || currentWeekHasSalchipapa || hasDoubleLockActive
  };

  // 4. Permitted options (strictly checked during Mon-Thu planning)
  const opciones_permitidas: MealType[] = [];
  if (inventario_detallado.hamburguesa > 0) opciones_permitidas.push("Hamburguesa");
  if (inventario_detallado.pizza > 0) opciones_permitidas.push("Pizza");
  if (inventario_detallado.sushi > 0) opciones_permitidas.push("Sushi");
  if (inventario_detallado.perro_caliente > 0) opciones_permitidas.push("Perro Caliente");
  if (inventario_detallado.sandwich_callejero > 0) opciones_permitidas.push("Sándwich Callejero");
  if (inventario_detallado.arepa > 0) opciones_permitidas.push("Arepa");

  if (inventario_detallado.salchipapa > 0 && !bloqueos_activos.salchipapa) {
    opciones_permitidas.push("Salchipapa");
  }

  // Determine state title
  const hasPenanceThisWeek = (bloqueos_activos.salchipapa || bloqueos_activos.extra_helado);
  const estado_hoy_titulo = hasPenanceThisWeek ? "Zona de Bloqueo" : "Zona Segura";
  const estado_hoy_color = hasPenanceThisWeek ? "rojo" : "celeste";

  let mensaje_motivacional = "";
  if (!cycle_start_date) {
    mensaje_motivacional = "Registren su primer cheat meal para iniciar automáticamente el cronograma permanente eterno.";
  } else if (hasDoubleLockActive) {
    mensaje_motivacional = `⚠️ ¡Castigo Activo por deslices de fin de semana! Capacidad de stock reducida en -${stockPenalty}p y bloqueo de salchipapa/dulces impuesto por 2 semanas.`;
  } else {
    mensaje_motivacional = `Semana ${activeWeek} en curso (Bloque 8-sem número ${currentBlockIndex}). Mantengan el autocontrol de lunes a viernes.`;
  }

  // Prediction mapping
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
