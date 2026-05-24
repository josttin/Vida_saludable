import { FitCycleState, SemanalInfo, MealType, FitCycleCalculatedData, SmartSugestion } from "./types";

/**
 * Default starter history helper for infinite eternal tracking.
 */
export function getInitialState(): FitCycleState {
  const history: SemanalInfo[] = [];
  // Build a generous initial 12 weeks
  for (let i = 1; i <= 12; i++) {
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
    cycle_start_date: null,
    history
  };
}

/**
 * Ensures upcoming weeks exist so the calendar can grow forever.
 */
export function ensureWeeksExist(history: SemanalInfo[], activeWeek: number): SemanalInfo[] {
  const updated = [...history];
  const maxWeek = updated.reduce((max, h) => Math.max(max, h.semana), 0);
  const targetMax = Math.max(activeWeek + 4, 12); // Always prepare at least 4 future weeks ahead
  
  if (maxWeek < targetMax) {
    for (let w = maxWeek + 1; w <= targetMax; w++) {
      updated.push({
        semana: w,
        cena_novio: null,
        cena_novia: null,
        cena: null,
        extra: false
      });
    }
  }
  return updated;
}

/**
 * Evaluates the eating history, flags infractions retroactively (consecutive abuses + exclusions),
 * and dynamically calculates current locks and customized suggestions.
 */
