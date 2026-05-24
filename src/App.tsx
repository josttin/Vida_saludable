import { useState, useEffect } from "react";
import { FitCycleState, FitCycleAPIResponse, MealType, SemanalInfo } from "./types";
import { getInitialState } from "./fitCycleEngine";
import { 
  Sparkles, 
  Trash2, 
  RefreshCw, 
  Utensils, 
  Smile, 
  AlertTriangle, 
  Send,
  Heart,
  Calendar,
  CheckCircle,
  Eye,
  Settings,
  Bell,
  User,
  Check,
  ChevronRight,
  Info,
  Layers,
  Sparkle
} from "lucide-react";

export default function App() {
  // Customizable profiles for the couple
  const [novioName, setNovioName] = useState("Joss");
  const [noviaName, setNoviaName] = useState("Nati");
  const [showConfig, setShowConfig] = useState(false);
  const [configTab, setConfigTab] = useState<"profiles" | "notifications">("profiles");

  // Personalized Notification customization states
  const [enableWeekendReminder, setEnableWeekendReminder] = useState(true);
  const [weekendReminderDay, setWeekendReminderDay] = useState("Sábado");
  const [weekendReminderTime, setWeekendReminderTime] = useState("20:30");

  const [enableStockWarning, setEnableStockWarning] = useState(true);
  const [stockWarningThreshold, setStockWarningThreshold] = useState(1.5);
  const [notifiedLowStocks, setNotifiedLowStocks] = useState<string[]>([]);

  const [enableMotivationalAlert, setEnableMotivationalAlert] = useState(true);
  const [motivationalDay, setMotivationalDay] = useState("Lunes");
  const [motivationalTime, setMotivationalTime] = useState("08:00");



  // App logical state
  const [state, setState] = useState<FitCycleState>(getInitialState());
  const [apiResponse, setApiResponse] = useState<FitCycleAPIResponse | null>(null);
  
  // UI states
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  
  // Active Simulated Notifications (Push notifications channel)
  const [notifications, setNotifications] = useState([
    { id: 1, text: "📲 ¡Recordatorio!: Les quedan salchipapas y pizzas en el inventario del ciclo de 8 semanas.", time: "Hace un momento", type: "info" },
    { id: 2, text: "🔒 Alerta de consecutividad: No repitan Salchipapa ni Extras de forma consecutiva.", time: "Hace 5 minutos", type: "block" },
    { id: 3, text: "💧 Compromiso mutuo: No negociar los 3 litros de agua los días de cheat meal.", time: "Hace 1 hora", type: "success" }
  ]);
  const [showNotificationList, setShowNotificationList] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Suggested quick prompts that showcase the AI engine
  const quickPrompts = [
    { label: "🍔 Compartir 🍔", text: "Registra que ambos comimos hamburguesa juntos este fin de semana" },
    { label: "🍟 Salchipapa (Joss)", text: "Joss comió salchipapa y Nati sushi" },
    { label: "🍣 Nati Sushi, Joss Pizza", text: "Nati comió sushi y Joss comió pizza" },
    { label: "🍧 Heladito dulce", text: "Poner extra dulce para el postre de este fin de semana" },
    { label: "🧹 Borrar todo", text: "Borrar el registro de la semana actual" }
  ];

  // Helper function to push temporary toasts (Simulating live push notifications)
  const triggerPushNotification = (message: string, type: "info" | "block" | "success") => {
    setToastMessage(message);
    const newId = Date.now();
    setNotifications(prev => [
      { id: newId, text: message, time: "Justo ahora", type },
      ...prev.slice(0, 5) // Keep last 6 notifications for simplicity
    ]);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Fetch / Calculate state representation
  const syncStateWithServer = async (currentState: FitCycleState) => {
    setLoading(true);
    setErrorStatus(null);
    try {
      const response = await fetch("/api/fitcycle/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: currentState })
      });
      if (!response.ok) {
        throw new Error("Error recalculando datos con el motor");
      }
      const data: FitCycleAPIResponse = await response.json();
      setApiResponse(data);
    } catch (err: any) {
      console.error(err);
      setErrorStatus("Error sincronizando con el servidor. Se cargaron cálculos estimados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncStateWithServer(state);
  }, [state]);

  // Automatic Low Stock Detection Alert inside the personalized notifications engine
  useEffect(() => {
    if (!apiResponse || !enableStockWarning) return;

    const { inventario } = apiResponse;
    const targets = [
      { key: "healthy_group", label: "grupo compartido saludable (Hamburguesa/Pizza/Sushi)", qty: inventario.hamburguesa },
      { key: "salchipapa", label: "Salchipapas 🍟", qty: inventario.salchipapa },
      { key: "otras", label: "Otras comidas saludables 🍱", qty: inventario.otra_comida },
      { key: "extras", label: "Extras Dulces 🍨", qty: inventario.extras }
    ];

    targets.forEach(t => {
      if (t.qty <= stockWarningThreshold && t.qty > 0) {
        if (!notifiedLowStocks.includes(t.key)) {
          triggerPushNotification(
            `🚨 ¡Stock Crítico!: Quedan solo ${t.qty} porciones del ${t.label} en el ciclo. ¡Planifiquen con cuidado!`,
            "block"
          );
          setNotifiedLowStocks(prev => [...prev, t.key]);
        }
      } else if (t.qty > stockWarningThreshold) {
        if (notifiedLowStocks.includes(t.key)) {
          setNotifiedLowStocks(prev => prev.filter(k => k !== t.key));
        }
      }
    });
  }, [apiResponse, enableStockWarning, stockWarningThreshold, notifiedLowStocks]);

  // Handle natural language inputs via the backend API with Gemini AI
  const handleSendMessage = async (customMessage?: string) => {
    const textToSend = customMessage || inputText;
    if (!textToSend.trim()) return;

    setLoading(true);
    setErrorStatus(null);
    try {
      const response = await fetch("/api/fitcycle/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend, state })
      });
      if (!response.ok) {
        throw new Error("Error en el procesamiento del lenguaje");
      }

      const resJson = await response.json();
      if (resJson.state) {
        setState(resJson.state);
        if (resJson.data) {
          setApiResponse(resJson.data);
        }
        triggerPushNotification(`📲 Registrado vía IA: "${textToSend.substring(0, 35)}..."`, "success");
      }
      if (!customMessage) setInputText("");
    } catch (err: any) {
      console.error(err);
      setErrorStatus("Error procesando comando de texto. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to determine if a specific meal is blocked for a given user
  const getMealBlockStatus = (userKey: "novio" | "novia", meal: MealType) => {
    const currentWeekData = state.history.find(h => h.semana === state.current_week);
    if (!currentWeekData) return { blocked: false, reason: "" };

    // 1. Same-week Extra vs Salchipapa mutual exclusion
    if (meal === "Salchipapa" && currentWeekData.extra) {
      return { blocked: true, reason: "Bloqueado por Extra dulce (Helado/Granizado) activo esta semana." };
    }

    // 2. Mitad y Mitad heavy-fat restrictions
    const otherKey = userKey === "novio" ? "novia" : "novio";
    const otherMeal = otherKey === "novio" ? currentWeekData.cena_novio : currentWeekData.cena_novia;

    if (otherMeal) {
      if (meal === "Salchipapa" && (otherMeal === "Pizza" || otherMeal === "Hamburguesa")) {
        return { blocked: true, reason: `Bloqueado: Combinar Salchipapa con ${otherMeal} junta mucha grasa. ¡Comen Mitad y Mitad!` };
      }
      if ((meal === "Pizza" || meal === "Hamburguesa") && otherMeal === "Salchipapa") {
        return { blocked: true, reason: `Bloqueado: Combinar con Salchipapa junta mucha grasa. ¡Comen Mitad y Mitad!` };
      }
    }

    // 3. Consecutivity lockout for Salchipapa from week W-1
    const previousWeekData = state.history.find(h => h.semana === state.current_week - 1);
    const hadSalchipapaLastWeek = previousWeekData ? (previousWeekData.cena_novio === "Salchipapa" || previousWeekData.cena_novia === "Salchipapa" || previousWeekData.cena === "Salchipapa") : false;
    if (meal === "Salchipapa" && hadSalchipapaLastWeek) {
      return { blocked: true, reason: "Bloqueado: Salchipapa consumida la semana pasada (bloqueo consecutivo)." };
    }

    // 4. Out of Stock validation
    if (meal === "Hamburguesa" || meal === "Pizza" || meal === "Sushi") {
      let consumedHealthyCount = 0;
      state.history.forEach(h => {
        if (h.semana !== state.current_week) {
          const mN = h.cena_novio;
          const mG = h.cena_novia;
          if (mN === "Hamburguesa" || mN === "Pizza" || mN === "Sushi") {
            consumedHealthyCount += 0.5;
          }
          if (mG === "Hamburguesa" || mG === "Pizza" || mG === "Sushi") {
            consumedHealthyCount += 0.5;
          }
        }
      });
      // Add proposed meal for current user (which adds 0.5)
      consumedHealthyCount += 0.5;
      
      // Add other partner's current week choice if in the shared pool
      const otherPartnerMeal = userKey === "novio" ? currentWeekData.cena_novia : currentWeekData.cena_novio;
      if (otherPartnerMeal === "Hamburguesa" || otherPartnerMeal === "Pizza" || otherPartnerMeal === "Sushi") {
        consumedHealthyCount += 0.5;
      }

      const limit = 5.0; // Shared healthy pool total across the cycle
      if (consumedHealthyCount > limit) {
        return { blocked: true, reason: `Sin stock: No quedan porciones suficientes del grupo saludable compartido (Hamburguesa/Pizza/Sushi) en el ciclo (Límite máximo: 5 semanas).` };
      }
    } else {
      let consumedCount = 0;
      state.history.forEach(h => {
        if (h.semana !== state.current_week) {
          const mN = h.cena_novio;
          const mG = h.cena_novia;
          if (mN === mG) {
            if (mN === meal) consumedCount += 1.0;
          } else {
            if (mN === meal) consumedCount += 0.5;
            if (mG === meal) consumedCount += 0.5;
          }
        }
      });
      const otherPartnerMeal = userKey === "novio" ? currentWeekData.cena_novia : currentWeekData.cena_novio;
      if (otherPartnerMeal === meal) {
        consumedCount += 1.0;
      } else {
        consumedCount += 0.5;
      }

      const limit = meal === "Otra" ? 1.0 : 2.0;
      if (consumedCount > limit) {
        return { blocked: true, reason: `Sin stock: No quedan porciones de ${meal} suficientes en el ciclo.` };
      }
    }

    return { blocked: false, reason: "" };
  };

  // 8-week structured roadmap guide helpers
  const getRecommendedMealForWeek = (weekNum: number): { meal: MealType, extra: boolean, desc: string } => {
    switch (weekNum) {
      case 1: return { meal: "Sushi", extra: false, desc: "Fase de inicio con proteína limpia sin azúcares." };
      case 2: return { meal: "Hamburguesa", extra: true, desc: "Modera grasa con hamburguesa y tu primer extra dulce." };
      case 3: return { meal: "Salchipapa", extra: false, desc: "Cena pesada habilitada. Cuidado: prohibido extra." };
      case 4: return { meal: "Pizza", extra: true, desc: "Fase intermedia. Pizza con extra dulce permitido." };
      case 5: return { meal: "Hamburguesa", extra: false, desc: "Fase de control. Hamburguesa sola sin postre." };
      case 6: return { meal: "Otra", extra: true, desc: "Subway de pechuga o Tacos balanceados con extra." };
      case 7: return { meal: "Salchipapa", extra: false, desc: "Última cena pesada del ciclo. Prohibido extra dulce." };
      case 8: return { meal: "Pizza", extra: true, desc: "Cierre festivo del ciclo de 8 semanas con Pizza y postre." };
      default: return { meal: "Sushi", extra: false, desc: "" };
    }
  };

  // Direct state modifications for the weekly meal planner with strict rules of constraints
  const setMealForUser = (userKey: "novio" | "novia", meal: MealType | null) => {
    if (meal) {
      const status = getMealBlockStatus(userKey, meal);
      if (status.blocked) {
        triggerPushNotification(status.reason, "block");
        return;
      }
    }

    const updatedHistory = state.history.map((h) => {
      if (h.semana === state.current_week) {
        const updated = { ...h };
        if (userKey === "novio") {
          updated.cena_novio = meal;
        } else {
          updated.cena_novia = meal;
        }
        // Sync unified cena field as fallback
        updated.cena = updated.cena_novio || updated.cena_novia;
        return updated;
      }
      return h;
    });

    const newState = {
      ...state,
      history: updatedHistory
    };
    setState(newState);
    
    // Trigger notification
    const userName = userKey === "novio" ? novioName : noviaName;
    const mealText = meal ? `eligió ${meal}` : "quitó su cena";
    triggerPushNotification(`🍽️ ${userName} ${mealText} para la Semana ${state.current_week}`, "info");
  };

  const toggleExtraForWeek = (weekNum: number) => {
    const currentWeekData = state.history.find(h => h.semana === weekNum);
    if (!currentWeekData) return;

    const nowHasExtra = !currentWeekData.extra;

    if (nowHasExtra) {
      // Rule 1: Same-week Extra vs Salchipapa mutual exclusion
      const hasSalchipapa = currentWeekData.cena_novio === "Salchipapa" || currentWeekData.cena_novia === "Salchipapa";
      if (hasSalchipapa) {
        triggerPushNotification(`❌ Bloqueado: No se puede agregar un Extra dulce (Café/Helado) si hay Salchipapa seleccionada esta semana.`, "block");
        return;
      }

      // Rule 2: Consecutive Extra sweet block
      const previousWeekData = state.history.find(h => h.semana === weekNum - 1);
      const hadExtraLastWeek = previousWeekData ? previousWeekData.extra : false;
      if (hadExtraLastWeek) {
        triggerPushNotification(`❌ Bloqueo Secuencial: Comieron Extra dulce (helado/café) la semana pasada. Debe descansar un fin de semana.`, "block");
        return;
      }

      // Rule 3: Out of Stock validation
      let extrasConsumed = 0;
      state.history.forEach(h => {
        if (h.semana !== weekNum && h.extra) {
          extrasConsumed++;
        }
      });
      if (extrasConsumed >= 4) {
        triggerPushNotification(`❌ Límite Alcanzado: Ya consumieron el máximo de 4 Extras dulces del ciclo.`, "block");
        return;
      }
    }

    const updatedHistory = state.history.map((h) => {
      if (h.semana === weekNum) {
        if (nowHasExtra) {
          if (weekNum % 2 !== 0) {
            triggerPushNotification(`⚠️ El plan sugiere NO usar extras en semanas impares (Semana ${weekNum}) para no saturar.`, "block");
          } else {
            triggerPushNotification(`🍦 ¡Delicioso! Extra programado de forma segura para la Semana ${weekNum}.`, "success");
          }
        } else {
          triggerPushNotification(`🍦 Removieron el Extra dulce de la Semana ${weekNum}.`, "info");
        }
        return { ...h, extra: nowHasExtra };
      }
      return h;
    });
    setState({
      ...state,
      history: updatedHistory
    });
  };

  const selectCurrentWeek = (weekNum: number) => {
    setState({
      ...state,
      current_week: weekNum
    });
    // Trigger week transition notification
    triggerPushNotification(`📅 Semana ${weekNum} activa. Evaluando estados y bloqueos...`, "info");

    // Personalized weekly motivational alert
    if (enableMotivationalAlert) {
      let motMsg = "";
      switch (weekNum) {
        case 1: motMsg = `✨ ¡Comenzamos este viaje de salud y amor! Respeten el déficit de lunes a viernes y celebren el fin de semana.`; break;
        case 2: motMsg = `🔥 ¡Semana 2 activa! La consistencia inicial es clave. ¡Ustedes pueden mantener el control!`; break;
        case 3: motMsg = `👟 ¡Semana 3! El ritmo metabólico se enciende. Controlen las salchipapas y beban suficiente agua de lunes a viernes.`; break;
        case 4: motMsg = `🍧 ¡Semana 4, mitad del camino! Un extra dulce está permitido si logran entrenar juntos esta semana.`; break;
        case 5: motMsg = `🎯 ¡Semana 5! Segunda parte del ciclo. No bajen la guardia, el esfuerzo mutuo vale oro.`; break;
        case 6: motMsg = `💪 ¡Semana 6! La constancia empieza a dar frutos. Se ven fantásticos, mantengan el enfoque este fin de semana.`; break;
        case 7: motMsg = `🔋 ¡Semana 7! Recta final del ciclo. Protejan lo logrado y recuerden el cardio compensatorio.`; break;
        case 8: motMsg = `🏆 ¡Semana 8, la gran meta! Han sido campeones del autocontrol. Cierren este ciclo de forma épica.`; break;
        default: motMsg = `🌟 ¡Fuerza pareja! El éxito físico y el bienestar se construyen plato a plato.`; break;
      }
      setTimeout(() => {
        triggerPushNotification(`💌 Motivación Semanal (${motivationalDay}): ${motMsg}`, "success");
      }, 1000);
    }
  };

  const resetCycle = () => {
    setShowResetConfirm(true);
  };

  // Pre-fill a realistic active history for testing
  const loadDemoState = () => {
    const demoHistory: SemanalInfo[] = [
      { semana: 1, cena_novio: "Sushi", cena_novia: "Sushi", cena: "Sushi", extra: false },
      { semana: 2, cena_novio: "Hamburguesa", cena_novia: "Sushi", cena: "Hamburguesa", extra: true },
      { semana: 3, cena_novio: "Salchipapa", cena_novia: "Salchipapa", cena: "Salchipapa", extra: false },
      { semana: 4, cena_novio: "Pizza", cena_novia: "Hamburguesa", cena: "Pizza", extra: true },
      { semana: 5, cena_novio: "Hamburguesa", cena_novia: "Hamburguesa", cena: "Hamburguesa", extra: false },
      { semana: 6, cena_novio: null, cena_novia: null, cena: null, extra: false },
      { semana: 7, cena_novio: null, cena_novia: null, cena: null, extra: false },
      { semana: 8, cena_novio: null, cena_novia: null, cena: null, extra: false },
    ];
    setState({
      current_week: 6,
      history: demoHistory
    });
    triggerPushNotification("📊 Cargados datos de prueba para la Semana 6 del ciclo.", "success");
  };

  // Profile status stats calculators
  const getProfileStats = (userKey: "novio" | "novia") => {
    let dinnersCount = 0;
    let extrasCount = 0;
    const mealsList: MealType[] = [];

    state.history.forEach(h => {
      const meal = userKey === "novio" ? h.cena_novio : h.cena_novia;
      if (meal) {
        dinnersCount++;
        mealsList.push(meal);
      }
      if (h.extra) {
        extrasCount++;
      }
    });

    // Calculate favorite
    let favorite: MealType | string = "Ninguno aún";
    if (mealsList.length > 0) {
      const counts: Record<string, number> = {};
      mealsList.forEach(m => { counts[m] = (counts[m] || 0) + 1; });
      let maxCount = 0;
      Object.entries(counts).forEach(([meal, count]) => {
        if (count > maxCount) {
          maxCount = count;
          favorite = meal;
        }
      });
    }

    return {
      dinnersCount,
      extrasCount,
      favorite
    };
  };

  const novioStats = getProfileStats("novio");
  const noviaStats = getProfileStats("novia");

  // Determine mixing compatibility for current week
  const currentWeekInfo = state.history.find(h => h.semana === state.current_week);
  const mChoice = currentWeekInfo?.cena_novio || null;
  const fChoice = currentWeekInfo?.cena_novia || null;

  let mixingStatus: "SAFE" | "PROHIBITED" | "OPTIMAL" | "NONE" = "NONE";
  let mixingMessage = "";

  if (mChoice && fChoice) {
    if (mChoice === fChoice) {
      mixingStatus = "SAFE";
      mixingMessage = `🟢 Alineación Perfecta: Ambos comerán ${mChoice} juntos. Es súper cómodo para cocinar o pedir a domicilio, ¡disfruten sin culpa!`;
    } else {
      // Check for forbidden combinations (Grasa + Grasa)
      const hasSalchipapa = mChoice === "Salchipapa" || fChoice === "Salchipapa";
      const hasPizza = mChoice === "Pizza" || fChoice === "Pizza";
      const hasHamburguesa = mChoice === "Hamburguesa" || fChoice === "Hamburguesa";
      const hasSushi = mChoice === "Sushi" || fChoice === "Sushi";

      if (hasSalchipapa && (hasPizza || hasHamburguesa)) {
        mixingStatus = "PROHIBITED";
        mixingMessage = `❌ Combinación Pesada (Evitar): Unir Salchipapa + ${hasPizza ? "Pizza" : "Hamburguesa"} junta demasiada grasa saturada, aceites fritos, embutidos y sodio. ¡Su cuerpo acumulará esto de inmediato y congelará el déficit de toda la semana!`;
      } else if (
        (hasHamburguesa && hasSushi) || 
        (hasPizza && hasHamburguesa) || 
        (hasSushi && hasPizza)
      ) {
        mixingStatus = "OPTIMAL";
        mixingMessage = `🟢 Mitad y Mitad Óptimo: Combinar ${mChoice} con ${fChoice} está aprobado. Es una excelente mezcla de proteína limpia y carbohidratos moderados. ¡Compártanlo felices!`;
      } else {
        mixingStatus = "SAFE";
        mixingMessage = `🟡 Combinación Balanceada: Compartir mitad de ${mChoice} y mitad de ${fChoice} es viable. Mantengan el consumo de agua alto durante el día.`;
      }
    }
  } else if (mChoice || fChoice) {
    const who = mChoice ? novioName : noviaName;
    const mealName = mChoice || fChoice;
    mixingStatus = "SAFE";
    mixingMessage = `🍽️ Solo ${who} ha seleccionado ${mealName} para este fin de semana. El otro perfil puede elegir para habilitar el análisis de "Mitad y Mitad".`;
  } else {
    mixingStatus = "NONE";
    mixingMessage = "No se ha registrado ninguna cena libre todavía para este fin de semana. ¡Selecciones abajo para empezar!";
  }

  // Helpers to color coordinate inventory items based on stock
  const getInventoryBgColor = (available: number, initial: number) => {
    if (available === 0) return "bg-slate-100 border-slate-200 opacity-60 text-slate-400";
    if (available < initial) return "bg-sky-50/70 border-sky-100 text-sky-950";
    return "bg-white border-slate-200 text-slate-800";
  };

  return (
    <div className="min-h-screen bg-[#F4F7F9] font-sans flex flex-col text-slate-800 antialiased selection:bg-sky-100">
      
      {/* Dynamic Push Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 animate-bounce max-w-sm bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-800 flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping shrink-0" />
          <p className="text-xs font-bold">{toastMessage}</p>
        </div>
      )}

      {/* Header Navigation */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-md">
            <Heart size={18} className="text-sky-400 fill-sky-400" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900 font-display flex items-center gap-2">
              FitCycle <span className="text-slate-400 font-normal">/ Parejas</span>
            </h1>
            <p className="text-[11px] text-slate-500 leading-none mt-0.5">Control de comidas trampas compartidas estilo MeetYou</p>
          </div>
        </div>

        {/* Central Week Tracker Switch */}
        <div className="flex items-center gap-2 bg-slate-100 px-3.5 py-1.5 rounded-xl border border-slate-200/60">
          <Calendar size={14} className="text-sky-500" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Semana Activa:</span>
          <select 
            value={state.current_week}
            onChange={(e) => selectCurrentWeek(parseInt(e.target.value))}
            className="font-black text-sky-600 bg-transparent py-0.5 px-1 border-none focus:outline-none cursor-pointer text-xs"
          >
            {[1,2,3,4,5,6,7,8].map((w) => (
              <option key={w} value={w}>Semana {w} del Ciclo</option>
            ))}
          </select>
        </div>

        {/* Action Widgets & Profile Badges */}
        <div className="flex items-center gap-3">
          {/* Notification Push Bell */}
          <div className="relative">
            <button 
              onClick={() => setShowNotificationList(!showNotificationList)}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition hover:bg-slate-100 relative cursor-pointer"
              title="Notificaciones push programadas"
            >
              <Bell size={18} className={notifications.length > 0 ? "text-sky-500 fill-sky-100" : ""} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-sky-500" />
            </button>

            {/* Notification Drawer Dropdown */}
            {showNotificationList && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-fade-in">
                <div className="flex justify-between items-center mb-3 pb-1.5 border-b border-slate-100">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Centro de Notificaciones 📱</span>
                  <button 
                    onClick={() => setNotifications([])} 
                    className="text-[10px] text-sky-500 font-bold hover:underline"
                  >
                    Limpiar
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-4">No tienes notificaciones pendientes.</p>
                ) : (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className="text-[11px] text-slate-700 leading-tight p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <p>{n.text}</p>
                        <span className="text-[9px] text-slate-400 block mt-1">{n.time}</span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[9px] text-slate-400 italic mt-3 text-center border-t border-slate-100 pt-2">
                  Notificaciones del ciclo sincronizadas con tu pareja.
                </p>
              </div>
            )}
          </div>

          <button 
            onClick={() => setShowConfig(!showConfig)}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition hover:bg-slate-100 cursor-pointer"
            title="Ajustes de pareja"
          >
            <Settings size={18} />
          </button>

          {/* Couple Combined Initials */}
          <div className="w-10 h-10 rounded-full bg-sky-50 border-2 border-white shadow-xs flex items-center justify-center text-sky-600 font-extrabold text-xs">
            {novioName[0]}+{noviaName[0]}
          </div>
        </div>
      </header>

      {/* Customizable Couple Profile & Personalized Notifications Configuration */}
      {showConfig && (
        <div className="bg-sky-50 border-b border-sky-100 px-4 py-5 md:px-6 transition-all duration-300 border-t sm:border-slate-200 text-slate-800 animate-fade-in shadow-xs">
          <div className="max-w-5xl mx-auto flex flex-col gap-5">
            {/* Header with Switch Tabs */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-sky-100/50">
              <div className="flex items-center gap-2">
                <Sparkles className="text-sky-500 fill-sky-200" size={16} />
                <h3 className="font-extrabold text-sm text-sky-950 uppercase tracking-wide">Panel de Ajustes y Personalización</h3>
              </div>
              
              {/* Navigation Tabs */}
              <div className="flex bg-slate-200/50 p-1 rounded-xl border border-slate-200/50 text-xs">
                <button
                  type="button"
                  onClick={() => setConfigTab("profiles")}
                  className={`px-3 py-1.5 rounded-lg font-black transition cursor-pointer ${
                    configTab === "profiles"
                      ? "bg-sky-500 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  👥 Perfiles de la Pareja
                </button>
                <button
                  type="button"
                  onClick={() => setConfigTab("notifications")}
                  className={`px-3 py-1.5 rounded-lg font-black transition cursor-pointer ${
                    configTab === "notifications"
                      ? "bg-sky-500 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  🔔 Notificaciones y Alertas
                </button>
              </div>
            </div>

            {/* TAB CONTENT: PROFILES */}
            {configTab === "profiles" && (
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in">
                <div className="flex flex-col gap-1 w-full md:w-1/3">
                  <p className="text-xs font-bold text-sky-900 leading-snug">Personalicen sus Nombres Elásticos:</p>
                  <p className="text-[10px] text-sky-700/80 leading-snug">Estos nombres se sincronizan mediante la lógica de FitCycle y los cálculos del motor.</p>
                </div>
                
                <div className="flex flex-wrap gap-4 w-full md:w-auto flex-1 justify-end">
                  <div className="flex-1 min-w-40 max-w-xs">
                    <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">Nombre Novio</label>
                    <input 
                      type="text" 
                      value={novioName}
                      onChange={(e) => {
                        setNovioName(e.target.value);
                        triggerPushNotification(`Perfil de Novio actualizado a ${e.target.value}`, "success");
                      }}
                      className="w-full bg-white px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-sky-500 focus:outline-none focus:border-sky-500" 
                    />
                  </div>
                  <div className="flex-1 min-w-40 max-w-xs">
                    <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">Nombre Novia</label>
                    <input 
                      type="text" 
                      value={noviaName}
                      onChange={(e) => {
                        setNoviaName(e.target.value);
                        triggerPushNotification(`Perfil de Novia actualizado a ${e.target.value}`, "success");
                      }}
                      className="w-full bg-white px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-sky-500 focus:outline-none focus:border-sky-500" 
                    />
                  </div>
                  <div className="flex items-end gap-2 shrink-0">
                    <button 
                      type="button"
                      onClick={loadDemoState}
                      className="px-3.5 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                    >
                      Cargar Demo
                    </button>
                    <button 
                      type="button"
                      onClick={resetCycle}
                      className="px-3.5 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Reiniciar Todo
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: NOTIFICATIONS */}
            {configTab === "notifications" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in text-slate-800">
                
                {/* 1. Weekend registration reminder */}
                <div className="bg-white p-4 rounded-2xl border border-sky-100 flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black uppercase text-sky-600 tracking-wider">🗓️ Recordatorio Finde</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={enableWeekendReminder} 
                          onChange={(e) => {
                            setEnableWeekendReminder(e.target.checked);
                            triggerPushNotification(
                              e.target.checked 
                                ? "🔔 Recordatorio de fin de semana ACTIVADO." 
                                : "🔕 Recordatorio de fin de semana DESACTIVADO.",
                              "info"
                            );
                          }}
                          className="sr-only peer" 
                        />
                        <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                      </label>
                    </div>
                    <p className="text-xs font-extrabold text-slate-900 mb-1">Registro de Cheat Meals</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                      Recuerda al celular los fines de semana registrar la cena libre compartida para no perder la racha.
                    </p>
                    
                    {enableWeekendReminder && (
                      <div className="space-y-2 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px]">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Día de Alerta:</span>
                          <select 
                            value={weekendReminderDay} 
                            onChange={(e) => setWeekendReminderDay(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-sky-500"
                          >
                            <option value="Viernes">Viernes</option>
                            <option value="Sábado">Sábado</option>
                            <option value="Domingo">Domingo</option>
                          </select>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Hora programada:</span>
                          <input 
                            type="text" 
                            value={weekendReminderTime} 
                            onChange={(e) => setWeekendReminderTime(e.target.value)}
                            placeholder="Ej. 20:30"
                            className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-slate-800 font-bold text-center focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      triggerPushNotification(
                        `📲 Recordatorio FitCycle: ¡Hola ${novioName} y ${noviaName}! El fin de semana llegó. Registren su cena de la Semana ${state.current_week} para controlar el inventario de porciones.`,
                        "info"
                      );
                    }}
                    className="w-full mt-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer text-center"
                  >
                    ⚡ Simular Alerta Finde
                  </button>
                </div>

                {/* 2. Critical Stock Alert */}
                <div className="bg-white p-4 rounded-2xl border border-sky-100 flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">⚠️ Control de Stock</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={enableStockWarning} 
                          onChange={(e) => {
                            setEnableStockWarning(e.target.checked);
                            if (e.target.checked) setNotifiedLowStocks([]); // Clear history to trigger instantly
                            triggerPushNotification(
                              e.target.checked 
                                ? "🔔 Alertas automáticas de poco stock ACTIVADAS." 
                                : "🔕 Alertas automáticas de poco stock DESACTIVADAS.",
                              "info"
                            );
                          }}
                          className="sr-only peer" 
                        />
                        <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                      </label>
                    </div>
                    <p className="text-xs font-extrabold text-slate-900 mb-1">Advertencia de Límite</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                      Avisa automáticamente si el grupo saludable compartido (Hamburguesas/Pizza/Sushi), las salchipapas o los extras bajan del límite.
                    </p>
                    
                    {enableStockWarning && (
                      <div className="space-y-2 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px]">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Límite de Alerta:</span>
                          <select 
                            value={stockWarningThreshold} 
                            onChange={(e) => {
                              setStockWarningThreshold(parseFloat(e.target.value));
                              setNotifiedLowStocks([]); // Reset notified tags to re-evaluate
                            }}
                            className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-sky-500"
                          >
                            <option value="1.0">≤ 1.0 porción</option>
                            <option value="1.5">≤ 1.5 porciones</option>
                            <option value="2.0">≤ 2.0 porciones</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      if (!apiResponse) {
                        triggerPushNotification("⚠️ Cargando datos iniciales del motor. Por favor espera.", "block");
                        return;
                      }
                      const { inventario } = apiResponse;
                      const lows: string[] = [];
                      if (inventario.hamburguesa <= stockWarningThreshold) lows.push("Saludables Compartidos (Ham/Piz/Sus)");
                      if (inventario.salchipapa <= stockWarningThreshold) lows.push("Salchipapas 🍟");
                      if (inventario.extras <= stockWarningThreshold) lows.push("Extras dulces 🍨");

                      if (lows.length > 0) {
                        triggerPushNotification(
                          `🚨 ¡Alerta de Stock Crítico SI!: Queda muy poco de: ${lows.join(", ")}. ¡Corten consumos para aguantar las 8 semanas!`,
                          "block"
                        );
                      } else {
                        triggerPushNotification(
                          `✅ ¡Inventario Seguro!: Todos sus platos de comida superan el umbral de ${stockWarningThreshold} porciones configurado.`,
                          "success"
                        );
                      }
                    }}
                    className="w-full mt-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer text-center"
                  >
                    ⚡ Probar Alerta de Stock
                  </button>
                </div>

                {/* 3. Motivational weekly message */}
                <div className="bg-white p-4 rounded-2xl border border-sky-100 flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black uppercase text-teal-600 tracking-wider">💌 Mensajes Motivacionales</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={enableMotivationalAlert} 
                          onChange={(e) => {
                            setEnableMotivationalAlert(e.target.checked);
                            triggerPushNotification(
                              e.target.checked 
                                ? "🔔 Mensajes motivacionales ACTIVADOS." 
                                : "🔕 Mensajes motivacionales DESACTIVADOS.",
                              "info"
                            );
                          }}
                          className="sr-only peer" 
                        />
                        <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                      </label>
                    </div>
                    <p className="text-xs font-extrabold text-slate-900 mb-1">Impulso Semanal de Inicio</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                      Recibe mensajes motivacionales adaptativos al inicio de cada una de las 8 semanas reguladas.
                    </p>
                    
                    {enableMotivationalAlert && (
                      <div className="space-y-2 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px]">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Día de Mensaje:</span>
                          <select 
                            value={motivationalDay} 
                            onChange={(e) => setMotivationalDay(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-sky-500"
                          >
                            <option value="Lunes">Lunes</option>
                            <option value="Domingo">Domingo</option>
                          </select>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Hora de entrega:</span>
                          <input 
                            type="text" 
                            value={motivationalTime} 
                            onChange={(e) => setMotivationalTime(e.target.value)}
                            placeholder="Ej. 08:00"
                            className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-slate-800 font-bold text-center focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      let motMsg = "";
                      switch (state.current_week) {
                        case 1: motMsg = `✨ ¡Comenzamos este viaje de salud y amor! Respeten el déficit de lunes a viernes y celebren el fin de semana juntos.`; break;
                        case 2: motMsg = `🔥 ¡Semana 2 activa! La consistencia inicial es la base de todo. ¡Ustedes pueden mantener el gran control!`; break;
                        case 3: motMsg = `👟 ¡Semana 3! El motor metabólico de la pareja está encendido. Moderen salchipapas consecutivas y beban agua de lunes a viernes.`; break;
                        case 4: motMsg = `🍧 ¡Semana 4, la mitad del camino! Un extra de helado libre está permitido si completan sus rutinas de ejercicio física.`; break;
                        case 5: motMsg = `🎯 ¡Semana 5! Iniciamos el segundo gran tramo del ciclo. No aflojen el ritmo, su disciplina combinada vale un mundo.`; break;
                        case 6: motMsg = `💪 ¡Semana 6! Los hábitos de comida consciente ya rinden frutos. Se ven excepcionales, continúen el enfoque en equipo.`; break;
                        case 7: motMsg = `🔋 ¡Semana 7! Recta finalísima de las 8 semanas. Defiendan cada gramo de esfuerzo y hagan cardio compensatorio.`; break;
                        case 8: motMsg = `🏆 ¡Semana 8, meta alcanzada! Han sido gigantes de la constancia. Prepárense para cerrar este ciclo de forma fantástica.`; break;
                        default: motMsg = `🌟 ¡Con todo pareja! La salud y bienestar de Joss y Nati se construye plato a plato.`; break;
                      }
                      triggerPushNotification(
                        `💌 Mensaje Motivacional Simulado (Llegando ${motivationalDay} ${motivationalTime}): ${motMsg}`,
                        "success"
                      );
                    }}
                    className="w-full mt-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer text-center"
                  >
                    ⚡ Simular Mensaje Motivacional
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Core Dashboard Layout */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        
        {/* LEFT COMPONENT COLUMN (5 col-span): Profiles, Mixer Analysis, GPT-Voz AI */}
        <section className="lg:col-span-12 xl:col-span-5 flex flex-col gap-6">

          {/* COMBINATION COMPATIBILITY ANALYZER ("MITAD Y MITAD") - NOW HIGHLY DETAILED & INTERACTIVE */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col gap-6 animate-fade-in text-slate-800">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Semáforo "Mitad y Mitad" 🚦</h3>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2.5 py-1 rounded-xl font-bold font-mono">Luz Nutricional actual</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 leading-tight">Regla de Combinación de Platos</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Compartir medio plato de cada uno les permite disfrutar más variedad. No obstante, para mantener la salud metabólica del ciclo de 8 semanas, deben evitar mezclar dos comidas de alta carga de grasa ("Grasa + Grasa").
              </p>
            </div>

            {/* SECCIÓN 1: ESTADO ACTUAL EN LA SEMANA SELECCIONADA */}
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <span className="text-[9px] uppercase font-bold text-slate-400 block mb-2 tracking-wider">Cena de esta Semana ({novioName} + {noviaName})</span>
              
              <div className={`p-4 rounded-xl border flex items-start gap-3 transition-colors duration-300 ${
                mixingStatus === "PROHIBITED" 
                  ? "bg-rose-50 border-rose-200 text-rose-950" 
                  : mixingStatus === "OPTIMAL"
                    ? "bg-teal-50 border-teal-200 text-teal-950"
                    : mixingStatus === "SAFE"
                      ? "bg-sky-50 border-sky-200 text-sky-950"
                      : "bg-slate-50/80 border-slate-200 text-slate-500"
              }`}>
                <div className="text-3xl shrink-0 pt-0.5" role="img">
                  {mixingStatus === "PROHIBITED" ? "🔴" : mixingStatus === "OPTIMAL" ? "🟢" : mixingStatus === "SAFE" ? "🟡" : "⚪"}
                </div>
                <div>
                  <h4 className="font-extrabold text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    {mixingStatus === "PROHIBITED" && "Evitar Combinación (Grasa + Grasa)"}
                    {mixingStatus === "OPTIMAL" && "Excelente Combinación (Proteína + Carbohidrato)"}
                    {mixingStatus === "SAFE" && "Combinación Aceptable y Segura"}
                    {mixingStatus === "NONE" && "Esperando Selección de Plato"}
                    {mixingStatus !== "NONE" && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-stone-900/10 font-mono font-bold">
                        {mixingStatus === "PROHIBITED" ? "Bajo 2/10" : mixingStatus === "OPTIMAL" ? "Alto 9/10" : "Medio 7.5/10"}
                      </span>
                    )}
                  </h4>
                  <p className="text-xs leading-normal opacity-90">{mixingMessage}</p>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: MANIFESTO COMPLETO Y EXPLICACIÓN DE REGLAS DE COMPATIBILIDAD */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3.5">
              <div>
                <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-md bg-stone-900 text-white font-mono tracking-wider">Manual del Semáforo de Comidas 📖</span>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                  Estas reglas garantizan que el metabolismo siga quemando grasa de forma eficiente y evitan letargo estomacal el fin de semana.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                {/* Verde */}
                <div className="flex items-start gap-2 border-l-2 border-emerald-500 pl-2.5">
                  <span className="text-base shrink-0">🟢</span>
                  <div>
                    <h5 className="font-extrabold text-slate-900 leading-tight">Mezclas Óptimas (Proteína + Carbos Limpios)</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      <strong>Ejemplos:</strong> Sushi + Hamburguesa, Sushi + Pizza, o plato saludable Subway con Pizza. Aporta proteína digerible libre de grasas saturadas saturadas que contrarresta el impacto graso del plato frito.
                    </p>
                  </div>
                </div>

                {/* Amarillo */}
                <div className="flex items-start gap-2 border-l-2 border-amber-400 pl-2.5">
                  <span className="text-base shrink-0">🟡</span>
                  <div>
                    <h5 className="font-extrabold text-slate-900 leading-tight">Mezclas Tolerables y Alineadas (Alineación Confort)</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      <strong>Ejemplos:</strong> Que ambos coman la misma comida (ej. Hamburguesa + Hamburguesa, Pizza + Pizza, Sushi + Sushi). Sencillo de coordinar para pedir. Se equilibra compensando con abundantes líquidos durante el día.
                    </p>
                  </div>
                </div>

                {/* Rojo */}
                <div className="flex items-start gap-2 border-l-2 border-rose-500 pl-2.5">
                  <span className="text-base shrink-0">🔴</span>
                  <div>
                    <h5 className="font-extrabold text-slate-900 leading-tight">Combinaciones Prohibidas (Doble Grasa / Sobrecarga)</h5>
                    <p className="text-[11px] text-slate-550 mt-0.5 leading-relaxed font-semibold text-rose-950">
                      <strong>Ejemplos:</strong> Salchipapa + Pizza, Salchipapa + Hamburguesa. La salchipapa contiene embutido, quesos grasos, papas fritas y salsas. Combinarla con pizza o hamburguesas sobrecarga el hígado y arruina la quema de grasas de inmediato.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ACTIVE WEEK CONSECUTIVE LOCKOUT BLOCKS STATUS */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Bloqueos de Consecutividad</h3>
            
            <div className="space-y-3">
              {/* Salchipapa consecutivity block card */}
              <div className={`flex items-center justify-between p-3.5 rounded-2xl border transition-colors ${
                apiResponse?.bloqueos_activos.salchipapa 
                  ? "bg-amber-50 border-amber-200 text-amber-950 animate-pulse" 
                  : "bg-slate-50/50 border-slate-100 text-slate-600"
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🍟</span>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Salchipapa Consecutiva</h4>
                    <p className="text-[10px] text-slate-400">No repetir fines de semana seguidos</p>
                  </div>
                </div>
                {apiResponse?.bloqueos_activos.salchipapa ? (
                  <span className="px-2.5 py-1 bg-amber-500 text-white text-[9px] font-black rounded-lg uppercase tracking-wider">
                    BLOQUEADO
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded-lg uppercase tracking-wider">
                    DISPONIBLE
                  </span>
                )}
              </div>

              {/* Extra Helado/café consecutivity block card */}
              <div className={`flex items-center justify-between p-3.5 rounded-2xl border transition-colors ${
                apiResponse?.bloqueos_activos.extra_helado 
                  ? "bg-amber-50 border-amber-200 text-amber-950" 
                  : "bg-slate-50/50 border-slate-100 text-slate-600"
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🍦</span>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Extra (Helado o Café)</h4>
                    <p className="text-[10px] text-slate-400">Usar máximo cada 15 días (Semanas pares)</p>
                  </div>
                </div>
                {apiResponse?.bloqueos_activos.extra_helado ? (
                  <span className="px-2.5 py-1 bg-amber-500 text-white text-[9px] font-black rounded-lg uppercase tracking-wider">
                    BLOQUEADO
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded-lg uppercase tracking-wider">
                    DISPONIBLE
                  </span>
                )}
              </div>
            </div>
          </div>



        </section>

        {/* RIGHT COLUMN COMPONENTS (7 col-span): Real-time Inventory & Timeline Node Map */}
        <section className="lg:col-span-12 xl:col-span-7 flex flex-col gap-6">
          


          {/* ACTIVE WEEK INTERACTIVE DETAIL EDITOR */}
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 animate-fade-in text-slate-800">
            {state.current_week === 8 && (
              <div className="mb-6 p-5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-300/30 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="text-3xl shrink-0">🎉</div>
                  <div>
                    <h4 className="font-extrabold text-emerald-950 text-sm">¡Final del Ciclo de 8 Semanas!</h4>
                    <p className="text-emerald-900/85 mt-0.5 leading-relaxed">
                      ¡Increíble logro! Han completado las 8 semanas reguladas con persistencia, semáforo de porciones de comida y autocontrol nutritivo. ¿Listos para restablecer sus porciones de inventario y empezar una nueva ronda?
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => resetCycle()}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl transition cursor-pointer shrink-0 shadow-xs"
                >
                  🔄 Reiniciar Ciclo
                </button>
              </div>
            )}
            <div className="flex flex-col sm:flex-row justify-between items-baseline gap-2 mb-4">
              <div>
                <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-lg bg-sky-100 text-sky-700 font-mono tracking-widest">
                  Planificación: Jueves de Antojos 📅
                </span>
                <h3 className="text-sm font-black text-slate-900 uppercase mt-1">Semana {state.current_week} del Ciclo</h3>
                <p className="text-xs text-slate-500 mt-1">Conectados para elegir qué comer el viernes, sábado o domingo.</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleExtraForWeek(state.current_week)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                    state.history.find(h => h.semana === state.current_week)?.extra
                      ? "bg-emerald-100 border-emerald-300 text-emerald-800 animate-pulse"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  🍧 Lleva Extra dulce (Granizado / Helado)
                </button>
              </div>
            </div>

            {/* Structured weekly advice ribbon */}
            {(() => {
              const rec = getRecommendedMealForWeek(state.current_week);
              return (
                <div className="my-3.5 p-3.5 bg-sky-50/75 border border-sky-100/60 rounded-2xl flex gap-3 text-xs text-sky-950">
                  <span className="text-lg">⭐</span>
                  <div>
                    <p className="font-extrabold text-sky-900">Recomendación Plan Lineal (Dieta Sugerida):</p>
                    <p className="font-medium mt-0.5">
                      Para la <strong>Semana {state.current_week}</strong> el plan maestro aconseja elegir <strong>{rec.meal}</strong> {rec.extra ? "CON Extra dulce 🍦" : "SIN Extra dulce 🔒"}. {rec.desc}
                    </p>
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              
              {/* Novio active week picker */}
              <div className="p-4 rounded-2xl bg-[#f8fafc] border border-slate-200/60">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-slate-950 uppercase flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-500" /> Su Plato ({novioName})
                  </span>
                  {currentWeekInfo?.cena_novio && (
                    <button
                      type="button"
                      onClick={() => setMealForUser("novio", null)}
                      className="text-[10px] text-rose-500 hover:text-rose-700 font-bold"
                    >
                      Remover
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {(["Hamburguesa", "Salchipapa", "Pizza", "Sushi", "Otra"] as MealType[]).map((meal) => {
                    const isSelected = currentWeekInfo?.cena_novio === meal;
                    const blockInfo = getMealBlockStatus("novio", meal);

                    let mealIcon = "🍔";
                    if (meal === "Salchipapa") mealIcon = "🍟";
                    if (meal === "Pizza") mealIcon = "🍕";
                    if (meal === "Sushi") mealIcon = "🍣";
                    if (meal === "Otra") mealIcon = "🍱";

                    return (
                      <button
                        key={meal}
                        type="button"
                        onClick={() => {
                          if (blockInfo.blocked && !isSelected) {
                            triggerPushNotification(blockInfo.reason, "block");
                            return;
                          }
                          setMealForUser("novio", isSelected ? null : meal);
                        }}
                        className={`py-2 rounded-xl text-xs font-bold border flex flex-col items-center justify-center transition cursor-pointer relative ${
                          isSelected
                            ? "bg-sky-500 border-sky-600 text-white shadow-md font-bold"
                            : blockInfo.blocked
                              ? "bg-slate-50 border-dashed border-slate-200 text-slate-300 opacity-40 cursor-not-allowed"
                              : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700"
                        }`}
                        title={blockInfo.blocked ? blockInfo.reason : meal}
                      >
                        <span className="text-lg">{mealIcon}</span>
                        <span className="text-[9px] mt-1 hidden sm:inline truncate max-w-full">{meal}</span>
                        {blockInfo.blocked && !isSelected && (
                          <span className="absolute -top-1.5 -right-1 text-[8px]" title={blockInfo.reason}>🚫</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Novia active week picker */}
              <div className="p-4 rounded-2xl bg-[#fffafb] border border-rose-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-rose-950 uppercase flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" /> Su Plato ({noviaName})
                  </span>
                  {currentWeekInfo?.cena_novia && (
                    <button
                      type="button"
                      onClick={() => setMealForUser("novia", null)}
                      className="text-[10px] text-rose-500 hover:text-rose-700 font-bold"
                    >
                      Remover
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {(["Hamburguesa", "Salchipapa", "Pizza", "Sushi", "Otra"] as MealType[]).map((meal) => {
                    const isSelected = currentWeekInfo?.cena_novia === meal;
                    const blockInfo = getMealBlockStatus("novia", meal);

                    let mealIcon = "🍔";
                    if (meal === "Salchipapa") mealIcon = "🍟";
                    if (meal === "Pizza") mealIcon = "🍕";
                    if (meal === "Sushi") mealIcon = "🍣";
                    if (meal === "Otra") mealIcon = "🍱";

                    return (
                      <button
                        key={meal}
                        type="button"
                        onClick={() => {
                          if (blockInfo.blocked && !isSelected) {
                            triggerPushNotification(blockInfo.reason, "block");
                            return;
                          }
                          setMealForUser("novia", isSelected ? null : meal);
                        }}
                        className={`py-2 rounded-xl text-xs font-bold border flex flex-col items-center justify-center transition cursor-pointer relative ${
                          isSelected
                            ? "bg-rose-400 border-rose-500 text-white shadow-md font-bold"
                            : blockInfo.blocked
                              ? "bg-slate-50 border-dashed border-slate-200 text-slate-300 opacity-40 cursor-not-allowed"
                              : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700"
                        }`}
                        title={blockInfo.blocked ? blockInfo.reason : meal}
                      >
                        <span className="text-lg">{mealIcon}</span>
                        <span className="text-[9px] mt-1 hidden sm:inline truncate max-w-full">{meal}</span>
                        {blockInfo.blocked && !isSelected && (
                          <span className="absolute -top-1.5 -right-1 text-[8px]" title={blockInfo.reason}>🚫</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Quick Synchronizer "Comer lo Mismo" shortcut button */}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (currentWeekInfo?.cena_novio) {
                    setMealForUser("novia", currentWeekInfo.cena_novio);
                    triggerPushNotification(`💞 ¡Sincronizado! Ambos han elegido comer ${currentWeekInfo.cena_novio}.`, "success");
                  } else if (currentWeekInfo?.cena_novia) {
                    setMealForUser("novio", currentWeekInfo.cena_novia);
                    triggerPushNotification(`💞 ¡Sincronizado! Ambos han elegido comer ${currentWeekInfo.cena_novia}.`, "success");
                  } else {
                    alert("Selecciona primero el plato de alguno de los dos para sincronizarlos.");
                  }
                }}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                title="Ahorra clics cuando piden lo mismo"
              >
                <span>💞 Sincronizar: Ambos comen igual</span>
              </button>
            </div>
          </div>

          {/* 8 WEEKS TIMELINE PROGRESSION MAP */}
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Progreso General del Ciclo</h3>
                  <p className="text-[11px] text-slate-400 mt-1">8 Semanas rotativas. Haz clic en un nodo para viajar por él.</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100">Plan Seguro</span>
                </div>
              </div>

              {/* Weekly nodes map alignment */}
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                {state.history.map((h, idx) => {
                  const isCurrent = h.semana === state.current_week;
                  const futurePrediction = apiResponse?.calendario_prediccion.find(p => p.semana === h.semana);

                  const novioMeal = h.cena_novio || h.cena;
                  const noviaMeal = h.cena_novia || h.cena;

                  // Decide node representation icon
                  let mainIcon = "🍽️";
                  let blockStatusBg = "bg-white border-slate-200 hover:bg-slate-50 text-slate-500";

                  if (novioMeal || noviaMeal) {
                    blockStatusBg = "bg-sky-500 border-sky-600 text-white shadow-xs shadow-sky-100";
                    if (novioMeal === "Salchipapa" || noviaMeal === "Salchipapa") {
                      mainIcon = "🍟";
                    } else if (novioMeal === "Hamburguesa" || noviaMeal === "Hamburguesa") {
                      mainIcon = "🍔";
                    } else if (novioMeal === "Pizza" || noviaMeal === "Pizza") {
                      mainIcon = "🍕";
                    } else if (novioMeal === "Sushi" || noviaMeal === "Sushi") {
                      mainIcon = "🍣";
                    } else {
                      mainIcon = "🍱";
                    }
                  } else if (futurePrediction) {
                    if (futurePrediction.estado === "permitido_con_extra") {
                      blockStatusBg = "bg-emerald-50 border-emerald-100 border-dashed text-emerald-900";
                      mainIcon = "🍦";
                    } else {
                      blockStatusBg = "bg-slate-50/80 border-slate-200 border-dashed text-slate-400";
                      mainIcon = "🍽️";
                    }
                  }

                  return (
                    <button
                      key={h.semana}
                      type="button"
                      onClick={() => selectCurrentWeek(h.semana)}
                      className={`relative flex flex-col items-center p-3 rounded-2xl border transition-all duration-300 group cursor-pointer ${
                        isCurrent 
                          ? "ring-2 ring-sky-500 ring-offset-2 z-15 scale-102 transform bg-white text-slate-900 font-extrabold" 
                          : ""
                      } ${blockStatusBg}`}
                    >
                      <span className="text-[9px] uppercase font-bold tracking-tight opacity-75">
                        Sem. {h.semana}
                      </span>
                      
                      <div className="text-2xl my-1.5 transition-transform duration-200 group-hover:scale-120">
                        {mainIcon}
                      </div>

                      <div className="text-[8px] font-black tracking-tighter truncate max-w-full leading-none opacity-90 h-3 flex items-center gap-0.5">
                        {h.extra && <span title="Tiene postre">✨</span>}
                        {novioMeal && noviaMeal ? (
                          novioMeal === noviaMeal ? novioMeal : "Mitad"
                        ) : novioMeal || noviaMeal ? (
                          "1/2"
                        ) : "Limpio"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Smart Prediction summary advice strip */}
            <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex items-start gap-3">
              <span className="text-xl leading-none">💡</span>
              <div className="text-xs text-slate-500 leading-relaxed">
                <strong>Predicción y Meta:</strong> El déficit calórico acumulado de lunes a viernes les da el colchón perfecto para que el fin de semana el cuerpo use el antojo como energía inmediata en lugar de guardarla como grasa. ¡Lo están haciendo excelente!
              </div>
            </div>

          </div>

        </section>
      </main>

      {/* Footer metadata & visual credits */}
      <footer className="p-6 bg-white border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400 text-center">
        <div className="flex items-center gap-2">
          <Heart size={14} className="text-rose-400 fill-rose-300" />
          <span>FitCycle — Diseñado con amor en base a las Reglas del Semáforo de Nutrición.</span>
        </div>
        <div className="flex gap-4">
          <span className="hover:text-slate-600 transition">3 Litros de Agua Diarios</span>
          <span>&bull;</span>
          <span className="hover:text-slate-600 transition">150 Calorías de Ejercicio</span>
        </div>
      </footer>

      {/* Custom Confirmation Modal for Resetting the 8-Week Cycle (Iframe Safe) */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col gap-4 text-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white font-bold flex items-center justify-center text-sm shrink-0">
                ⚠️
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">¿Desean reiniciar el ciclo?</h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Acción irreversible</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-normal">
              Se eliminará todo el historial registrado de las 8 semanas y se restablecerán por completo las 5 porciones saludables del fondo compartido ({novioName} y {noviaName}).
            </p>

            <div className="flex gap-2 justify-end mt-1.5">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setState(getInitialState());
                  setShowResetConfirm(false);
                  triggerPushNotification("🚀 Nuevo ciclo de 8 semanas iniciado con éxito.", "success");
                }}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-sm animate-pulse"
              >
                Sí, reiniciar ahora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
