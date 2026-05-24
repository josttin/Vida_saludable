import { useState, useEffect } from "react";
import { FitCycleState, FitCycleAPIResponse, MealType, SemanalInfo } from "./types";
import { getInitialState, calculateCastigo, INITIAL_INVENTORY, calculateFitCycle } from "./fitCycleEngine";
import { 
  Heart, 
  Calendar, 
  CheckCircle, 
  Settings, 
  Bell, 
  Check, 
  RotateCcw, 
  Zap, 
  Info, 
  Sliders, 
  Sparkles, 
  Award, 
  Flame, 
  UserCheck, 
  Coffee, 
  Clock, 
  History, 
  ShieldAlert, 
  Frown, 
  CheckSquare,
  AlertTriangle,
  Sparkle
} from "lucide-react";

export default function App() {
  // Names are strictly hardcoded to Joss and Natt
  const novioName = "Joss";
  const nattName = "Natt";

  // App logical state with LocalStorage persistence support so data is never lost
  const [state, setState] = useState<FitCycleState>(() => {
    const saved = localStorage.getItem("fitcycle_couple_state_v2");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure standard structure is correct
        if (parsed.history && parsed.history.length === 8) {
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
  const [showNotificationList, setShowNotificationList] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Custom states for the Date backdating helper in Settings
  const [backdateDays, setBackdateDays] = useState("0");
  const [pwaPromptShow, setPwaPromptShow] = useState(true);

  // Persistence triggers
  useEffect(() => {
    localStorage.setItem("fitcycle_couple_state_v2", JSON.stringify(state));
  }, [state]);

  // Toast dynamic notification helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Get dynamic cellular day of week status
  // if registered Mon-Thu -> Weekends programming. if Fri-Sun -> Eating executing
  const getDayStatus = () => {
    const d = new Date();
    const day = d.getDay(); // 0 is Sunday, 1-4 is Mon-Thu, 5-6 is Fri-Sat
    const isPreplanning = day >= 1 && day <= 4;
    const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const currentDayName = dayNames[day];

    return {
      isPreplanning,
      currentDayName,
      badgeText: isPreplanning ? "📝 Programación" : "🔥 Ejecución Real",
      description: isPreplanning 
        ? "Estás planificando por adelantado las comidas del fin de semana de forma inteligente."
        : "¡Buen provecho! Registrando el cheat meal consumido real de este fin de semana."
    };
  };

  const dayStatus = getDayStatus();

  // Automatic calculation of week based on cellular Date
  const calculateComputedWeek = () => {
    if (!state.cycle_start_date) {
      return 1;
    }
    const start = new Date(state.cycle_start_date);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    if (diffMs <= 0) return 1;
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const calculated = Math.floor(diffDays / 7) + 1;
    return Math.min(8, Math.max(1, calculated));
  };

  const currentComputedWeek = calculateComputedWeek();

  // Handle setting a custom meal selection for a specific partner in a specific week
  const handleSelectMeal = (weekNum: number, partner: "novio" | "novia", meal: MealType | null) => {
    const isStarting = !state.cycle_start_date;
    let updatedStartDate = state.cycle_start_date;

    // The cycle starts strictly upon registering the very first week!
    if (isStarting) {
      const today = new Date();
      updatedStartDate = today.toISOString();
      triggerToast("🚀 ¡Plan de 8 semanas INICIADO automáticamente hoy con su primer registro!");
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
        const penalty = calculateCastigo(nextInfo.cena_novio, nextInfo.cena_novia, nextInfo.extra);
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

  // Switch sweet extra dessert status
  const handleToggleExtra = (weekNum: number) => {
    const isStarting = !state.cycle_start_date;
    let updatedStartDate = state.cycle_start_date;

    if (isStarting) {
      const today = new Date();
      updatedStartDate = today.toISOString();
      triggerToast("🚀 ¡Plan de 8 semanas INICIADO automáticamente hoy con su primer registro de Extra!");
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

    const targetWeek = state.history.find(h => h.semana === weekNum);
    const nextVal = targetWeek ? !targetWeek.extra : true;
    if (nextVal) {
      triggerToast(`🍧 Extra dulce programado para la Semana ${weekNum}`);
    } else {
      triggerToast(`🍦 Extra dulce desmarcado para la Semana ${weekNum}`);
    }
  };

  // Toggle active penity / castigo task completed status
  const handleTogglePenanceCompleted = (weekNum: number) => {
    const updatedHistory = state.history.map((h) => {
      if (h.semana === weekNum) {
        const nextVal = !h.castigo_completed;
        if (nextVal) {
          triggerToast(`🏆¡Felicidades! Castigo saludable de Semana ${weekNum} completado y racha reparada.`);
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

  // Quick Action: Eat the same selection (Duplicar elección)
  const handleDuplicarEleccion = (weekNum: number) => {
    const weekData = state.history.find(h => h.semana === weekNum);
    if (!weekData) return;

    if (weekData.cena_novio && !weekData.cena_novia) {
      handleSelectMeal(weekNum, "novia", weekData.cena_novio);
      triggerToast(`💞 ¡Sincronizados! ${nattName} ahora comerá ${weekData.cena_novio} también.`);
    } else if (weekData.cena_novia && !weekData.cena_novio) {
      handleSelectMeal(weekNum, "novio", weekData.cena_novia);
      triggerToast(`💞 ¡Sincronizados! ${JossName} ahora comerá ${weekData.cena_novia} también.`);
    } else {
      triggerToast(`⚠️ Uno de los dos debe seleccionar una comida primero para poder duplicarla.`);
    }
  };

  // Get active name label helper
  const JossName = "Joss";

  const handleResetCycle = () => {
    localStorage.removeItem("fitcycle_couple_state_v2");
    setState(getInitialState());
    setBackdateDays("0");
    setShowResetConfirm(false);
    triggerToast("🔄 El ciclo ha sido reiniciado por completo. Listos para empezar!");
    setActiveTab("calendar");
  };

  const handleLoadSimulation = () => {
    // Generate realistic historical demo data
    const now = new Date();
    // Start cycle exactly 4 weeks ago
    const simulatedStart = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    const simulatedHistory: SemanalInfo[] = [
      { 
        semana: 1, 
        cena_novio: "Sushi", 
        cena_novia: "Sushi", 
        cena: "Sushi", 
        extra: false, 
        castigo_task: "🟢 Racha Limpia: Realizar 30 min de cardio habitual los días lunes o martes para maximizar la oxidación de grasas posterior y acelerar el vaciado de jugos gástricos.", 
        castigo_completed: true 
      },
      { 
        semana: 2, 
        cena_novio: "Hamburguesa", 
        cena_novia: "Pizza", 
        cena: "Hamburguesa", 
        extra: true, 
        castigo_task: "⚡ Drenaje Glucogénico: Recortar carbohidratos simples el lunes (sólo proteínas y crucíferos), más entrenamiento de piernas de altas repeticiones el miércoles para re-sensibilizar receptores de insulina. 🍧 [Ajuste de Insulina]: Evitar edulcorantes/estevia por 4 días para calmar receptores de dopamina, más 15 min de Cardio HIIT post-pescar hoy lunes.", 
        castigo_completed: true 
      },
      { 
        semana: 3, 
        cena_novio: "Salchipapa", 
        cena_novia: "Salchipapa", 
        cena: "Salchipapa", 
        extra: false, 
        castigo_task: "🚨 Protocolo de Choque Sódico: Realizar 45 min de cardio LISS (Caminata inclinada) en ayunas lunes, martes y miércoles, más beber 4.5 litros de agua diarios por 3 días para drenar retención celular.", 
        castigo_completed: false 
      },
      { 
        semana: 4, 
        cena_novio: "Sándwich Callejero", 
        cena_novia: "Hamburguesa", 
        cena: "Sándwich Callejero", 
        extra: true, 
        castigo_task: "🚨 Protocolo de Choque Sódico: Realizar 45 min de cardio LISS (Caminata inclinada) en ayunas lunes, martes y miércoles, más beber 4.5 litros de agua diarios por 3 días para drenar retención celular. 🍧 [Ajuste de Insulina]: Evitar edulcorantes/estevia por 4 días para calmar receptores de dopamina, más 15 min de Cardio HIIT post-pescar hoy lunes.", 
        castigo_completed: false 
      },
      { semana: 5, cena_novio: null, cena_novia: null, cena: null, extra: false },
      { semana: 6, cena_novio: null, cena_novia: null, cena: null, extra: false },
      { semana: 7, cena_novio: null, cena_novia: null, cena: null, extra: false },
      { semana: 8, cena_novio: null, cena_novia: null, cena: null, extra: false },
    ];

    setState({
      current_week: 5,
      cycle_start_date: simulatedStart.toISOString(),
      history: simulatedHistory
    });

    triggerToast("✨ Simulación realista de racha cargada en la Semana 5.");
    setActiveTab("calendar");
  };

  // Adjust start date backwards for debugging / fine adjustments
  const handleBackdateCycle = (days: number) => {
    if (!state.cycle_start_date) {
      triggerToast("⚠️ El ciclo aún no ha iniciado. Registra una comida primero.");
      return;
    }
    const currentStart = new Date(state.cycle_start_date);
    const newStart = new Date(currentStart.getTime() - days * 24 * 60 * 60 * 1000);
    setState(prev => ({
      ...prev,
      cycle_start_date: newStart.toISOString()
    }));
    triggerToast(`📅 Fecha de inicio retrocedida ${days} días.`);
  };

  // Calculate Portion Consumption for Portions/Stock view
  const getInventoryStatus = () => {
    let hamburguesasUsed = 0;
    let salchipapasUsed = 0;
    let pizzasUsed = 0;
    let sushisUsed = 0;
    let perrosUsed = 0;
    let sandwichesUsed = 0;
    let arepasUsed = 0;
    let extrasUsed = 0;

    state.history.forEach((h) => {
      // Joss
      if (h.cena_novio === "Hamburguesa") hamburguesasUsed += 0.5;
      else if (h.cena_novio === "Salchipapa") salchipapasUsed += 0.5;
      else if (h.cena_novio === "Pizza") pizzasUsed += 0.5;
      else if (h.cena_novio === "Sushi") sushisUsed += 0.5;
      else if (h.cena_novio === "Perro Caliente") perrosUsed += 0.5;
      else if (h.cena_novio === "Sándwich Callejero") sandwichesUsed += 0.5;
      else if (h.cena_novio === "Arepa") arepasUsed += 0.5;

      // Natt
      if (h.cena_novia === "Hamburguesa") hamburguesasUsed += 0.5;
      else if (h.cena_novia === "Salchipapa") salchipapasUsed += 0.5;
      else if (h.cena_novia === "Pizza") pizzasUsed += 0.5;
      else if (h.cena_novia === "Sushi") sushisUsed += 0.5;
      else if (h.cena_novia === "Perro Caliente") perrosUsed += 0.5;
      else if (h.cena_novia === "Sándwich Callejero") sandwichesUsed += 0.5;
      else if (h.cena_novia === "Arepa") arepasUsed += 0.5;

      if (h.extra) extrasUsed += 1.0;
    });

    return {
      hamburguesa: { label: "🍔 Hamburguesas", max: 2, used: hamburguesasUsed, remaining: Math.max(0, 2 - hamburguesasUsed) },
      salchipapa: { label: "🍟 Salchipapas", max: 1, used: salchipapasUsed, remaining: Math.max(0, 1 - salchipapasUsed) },
      pizza: { label: "🍕 Pizzas", max: 2, used: pizzasUsed, remaining: Math.max(0, 2 - pizzasUsed) },
      sushi: { label: "🍣 Sushis", max: 1, used: sushisUsed, remaining: Math.max(0, 1 - sushisUsed) },
      perro_caliente: { label: "🌭 Perros Calientes", max: 1, used: perrosUsed, remaining: Math.max(0, 1 - perrosUsed) },
      sandwich_callejero: { label: "🥪 Sándwiches", max: 1, used: sandwichesUsed, remaining: Math.max(0, 1 - sandwichesUsed) },
      arepa: { label: "🫓 Arepas", max: 1, used: arepasUsed, remaining: Math.max(0, 1 - arepasUsed) },
      extras: { label: "🍧 Extras Dulces", max: 4, used: extrasUsed, remaining: Math.max(0, 4 - extrasUsed) }
    };
  };

  const inventory = getInventoryStatus();

  // Highlight warnings or low-stocks
  const hasLowStocks = Object.values(inventory).some(item => item.remaining <= 0.5 && item.remaining > 0);

  // Recommendations roadmap helper
  const getRoadmapForWeek = (weekNum: number) => {
    switch (weekNum) {
      case 1: return "🍣 Sushi (Proteína limpia) - ¡Fuerza inicial!";
      case 2: return "🍔 Hamburguesa + 🍧 Permitido 1er Extra dulce";
      case 3: return "🍟 Salchipapa (Pesada) - 🔒 Prohibidos extras";
      case 4: return "🍕 Pizza + 🍧 Permitido Extra dulce";
      case 5: return "🍔 Hamburguesa sola de control - Sin postre";
      case 6: return "🥪 Sándwich Callejero + 🍧 Extra dulce";
      case 7: return "🌭 Perro Caliente o Arepa - 🔒 Prohibidos extras";
      case 8: return "🍕 Pizza / Hamburguesa festiva + 🍧 Cierre con Extra";
      default: return "";
    }
  };

  // Pre-calculated stats for visual summaries
  const totalCheatsRecorded = state.history.filter(h => h.cena_novio !== null || h.cena_novia !== null).length;
  const totalExtrasRecorded = state.history.filter(h => h.extra).length;
  const completedPenancesCount = state.history.filter(h => h.castigo_task && h.castigo_completed).length;
  const activePenancesCount = state.history.filter(h => h.castigo_task && !h.castigo_completed).length;

  return (
    <div className="min-h-[100dvh] bg-slate-950 flex items-center justify-center font-sans antialiased text-slate-900 md:p-6 select-none select-none">
      
      {/* Container simulating high-end mobile frame perfectly optimized for mobile screen dimensions */}
      <div className="w-full max-w-md h-[100dvh] md:h-[860px] md:max-h-[92vh] md:rounded-[48px] md:border-8 md:border-slate-800 bg-slate-50 relative flex flex-col md:shadow-2xl overflow-hidden shadow-none border-none rounded-none">
        
        {/* UPPER FIXED HEADER BAR */}
        <header className="bg-white border-b border-slate-100 px-5 py-4 shrink-0 flex items-center justify-between z-30 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-red-500 rounded-xl flex items-center justify-center text-white shadow-sm">
              <Heart size={16} className="fill-white" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-slate-900 flex items-center gap-1 font-display leading-none">
                FitCycle <span className="text-[9px] bg-red-105 text-red-600 font-extrabold px-1.5 py-0.5 rounded-sm">COMPROMISO</span>
              </h1>
              <p className="text-[10px] text-slate-400 mt-0.5 font-bold leading-none">Joss & Natt</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Clock & Real countdown helper */}
            <div className="bg-slate-100 rounded-lg px-2.5 py-1.5 flex items-center gap-1 border border-slate-250/20">
              <Clock size={12} className="text-red-550" />
              <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">
                {state.cycle_start_date ? `Semana ${currentComputedWeek}` : "Pausa"}
              </span>
            </div>
          </div>
        </header>

        {/* TOAST PANEL (Overlaid Alert system) */}
        {toastMessage && (
          <div className="absolute top-16 left-4 right-4 z-50 bg-slate-900 text-white rounded-2xl p-3.5 shadow-xl flex items-center gap-2.5 border border-slate-800 animate-slide-in">
            <Sparkles size={16} className="text-yellow-400 shrink-0" />
            <p className="text-xs font-bold leading-snug">{toastMessage}</p>
          </div>
        )}

        {/* SUBHEADER: LIVE INTELLIGENT CELLULAR DATE TRACKING INTERACTION */}
        <div className="bg-white px-5 py-3 border-b border-slate-100 shrink-0 flex items-center justify-between gap-3 text-xs">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`w-2.5 h-2.5 rounded-full inline-block ${dayStatus.isPreplanning ? "bg-cyan-500" : "bg-emerald-500"}`} />
              <span className="font-extrabold text-[11px] text-slate-700 tracking-wide uppercase">Hoy: {dayStatus.currentDayName} ({dayStatus.badgeText})</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-snug">{dayStatus.description}</p>
          </div>
          <div className="shrink-0 text-right">
            <span className="text-[10px] text-slate-400 block font-semibold">Calendario Celular</span>
            <span className="text-[10px] font-black text-slate-800 leading-none">Activo en Vivo</span>
          </div>
        </div>

        {/* INTERNAL SCROLL CONTENT CONTAINER */}
        <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-20 scroll-smooth">
          
          {/* TAB 1: INTERACTIVE CALENDAR DASHBOARD */}
          {activeTab === "calendar" && (
            <div className="space-y-4 animate-fade-in text-slate-800">

              {/* Status on Cycle State */}
              {!state.cycle_start_date ? (
                <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-2xl p-5 shadow-sm space-y-3">
                  <Flame size={24} className="text-white animate-pulse" />
                  <h3 className="font-black text-sm tracking-tight">¡Esperando Inicio del Ciclo! 🚀</h3>
                  <p className="text-xs leading-relaxed text-red-50 font-semibold">
                    El tracker inteligente de 8 semanas está listo. Se iniciará automáticamente en cuanto registren la primera comida de cheat meal o dulce de este fin de semana.
                  </p>
                  <p className="text-[10px] bg-white/10 p-2 rounded-lg text-red-100 font-bold">
                    💡 La app detecta si estás en "Programación del Finde" (Lunes a Jueves) o "Consumo Real" (Viernes a Domingo) usando la fecha de tu celular.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-4 border border-slate-205/60 shadow-xs text-xs space-y-2">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="font-extrabold text-slate-700 uppercase tracking-widest text-[10px]">Estatus de Racha actual</span>
                    <span className="bg-emerald-100 text-emerald-800 font-bold text-[9px] px-2 py-0.5 rounded-full uppercase">Ciclo Activo</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-600">
                    <div>📅 Inicio: <span className="font-extrabold text-slate-850">{new Date(state.cycle_start_date).toLocaleDateString()}</span></div>
                    <div>🎯 Semana actual: <span className="font-extrabold text-red-550">Semana {currentComputedWeek} de 8</span></div>
                  </div>
                </div>
              )}

              {/* WEEKLY CALENDAR LIST CARDS */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-extrabold text-xs text-slate-500 uppercase tracking-wider">Cronograma de 8 Semanas</h3>
                  <span className="text-[10px] text-slate-400 font-bold">Juntos en esto 💕</span>
                </div>

                {state.history.map((week) => {
                  const isCur = week.semana === currentComputedWeek;
                  const isCompleted = week.cena_novio !== null || week.cena_novia !== null;
                  
                  // Icons mappings
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
                      className={`rounded-2xl border transition-all duration-200 ${
                        isCur 
                          ? "bg-white border-red-200 shadow-md ring-2 ring-red-100" 
                          : isCompleted 
                            ? "bg-slate-50 border-slate-200 opacity-90"
                            : "bg-white border-slate-150"
                      }`}
                    >
                      {/* Week Header */}
                      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full font-black text-xs flex items-center justify-center ${
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
                            <span className="text-[10px] text-slate-400 block font-semibold leading-none mt-0.5">
                              Sugerido: {getRoadmapForWeek(week.semana)}
                            </span>
                          </div>
                        </div>

                        {/* Status Label based on real dates */}
                        {isCur && (
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                            dayStatus.isPreplanning ? "bg-cyan-100 text-cyan-800" : "bg-teal-100 text-teal-800"
                          }`}>
                            {dayStatus.badgeText}
                          </span>
                        )}
                        {!isCur && isCompleted && (
                          <span className="text-[8px] font-black uppercase bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                            Historial
                          </span>
                        )}
                      </div>

                      {/* Partners Selector Panel */}
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          
                          {/* JOSS INPUT SELECTOR */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-extrabold uppercase text-slate-450 tracking-wider flex items-center gap-1">
                              👦 {JossName}
                            </label>
                            
                            <select
                              value={week.cena_novio || ""}
                              onChange={(e) => handleSelectMeal(week.semana, "novio", (e.target.value as MealType) || null)}
                              className="w-full bg-slate-100 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-300 cursor-pointer"
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

                            <div className="text-center py-1 rounded bg-slate-50 text-[10px] font-extrabold text-slate-600">
                              {getMealIcon(week.cena_novio)} {week.cena_novio || "Vacío"}
                            </div>
                          </div>

                          {/* NATT INPUT SELECTOR */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-extrabold uppercase text-slate-450 tracking-wider flex items-center gap-1">
                              👧 {nattName}
                            </label>
                            
                            <select
                              value={week.cena_novia || ""}
                              onChange={(e) => handleSelectMeal(week.semana, "novia", (e.target.value as MealType) || null)}
                              className="w-full bg-slate-100 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-300 cursor-pointer"
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

                            <div className="text-center py-1 rounded bg-slate-50 text-[10px] font-extrabold text-slate-600">
                              {getMealIcon(week.cena_novia)} {week.cena_novia || "Vacío"}
                            </div>
                          </div>

                        </div>

                        {/* Duplicated meals helper & Extras Dulces row */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-4">
                          
                          {/* Sweet Extra switch */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleExtra(week.semana)}
                              className={`p-1.5 px-3 rounded-lg border text-[11px] font-black flex items-center gap-1 cursor-pointer transition ${
                                week.extra 
                                  ? "bg-rose-50 border-rose-200 text-rose-700 font-extrabold" 
                                  : "bg-slate-100 border-slate-200 text-slate-400"
                              }`}
                            >
                              🍧 {week.extra ? "Extra Activo" : "Sin Extra dulce"}
                            </button>
                          </div>

                          {/* Match Selector duplicated helper */}
                          {((week.cena_novio && !week.cena_novia) || (week.cena_novia && !week.cena_novio)) && (
                            <button
                              type="button"
                              onClick={() => handleDuplicarEleccion(week.semana)}
                              className="text-[10px] text-red-600 font-black flex items-center gap-1 hover:underline cursor-pointer"
                            >
                              💞 Comer lo Mismo
                            </button>
                          )}
                        </div>

                        {/* Calculated Fit Corrective Penance Task summary for visualization */}
                        {week.castigo_task && (
                          <div className="bg-amber-50/75 border border-amber-200 p-3 rounded-xl space-y-2 mt-2">
                            <h5 className="font-extrabold text-[10px] text-amber-800 tracking-wider uppercase flex items-center gap-1">
                              ⚠️ Castigo de Reparación:
                            </h5>
                            <p className="text-[10.5px] leading-relaxed text-amber-950 font-medium">
                              {week.castigo_task}
                            </p>
                            <div className="flex items-center justify-between pt-1 border-t border-amber-200/50">
                              <span className="text-[9px] text-slate-500">¿Daño compensado esta semana limpia?</span>
                              <button
                                type="button"
                                onClick={() => handleTogglePenanceCompleted(week.semana)}
                                className={`text-[10px] font-black px-2.5 py-1 rounded-lg transition shrink-0 ${
                                  week.castigo_completed 
                                    ? "bg-emerald-600 text-white" 
                                    : "bg-white hover:bg-amber-100 text-amber-900 border border-amber-350"
                                }`}
                              >
                                {week.castigo_completed ? "✔ Completado" : "Pendiente"}
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

          {/* TAB 2: PORTION INVENTORIES */}
          {activeTab === "inventory" && (
            <div className="space-y-4 animate-fade-in text-slate-800">
              
              <div className="bg-white rounded-2xl p-5 border border-slate-150 shadow-xs">
                <h3 className="font-black text-xs text-slate-905 uppercase tracking-wider mb-1">
                  Inventario en Vivo de las 8 Semanas
                </h3>
                <p className="text-[10.5px] text-slate-500 leading-normal mb-5 font-semibold">
                  Porciones máximas permitidas para Joss y Natt combinadas para evitar estancamientos metabólicos durante el ciclo:
                </p>

                <div className="space-y-4">
                  {Object.entries(inventory).map(([key, item]) => {
                    const percent = (item.remaining / item.max) * 100;
                    
                    // Style indicators
                    let barBg = "bg-red-500";
                    let textAccent = "text-slate-800";
                    if (percent === 0) {
                      barBg = "bg-slate-300";
                      textAccent = "text-slate-400 font-bold";
                    } else if (percent <= 25) {
                      barBg = "bg-rose-500 animate-pulse";
                      textAccent = "text-red-650 font-black";
                    } else if (percent <= 50) {
                      barBg = "bg-amber-500";
                      textAccent = "text-amber-800 font-extrabold";
                    } else {
                      barBg = "bg-emerald-500";
                    }

                    return (
                      <div key={key} className="space-y-1 pb-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-black text-slate-800">{item.label}</span>
                          <span className={`text-[11px] font-black ${textAccent}`}>
                            {item.remaining.toFixed(1)} libres (Usadas: {item.used.toFixed(1)} / Máx: {item.max})
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-205/30">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${barBg}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {hasLowStocks && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 mt-4">
                    <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-900 leading-normal">
                      <strong>¡Alerta de Consumo Crítico!</strong> Algunas porciones se encuentran muy bajas. Conversen entre ustedes para gestionar los próximos fines de semana.
                    </p>
                  </div>
                )}
              </div>

              {/* MOTIVATIONAL STATISTICS BOARD */}
              <div className="bg-white rounded-2xl p-5 border border-slate-150 shadow-xs space-y-3 shrink-0">
                <h3 className="font-black text-xs text-slate-900 uppercase tracking-wide">
                  Historial de Esfuerzo Resumido
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-center">
                    <span className="text-[9px] text-slate-400 uppercase font-black block leading-none">Cenas Libres</span>
                    <span className="text-lg font-black text-slate-800 block mt-1">{(totalCheatsRecorded * 2).toFixed(0)}</span>
                    <span className="text-[8px] text-slate-405 block font-bold">Porciones registradas</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-center">
                    <span className="text-[9px] text-slate-400 uppercase font-black block leading-none">Extras Dulces</span>
                    <span className="text-lg font-black text-slate-800 block mt-1">{totalExtrasRecorded}</span>
                    <span className="text-[8px] text-slate-405 block font-bold">Consumos permitidos</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-center">
                    <span className="text-[9px] text-slate-400 uppercase font-black block leading-none">Compensados</span>
                    <span className="text-lg font-black text-emerald-600 block mt-1">{completedPenancesCount}</span>
                    <span className="text-[8px] text-slate-405 block font-bold">Castigos saludables</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: CASTIGOS PENANCES CHECKLIST */}
          {activeTab === "penance" && (
            <div className="space-y-4 animate-fade-in text-slate-800">
              
              <div className="bg-white rounded-2xl p-5 border border-slate-150 shadow-xs">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                    <Zap size={16} />
                  </div>
                  <div>
                    <h3 className="font-black text-xs text-slate-905 uppercase tracking-widest">
                      Compensación Saludable (Monitoreo)
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold leading-none mt-0.5">La ciencia reparadora post-deslices</p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed mt-4 bg-slate-50 p-3 rounded-xl border border-slate-150 shadow-3xs font-semibold">
                  💡 <strong>¿Por qué se aplican castigos saludables?</strong> Cuando consumen sodio elevado, grasas rústicas o dulces concentrados, los receptores se saturan y el agua celular se eleva. En lugar de bloquearlos, utilicen estas técnicas clínicas de compensación lunes a jueves para resetear el metabolismo de inmediato.
                </p>

                {/* ACTIVE CASTIGOS CHECKLOGS */}
                <div className="space-y-3.5 mt-5">
                  <h4 className="text-[11px] font-extrabold text-slate-450 uppercase tracking-widest">Compromisos de las 8 semanas:</h4>
                  
                  {state.history.filter(h => h.castigo_task).length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <Award size={28} className="text-red-400 mx-auto mb-2 animate-bounce" />
                      <p className="text-[11px] text-slate-400 font-extrabold">¡Racha Perfecta! Sin daños ni castigos pendientes todavía.</p>
                    </div>
                  ) : (
                    state.history.filter(h => h.castigo_task).map((week) => (
                      <div 
                        key={week.semana}
                        className={`p-4 rounded-xl border transition ${
                          week.castigo_completed 
                            ? "bg-emerald-50/50 border-emerald-200 opacity-80" 
                            : "bg-amber-50/40 border-amber-200"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-black text-slate-700 text-xs">Semana {week.semana}</span>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                            week.castigo_completed ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}>
                            {week.castigo_completed ? "🏆 Completado" : "Pendiente"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 leading-normal mb-3 font-semibold">
                          {week.castigo_task}
                        </p>
                        
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleTogglePenanceCompleted(week.semana)}
                            className="w-full py-2 rounded-lg text-xs font-black text-center flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 transition bg-white hover:bg-slate-100"
                          >
                            <CheckSquare size={13} className={week.castigo_completed ? "text-emerald-600 fill-emerald-50" : "text-slate-400"} />
                            <span>{week.castigo_completed ? "Desmarcar para revisar" : "Marcar Castigo de Semana como Hecho"}</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: ADJUSTMENTS / SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-4 animate-fade-in text-slate-800">
              
              <div className="bg-white rounded-2xl p-5 border border-slate-150 shadow-xs">
                <div className="pb-3 border-b border-slate-100">
                  <h3 className="font-black text-xs text-slate-905 uppercase tracking-wider">
                    Ajustes de Joss & Natt
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-bold">Configuren o reseteen su ciclo sin rodeos o AI logs</p>
                </div>

                <div className="space-y-4 mt-4">
                  
                  {/* Info Row block */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2 text-xs">
                    <h5 className="font-extrabold text-[10px] text-slate-450 uppercase uppercase tracking-wider flex items-center gap-1">
                      <UserCheck size={12} className="text-red-500" /> Perfiles Activos
                    </h5>
                    <p className="font-extrabold text-slate-800">👦 Novio: <span className="text-red-650">Joss</span></p>
                    <p className="font-extrabold text-slate-800">👧 Novia: <span className="text-red-650">Natt</span></p>
                  </div>

                  {/* Date tuning Backdater adjustment tool (Extremely high fidelity for practical coupling!) */}
                  {state.cycle_start_date ? (
                    <div className="space-y-2 p-3.5 border border-slate-200 rounded-xl bg-slate-50">
                      <h4 className="font-extrabold text-[10px] uppercase text-slate-700 tracking-wider">
                        📅 Cambiar Fecha de Inicio del Ciclo
                      </h4>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                        Retroceder la fecha de inicio del ciclo si lo registraron tarde o desean coordinar semanas con otro día:
                      </p>
                      
                      <div className="flex gap-2">
                        <select
                          value={backdateDays}
                          onChange={(e) => setBackdateDays(e.target.value)}
                          className="flex-1 bg-white border border-slate-300 rounded-xl text-xs p-2 font-bold cursor-pointer"
                        >
                          <option value="0">Hoy (No retroceder)</option>
                          <option value="7">1 semana atrás (-7 días)</option>
                          <option value="14">2 semanas atrás (-14 días)</option>
                          <option value="21">3 semanas atrás (-21 días)</option>
                          <option value="28">4 semanas atrás (-28 días)</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleBackdateCycle(parseInt(backdateDays))}
                          className="bg-slate-900 text-white rounded-xl p-2 px-3.5 text-xs font-black hover:bg-slate-800 shrink-0 cursor-pointer"
                        >
                          Aplicar
                        </button>
                      </div>
                      <p className="text-[9px] text-slate-400 italic font-semibold">
                        Fecha de inicio configurada en la app: {new Date(state.cycle_start_date).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 text-center bg-slate-100 rounded-xl text-[10px] text-slate-400">
                      Registra tu primera cena para habilitar la fecha de inicio del ciclo.
                    </div>
                  )}

                  {/* Actions buttons */}
                  <div className="space-y-3 pt-2">
                    <button
                      type="button"
                      onClick={handleLoadSimulation}
                      className="w-full py-3 bg-red-50 hover:bg-red-100/70 text-red-700 border border-red-200/50 rounded-2xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-3xs"
                    >
                      🧪 Cargar Simulación de Prueba (Semana 5)
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(true)}
                      className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-extrabold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95 duration-200"
                    >
                      <RotateCcw size={14} /> Reiniciar Ciclo de 8 Semanas
                    </button>
                  </div>

                </div>
              </div>

              {/* Reset Confirm dialogue modal inline drawer */}
              {showResetConfirm && (
                <div className="bg-white rounded-2xl p-5 border-2 border-red-500 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 text-red-650">
                    <AlertTriangle size={20} className="fill-red-50 text-red-600 animate-bounce" />
                    <h4 className="font-extrabold text-sm uppercase">¿Deseas reiniciar de verdad?</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-normal">
                    Se borrarán todas las porciones consumidas, los extras dulces programados y las compensaciones saludables. Joss y Natt volverán al día 0.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(false)}
                      className="py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black cursor-pointer text-slate-700"
                    >
                      No, mantener plan
                    </button>
                    <button
                      type="button"
                      onClick={handleResetCycle}
                      className="py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-black cursor-pointer text-white"
                    >
                      Sí, borrar todo
                    </button>
                  </div>
                </div>
              )}

              {/* Minimalist install help block for mobile devices */}
              {pwaPromptShow && (
                <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-3 relative">
                  <button 
                    onClick={() => setPwaPromptShow(false)} 
                    className="absolute top-3 right-3 text-slate-400 hover:text-white font-extrabold text-xs"
                  >
                    ✕
                  </button>
                  <h4 className="font-black text-xs uppercase text-yellow-400">📲 Truco para tenerlo como una App:</h4>
                  <p className="text-[10.5px] text-slate-300 leading-relaxed font-semibold">
                    Esto es una <strong>PWA Oficial</strong>. Abre este enlace en el buscador de tu celular, pulsa en <strong>"Compartir"</strong> y elige <strong>"Añadir a pantalla de inicio"</strong>. ¡Trabajará como una app instalada real!
                  </p>
                </div>
              )}

            </div>
          )}

        </main>

        {/* STICKY BOTTOM NAVIGATION TABS AREA (Always visible, clean, mobile-optimized) */}
        <nav className="bg-white border-t border-slate-100 px-3 py-2.5 shrink-0 flex items-center justify-around z-30 shadow-md">
          
          {/* TAB 1: CALENDAR */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("calendar");
              setShowNotificationList(false);
            }}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition cursor-pointer select-none ${
              activeTab === "calendar" 
                ? "text-red-600 font-extrabold bg-red-50" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Calendar size={18} className={activeTab === "calendar" ? "stroke-[2.5]" : "stroke-2"} />
            <span className="text-[9px] mt-1 font-black uppercase tracking-tight">Calendario</span>
          </button>

          {/* TAB 2: PORTION STOCK COUNTERS */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("inventory");
              setShowNotificationList(false);
            }}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition cursor-pointer select-none relative ${
              activeTab === "inventory" 
                ? "text-red-600 font-extrabold bg-red-50" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Sliders size={18} className={activeTab === "inventory" ? "stroke-[2.5]" : "stroke-2"} />
            <span className="text-[9px] mt-1 font-black uppercase tracking-tight">Porciones</span>
            {hasLowStocks && (
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </button>

          {/* TAB 3: CASTIGOS */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("penance");
              setShowNotificationList(false);
            }}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition cursor-pointer select-none relative ${
              activeTab === "penance" 
                ? "text-red-600 font-extrabold bg-red-50" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Zap size={18} className={activeTab === "penance" ? "stroke-[2.5]" : "stroke-2"} />
            <span className="text-[9px] mt-1 font-black uppercase tracking-tight">Castigos</span>
            {activePenancesCount > 0 && (
              <span className="absolute -top-0.5 right-1 bg-amber-500 text-white font-black text-[8px] px-1.5 py-0.5 rounded-full leading-none shrink-0 min-w-4 text-center">
                {activePenancesCount}
              </span>
            )}
          </button>

          {/* TAB 4: SETTINGS */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("settings");
              setShowNotificationList(false);
            }}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition cursor-pointer select-none ${
              activeTab === "settings" 
                ? "text-red-600 font-extrabold bg-red-50" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Settings size={18} className={activeTab === "settings" ? "stroke-[2.5]" : "stroke-2"} />
            <span className="text-[9px] mt-1 font-black uppercase tracking-tight">Ajustes</span>
          </button>

        </nav>

      </div>
    </div>
  );
}