export function processFitCycle(state: FitCycleState): FitCycleCalculatedData {
  const { cycle_start_date, history } = state;

  // 1. Calculate active week based on elapsed date since first meal, remaining strictly in Week 1 until initialized
  let activeWeek = 1;
  if (cycle_start_date) {
    const startDate = new Date(cycle_start_date);
    const now = new Date();
    const diffMs = now.getTime() - startDate.getTime();
    if (diffMs > 0) {
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      activeWeek = Math.max(1, Math.floor(diffDays / 7) + 1);
    }
  }

  // Ensure we evaluate weeks up to the currently calculated active week
  // Let's analyze the entire history array step-by-step to identify infractions:
  // For each week, an infraction happens if they ate something that violated blocking rules.
  let isDoubleLockedByPreviousInfraction = false;

  const evaluatedHistory = history.map((w, index) => {
    const weekNum = w.semana;
    
    // We only evaluate infractions for weeks that have passed or are active
    const isPastOrActive = weekNum <= activeWeek;
    if (!isPastOrActive) {
      return { ...w, infraction_detected: false, infraction_details: "" };
    }

    const previousWeek = history.find(h => h.semana === weekNum - 1);
    const hadSalchipapaLastWeek = previousWeek ? (previousWeek.cena_novio === "Salchipapa" || previousWeek.cena_novia === "Salchipapa") : false;
    const hadExtraLastWeek = previousWeek ? previousWeek.extra : false;

    let infraction_detected = false;
    let infraction_details = "";

    // 1. Consecutive Salchipapa rule
    const hasSalchipapaThisWeek = w.cena_novio === "Salchipapa" || w.cena_novia === "Salchipapa";
    if (hadSalchipapaLastWeek && hasSalchipapaThisWeek) {
      infraction_detected = true;
      infraction_details += "• Salchipapas consecutivas prohibidas. ";
    }

    // 2. Consecutive Extra Sweets rule
    if (hadExtraLastWeek && w.extra) {
      infraction_detected = true;
      infraction_details += "• Extras Dulces consecutivos prohibidos. ";
    }

    // 3. Mutual Exclude Salchipapa + Extra Sweet within the same week
    if (hasSalchipapaThisWeek && w.extra) {
      infraction_detected = true;
      infraction_details += "• Combinación prohibida de Salchipapa y Dulce Extra la misma semana. ";
    }

    // 4. Double Lock infraction (If previous week was double-locked due to infraction, and they registered blocked elements)
    if (isDoubleLockedByPreviousInfraction) {
      const hasAnyExtraOrSalchipapa = hasSalchipapaThisWeek || w.extra;
      if (hasAnyExtraOrSalchipapa) {
        infraction_detected = true;
        infraction_details += "• Evasión de bloqueo por castigo activo de la semana anterior. ";
      }
    }

    // Set double lock status for the *NEXT* week based on this week's infraction
    isDoubleLockedByPreviousInfraction = infraction_detected;

    return {
      ...w,
      infraction_detected,
      infraction_details: infraction_details.trim()
    };
  });

  // Now, calculate locks affecting the current active week
  const previousWeekInfo = evaluatedHistory.find(h => h.semana === activeWeek - 1);
  const curWeekInfo = evaluatedHistory.find(h => h.semana === activeWeek);

  const hadSalchipapaLastWeek = previousWeekInfo ? (previousWeekInfo.cena_novio === "Salchipapa" || previousWeekInfo.cena_novia === "Salchipapa") : false;
  const hadExtraLastWeek = previousWeekInfo ? previousWeekInfo.extra : false;

  // Active punishment blockade if the previous registered week had an infraction!
  const hasPenaltyLockActive = previousWeekInfo ? (previousWeekInfo.infraction_detected || false) : false;

  // Compile active blockades
  const bloqueos_activos = {
    salchipapa: hadSalchipapaLastWeek || hasPenaltyLockActive || (curWeekInfo ? curWeekInfo.extra : false),
    extra_helado: hadExtraLastWeek || hasPenaltyLockActive || (curWeekInfo ? (curWeekInfo.cena_novio === "Salchipapa" || curWeekInfo.cena_novia === "Salchipapa") : false),
    hamburguesa_pizza_penalty: hasPenaltyLockActive // Restricts heavy favourites due to metabolic penalty
  };

  // List of permitted options based on active week locks
  const opciones_permitidas: MealType[] = ["Sushi", "Sándwich Callejero", "Perro Caliente", "Arepa"];
  if (!bloqueos_activos.salchipapa) {
    opciones_permitidas.push("Salchipapa");
  }
  if (!bloqueos_activos.hamburguesa_pizza_penalty) {
    opciones_permitidas.push("Hamburguesa");
    opciones_permitidas.push("Pizza");
  }

  // Calculate stats to generate recommendation of the last 12 weeks (3 months)
  const recentWeeks = evaluatedHistory.filter(h => h.semana < activeWeek && h.semana >= activeWeek - 12);
  const weightedCounts: Record<MealType, number> = {
    Hamburguesa: 0,
    Salchipapa: 0,
    Pizza: 0,
    Sushi: 0,
    "Perro Caliente": 0,
    "Sándwich Callejero": 0,
    Arepa: 0
  };
  
  let totalRecentCheats = 0;
  recentWeeks.forEach(h => {
    let weight = 0.5; // Low weight for 9-12 weeks ago (approx 3 months)
    const weeksAgo = activeWeek - h.semana;
    if (weeksAgo <= 4) {
      weight = 3.0; // High weight for the most recent 4 weeks
    } else if (weeksAgo <= 8) {
      weight = 1.5; // Medium weight for 5-8 weeks ago
    }
    
    if (h.cena_novio && weightedCounts[h.cena_novio] !== undefined) {
      weightedCounts[h.cena_novio] += weight;
      totalRecentCheats++;
    }
    if (h.cena_novia && weightedCounts[h.cena_novia] !== undefined) {
      weightedCounts[h.cena_novia] += weight;
      totalRecentCheats++;
    }
  });

  // Find most weighted and least weighted meals in recent 12-week trends
  const sortedRecentTrends = Object.entries(weightedCounts)
    .map(([name, weight]) => ({ name: name as MealType, weight: Math.round(weight * 10) / 10 }))
    .sort((a, b) => b.weight - a.weight);

  const favoriteRecent = sortedRecentTrends[0].weight > 0 ? sortedRecentTrends[0].name : null;
  const leastEatenRecent = sortedRecentTrends[sortedRecentTrends.length - 1].name;

  // Let's also look for sushi gap
  let lastTimeSushi = 999;
  for (let u = activeWeek - 1; u >= 1; u--) {
    const wk = evaluatedHistory.find(h => h.semana === u);
    if (wk && (wk.cena_novio === "Sushi" || wk.cena_novia === "Sushi")) {
      lastTimeSushi = activeWeek - u;
      break;
    }
  }

  // Calculate a smart suggestion
  let sugerencia: SmartSugestion = {
    title: "Sugerencia Inteligente Inicial",
    type: "same_meal",
    message: "¡Bienvenidos a su primer cheat meal de la racha eterna! Para empezar con pie de derecho, les recomendamos coordinar y pedir el mismo plato: un delicioso Sushi o Hamburguesas juntos."
  };

  if (activeWeek > 1 && previousWeekInfo) {
    const pNovio = previousWeekInfo.cena_novio;
    const pNovia = previousWeekInfo.cena_novia;
    const pShared = previousWeekInfo.share_mode;

    if (hasPenaltyLockActive) {
      sugerencia = {
        title: "🛡️ Menú Compensador Activo",
        type: "clean_balance",
        message: "Hubo un desliz en el fin de semana anterior. Las opciones pesadas están bloqueadas o penalizadas. Sugerimos comer Sushi o Arepas esta semana. Mantengan el organismo limpio y completen la semana sin dulce extra."
      };
    } else if (lastTimeSushi > 4) {
      // Prioritize Sushi if forgotten (good balance)
      sugerencia = {
        title: "🍣 ¡Hora de Sushi Saludable!",
        type: "clean_balance",
        message: `Llevan ${lastTimeSushi} semanas sin registrar Sushi en el último trimestre. Es el cheat meal óptimo: bajo en grasas saturadas. ¡Es hora de unificar gustos e ir por sushi hoy!`
      };
    } else if (favoriteRecent && weightedCounts[favoriteRecent] >= 8.0 && (pNovio === favoriteRecent || pNovia === favoriteRecent)) {
      // Overconsumption warning of the favorite recent food
      sugerencia = {
        title: `🔄 ¡Basta de ${favoriteRecent}! (Rotación Obligatoria)`,
        type: "change_meal",
        message: `Las estadísticas de los últimos 3 meses indican que están abusando de la ${favoriteRecent} (peso de tendencia alto de ${weightedCounts[favoriteRecent]}). Les sugerimos cambiar hoy a algo diferente como ${leastEatenRecent === favoriteRecent ? "Arepa o Sushi" : leastEatenRecent} para dar variedad.`
      };
    } else if (pNovio !== pNovia && pNovio !== null && pNovia !== null) {
      // Did they eat different meals last week? Let's check share mode
      if (pShared === "cada_uno") {
        sugerencia = {
          title: "💞 ¡Sugerimos Mitad y Mitad!",
          type: "same_meal",
          message: `La semana pasada comieron platos separados (${pNovio} para Joss y ${pNovia} para Natt) sin compartir. Hoy, si quieren pedir diferente, ¡les sugerimos comer a Mitad y Mitad para disfrutar la variedad gastronómica juntos!`
        };
      } else {
        sugerencia = {
          title: "Sincronía Sostenible",
          type: "same_meal",
          message: `La semana pasada compartieron degustando mitad y mitad de sus platos. Para esta semana sugerimos ponerse de acuerdo y pedir lo mismo: unas ricas Pizzas o la opción menos comida recientemente (${leastEatenRecent}).`
        };
      }
    } else if (pNovio === pNovia && pNovio !== null) {
      // Ate same thing last week
      sugerencia = {
        title: "🔄 Variemos el Paladar",
        type: "change_meal",
        message: `La semana pasada comieron lo mismo (${pNovio}). Según su historial de 3 meses, su comida menos consumida es ${leastEatenRecent}. ¡Cada uno podría elegir un plato distinto y compartirlo mitad y mitad, o probar por completo ${leastEatenRecent}!`
      };
    } else {
      sugerencia = {
        title: "🧩 Menú Libre y Variado",
        type: "same_meal",
        message: `¡Vía libre total en la racha! Según sus tendencias recientes, coman ${leastEatenRecent} para mantener baja la repetición acumulada.`
      };
    }
  }

  // Determine state title based on current blockades list
  const isPenalized = bloqueos_activos.salchipapa || bloqueos_activos.extra_helado || bloqueos_activos.hamburguesa_pizza_penalty;
  const stateTitle = isPenalized ? "Zona de Bloqueo" : "Zona Segura";
  const stateColor = hasPenaltyLockActive ? "rojo" : (isPenalized ? "amarillo" : "celeste");

  return {
    activeWeek,
    stateTitle,
    stateColor,
    bloqueos_activos,
    opciones_permitidas,
    sugerencia
  };
}

