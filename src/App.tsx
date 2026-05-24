import { useState, useEffect } from "react";
import { FitCycleState, SemanalInfo, MealType } from "./types";
import { 
  getInitialState, 
  ensureWeeksExist, 
  processFitCycle,
  calculateCoupleStats
} from "./fitCycleEngine";
import { 
  Heart, 
  Calendar, 
  TrendingUp, 
  Sliders, 
  ChevronRight, 
  AlertTriangle,
  Flame, 
  Smile, 
  CheckCircle, 
  ThumbsUp, 
  Award, 
  Percent, 
  Plus, 
  Dumbbell, 
  ArrowRightLeft, 
  Sparkles,
  Info
} from "lucide-react";

export default function App() {
  const novioName = "Joss";
  const nattName = "Natt";

  // Persistent State Management via LocalStorage
  const [state, setState] = useState<FitCycleState>(() => {
    const saved = localStorage.getItem("fitcycle_couple_state_eternal_v4");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.history && Array.isArray(parsed.history)) {
          return parsed;
        }
      } catch (e) {
        console.error("Error reading saved eternal state", e);
      }
    }
    return getInitialState();
  });

  const [activeTab, setActiveTab] = useState<"dashboard" | "planning">("dashboard");
  const [dayPhaseSim, setDayPhaseSim] = useState<"planning" | "execution">("planning"); // Mon-Thu Planificando vs Fri-Sun Comiendo
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  // Helper inside reactive loop to show transient feedback toasts safely
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Derive dynamic computations
  const calculated = processFitCycle(state);
  const currentComputedWeek = calculated.activeWeek;

  // Auto ensure that weekly blocks grow dynamically so you can view upcoming slots forever
  useEffect(() => {
    const upgradedHistory = ensureWeeksExist(state.history, currentComputedWeek);
    if (upgradedHistory.length !== state.history.length) {
      setState(prev => ({ ...prev, history: upgradedHistory }));
    }
  }, [currentComputedWeek, state.history.length]);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem("fitcycle_couple_state_eternal_v4", JSON.stringify(state));
  }, [state]);

  const stats = calculateCoupleStats(state.history, currentComputedWeek);

  // Identify block details affecting the current options
  const isSalchipapaBlocked = calculated.bloqueos_activos.salchipapa;
  const isExtraBlocked = calculated.bloqueos_activos.extra_helado;
  const isHeavyMealsPenalized = calculated.bloqueos_activos.hamburguesa_pizza_penalty;

  // Register meal changes with strict logic of Lunes-Jueves vs Viernes-Domingo
  const handleSelectMeal = (weekNum: number, partner: "novio" | "novia", meal: MealType | null) => {
    const isNewStart = !state.cycle_start_date;
    let nextStartDate = state.cycle_start_date;

    // Execution weekend locking: once registered in execution mode (Viernes, Sábado, Domingo), it cannot be modified until Monday
    if (dayPhaseSim === "execution" && nextStartDate) {
      const activeInfo = state.history.find(h => h.semana === weekNum);
      if (activeInfo) {
        if (partner === "novio" && activeInfo.cena_novio !== null) {
          triggerToast("🔒 No puedes modificar tu comida de Joss en fin de semana una vez registrada. Espera a Lunes-Jueves.");
          return;
        }
        if (partner === "novia" && activeInfo.cena_novia !== null) {
          triggerToast("🔒 No puedes modificar la comida de Natt en fin de semana una vez registrada. Espera a Lunes-Jueves.");
          return;
        }
      }
    }

    if (isNewStart && meal) {
      const today = new Date();
      nextStartDate = today.toISOString();
      triggerToast("🚀 ¡Ciclo eterno iniciado con su primer cheat meal registrado!");
    }

    if (meal) {
      // Mon-Thu PLANNING checks -> Strictly blocks unpermitted selections
      if (dayPhaseSim === "planning") {
        if (meal === "Salchipapa" && isSalchipapaBlocked) {
          triggerToast("⛔ NO PERMITIDO: La salchipapa está bloqueada para planificación en esta semana.");
          return;
        }
        if ((meal === "Hamburguesa" || meal === "Pizza") && isHeavyMealsPenalized) {
          triggerToast("⛔ NO PERMITIDO: Comidas pesadas bloqueadas por una infracción cometida la semana pasada.");
          return;
        }
      }
    }

    // Update history states
    const nextHistory = state.history.map((h) => {
      if (h.semana === weekNum) {
        const item = { ...h };
        if (partner === "novio") item.cena_novio = meal;
        else item.cena_novia = meal;
        item.cena = item.cena_novio || item.cena_novia;
        
        // Auto default share_mode if options are different, otherwise nullify if same
        if (item.cena_novio && item.cena_novia && item.cena_novio !== item.cena_novia) {
          if (!item.share_mode) item.share_mode = "mitad_mitad";
        } else {
          item.share_mode = null;
        }
        return item;
      }
      return h;
    });

    setState(prev => ({
      ...prev,
      cycle_start_date: nextStartDate,
      history: nextHistory
    }));

    if (meal) {
      triggerToast(`🍽️ ${partner === "novio" ? novioName : nattName} registró ${meal} en la Semana ${weekNum}`);
    } else {
      triggerToast(`🧼 Elección removida para la Semana ${weekNum}`);
    }
  };

  // Select share mode helper
  const handleSelectShareMode = (weekNum: number, mode: "mitad_mitad" | "cada_uno") => {
    const nextHistory = state.history.map((h) => {
      if (h.semana === weekNum) {
        return { ...h, share_mode: mode };
      }
      return h;
    });

    setState(prev => ({
      ...prev,
      history: nextHistory
    }));

    triggerToast(
      mode === "mitad_mitad"
        ? "🤝 Registrado: ¡Degustación a Mitad y Mitad! Compartiendo platos."
        : "🍽️ Registrado: Cada uno comerá su propio plato por su cuenta."
    );
  };

  // Toggle Sweet treats
  const handleToggleExtra = (weekNum: number) => {
    const isNewStart = !state.cycle_start_date;
    let nextStartDate = state.cycle_start_date;

    if (isNewStart) {
      const today = new Date();
      nextStartDate = today.toISOString();
      triggerToast("🚀 ¡Ciclo eterno iniciado hoy con su primer extra registrado!");
    }

    const currentElem = state.history.find(h => h.semana === weekNum);
    const targetState = currentElem ? !currentElem.extra : true;

    if (dayPhaseSim === "planning" && targetState === true) {
      if (isExtraBlocked) {
        triggerToast("⛔ NO PERMITIDO: El Dulce Extra está bloqueado para planificar consecutivamente.");
        return;
      }
    }

    const nextHistory = state.history.map((h) => {
      if (h.semana === weekNum) {
        return { ...h, extra: !h.extra };
      }
      return h;
    });

    setState(prev => ({
      ...prev,
      cycle_start_date: nextStartDate,
      history: nextHistory
    }));

    triggerToast(targetState ? `🍧 Extra dulce activado para la Semana ${weekNum}` : `🍦 Extra dulce desactivado`);
  };

  // Fast shortcut to clone each other's choice
  const handleClonePartnerMeal = (weekNum: number, source: "novio" | "novia") => {
    const weekData = state.history.find(h => h.semana === weekNum);
    if (!weekData) return;

    if (source === "novio" && weekData.cena_novio) {
      handleSelectMeal(weekNum, "novia", weekData.cena_novio);
    } else if (source === "novia" && weekData.cena_novia) {
      handleSelectMeal(weekNum, "novio", weekData.cena_novia);
    }
  };

  // Wipe cycles completely
  const handleWipeEverything = () => {
    localStorage.removeItem("fitcycle_couple_state_eternal_v4");
    setState(getInitialState());
    setShowConfig(false);
    triggerToast("🔄 Todos los registros y estadísticas han sido borrados.");
    setActiveTab("dashboard");
  };

  // Skip active week counter easily for custom timing verification
  const handleFastForwardWeek = () => {
    if (!state.cycle_start_date) {
      triggerToast("⚠️ Registren primero para iniciar el cronómetro de fechas reales.");
      return;
    }
    const currentStart = new Date(state.cycle_start_date);
    // Move start date 7 days into the past to simulated active week increment
    const earlierStart = new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    setState(prev => ({
      ...prev,
      cycle_start_date: earlierStart.toISOString()
    }));
    triggerToast("⏩ Viajaste 1 semana al futuro en el tiempo real.");
  };

  const getMealEmoji = (m: MealType | null) => {
    if (!m) return "🍽️";
    if (m === "Hamburguesa") return "🍔";
    if (m === "Salchipapa") return "🍟";
    if (m === "Pizza") return "🍕";
    if (m === "Sushi") return "🍣";
    if (m === "Perro Caliente") return "🌭";
    if (m === "Sándwich Callejero") return "🥪";
    if (m === "Arepa") return "🫓";
    if (m === "Pollo Broaster") return "🍗";
    return "🥡";
  };

  // Suggestions roadmap list for calendar decoration
  const getRoadmapForWeek = (weekNum: number) => {
    const cyclePos = ((weekNum - 1) % 6) + 1;
    switch (cyclePos) {
      case 1: return "🍣 Sugerencia: Sushi (Proteína Limpia)";
      case 2: return "🍔 Sugerencia: Hamburguesa Sola + Dulce";
      case 3: return "🫓 Sugerencia: Arepas Tradicionales Sincronizadas";
      case 4: return "🍕 Sugerencia: Pizza Crujiente Con Extra Dulce";
      case 5: return "🥪 Sugerencia: Sándwich Callejero (Control dulces)";
      case 6: return "🌭 Sugerencia: Perro Caliente Completo";
      default: return "";
    }
  };

  // Get active week data
  const activeWeekInfo = state.history.find(h => h.semana === currentComputedWeek) || {
    semana: currentComputedWeek,
    cena_novio: null,
    cena_novia: null,
    cena: null,
    extra: false
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans antialiased text-slate-900 md:p-6 select-none">
      
      {/* Visual device wrapper */}
      <div id="app-frame" className="w-full max-w-md h-[100vh] md:h-[880px] md:max-h-[95vh] md:rounded-[40px] md:border-[8px] md:border-slate-800 bg-slate-50 relative flex flex-col md:shadow-2xl overflow-hidden shadow-none border-none">
        
        {/* APP HEADER */}
        <header className="bg-white border-b border-rose-100 px-5 py-4 shrink-0 flex items-center justify-between z-30 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-md animate-pulse">
              <Heart size={18} className="fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black tracking-tight text-slate-900 font-display">
                  FitCycle <span className="text-rose-500 text-xs font-black">ETERNO</span>
                </span>
                <span className="text-[8px] bg-emerald-50 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded-full border border-emerald-100">
                  REAL-TIME
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5 leading-none">👦{novioName} & 👧{nattName} • En Pareja</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-100 rounded-xl px-2.5 py-1.5 flex items-center gap-1 border border-slate-200">
              <span className="text-[9.5px] font-black text-slate-700 uppercase tracking-tight">Semana {currentComputedWeek}</span>
            </div>
          </div>
        </header>

        {/* FEEDBACK TOASTS */}
        {toastMessage && (
          <div className="absolute top-18 left-4 right-4 z-50 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-3 shadow-lg flex items-center gap-2 border border-slate-800 animate-slide-up text-[11px] font-bold">
            <Sparkles size={14} className="text-rose-400 shrink-0" />
            <p className="flex-1 leading-snug">{toastMessage}</p>
          </div>
        )}

        {/* WORKFLOW CONTROLS STATS OVERVIEW */}
        <div className="bg-white border-b border-slate-100 px-4 py-2 shrink-0 flex items-center justify-between text-xs font-semibold gap-3 text-slate-650">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${dayPhaseSim === 'planning' ? 'bg-cyan-500' : 'bg-rose-500'}`} />
            <span className="text-[10px] font-black uppercase text-slate-500">Estado Celular:</span>
          </div>

          <div className="flex bg-slate-150 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => {
                setDayPhaseSim("planning");
                triggerToast("📝 Modo de Planificación (Lunes a Jueves) activado. Bloqueos aplicados estrictamente.");
              }}
              className={`px-2 py-1 text-[9px] font-black rounded-md transition ${
                dayPhaseSim === "planning" 
                  ? "bg-white text-slate-800 shadow-xs" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              📝 Lunes - Jueves
            </button>
            <button
              onClick={() => {
                setDayPhaseSim("execution");
                triggerToast("🔥 Modo Consumo Real (Viernes a Domingo). Puedes saltarte las reglas pero implicará castigo automático.");
              }}
              className={`px-2 py-1 text-[9px] font-black rounded-md transition ${
                dayPhaseSim === "execution" 
                  ? "bg-rose-500 text-white shadow-xs" 
                  : "text-slate-500 hover:text-rose-600"
              }`}
            >
              🔥 Viernes - Domingo
            </button>
          </div>
        </div>

        {/* PRIMARY SCROLL CONTAINER */}
        <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-20 scroll-smooth">

          {/* TAB 1: DASHBOARD & ETERNAL CALENDAR */}
          {activeTab === "dashboard" && (
            <div className="space-y-4 animate-fade-in">
              
              {/* COMPREHENSIVE ETERNAL STATUS BADGE */}
              <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400">
                    Estatus de Racha
                  </div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">
                    {state.cycle_start_date ? "Flujo Permanente Activo" : "Esperando Primer Registro"}
                  </h3>
                  <p className="text-[10.5px] text-slate-500 font-medium leading-normal">
                    {state.cycle_start_date 
                      ? "Este sistema se auto-modera y expande indefinidamente. No hay fin de 8 semanas, aprendiendo eternamente de cada plato." 
                      : "Registren su primer cheat meal de la semana y comiencen automáticamente la racha."
                    }
                  </p>
                </div>
                
                <div className={`p-3 rounded-2xl border text-center font-black text-[11px] uppercase tracking-wide shrink-0 ${
                  calculated.stateColor === "rojo" 
                    ? "bg-red-50 border-red-200 text-red-700"
                    : calculated.stateColor === "amarillo"
                      ? "bg-amber-50 border-amber-200 text-amber-700"
                      : "bg-cyan-50 border-cyan-200 text-cyan-700"
                }`}>
                  <span className="block text-[8px] font-bold text-slate-400">Estado</span>
                  {calculated.stateTitle}
                </div>
              </div>

              {/* AUTOMATIC SMART RECOMMENDATION BOX */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-5 shadow-lg border border-slate-800 space-y-3 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-32 h-32 bg-rose-500/10 rounded-full filter blur-xl" />
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-rose-400 animate-spin" />
                  <span className="text-[10px] font-black text-rose-350 tracking-widest uppercase">
                    Propuesta del Algoritmo de Variabilidad
                  </span>
                </div>
                
                <h4 className="font-extrabold text-sm text-yellow-350 leading-tight">
                  {calculated.sugerencia.title}
                </h4>
                
                <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                  {calculated.sugerencia.message}
                </p>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-extrabold text-slate-400">
                  <span>Basado en su historial completo</span>
                  <span className="text-rose-450 italic">Joss & Natt Sostenibles ♥</span>
                </div>
              </div>

              {/* STATISTICS METRICS "CÓMO COMEMOS" */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex justify-between items-center border-b border-slate-105 pb-3">
                  <h3 className="font-black text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-rose-500" />
                    Cómo Comemos (Métricas Cruzadas)
                  </h3>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                    stats.historicalGrade.includes("S") 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}>
                    Nota {stats.historicalGrade}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                    <span className="text-[8px] text-slate-450 font-black uppercase block leading-none">Cenas Libres</span>
                    <span className="text-base font-black text-slate-850 block mt-1">{stats.totalCheats}</span>
                    <span className="text-[8px] text-slate-400 font-bold block mt-0.5">En total</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                    <span className="text-[8px] text-slate-450 font-black uppercase block leading-none">Coincidencia</span>
                    <span className="text-base font-black text-rose-600 block mt-1">{stats.coincidenceRate}%</span>
                    <span className="text-[8px] text-slate-400 font-bold block mt-0.5">Compartido</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                    <span className="text-[8px] text-slate-350 font-black uppercase block leading-none">Índice Dulce</span>
                    <span className="text-base font-black text-slate-800 block mt-1">{stats.sweetToothRate}%</span>
                    <span className="text-[8px] text-slate-400 font-bold block mt-0.5">Helados</span>
                  </div>
                </div>

                {/* INDIVIDUAL PREFERENCES CHART METERS */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  
                  {/* JOSS PREFS */}
                  <div className="space-y-2">
                    <h4 className="text-[9.5px] font-black uppercase text-slate-500 flex items-center gap-1">
                      👦 Top Joss
                    </h4>
                    {stats.jossPreferences.length === 0 ? (
                      <span className="text-[10px] text-slate-400 font-bold italic block">Sin datos aún</span>
                    ) : (
                      <div className="space-y-1.5">
                        {stats.jossPreferences.slice(0, 3).map((pref, i) => (
                          <div key={pref.name} className="text-[10px] font-bold">
                            <div className="flex justify-between text-slate-600">
                              <span>{getMealEmoji(pref.name as MealType)} {pref.name}</span>
                              <span>{pref.count}</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-0.5">
                              <div className="bg-slate-700 h-full rounded-full" style={{ width: `${pref.pct}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* NATT PREFS */}
                  <div className="space-y-2">
                    <h4 className="text-[9.5px] font-black uppercase text-slate-500 flex items-center gap-1">
                      👧 Top Natt
                    </h4>
                    {stats.nattPreferences.length === 0 ? (
                      <span className="text-[10px] text-slate-400 font-bold italic block">Sin datos aún</span>
                    ) : (
                      <div className="space-y-1.5">
                        {stats.nattPreferences.slice(0, 3).map((pref, i) => (
                          <div key={pref.name} className="text-[10px] font-bold">
                            <div className="flex justify-between text-slate-600">
                              <span>{getMealEmoji(pref.name as MealType)} {pref.name}</span>
                              <span>{pref.count}</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-0.5">
                              <div className="bg-rose-500 h-full rounded-full" style={{ width: `${pref.pct}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* INTEGRATED VIEW-ONLY ETERNAL CALENDAR */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Calendar size={13} />
                    Bitácora Histórica Eternidad
                  </h3>
                  <span className="text-[9px] text-slate-400 font-bold">Historial de Racha</span>
                </div>

                {state.history.map((week) => {
                  const isCurrent = week.semana === currentComputedWeek;
                  const isRegistered = week.cena_novio !== null || week.cena_novia !== null;
                  
                  return (
                    <div 
                      key={week.semana}
                      className={`rounded-2xl border p-3 flex flex-col gap-2.5 transition ${
                        isCurrent 
                          ? "bg-rose-500/5 border-rose-250 ring-2 ring-rose-200/40" 
                          : isRegistered 
                            ? "bg-white border-slate-200 opacity-95 shadow-2xs" 
                            : "bg-slate-100/70 border-slate-205 border-dashed"
                      }`}
                    >
                      {/* Top indicator row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-5.5 h-5.5 rounded-full font-black text-[10px] flex items-center justify-center ${
                            isCurrent 
                              ? "bg-rose-500 text-white" 
                              : isRegistered 
                                ? "bg-slate-300 text-slate-700"
                                : "bg-slate-200 text-slate-400"
                          }`}>
                            {week.semana}
                          </span>
                          <div>
                            <span className="text-xs font-black text-slate-800">Semana {week.semana}</span>
                            <span className="text-[9px] text-slate-400 font-bold block leading-none">
                              {getRoadmapForWeek(week.semana)}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-1 items-center">
                          {week.infraction_detected && (
                            <span className="text-[8px] font-black bg-red-100 text-red-700 px-1.5 py-0.5 rounded border border-red-200">
                              ⚠️ INFRACCIÓN
                            </span>
                          )}
                          {!week.infraction_detected && isRegistered && (
                            <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                              ✓ RACHA LIMPIA
                            </span>
                          )}
                          {isCurrent && (
                            <span className="text-[8px] font-extrabold bg-rose-500 text-white px-2 py-0.5 rounded-full">
                              ACTUAL
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Display registered meals side-by-side cleanly without select dropdown controls */}
                      {isRegistered ? (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-slate-50 border border-slate-150 rounded-xl p-2 flex items-center justify-between text-slate-700">
                            <div>
                              <span className="text-[8.5px] font-black text-slate-400 uppercase block">Joss</span>
                              <span className="font-black text-slate-850 truncate max-w-[80px] inline-block">
                                {getMealEmoji(week.cena_novio)} {week.cena_novio || "Vacío"}
                              </span>
                            </div>
                          </div>

                          <div className="bg-slate-50 border border-slate-150 rounded-xl p-2 flex items-center justify-between text-slate-700">
                            <div>
                              <span className="text-[8.5px] font-black text-rose-400 uppercase block font-display">Natt</span>
                              <span className="font-black text-slate-850 truncate max-w-[80px] inline-block">
                                {getMealEmoji(week.cena_novia)} {week.cena_novia || "Vacío"}
                              </span>
                            </div>
                          </div>

                          {week.cena_novio !== week.cena_novia && week.cena_novio && week.cena_novia && (
                            <div className="col-span-2 bg-rose-50/50 border border-rose-100 rounded-xl px-2.5 py-1.5 flex items-center justify-between text-[10px] text-rose-900 leading-none">
                              <span className="font-extrabold flex items-center gap-1">🤝 Tipo de Consumo:</span>
                              <span className="font-black uppercase tracking-wider bg-rose-100 text-rose-800 px-2 py-0.5 rounded-lg text-[8.5px]">
                                {week.share_mode === "mitad_mitad" ? "Mitad y Mitad" : "Cada uno lo suyo"}
                              </span>
                            </div>
                          )}

                          <div className="col-span-2 pt-1 border-t border-slate-100 flex items-center justify-between text-[9.5px] text-slate-500">
                            <span className="font-bold">Postre Dulce adicional:</span>
                            <span className={`font-black uppercase tracking-wider ${week.extra ? "text-rose-600 font-extrabold" : "text-slate-400"}`}>
                              {week.extra ? "🍨 Activo" : "❌ No consumido"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-2 text-[10px] text-slate-400 font-bold italic">
                          Sin registrar • Esperando a su tiempo real
                        </div>
                      )}

                      {/* Display warning description directly inside calendar if infractions happened */}
                      {week.infraction_detected && week.infraction_details && (
                        <div className="bg-red-50/70 border border-red-100 p-2.5 rounded-xl text-[9.5px] text-red-900 font-bold leading-normal">
                          <div className="flex items-start gap-1">
                            <AlertTriangle size={11} className="text-red-500 shrink-0 mt-0.5" />
                            <span>{week.infraction_details}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* TAB 2: SELECT MEAL FOR ACTIVE WEEK ONLY */}
          {activeTab === "planning" && (
            <div className="space-y-4 animate-fade-in text-slate-800">
              
              {/* CURRENT WEEK BIG PANEL */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4 relative">
                
                <div className="pb-3 border-b border-slate-105 flex items-center justify-between">
                  <div>
                    <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest">Registrando Comida de la Semana</span>
                    <h3 className="text-xl font-black text-slate-900 leading-none mt-1">
                      Semana {currentComputedWeek}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] bg-red-105 text-red-650 font-black px-2 py-0.5 rounded-full uppercase border border-red-200">
                      Entrada Exclusiva
                    </span>
                  </div>
                </div>

                {/* SHOW ME WHICH RULES ARE ACTIVE IMMEDIATELY WITH CLEAR BLOCK SYMBOLS */}
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-2.5">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Reglas metabólicas activas esta semana:
                  </h4>
                  
                  <div className="space-y-2 text-[11px] font-extrabold text-slate-700">
                    
                    {/* Salchipapa Lock logic */}
                    <div className="flex items-center justify-between">
                      <span>🍟 Salchipapas Crujientes:</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[9.5px] font-black uppercase ${
                        isSalchipapaBlocked 
                          ? "bg-red-50 text-red-700 border border-red-150" 
                          : "bg-emerald-50 text-emerald-700 border border-emerald-150"
                      }`}>
                        {isSalchipapaBlocked ? "🔒 BLOQUEADAS (Desliz / Consiguiente)" : "✔ PERMITIDO"}
                      </span>
                    </div>

                    {/* Extra sweets Lock logic */}
                    <div className="flex items-center justify-between">
                      <span>🍧 Extras dulces (Helado / Postre):</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[9.5px] font-black uppercase ${
                        isExtraBlocked 
                          ? "bg-red-50 text-red-700 border border-red-150" 
                          : "bg-emerald-50 text-emerald-700 border border-emerald-150"
                      }`}>
                        {isExtraBlocked ? "🔒 BLOQUEADOS (Consecutividad)" : "✔ PERMITIDO"}
                      </span>
                    </div>

                    {/* Heavy Meals Restriction Lock logic */}
                    <div className="flex items-center justify-between">
                      <span>🍔 & 🍕 Hamburguesa / Pizza:</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[9.5px] font-black uppercase ${
                        isHeavyMealsPenalized 
                          ? "bg-red-50 text-red-700 border border-red-150" 
                          : "bg-emerald-50 text-emerald-700 border border-emerald-150"
                      }`}>
                        {isHeavyMealsPenalized ? "🔑 RESTRINGIDAS (Castigo por desliz)" : "✔ PERMITIDO"}
                      </span>
                    </div>

                  </div>

                  {dayPhaseSim === 'planning' ? (
                    <div className="text-[9.5px] text-cyan-700 font-extrabold leading-normal bg-cyan-50/70 p-2.5 rounded-xl border border-cyan-100 flex gap-1.5 items-start mt-1">
                      <Info size={12} className="shrink-0 mt-0.5" />
                      <span>Estás en modo planificación. El sistema evitará que elijas las opciones bloqueadas o en castigo para ayudarte a controlar la racha.</span>
                    </div>
                  ) : (
                    <div className="text-[9.5px] text-rose-700 font-extrabold leading-normal bg-rose-50/70 p-2.5 rounded-xl border border-rose-100 flex gap-1.5 items-start mt-1">
                      <Info size={12} className="shrink-0 mt-0.5" />
                      <span>Estás en modo consumo real de fin de semana. Puedes registrar opciones bloqueadas pero implicará una multa inmediata y un bloqueo doble extendido en la siguiente semana.</span>
                    </div>
                  )}
                </div>

                {/* SELECTOR CONTROLS */}
                <div className="space-y-4 pt-2">
                  
                  {/* JOSS CONTROLLER */}
                  <div className="space-y-2 bg-slate-50/50 rounded-2xl p-4 border border-slate-150 relative overflow-hidden">
                    {dayPhaseSim === "execution" && activeWeekInfo.cena_novio !== null && (
                      <div className="absolute top-1.5 right-2 flex items-center gap-1 text-[9px] bg-slate-900 text-white font-black px-2 py-0.5 rounded-md shadow-xs">
                        <span>🔒 Consumido</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center bg-transparent">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-650 flex items-center gap-1.5">
                        👦 Elección de {novioName} {dayPhaseSim === "execution" && activeWeekInfo.cena_novio !== null && "(Bloqueado)"}
                      </label>
                      <span className="text-[10px] text-slate-405 font-bold">Comida Cheat</span>
                    </div>

                    {/* Button grid of options */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(["Hamburguesa", "Salchipapa", "Pizza", "Sushi", "Perro Caliente", "Sándwich Callejero", "Arepa", "Pollo Broaster"] as MealType[]).map((meal) => {
                        const isChosen = activeWeekInfo.cena_novio === meal;
                        // Determine if option is logically locked
                        const isLockedOption = ((dayPhaseSim === "planning") && (
                          (meal === "Salchipapa" && isSalchipapaBlocked) ||
                          ((meal === "Hamburguesa" || meal === "Pizza") && isHeavyMealsPenalized)
                        )) || (dayPhaseSim === "execution" && activeWeekInfo.cena_novio !== null);

                        return (
                          <button
                            key={meal}
                            type="button"
                            onClick={() => handleSelectMeal(currentComputedWeek, "novio", isChosen ? null : meal)}
                            disabled={isLockedOption}
                            className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                              isChosen 
                                ? "bg-slate-900 border-slate-900 text-white font-black" 
                                : isLockedOption
                                  ? "bg-slate-105 border-slate-205 text-slate-350 line-through cursor-not-allowed"
                                  : "bg-white border-slate-205 hover:bg-slate-100/60 text-slate-700 font-bold"
                            }`}
                          >
                            <span className="text-lg leading-none">
                              {isChosen && dayPhaseSim === "execution" ? "🔒" : getMealEmoji(meal)}
                            </span>
                            <span className="text-[9px] truncate max-w-full leading-tight font-black">{meal}</span>
                          </button>
                        );
                      })}
                    </div>

                    {activeWeekInfo.cena_novio && dayPhaseSim !== "execution" && (
                      <button
                        type="button"
                        onClick={() => handleSelectMeal(currentComputedWeek, "novio", null)}
                        className="text-[10px] text-slate-500 font-bold hover:underline"
                      >
                        Limpiar selección de Joss
                      </button>
                    )}
                  </div>

                  {/* NATT CONTROLLER */}
                  <div className="space-y-2 bg-slate-50/50 rounded-2xl p-4 border border-slate-150 relative overflow-hidden">
                    {dayPhaseSim === "execution" && activeWeekInfo.cena_novia !== null && (
                      <div className="absolute top-1.5 right-2 flex items-center gap-1 text-[9px] bg-rose-600 text-white font-black px-2 py-0.5 rounded-md shadow-xs">
                        <span>🔒 Consumido</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center bg-transparent">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-650 flex items-center gap-1.5">
                        👧 Elección de {nattName} {dayPhaseSim === "execution" && activeWeekInfo.cena_novia !== null && "(Bloqueada)"}
                      </label>
                      <span className="text-[10px] text-slate-405 font-bold">Comida Cheat</span>
                    </div>

                    {/* Button grid of options */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(["Hamburguesa", "Salchipapa", "Pizza", "Sushi", "Perro Caliente", "Sándwich Callejero", "Arepa", "Pollo Broaster"] as MealType[]).map((meal) => {
                        const isChosen = activeWeekInfo.cena_novia === meal;
                        // Determine if option is logically locked
                        const isLockedOption = ((dayPhaseSim === "planning") && (
                          (meal === "Salchipapa" && isSalchipapaBlocked) ||
                          ((meal === "Hamburguesa" || meal === "Pizza") && isHeavyMealsPenalized)
                        )) || (dayPhaseSim === "execution" && activeWeekInfo.cena_novia !== null);

                        return (
                          <button
                            key={meal}
                            type="button"
                            onClick={() => handleSelectMeal(currentComputedWeek, "novia", isChosen ? null : meal)}
                            disabled={isLockedOption}
                            className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                              isChosen 
                                ? "bg-rose-600 border-rose-600 text-white font-black" 
                                : isLockedOption
                                  ? "bg-slate-105 border-slate-205 text-slate-350 line-through cursor-not-allowed"
                                  : "bg-white border-slate-205 hover:bg-slate-100/60 text-slate-700 font-bold"
                            }`}
                          >
                            <span className="text-lg leading-none">
                              {isChosen && dayPhaseSim === "execution" ? "🔒" : getMealEmoji(meal)}
                            </span>
                            <span className="text-[9px] truncate max-w-full leading-tight font-black">{meal}</span>
                          </button>
                        );
                      })}
                    </div>

                    {activeWeekInfo.cena_novia && dayPhaseSim !== "execution" && (
                      <button
                        type="button"
                        onClick={() => handleSelectMeal(currentComputedWeek, "novia", null)}
                        className="text-[10px] text-rose-500 font-bold hover:underline"
                      >
                        Limpiar selección de Natt
                      </button>
                    )}
                  </div>

                  {/* SWEETS SWITCH OR CLONING HELPER */}
                  <div className="flex flex-col gap-3 pt-2">
                    
                    {/* Synchronize choice button */}
                    <div className="flex gap-2">
                      {activeWeekInfo.cena_novio && !activeWeekInfo.cena_novia && (
                        <button
                          type="button"
                          onClick={() => handleClonePartnerMeal(currentComputedWeek, "novio")}
                          className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-[10.5px] font-black border border-slate-200 flex items-center justify-center gap-1 cursor-pointer transition"
                        >
                          💞 ¡Replicar plato de Joss para Natt ({activeWeekInfo.cena_novio})!
                        </button>
                      )}

                      {activeWeekInfo.cena_novia && !activeWeekInfo.cena_novio && (
                        <button
                          type="button"
                          onClick={() => handleClonePartnerMeal(currentComputedWeek, "novia")}
                          className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-[10.5px] font-black border border-slate-200 flex items-center justify-center gap-1 cursor-pointer transition"
                        >
                          💞 ¡Replicar plato de Natt para Joss ({activeWeekInfo.cena_novia})!
                        </button>
                      )}
                    </div>

                    {/* COMPARTIDO O CADA UNO LO SUYO TOGGLE */}
                    {activeWeekInfo.cena_novio && activeWeekInfo.cena_novia && activeWeekInfo.cena_novio !== activeWeekInfo.cena_novia && (
                      <div className="bg-gradient-to-r from-pink-50 via-rose-50/30 to-rose-50 border border-rose-200 rounded-2xl p-4 space-y-3 animate-fade-in">
                        <div className="flex items-center gap-2">
                          <span className="text-base text-rose-500">🤝</span>
                          <div>
                            <h4 className="text-xs font-black text-rose-950 uppercase tracking-widest">Platos Diferentes Detectados</h4>
                            <p className="text-[10.5px] text-rose-700 font-bold leading-tight">¿Cómo compartirán esta deliciosa experiencia?</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => handleSelectShareMode(currentComputedWeek, "mitad_mitad")}
                            className={`py-3 px-2 rounded-xl border font-black transition text-center flex flex-col items-center justify-center gap-1 cursor-pointer ${
                              activeWeekInfo.share_mode === "mitad_mitad"
                                ? "bg-rose-500 border-rose-500 text-white shadow-sm"
                                : "bg-white border-rose-200 text-rose-950 hover:bg-rose-100/40"
                            }`}
                          >
                            <span className="text-sm">🤝</span>
                            <span className="text-[10px] font-black">Mitad y Mitad</span>
                            <span className="text-[8.5px] font-bold opacity-85">(Degustan ambos)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectShareMode(currentComputedWeek, "cada_uno")}
                            className={`py-3 px-2 rounded-xl border font-black transition text-center flex flex-col items-center justify-center gap-1 cursor-pointer ${
                              activeWeekInfo.share_mode === "cada_uno"
                                ? "bg-slate-800 border-slate-800 text-white shadow-sm"
                                : "bg-white border-slate-250 text-slate-705 hover:bg-slate-100/40"
                            }`}
                          >
                            <span className="text-sm">🍽️</span>
                            <span className="text-[10px] font-black">Cada Uno lo Suyo</span>
                            <span className="text-[8.5px] font-bold opacity-85">(Platos individuales)</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleToggleExtra(currentComputedWeek)}
                      className={`w-full p-4 rounded-2xl border text-xs font-black transition cursor-pointer flex items-center justify-between ${
                        activeWeekInfo.extra 
                          ? "bg-rose-50 border-rose-300 text-rose-700" 
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>🍨</span>
                        <div className="text-left font-semibold">
                          <span className="font-extrabold text-[11px] block text-rose-800">Helado / Postre Adicional (Sweets Extra)</span>
                          <span className="text-[9.5px] text-slate-400 font-bold block">Adiciona placer dopamínico semanal</span>
                        </div>
                      </span>
                      <span className={`text-[9.5px] font-black uppercase px-2.5 py-1 rounded-xl border ${
                        activeWeekInfo.extra 
                          ? "bg-rose-600 text-white border-rose-600" 
                          : "bg-slate-100 text-slate-400 border-slate-200"
                      }`}>
                        {activeWeekInfo.extra ? "CON POSTRE" : "SIN POSTRE"}
                      </span>
                    </button>

                  </div>

                </div>
              </div>

            </div>
          )}

        </main>

        {/* METABOLIC RESET AND SIMULATING UTILITIES BAR (PREVIEW ONLY) */}
        {!state.cycle_start_date ? null : (
          <div className="absolute bottom-16 left-0 right-0 bg-white/95 border-t border-slate-100 px-5 py-2 flex items-center justify-between text-[10px] font-extrabold text-slate-400 z-20">
            <span>Día 0 Sincronizado</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleFastForwardWeek}
                className="text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
              >
                ⏩ Forzar 1 Semana Real
              </button>
              <button
                type="button"
                onClick={() => setShowConfig(true)}
                className="text-red-500 hover:text-red-850 flex items-center gap-1 cursor-pointer"
              >
                ⚙ Reiniciar Racha
              </button>
            </div>
          </div>
        )}

        {/* CONFIG RESET MODAL */}
        {showConfig && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-6 z-50">
            <div className="bg-white rounded-3xl p-5 w-full max-w-xs border border-slate-150 space-y-4 shadow-xl">
              <h4 className="font-black text-sm text-slate-900">¿Deseas reiniciar la racha?</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                Esta acción borrará de manera inmediata e irreversible todos los cheats recordados, deslices y estadísticas de toda la vida.
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowConfig(false)}
                  className="w-full py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleWipeEverything}
                  className="w-full py-2 bg-red-650 text-white font-black rounded-xl hover:bg-red-750 cursor-pointer"
                >
                  Confirmar Borrado
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM NAVIGATION TAB BAR */}
        <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 h-16 flex items-center justify-around z-40 px-6">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex flex-col items-center justify-center gap-1 transition-all ${
              activeTab === "dashboard" ? "text-rose-650 font-black scale-105" : "text-slate-400 font-semibold"
            } cursor-pointer`}
          >
            <TrendingUp size={18} className={activeTab === "dashboard" ? "text-rose-500" : "text-slate-400"} />
            <span className="text-[9.5px]">Dashboard & Bitácora</span>
          </button>

          <button
            onClick={() => setActiveTab("planning")}
            className={`flex flex-col items-center justify-center gap-1 transition-all ${
              activeTab === "planning" ? "text-rose-650 font-black scale-105" : "text-slate-400 font-semibold"
            } cursor-pointer`}
          >
            <Sliders size={18} className={activeTab === "planning" ? "text-rose-500" : "text-slate-450"} />
            <span className="text-[9.5px] font-display">Registrar / Bloqueos</span>
          </button>
        </nav>

      </div>
    </div>
  );
}
