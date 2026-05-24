import { useState, useEffect } from "react";
import { FitCycleState, FitCycleAPIResponse, MealType, SemanalInfo } from "./types";
import { 
  getInitialState, 
  calculateCastigo, 
  INITIAL_INVENTORY, 
  calculateFitCycle, 
  ensureWeeksExist 
} from "./fitCycleEngine";
import { 
  Heart, 
  Calendar, 
  CheckCircle, 
  Settings, 
  Check, 
  RotateCcw, 
  Zap, 
  Sliders, 
  Sparkles, 
  Award, 
  Flame, 
  UserCheck, 
  Clock, 
  AlertTriangle,
  XSquare,
  HelpCircle
} from "lucide-react";

export default function App() {
  // Names are strictly Joss and Natt
  const novioName = "Joss";
  const nattName = "Natt";

  // State with LocalStorage persistence support
  const [state, setState] = useState<FitCycleState>(() => {
    const saved = localStorage.getItem("fitcycle_couple_state_eternal_v3");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.history && Array.isArray(parsed.history)) {
          return parsed;
        }
      } catch (e) {
        console.error("Error reading cached state", e);
      }
    }
    return getInitialState();
  });

  const [activeTab, setActiveTab] = useState<"calendar" | "inventory" | "penance" | "settings">("calendar");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [pwaPromptShow, setPwaPromptShow] = useState(true);

  // Helper to trigger clean Toast alerts
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Get dynamic cellular day status
  const getDayStatus = () => {
    const d = new Date();
    const day = d.getDay(); // 0 is Sunday, 1-4 is Mon-Thu, 5-6 is Fri-Sat
    const isPreplanning = day >= 1 && day <= 4;
    const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const currentDayName = dayNames[day];

    return {
      isPreplanning,
      currentDayName,
      badgeClass: isPreplanning ? "bg-cyan-100 text-cyan-800 border-cyan-200" : "bg-emerald-100 text-emerald-800 border-emerald-200",
      badgeText: isPreplanning ? "📝 Programación" : "🔥 Ejecución Real",
      description: isPreplanning 
        ? "Planificación activa (Lunes a Jueves). Se prohíbe programar comidas bloqueadas o agotadas."
        : "Registro real de consumo (Viernes a Domingo). Puedes registrar elecciones con deslices, pero implicarán castigos."
    };
  };

  const dayStatus = getDayStatus();

  // 1. Calculate automatized current week based on date if initialized
  const calculateComputedWeek = () => {
    if (!state.cycle_start_date) {
      return 1;
    }
    const start = new Date(state.cycle_start_date);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    if (diffMs <= 0) return 1;
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7) + 1;
  };

  const currentComputedWeek = calculateComputedWeek();

  // Run automatic continuous loop to support infinite eternal calendar entries
  useEffect(() => {
    const freshWeeks = ensureWeeksExist(state.history, currentComputedWeek);
    if (freshWeeks.length !== state.history.length) {
      setState(prev => ({
        ...prev,
        history: freshWeeks
      }));
    }
  }, [currentComputedWeek, state.history.length]);

  // Persist state updates to LocalStorage
  useEffect(() => {
    localStorage.setItem("fitcycle_couple_state_eternal_v3", JSON.stringify(state));
  }, [state]);

  // Derive dynamic engine state
  const apiData = calculateFitCycle(state);

  // Remaining stocks calculation for validation
  const getDetailedStocks = () => {
    let hamburguesasUsed = 0;
    let salchipapasUsed = 0;
    let pizzasUsed = 0;
    let sushisUsed = 0;
    let perrosUsed = 0;
    let sandwichesUsed = 0;
    let arepasUsed = 0;
    let extrasUsed = 0;

    // Detect epoch block
    const currentBlockIndex = Math.floor((currentComputedWeek - 1) / 8) + 1;
    const blockStartWeek = (currentBlockIndex - 1) * 8 + 1;
    const blockEndWeek = currentBlockIndex * 8;

    // Calculate count of infractions inside the current block
    let infractionPenalty = 0;
    state.history.forEach((h) => {
      if (h.semana >= blockStartWeek && h.semana <= blockEndWeek) {
        if (h.infraction_detected) infractionPenalty += 0.5;

        const meals = [h.cena_novio, h.cena_novia].filter(Boolean) as MealType[];
        meals.forEach((m) => {
          if (m === "Hamburguesa") hamburguesasUsed += 0.5;
          else if (m === "Salchipapa") salchipapasUsed += 0.5;
          else if (m === "Pizza") pizzasUsed += 0.5;
          else if (m === "Sushi") sushisUsed += 0.5;
          else if (m === "Perro Caliente") perrosUsed += 0.5;
          else if (m === "Sándwich Callejero") sandwichesUsed += 0.5;
          else if (m === "Arepa") arepasUsed += 0.5;
        });

        if (h.extra) extrasUsed += 1.0;
      }
    });

    return {
      hamburguesa: Math.max(0, INITIAL_INVENTORY.hamburguesa - hamburguesasUsed - infractionPenalty),
      salchipapa: Math.max(0, INITIAL_INVENTORY.salchipapa - salchipapasUsed),
      pizza: Math.max(0, INITIAL_INVENTORY.pizza - pizzasUsed - infractionPenalty),
      sushi: Math.max(0, INITIAL_INVENTORY.sushi - sushisUsed - infractionPenalty),
      perro_caliente: Math.max(0, INITIAL_INVENTORY.perro_caliente - perrosUsed),
      sandwich_callejero: Math.max(0, INITIAL_INVENTORY.sandwich_callejero - sandwichesUsed),
      arepa: Math.max(0, INITIAL_INVENTORY.arepa - arepasUsed),
      extras: Math.max(0, INITIAL_INVENTORY.extras - extrasUsed),
      penaltyApplied: infractionPenalty
    };
  };

  const detailedStocks = getDetailedStocks();

  // Specific helper to fetch a specific meal stock left
  const getMealStockValue = (m: MealType) => {
    if (m === "Hamburguesa") return detailedStocks.hamburguesa;
    if (m === "Salchipapa") return detailedStocks.salchipapa;
    if (m === "Pizza") return detailedStocks.pizza;
    if (m === "Sushi") return detailedStocks.sushi;
    if (m === "Perro Caliente") return detailedStocks.perro_caliente;
    if (m === "Sándwich Callejero") return detailedStocks.sandwich_callejero;
    if (m === "Arepa") return detailedStocks.arepa;
    return 0;
  };

  // Switch meal inputs with proactive Mon-Thu lockouts vs Fri-Sun penance enforcement
  const handleSelectMeal = (weekNum: number, partner: "novio" | "novia", meal: MealType | null) => {
    const isStarting = !state.cycle_start_date;
    let updatedStartDate = state.cycle_start_date;

    // Cycle starts strictly upon registering the very first item
    if (isStarting) {
      const today = new Date();
      updatedStartDate = today.toISOString();
      triggerToast("🚀 ¡Plan iniciado y sincronizado automáticamente hoy con su primer registro!");
    }

    if (meal) {
      // 1. If we are in Mon-Thu planning mode, PREVENT SELECTING locked/out of stock items
      if (dayStatus.isPreplanning) {
        // Evaluate blocks
        const prevWeekInfo = state.history.find(h => h.semana === weekNum - 1);
        const hadConflictingSalchipapa = prevWeekInfo ? (prevWeekInfo.cena_novio === "Salchipapa" || prevWeekInfo.cena_novia === "Salchipapa") : false;
        
        const isOutOfStock = getMealStockValue(meal) <= 0;
        const isSalchipapaLocked = meal === "Salchipapa" && (hadConflictingSalchipapa || apiData.bloqueos_activos.salchipapa);

        if (isOutOfStock) {
          triggerToast(`⛔ BLOQUED: ¡No queda stock suficiente de ${meal} para este bloque semanal!`);
          return;
        }

        if (isSalchipapaLocked) {
          triggerToast(`⛔ BLOQUEADO: No puedes planificar Salchipapa. Estuviste comiendo en la última semana o tienen castigo consecutivo.`);
          return;
        }
      }
    }

    const updatedHistory = state.history.map((h) => {
      if (h.semana === weekNum) {
        const nextInfo = { ...h };
        if (partner === "novio") {
          nextInfo.cena_novio = meal;
        } else {
          nextInfo.cena_novia = meal;
        }
        nextInfo.cena = nextInfo.cena_novio || nextInfo.cena_novia;

        // Auto calculate corresponding professional healthy Castigo
        const isDoubleLock = h.infraction_detected || false; 
        const penalty = calculateCastigo(nextInfo.cena_novio, nextInfo.cena_novia, nextInfo.extra, isDoubleLock);
        nextInfo.castigo_task = penalty || undefined;
        if (!penalty) {
          nextInfo.castigo_completed = false;
        }
        return nextInfo;
      }
      return h;
    });

    setState(prev => ({
      ...prev,
      cycle_start_date: updatedStartDate,
      current_week: isStarting ? 1 : prev.current_week,
      history: updatedHistory
    }));

    if (meal) {
      triggerToast(`🍽️ ${partner === "novio" ? novioName : nattName} eligió ${meal} para la Semana ${weekNum}`);
    } else {
      triggerToast(`🧼 Elección removida para la Semana ${weekNum}`);
    }
  };

  // Switch Extra Sweet toggler
  const handleToggleExtra = (weekNum: number) => {
    const isStarting = !state.cycle_start_date;
    let updatedStartDate = state.cycle_start_date;

    if (isStarting) {
      const today = new Date();
      updatedStartDate = today.toISOString();
      triggerToast("🚀 ¡Plan iniciado automáticamente hoy con su primer registro!");
    }

    const targetWeek = state.history.find(h => h.semana === weekNum);
    const nextVal = targetWeek ? !targetWeek.extra : true;

    // Mon-Thu lockout restrictions prevent saving extra sweet
    if (dayStatus.isPreplanning && nextVal) {
      if (detailedStocks.extras <= 0) {
        triggerToast("⛔ ERROR: ¡No queda stock disponible de extras dulces para este bloque de 8 semanas!");
        return;
      }
      if (apiData.bloqueos_activos.extra_helado) {
        triggerToast("⛔ BLOQUEADO: No se permite programar extras dulces consecutivamente. ¡Recuerden moderar el azúcar!");
        return;
      }
    }

    const updatedHistory = state.history.map((h) => {
      if (h.semana === weekNum) {
        const nextInfo = { ...h, extra: !h.extra };
        const penalty = calculateCastigo(nextInfo.cena_novio, nextInfo.cena_novia, nextInfo.extra);
        nextInfo.castigo_task = penalty || undefined;
        return nextInfo;
      }
      return h;
    });

    setState(prev => ({
      ...prev,
      cycle_start_date: updatedStartDate,
      history: updatedHistory
    }));

    if (nextVal) {
      triggerToast(`🍧 Extra dulce activado para la Semana ${weekNum}`);
    } else {
      triggerToast(`🍦 Extra dulce desmarcado para la Semana ${weekNum}`);
    }
  };

  // Mark casting penance completed
  const handleTogglePenanceCompleted = (weekNum: number) => {
    const updatedHistory = state.history.map((h) => {
      if (h.semana === weekNum) {
        const nextVal = !h.castigo_completed;
        if (nextVal) {
          triggerToast(`🏆 ¡Castigo de Semana ${weekNum} completado! Esfuerzo compensado con éxito.`);
        }
        return { ...h, castigo_completed: nextVal };
      }
      return h;
    });
    setState(prev => ({
      ...prev,
      history: updatedHistory
    }));
  };

  // Quick action: matching meal
  const handleDuplicarEleccion = (weekNum: number) => {
    const weekData = state.history.find(h => h.semana === weekNum);
    if (!weekData) return;

    if (weekData.cena_novio && !weekData.cena_novia) {
      handleSelectMeal(weekNum, "novia", weekData.cena_novio);
    } else if (weekData.cena_novia && !weekData.cena_novio) {
      handleSelectMeal(weekNum, "novio", weekData.cena_novia);
    } else {
      triggerToast(`⚠️ Uno de los dos debe elegir una comida para duplicar.`);
    }
  };

  // Reset entire workflow back to day 0
  const handleResetCycle = () => {
    localStorage.removeItem("fitcycle_couple_state_eternal_v3");
    setState(getInitialState());
    setShowResetConfirm(false);
    triggerToast("🔄 El flujo ha sido reiniciado por completo. ¡Listo para comenzar un eterno viaje!");
    setActiveTab("calendar");
  };

  // Load Demonstration Simulation (Semana 5 representation)
  const handleLoadSimulation = () => {
    const now = new Date();
    // Simulate started exactly 4 weeks ago
    const simulatedStart = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1050);
    const simulatedHistory: SemanalInfo[] = [
      { 
        semana: 1, 
        cena_novio: "Sushi", 
        cena_novia: "Sushi", 
        cena: "Sushi", 
        extra: false, 
        castigo_task: "⚡ Resensibilización de Insulina: Recortar carbohidratos simples el lunes y realizar entrenamiento de piernas de altas repeticiones el miércoles.", 
        castigo_completed: true,
        infraction_detected: false,
        infraction_details: ""
      },
      { 
        semana: 2, 
        cena_novio: "Hamburguesa", 
        cena_novia: "Pizza", 
        cena: "Hamburguesa", 
        extra: true, 
        castigo_task: "⚡ Resensibilización de Insulina. 🍧 [Bloqueo Dopamínico]: Evitar edulcorantes artificiales de lunes a jueves.", 
        castigo_completed: true,
        infraction_detected: false,
        infraction_details: ""
      },
      { 
        semana: 3, 
        cena_novio: "Salchipapa", 
        cena_novia: "Salchipapa", 
        cena: "Salchipapa", 
        extra: false, 
        castigo_task: "🚨 Protocolo Sódico Intensivo: Cardio LISS y 4.5L de agua diarios por 3 días.", 
        castigo_completed: false,
        infraction_detected: false,
        infraction_details: ""
      },
      { 
        semana: 4, 
        cena_novio: "Sándwich Callejero", 
        cena_novia: "Hamburguesa", 
        cena: "Sándwich Callejero", 
        extra: true, 
        castigo_task: "🚨 Protocolo Sódico Intensivo. [Bloqueo Dopamínico]: Evitar edulcorantes.", 
        castigo_completed: false,
        infraction_detected: false,
        infraction_details: ""
      },
      // In Week 5 let's simulate an infraction on executing (Fri-Sun) to demonstrate penalty behavior
      {
        semana: 5,
        cena_novio: "Salchipapa",
        cena_novia: "Salchipapa",
        cena: "Salchipapa",
        extra: true, // Broken mutual exclusion!
        castigo_task: "🚨 Protocolo Sódico Intensivo más [Doble Castigo Activo].",
        castigo_completed: false,
        infraction_detected: true,
        infraction_details: "• Combinación prohibida de Salchipapa y Dulce Extra en el mismo fin de semana."
      }
    ];

    // Pad with empty future weeks up to 12
    for (let w = 6; w <= 12; w++) {
      simulatedHistory.push({
        semana: w,
        cena_novio: null,
        cena_novia: null,
        cena: null,
        extra: false,
        infraction_detected: false,
        infraction_details: ""
      });
    }

    setState({
      current_week: 5,
      cycle_start_date: simulatedStart.toISOString(),
      history: simulatedHistory
    });

    triggerToast("✨ Simulación realista cargada con infracciones y castigo de ejemplo.");
    setActiveTab("calendar");
  };

  // Get Suggested Food for visual feedback
  const getRoadmapForWeek = (weekNum: number) => {
    const cyclePos = ((weekNum - 1) % 8) + 1;
    switch (cyclePos) {
      case 1: return "🍣 Sushi (Proteína limpia) - ¡Fuerza inicial!";
      case 2: return "🍔 Hamburguesa sola + 🍧 Permitido 1er Extra dulce";
      case 3: return "🍟 Salchipapa (Sabor intenso) - 🔒 Prohibido dulces extras";
      case 4: return "🍕 Pizza crujiente de queso + 🍧 Permitido Extra dulce";
      case 5: return "🍔 Hamburguesa en combo - Control sin postre";
      case 6: return "🥪 Sándwich Callejero cargado + 🍧 Extra dulce de premio";
      case 7: return "🌭 Perro Caliente o Arepa tradicional - 🔒 Sin extras dulces";
      case 8: return "🍕 Pizza / Hamburguesa festiva + 🍧 Cierre con Extra dulce";
      default: return "";
    }
  };

  // Global counts for badges
  const totalCheatsRecorded = state.history.filter(h => h.cena_novio !== null || h.cena_novia !== null).length;
  const totalExtrasRecorded = state.history.filter(h => h.extra).length;
  const activePenancesCount = state.history.filter(h => h.castigo_task && !h.castigo_completed).length;
  const totalInfractionsLogged = state.history.filter(h => h.infraction_detected).length;

  return (
    <div className="min-h-[100dvh] bg-slate-950 flex items-center justify-center font-sans antialiased text-slate-900 md:p-6 select-none">
      
      {/* Device frame simulated for desktop preview, expands fully on mobile */}
      <div className="w-full max-w-md h-[100dvh] md:h-[840px] md:max-h-[95vh] md:rounded-[40px] md:border-[6px] md:border-slate-800 bg-slate-50 relative flex flex-col md:shadow-2xl overflow-hidden shadow-none rounded-none border-none">
        
        {/* TOP COMPROMISE BAR */}
        <header className="bg-white border-b border-slate-100 px-5 py-4 shrink-0 flex items-center justify-between z-30 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-red-500 rounded-xl flex items-center justify-center text-white shadow-xs">
              <Heart size={16} className="fill-white" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-slate-900 flex items-center gap-1 font-display leading-none">
                FitCycle <span className="text-[8px] bg-red-100 text-red-650 font-extrabold px-1.5 py-0.5 rounded">ETERNO</span>
              </h1>
              <p className="text-[10px] text-slate-400 mt-1 font-bold leading-none">Joss & Natt</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-100 rounded-lg px-2 py-1 flex items-center gap-1 border border-slate-200">
              <Clock size={11} className="text-red-500" />
              <span className="text-[10px] font-black text-slate-800 tracking-tight">
                {state.cycle_start_date ? `Semana ${currentComputedWeek}` : "ESPERANDO"}
              </span>
            </div>
          </div>
        </header>

        {/* TOAST PANEL */}
        {toastMessage && (
          <div className="absolute top-18 left-4 right-4 z-50 bg-slate-900 text-white rounded-2xl p-3 shadow-lg flex items-center gap-2 border border-slate-800 animate-slide-in">
            <Sparkles size={14} className="text-yellow-400 shrink-0" />
            <p className="text-[11px] font-bold leading-snug">{toastMessage}</p>
          </div>
        )}

        {/* DYNAMIC CELLULAR DAY TRACKER */}
        <div className="bg-white px-5 py-3 border-b border-slate-100 shrink-0 flex items-center justify-between gap-3 text-xs">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`w-2.5 h-2.5 rounded-full inline-block ${dayStatus.isPreplanning ? "bg-cyan-500" : "bg-emerald-500"}`} />
              <span className="font-extrabold text-[11px] text-slate-700 tracking-wide uppercase">Hoy: {dayStatus.currentDayName}</span>
              <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded border ${dayStatus.badgeClass}`}>
                {dayStatus.badgeText}
              </span>
            </div>
            <p className="text-[10px] text-slate-450 leading-snug font-medium">{dayStatus.description}</p>
          </div>
        </div>

        {/* COMPREHENSIVE ALERTS BAR FOR INFRACTIONS AND PUNISHMENTS */}
        {detailedStocks.penaltyApplied > 0 && (
          <div className="bg-red-50 border-b border-red-100 px-5 py-2.5 shrink-0 flex items-center gap-2 text-red-950 font-semibold text-[10.5px]">
            <AlertTriangle size={14} className="text-red-600 shrink-0" />
            <span>
              <strong>Penitencia de Racha:</strong> -{detailedStocks.penaltyApplied}p porción en stock de favoritos y blocks de 2-sem activos.
            </span>
          </div>
        )}

        {/* PRIMARY SCROLL VIEW */}
        <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-22 scroll-smooth">
          
          {/* TAB 1: CALENDAR VIEW */}
          {activeTab === "calendar" && (
            <div className="space-y-4 animate-fade-in text-slate-800">

              {/* Waiting status for first trigger */}
              {!state.cycle_start_date ? (
                <div className="bg-gradient-to-br from-red-550 to-rose-600 text-white rounded-2xl p-5 shadow-sm space-y-3">
                  <Flame size={22} className="text-white animate-bounce" />
                  <h3 className="font-black text-xs tracking-tight uppercase">¡Esperando Primer Registro! 💕</h3>
                  <p className="text-[11px] leading-relaxed text-red-50 font-semibold">
                    El plan de 8 semanas se asocia automáticamente a partir de su primer cheat real registrado. ¡No tienen que configurar fechas manualmente!
                  </p>
                  <p className="text-[10px] bg-white/10 p-2.5 rounded-xl text-red-100 font-bold leading-normal">
                    📌 <strong>Regla Celular:</strong> Durante Lunes a Jueves se prohibirán comidas consecutivas o sin stock. De Viernes a Domingo se permite elegir todo, pero se penalizará con menor stock de favoritos y dobles bloqueos.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-xs text-xs space-y-2.5">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="font-extrabold text-slate-500 uppercase tracking-wider text-[9.5px]">Estatus de Sostenibilidad</span>
                    <span className="bg-emerald-150 text-emerald-800 font-black text-[9px] px-2 py-0.5 rounded-full uppercase">Flujo Permanente</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10.5px] font-extrabold text-slate-600">
                    <div>📅 Fecha de Inicio: <span className="font-black text-slate-850">{new Date(state.cycle_start_date).toLocaleDateString()}</span></div>
                    <div>🎯 Racha en Proceso: <span className="font-black text-red-600">Semana {currentComputedWeek} activo</span></div>
                  </div>
                </div>
              )}

              {/* HISTORICAL WEEKS SCROLL */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-black text-xs text-slate-400 uppercase tracking-widest">Dashboard Calendario de Comidas</h3>
                  <span className="text-[10px] text-red-500 font-bold">Sin fin de ciclo 🔄</span>
                </div>

                {state.history.map((week) => {
                  const isCur = week.semana === currentComputedWeek;
                  const isCompleted = week.cena_novio !== null || week.cena_novia !== null;
                  
                  const getMealIcon = (m: MealType | null) => {
                    if (!m) return "🍽️";
                    if (m === "Hamburguesa") return "🍔";
                    if (m === "Salchipapa") return "🍟";
                    if (m === "Pizza") return "🍕";
                    if (m === "Sushi") return "🍣";
                    if (m === "Perro Caliente") return "🌭";
                    if (m === "Sándwich Callejero") return "🥪";
                    if (m === "Arepa") return "🫓";
                    return "🍱";
                  };

                  return (
                    <div 
                      key={week.semana}
                      className={`rounded-2xl border transition-all duration-300 relative ${
                        isCur 
                          ? "bg-white border-red-200 shadow-md ring-2 ring-red-100/50" 
                          : isCompleted 
                            ? "bg-slate-50/90 border-slate-200 opacity-90"
                            : "bg-white border-slate-150"
                      }`}
                    >
                      {/* Card Header information */}
                      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-6 h-6 rounded-full font-black text-[11px] flex items-center justify-center ${
                            isCur 
                              ? "bg-red-500 text-white animate-pulse" 
                              : isCompleted 
                                ? "bg-slate-300 text-slate-600"
                                : "bg-slate-100 text-slate-400"
                          }`}>
                            {week.semana}
                          </span>
                          <div>
                            <span className="font-black text-slate-800 text-xs">Semana {week.semana}</span>
                            <span className="text-[9.5px] text-slate-400 block font-semibold leading-none mt-0.5">
                              Sugerido: {getRoadmapForWeek(week.semana)}
                            </span>
                          </div>
                        </div>

                        {/* Status Label tags */}
                        <div className="flex items-center gap-1.5">
                          {week.infraction_detected && (
                            <span className="bg-red-100 text-red-800 text-[8.5px] font-black px-1.5 py-0.5 rounded border border-red-200">
                              🚨 PENALIZADO
                            </span>
                          )}
                          {isCur && (
                            <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded border ${
                              dayStatus.isPreplanning ? "bg-cyan-550/10 text-cyan-800 border-cyan-200" : "bg-emerald-550/10 text-emerald-800 border-emerald-200"
                            }`}>
                              {dayStatus.badgeText}
                            </span>
                          )}
                          {!isCur && isCompleted && (
                            <span className="text-[8.5px] font-black uppercase bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">
                              Registrado
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Main Choices dropdown selectors */}
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          
                          {/* JOSS DROP */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-extrabold uppercase text-slate-450 tracking-wider flex items-center gap-1 leading-none">
                              👦 Joss
                            </label>
                            
                            <select
                              value={week.cena_novio || ""}
                              onChange={(e) => handleSelectMeal(week.semana, "novio", (e.target.value as MealType) || null)}
                              className="w-full bg-slate-100/90 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-200 cursor-pointer"
                            >
                              <option value="">🍽️ Sin Registrar</option>
                              <option value="Hamburguesa">🍔 Hamburguesa</option>
                              <option value="Salchipapa">🍟 Salchipapa</option>
                              <option value="Pizza">🍕 Pizza</option>
                              <option value="Sushi">🍣 Sushi</option>
                              <option value="Perro Caliente">🌭 Perro Caliente</option>
                              <option value="Sándwich Callejero">🥪 Sándwich Callejero</option>
                              <option value="Arepa">🫓 Arepa</option>
                            </select>

                            <div className="text-center py-1 rounded bg-slate-100/40 border border-slate-200/50 text-[10px] font-black text-slate-600">
                              {getMealIcon(week.cena_novio)} {week.cena_novio || "Vacío"}
                            </div>
                          </div>

                          {/* NATT DROP */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-extrabold uppercase text-slate-450 tracking-wider flex items-center gap-1 leading-none">
                              👧 Natt
                            </label>
                            
                            <select
                              value={week.cena_novia || ""}
                              onChange={(e) => handleSelectMeal(week.semana, "novia", (e.target.value as MealType) || null)}
                              className="w-full bg-slate-100/90 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-200 cursor-pointer"
                            >
                              <option value="">🍽️ Sin Registrar</option>
                              <option value="Hamburguesa">🍔 Hamburguesa</option>
                              <option value="Salchipapa">🍟 Salchipapa</option>
                              <option value="Pizza">🍕 Pizza</option>
                              <option value="Sushi">🍣 Sushi</option>
                              <option value="Perro Caliente">🌭 Perro Caliente</option>
                              <option value="Sándwich Callejero">🥪 Sándwich Callejero</option>
                              <option value="Arepa">🫓 Arepa</option>
                            </select>

                            <div className="text-center py-1 rounded bg-slate-100/40 border border-slate-200/50 text-[10px] font-black text-slate-600">
                              {getMealIcon(week.cena_novia)} {week.cena_novia || "Vacío"}
                            </div>
                          </div>

                        </div>

                        {/* Extra controls row */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-4">
                          
                          {/* Extra sweet button */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleExtra(week.semana)}
                              className={`p-1.5 px-3 rounded-xl border text-[11px] font-black flex items-center gap-1 cursor-pointer transition ${
                                week.extra 
                                  ? "bg-rose-50 border-rose-200 text-rose-700 font-extrabold" 
                                  : "bg-slate-100 border-slate-205/80 text-slate-400"
                              }`}
                            >
                              🍧 {week.extra ? "Extra Dulce Activo" : "Sin Extra dulce"}
                            </button>
                          </div>

                          {/* Equalizer choice */}
                          {((week.cena_novio && !week.cena_novia) || (week.cena_novia && !week.cena_novio)) && (
                            <button
                              type="button"
                              onClick={() => handleDuplicarEleccion(week.semana)}
                              className="text-[10.5px] text-red-650 font-black flex items-center gap-1 hover:underline cursor-pointer"
                            >
                              💞 Comer lo Mismo
                            </button>
                          )}
                        </div>

                        {/* Infraction detailed warning flag block (only displays if they transgressed blockades in executing Fri-Sun) */}
                        {week.infraction_detected && (
                          <div className="bg-red-50 border border-red-200 p-3 rounded-xl space-y-1.5 mt-2 animate-fade-in text-red-950 font-semibold text-[10.5px]">
                            <h5 className="font-extrabold text-[10px] text-red-800 tracking-wider uppercase flex items-center gap-1">
                              🚨 INFRACCIÓN ADVERTIDA EN FIN DE SEMANA
                            </h5>
                            <p className="font-medium text-[10px]">
                              {week.infraction_details}
                            </p>
                            <p className="text-[9px] text-red-700 leading-tight italic">
                              ⚠️ Sanción aplicada en los stocks siguientes de este bloque de 8 semanas, desactivando la consecutividad de salchipapas temporalmente.
                            </p>
                          </div>
                        )}

                        {/* Professional Castigo Healthy metabolic task */}
                        {week.castigo_task && (
                          <div className="bg-amber-50/75 border border-amber-200 p-3 rounded-xl space-y-2 mt-2">
                            <h5 className="font-extrabold text-[10px] text-amber-800 tracking-wider uppercase flex items-center gap-1">
                              ⚡ Tarea de Compensación Saludable
                            </h5>
                            <p className="text-[10.5px] leading-relaxed text-amber-950 font-medium">
                              {week.castigo_task}
                            </p>
                            <div className="flex items-center justify-between pt-1 border-t border-amber-200/50 text-[10px]">
                              <span className="text-slate-500 font-bold">¿Compensaron el daño en pareja?</span>
                              <button
                                type="button"
                                onClick={() => handleTogglePenanceCompleted(week.semana)}
                                className={`font-black px-2.5 py-1 rounded-lg transition shrink-0 ${
                                  week.castigo_completed 
                                    ? "bg-emerald-600 text-white" 
                                    : "bg-white hover:bg-amber-100 text-amber-900 border border-amber-300"
                                }`}
                              >
                                {week.castigo_completed ? "✔ Hecho" : "Pendiente"}
                              </button>
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* TAB 2: PORTIONS STOCK COUNTERS */}
          {activeTab === "inventory" && (
            <div className="space-y-4 animate-fade-in text-slate-800">
              
              <div className="bg-white rounded-2xl p-5 border border-slate-150 shadow-xs">
                <h3 className="font-black text-xs text-slate-900 uppercase tracking-wider mb-1">
                  Inventario por Bloque de 8 Semanas
                </h3>
                <p className="text-[10.5px] text-slate-500 leading-normal mb-5 font-semibold">
                  Cada bloque de 8 semanas tiene un pool independiente. Si cometen infracciones de fin de semana (Fri-Sun), se restará un -0.5 de porciones a sus comidas favoritas (Hamburguesa, Pizza, Sushi) de inmediato.
                </p>

                <div className="space-y-4 font-bold text-xs">
                  
                  {/* Hamburguesas */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-800">🍔 Hamburguesas (Joss & Natt)</span>
                      <span className="text-slate-500">{detailedStocks.hamburguesa.toFixed(1)} libres / Máx 2.0</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(detailedStocks.hamburguesa / 2) * 100}%` }} />
                    </div>
                  </div>

                  {/* Salchipapa */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-800">🍟 Salchipapas</span>
                      <span className="text-slate-500">{detailedStocks.salchipapa.toFixed(1)} libres / Máx 1.0</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-orange-500 h-full rounded-full" style={{ width: `${(detailedStocks.salchipapa / 1) * 100}%` }} />
                    </div>
                  </div>

                  {/* Pizza */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-800">🍕 Pizzas</span>
                      <span className="text-slate-500">{detailedStocks.pizza.toFixed(1)} libres / Máx 2.0</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(detailedStocks.pizza / 2) * 100}%` }} />
                    </div>
                  </div>

                  {/* Sushi */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-800">🍣 Sushi</span>
                      <span className="text-slate-500">{detailedStocks.sushi.toFixed(1)} libres / Máx 1.0</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-sky-500 h-full rounded-full" style={{ width: `${(detailedStocks.sushi / 1) * 100}%` }} />
                    </div>
                  </div>

                  {/* Other street food list */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-800">🌭 Perros Calientes</span>
                      <span className="text-slate-500">{detailedStocks.perro_caliente.toFixed(1)} libres / Máx 1.0</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${(detailedStocks.perro_caliente / 1) * 100}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-800">🥪 Sándwich Callejero</span>
                      <span className="text-slate-500">{detailedStocks.sandwich_callejero.toFixed(1)} libres / Máx 1.0</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${(detailedStocks.sandwich_callejero / 1) * 100}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-800">🫓 Arepas</span>
                      <span className="text-slate-500">{detailedStocks.arepa.toFixed(1)} libres / Máx 1.0</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${(detailedStocks.arepa / 1) * 100}%` }} />
                    </div>
                  </div>

                  {/* Extras dulces */}
                  <div className="space-y-1 border-t border-slate-100 pt-3">
                    <div className="flex justify-between">
                      <span className="text-slate-800 font-extrabold text-rose-700">🍧 Extras Dulces (Postres / Helados)</span>
                      <span className="text-rose-900 font-black">{detailedStocks.extras.toFixed(1)} libres / Máx 4.0</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full rounded-full" style={{ width: `${(detailedStocks.extras / 4) * 100}%` }} />
                    </div>
                  </div>

                </div>
              </div>

              {/* STATS CONSOLIDATED */}
              <div className="bg-white rounded-2xl p-5 border border-slate-150 shadow-xs space-y-3">
                <h3 className="font-black text-xs text-slate-900 uppercase tracking-wide">
                  Historial Consolidado (Toda la Vida)
                </h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Cenas Libres</span>
                    <span className="text-lg font-black text-slate-800 block mt-1">{(totalCheatsRecorded * 2).toFixed(0)}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Extras dulces</span>
                    <span className="text-lg font-black text-slate-800 block mt-1">{totalExtrasRecorded}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase block text-red-650">Infracciones</span>
                    <span className="text-lg font-black text-red-650 block mt-1">{totalInfractionsLogged}</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: CASTIGOS COMPENSATION TABS */}
          {activeTab === "penance" && (
            <div className="space-y-4 animate-fade-in text-slate-800">
              
              <div className="bg-white rounded-2xl p-5 border border-slate-150 shadow-xs">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                    <Zap size={15} />
                  </div>
                  <div>
                    <h3 className="font-black text-xs text-slate-900 uppercase tracking-widest leading-none">
                      Compensación Saludable Activa
                    </h3>
                    <p className="text-[9px] text-slate-400 font-bold mt-1">Ciencia y protocolo para revertir deslices en pareja</p>
                  </div>
                </div>

                <p className="text-[10.5px] text-slate-500 leading-normal mt-4 bg-slate-50 p-3 rounded-xl border border-slate-205/50 font-semibold">
                  🌿 <strong>Compensación Científica de Sodio e Insulina:</strong> Cuando consumimos cheat meals pesados en fin de semana, hidratarse al máximo y realizar cardio LISS en ayunas el lunes y piernas el miércoles vacía las reservas de glucógeno y normaliza el balance sódico.
                </p>

                {/* PENANCE RECORD LIST */}
                <div className="space-y-3.5 mt-5">
                  <h4 className="text-[10px] font-black text-slate-405 uppercase tracking-widest">Compromisos de Reparación:</h4>
                  
                  {state.history.filter(h => h.castigo_task).length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <Award size={26} className="text-red-400 mx-auto mb-2" />
                      <p className="text-[11px] text-slate-450 font-black">¡Felicidades! Racha limpia perfecta y sin castigos por el momento.</p>
                    </div>
                  ) : (
                    state.history.filter(h => h.castigo_task).map((week) => (
                      <div 
                        key={week.semana}
                        className={`p-4 rounded-xl border transition ${
                          week.castigo_completed 
                            ? "bg-emerald-50/50 border-emerald-200 opacity-80" 
                            : "bg-amber-50/45 border-amber-200"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-black text-slate-700 text-xs">Semana {week.semana}</span>
                          <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded ${
                            week.castigo_completed ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}>
                            {week.castigo_completed ? "✔ Completado" : "Pendiente"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 leading-normal mb-3 font-semibold">
                          {week.castigo_task}
                        </p>
                        
                        <button
                          type="button"
                          onClick={() => handleTogglePenanceCompleted(week.semana)}
                          className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-black text-center flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <Check size={12} className={week.castigo_completed ? "text-emerald-600" : "text-slate-400"} />
                          <span>{week.castigo_completed ? "Volver a Pendiente" : "Marcar como Completado"}</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: ADJUSTMENTS SETTINGS (MINIMAL, RETAINING ONLY RESTART AND SIMULATE AS DESIRED) */}
          {activeTab === "settings" && (
            <div className="space-y-4 animate-fade-in text-slate-800">
              
              <div className="bg-white rounded-2xl p-5 border border-slate-150 shadow-xs space-y-4">
                <div className="pb-3 border-b border-slate-100">
                  <h3 className="font-black text-xs text-slate-900 uppercase tracking-wider">
                    Ajustes de Sostenibilidad
                  </h3>
                  <p className="text-[10px] text-slate-450 font-bold">Gestión simple y transparente del flujo eterno</p>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-1.5 text-xs text-slate-705">
                  <p className="font-black">👦 Perfil Novio: <span className="text-slate-900 font-extrabold">Joss</span></p>
                  <p className="font-black">👧 Perfil Novia: <span className="text-slate-900 font-extrabold">Natt</span></p>
                  <p className="font-bold text-[9.5px] text-slate-400 pt-1">
                    💖 Ajustes limpios sin chat bots IA o telemetría artificial.
                  </p>
                </div>

                {/* Simulated and debugging actions */}
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={handleLoadSimulation}
                    className="w-full py-3 bg-red-50 hover:bg-red-100/60 text-red-700 border border-red-250/20 rounded-2xl text-xs font-black transition cursor-pointer flex items-center justify-center"
                  >
                    🧪 Cargar Demostración Simulada (Semana 5)
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full py-3 bg-red-650 hover:bg-red-750 text-white rounded-2xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <RotateCcw size={12} /> Reiniciar Todo el Ciclo Eterno
                  </button>
                </div>
              </div>

              {/* Confirmation Reset Drawer */}
              {showResetConfirm && (
                <div className="bg-white rounded-2xl p-5 border-2 border-red-500 shadow-xl space-y-4 text-xs animate-fade-in">
                  <div className="flex items-center gap-2 text-red-600 font-black uppercase">
                    <AlertTriangle size={18} />
                    <h4>¿Restablecer absolutamente todo?</h4>
                  </div>
                  <p className="text-slate-600 leading-normal font-semibold">
                    Esta acción vaciará de forma irreversible el historial digital, los extras dulces planificados y las compensaciones activas para Joss y Natt.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(false)}
                      className="py-2 bg-slate-100 rounded-lg font-black text-slate-750 border border-slate-200"
                    >
                      No, cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleResetCycle}
                      className="py-2 bg-red-650 hover:bg-red-750 text-white font-black rounded-lg"
                    >
                      Sí, borrar datos
                    </button>
                  </div>
                </div>
              )}

              {/* Install PWA Prompt */}
              {pwaPromptShow && (
                <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-2.5 relative">
                  <button 
                    onClick={() => setPwaPromptShow(false)} 
                    className="absolute top-3 right-3 text-slate-400 hover:text-white font-black text-[10px]"
                  >
                    ✕
                  </button>
                  <h4 className="font-black text-[11px] uppercase text-yellow-500 tracking-wider">📲 Tenerlo como App Directa:</h4>
                  <p className="text-[10.5px] text-slate-300 leading-relaxed font-semibold">
                    Abre este enlace en Safari o Chrome desde tu celular. Pulsa en <strong>"Compartir"</strong> y selecciona <strong>"Añadir a pantalla de inicio"</strong>. ¡Funcionará de forma transparente e independiente!
                  </p>
                </div>
              )}

            </div>
          )}

        </main>

        {/* BOTTOM NAV TABS */}
        <nav className="bg-white border-t border-slate-100 px-3 py-2.5 shrink-0 flex items-center justify-around z-30 shadow-md">
          
          <button
            type="button"
            onClick={() => setActiveTab("calendar")}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition cursor-pointer select-none ${
              activeTab === "calendar" 
                ? "text-red-600 font-black bg-red-50" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Calendar size={18} />
            <span className="text-[9px] mt-1 font-black uppercase tracking-tight">Calendario</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("inventory")}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition cursor-pointer select-none ${
              activeTab === "inventory" 
                ? "text-red-600 font-black bg-red-50" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Sliders size={18} />
            <span className="text-[9px] mt-1 font-black uppercase tracking-tight">Porciones</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("penance")}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition cursor-pointer select-none relative ${
              activeTab === "penance" 
                ? "text-red-600 font-black bg-red-50" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Zap size={18} />
            <span className="text-[9px] mt-1 font-black uppercase tracking-tight">Castigos</span>
            {activePenancesCount > 0 && (
              <span className="absolute top-1 right-2 bg-amber-500 text-white font-black text-[8px] px-1.5 py-0.5 rounded-full leading-none shrink-0 text-center">
                {activePenancesCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition cursor-pointer select-none ${
              activeTab === "settings" 
                ? "text-red-600 font-black bg-red-50" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Settings size={18} />
            <span className="text-[9px] mt-1 font-black uppercase tracking-tight">Ajustes</span>
          </button>

        </nav>

      </div>
    </div>
  );
}