/**
 * Generates all stats needed for the visual dashboard of 'cómo comen'
 */
export function calculateCoupleStats(history: SemanalInfo[], activeWeek: number) {
  const pastWeeks = history.filter(h => h.semana < activeWeek && (h.cena_novio !== null || h.cena_novia !== null));
  const totalWeeks = pastWeeks.length;

  if (totalWeeks === 0) {
    return {
      totalCheats: 0,
      coincidenceRate: 0,
      jossPreferences: [] as { name: string; count: number; pct: number }[],
      nattPreferences: [] as { name: string; count: number; pct: number }[],
      sweetToothRate: 0,
      cleanWeeksCount: history.filter(h => h.semana <= activeWeek && h.cena !== null && !h.infraction_detected).length,
      historicalGrade: "S+"
    };
  }

  let coincidedCount = 0;
  const jossCounts: Record<MealType, number> = {
    Hamburguesa: 0,
    Salchipapa: 0,
    Pizza: 0,
    Sushi: 0,
    "Perro Caliente": 0,
    "Sándwich Callejero": 0,
    Arepa: 0
  };
  const nattCounts: Record<MealType, number> = {
    Hamburguesa: 0,
    Salchipapa: 0,
    Pizza: 0,
    Sushi: 0,
    "Perro Caliente": 0,
    "Sándwich Callejero": 0,
    Arepa: 0
  };
  let sweetWeeks = 0;
  let infractionsCount = 0;

  pastWeeks.forEach(w => {
    if (w.cena_novio === w.cena_novia && w.cena_novio !== null) {
      coincidedCount++;
    }
    if (w.cena_novio && jossCounts[w.cena_novio] !== undefined) jossCounts[w.cena_novio]++;
    if (w.cena_novia && nattCounts[w.cena_novia] !== undefined) nattCounts[w.cena_novia]++;
    if (w.extra) sweetWeeks++;
    if (w.infraction_detected) infractionsCount++;
  });

  const generateSortedPrefList = (counts: Record<MealType, number>, total: number) => {
    return Object.entries(counts)
      .map(([name, count]) => ({
        name: name as MealType,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);
  };

  const jossPrefs = generateSortedPrefList(jossCounts, totalWeeks);
  const nattPrefs = generateSortedPrefList(nattCounts, totalWeeks);

  const coincidenceRate = Math.round((coincidedCount / totalWeeks) * 100);
  const sweetToothRate = Math.round((sweetWeeks / totalWeeks) * 100);

  // Dynamic Grade based on self-discipline (infractions count)
  let historicalGrade = "A+";
  const infractionPct = infractionsCount / totalWeeks;
  if (infractionPct === 0) historicalGrade = "S (Perfecto)";
  else if (infractionPct <= 0.15) historicalGrade = "A (Ejemplar)";
  else if (infractionPct <= 0.3) historicalGrade = "B (Moderado)";
  else if (infractionPct <= 0.5) historicalGrade = "C (Alerta)";
  else historicalGrade = "D (Descontrol metabólico)";

  return {
    totalCheats: totalWeeks * 2,
    coincidenceRate,
    jossPreferences: jossPrefs,
    nattPreferences: nattPrefs,
    sweetToothRate,
    cleanWeeksCount: history.filter(h => h.semana < activeWeek && !h.infraction_detected).length,
    historicalGrade
  };
}
