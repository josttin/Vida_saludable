import { FitCycleState, FitCycleAPIResponse, MealType, SemanalInfo, BloqueosActivos, Inventario } from "./types";

const INITIAL_INVENTORY = {
  hamburguesa: 2,
  salchipapa: 2,
  pizza: 2,
  sushi: 1,
  otra_comida: 1,
  extras: 4
};

export function getInitialState(): FitCycleState {
  const history: SemanalInfo[] = [];
  for (let i = 1; i <= 8; i++) {
    history.push({
      semana: i,
      cena_novio: null,
      cena_novia: null,
      cena: null,
      extra: false
    });
  }
  return {
    current_week: 1,
    history
  };
}

export function calculateFitCycle(state: FitCycleState): FitCycleAPIResponse {
  const { current_week, history } = state;

  // Ensure current_week is bounded between 1 and 8
  const currentWeekNum = Math.min(8, Math.max(1, current_week));

  // 1. Calculate consumed items so far (all logs)
  let hamburguesasConsumed = 0;
  let salchipapasConsumed = 0;
  let pizzasConsumed = 0;
  let sushisConsumed = 0;
  let otrasConsumed = 0;
  let extrasConsumed = 0;

  history.forEach((h) => {
    const novio = h.cena_novio || h.cena;
    const novia = h.cena_novia || h.cena;

    if (novio && novia) {
      if (novio === novia) {
        if (novio === "Hamburguesa") hamburguesasConsumed += 1.0;
        else if (novio === "Salchipapa") salchipapasConsumed += 1.0;
        else if (novio === "Pizza") pizzasConsumed += 1.0;
        else if (novio === "Sushi") sushisConsumed += 1.0;
        else if (novio === "Otra") otrasConsumed += 1.0;
      } else {
        // Mitad y mitad sharing! Both count as 0.5
        [novio, novia].forEach((meal) => {
          if (meal === "Hamburguesa") hamburguesasConsumed += 0.5;
          else if (meal === "Salchipapa") salchipapasConsumed += 0.5;
          else if (meal === "Pizza") pizzasConsumed += 0.5;
          else if (meal === "Sushi") sushisConsumed += 0.5;
          else if (meal === "Otra") otrasConsumed += 0.5;
        });
      }
    } else if (novio || novia) {
      const singleMeal = novio || novia;
      if (singleMeal === "Hamburguesa") hamburguesasConsumed += 0.5;
      else if (singleMeal === "Salchipapa") salchipapasConsumed += 0.5;
      else if (singleMeal === "Pizza") pizzasConsumed += 0.5;
      else if (singleMeal === "Sushi") sushisConsumed += 0.5;
      else if (singleMeal === "Otra") otrasConsumed += 0.5;
    }

    if (h.extra) extrasConsumed++;
  });

  // 2. Calculate remaining Inventory (Hamburguesa, Pizza and Sushi share a combined pool of 5.0 portions in total across the cycle)
  const sharedHealthyRemaining = Math.max(0, 5.0 - (hamburguesasConsumed + pizzasConsumed + sushisConsumed));

  const inventario: Inventario = {
    hamburguesa: sharedHealthyRemaining,
    salchipapa: Math.max(0, INITIAL_INVENTORY.salchipapa - salchipapasConsumed),
    pizza: sharedHealthyRemaining,
    sushi: sharedHealthyRemaining,
    otra_comida: Math.max(0, INITIAL_INVENTORY.otra_comida - otrasConsumed),
    extras: Math.max(0, INITIAL_INVENTORY.extras - extrasConsumed),
  };

  // 3. active blocks check for the current week
  // Block if previous week has the item by either partner
  const previousWeekInfo = history.find(h => h.semana === currentWeekNum - 1);
  const hadSalchipapaLastWeek = previousWeekInfo ? (previousWeekInfo.cena_novio === "Salchipapa" || previousWeekInfo.cena_novia === "Salchipapa" || previousWeekInfo.cena === "Salchipapa") : false;
  const extraHeladoBlocked = previousWeekInfo ? previousWeekInfo.extra : false;

  // Real-time mutual exclusion within the same week:
  // If either partner has selected Salchipapa for the current week, then extra is blocked.
  const currentWeekInfo = history.find(h => h.semana === currentWeekNum);
  const currentWeekHasSalchipapa = currentWeekInfo ? (currentWeekInfo.cena_novio === "Salchipapa" || currentWeekInfo.cena_novia === "Salchipapa") : false;
  const currentWeekHasExtra = currentWeekInfo ? currentWeekInfo.extra : false;

  const bloqueos_activos: BloqueosActivos = {
    salchipapa: hadSalchipapaLastWeek || currentWeekHasExtra,
    extra_helado: extraHeladoBlocked || currentWeekHasSalchipapa
  };

  // 4. permitted options for the current week (need to be in inventory)
  const opciones_permitidas: MealType[] = [];
  if (inventario.sushi > 0) opciones_permitidas.push("Sushi");
  if (inventario.pizza > 0) opciones_permitidas.push("Pizza");
  if (inventario.hamburguesa > 0) opciones_permitidas.push("Hamburguesa");
  if (inventario.otra_comida > 0) opciones_permitidas.push("Otra");
  
  // Salchipapa is permitted only if we have inventory, no consecutivity lockout AND no extra sweet in same week
  if (inventario.salchipapa > 0 && !hadSalchipapaLastWeek && !currentWeekHasExtra) {
    opciones_permitidas.push("Salchipapa");
  }

  // 5. Fase Actual
  const isBlockedToday = hadSalchipapaLastWeek || extraHeladoBlocked;
  const estado_hoy_titulo = isBlockedToday ? "Zona de Bloqueo" : "Zona Segura";
  const estado_hoy_color = isBlockedToday ? "rojo" : "celeste";

  // Motivational messages
  let mensaje_motivacional = "¡Vas excelente! De lunes a viernes eres un reloj.";
  if (isBlockedToday) {
    mensaje_motivacional = "¡Cuidado con los consecutivos! Activamos bloqueo temporal para mantener el autocontrol.";
  } else if (inventario.extras === 1) {
    mensaje_motivacional = "Alerta: Solo queda 1 extra para el resto del ciclo. ¡Úsenlo con sabiduría!";
  } else if (inventario.sushi === 1 && sushisConsumed === 0) {
    mensaje_motivacional = "¡Semana de sushi disponible! Ideal para celebrar una meta especial de la pareja.";
  } else if (extrasConsumed >= 3) {
    mensaje_motivacional = "Han consumido bastantes extras. ¡Mantengan el enfoque en los fines de semana!";
  } else if (currentWeekNum >= 6) {
    mensaje_motivacional = "¡Recta final del ciclo de 8 semanas! Están logrando una constancia increíble.";
  }

  // 6. Calendario Predicción
  // Let's predict the status of each week
  const calendario_prediccion: { semana: number; estado: string }[] = [];
  
  // To simulate future extras and consecutivity blocks
  let simulatedExtrasRemaining = inventario.extras;
  let lastMealWasSalchipapa = history.find(h => h.semana === currentWeekNum)?.cena === "Salchipapa";
  let lastWeekHadExtra = history.find(h => h.semana === currentWeekNum)?.extra || false;

  for (let w = 1; w <= 8; w++) {
    const weekReg = history.find(h => h.semana === w);
    const hasCena = weekReg && weekReg.cena !== null;

    if (w < currentWeekNum) {
      calendario_prediccion.push({
        semana: w,
        estado: hasCena ? "completada" : "sin_registro"
      });
    } else if (w === currentWeekNum) {
      if (hasCena) {
        calendario_prediccion.push({
          semana: w,
          estado: "completada"
        });
      } else {
        const canHaveExtra = !extraHeladoBlocked && inventario.extras > 0;
        calendario_prediccion.push({
          semana: w,
          estado: canHaveExtra ? "permitido_con_extra" : "permitido_sin_extra"
        });
      }
    } else {
      // Future prediction week > current_week
      // Check if we can have extra predicted
      const canHaveExtraPredicted = !lastWeekHadExtra && simulatedExtrasRemaining > 0;
      
      calendario_prediccion.push({
        semana: w,
        estado: canHaveExtraPredicted ? "permitido_con_extra" : "permitido_sin_extra"
      });

      // Update predictions for the next loop step
      if (canHaveExtraPredicted) {
        simulatedExtrasRemaining = Math.max(0, simulatedExtrasRemaining - 1);
        lastWeekHadExtra = true;
      } else {
        lastWeekHadExtra = false;
      }
    }
  }

  return {
    fase_actual: {
      semana: currentWeekNum,
      estado_hoy_titulo,
      estado_hoy_color,
      mensaje_motivacional
    },
    bloqueos_activos,
    opciones_permitidas,
    inventario,
    calendario_prediccion
  };
}
