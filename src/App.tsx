import { useState, useEffect, useRef } from "react";
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
  Sparkle,
  Home,
  Database,
  MessageSquare,
  Clock,
  BookOpen,
  TrendingUp,
  Sliders,
  BellRing
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  time: string;
}

export default function App() {
  // Customizable profiles for the couple
  const [novioName, setNovioName] = useState("Joss");
  const [noviaName, setNoviaName] = useState("Nati");
  const [showConfig, setShowConfig] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "inventory" | "map" | "ai" | "settings">("dashboard");

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

  // Chat conversation log memory
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "¡Hola! Soy su asistente inteligente de FitCycle. Pueden registrar comidas libre por voz o texto (ej: 'Nati comió sushi y Joss pizza' o 'Hamburguesas juntas en la semana 4'). ¿En qué les puedo ayudar hoy?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll chat to bottom when message log changes
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, activeTab]);

  // Suggested quick chat command pills
  const quickChatPills = [
    { label: "🤝 Hamburguesas juntos", text: "Registra que ambos comimos hamburguesa juntos este fin de semana" },
    { label: "🍟 Joss Salchipapa, Nati Sushi", text: "Joss comió salchipapa y Nati sushi" },
    { label: "🍕 Nati Pizza, Joss Sushi", text: "Nati comió pizza y Joss comió sushi" },
    { label: "🍧 Añadir postre extra", text: "Poner extra dulce para el postre de este fin de semana" },
    { label: "🧹 Limpiar esta semana", text: "Borrar el registro de la semana actual" }
  ];

  // Helper function to push temporary toasts (Simulating live push notifications)
  const triggerPushNotification = (message: string, type: "info" | "block" | "success") => {
    setToastMessage(message);
    const newId = Date.now();
    setNotifications(prev => [
      { id: newId, text: message, time: "Justo ahora", type },
      ...prev.slice(0, 15) // Keep last 15 notifications for simplicity
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

    // Add user message to log
    const userMsgId = Date.now().toString();
    const newUserMsg: ChatMessage = {
      id: userMsgId,
      sender: "user",
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, newUserMsg]);
    if (!customMessage) setInputText("");

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
        triggerPushNotification(`📲 Registrado vía IA: "${textToSend.substring(0, 30)}..."`, "success");

        // Format conversational reply based on response or simple fallback
        const replyText = resJson.fallback
          ? `¡Claro! He procesado tu comando de forma directa local: "${textToSend}". He actualizado el calendario de planificación de inmediato.`
          : `He interpretado tu mensaje con IA y ajustado el cronograma. Las porciones han sido descontadas correspondientemente y los semáforos se encuentran activos.`;

        const newAiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prev => [...prev, newAiMsg]);
      }
    } catch (err: any) {
      console.error(err);
      setErrorStatus("Error procesando comando de texto. Intenta de nuevo.");

      const newAiMsg: ChatMessage = {
        id: (Date.now() + 2).toString(),
        sender: "ai",
        text: `⚠️ No logré sincronizar la petición con la IA. Puedes realizar tus selecciones tocando los botones interactivos del Dashboard para un control más seguro.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, newAiMsg]);
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
      return { blocked: true, reason: "Bloqueado por Extra dulce (Helado) activo hoy hoy." };
    }

    // 2. Mitad y Mitad heavy-fat restrictions
    const otherKey = userKey === "novio" ? "novia" : "novio";
    const otherMeal = otherKey === "novio" ? currentWeekData.cena_novio : currentWeekData.cena_novia;

    if (otherMeal) {
      if (meal === "Salchipapa" && (otherMeal === "Pizza" || otherMeal === "Hamburguesa")) {
        return { blocked: true, reason: `Bloqueado: Combinar Salchipapa + ${otherMeal} junta mucha grasa saturada. ¡Coman Mitad y Mitad!` };
      }
      if ((meal === "Pizza" || meal === "Hamburguesa") && otherMeal === "Salchipapa") {
        return { blocked: true, reason: `Bloqueado: Combinar con Salchipapa junta mucha grasa saturada. ¡Comen Mitad y Mitad!` };
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
        return { blocked: true, reason: `Sin stock: No quedan porciones en el grupo saludable compartido (Hamburguesa/Pizza/Sushi) en el ciclo (Máx: 5 semanas).` };
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
        return { blocked: true, reason: `Sin stock: No quedan porciones libres de ${meal} suficientes en tu fondo.` };
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
      case 4: return { meal: "Pizza", extra: true, desc: "Fase intermedia. Pizza con extra dulce permitido hoy." };
      case 5: return { meal: "Hamburguesa", extra: false, desc: "Fase de control. Hamburguesa sola sin postre." };
      case 6: return { meal: "Otra", extra: true, desc: "Subway de pechuga o Tacos balanceados con extra de helado." };
      case 7: return { meal: "Salchipapa", extra: false, desc: "Última cena pesada del ciclo. Prohibido extra dulce." };
      case 8: return { meal: "Pizza", extra: true, desc: "Cierre festivo del ciclo de 8 semanas con Pizza y helado." };
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
        triggerPushNotification(`❌ Bloqueado: No se puede agregar un Extra dulce (Helado) si hay Salchipapa seleccionada esta semana.`, "block");
        return;
      }

      // Rule 2: Consecutive Extra sweet block
      const previousWeekData = state.history.find(h => h.semana === weekNum - 1);
      const hadExtraLastWeek = previousWeekData ? previousWeekData.extra : false;
      if (hadExtraLastWeek) {
        triggerPushNotification(`❌ Bloqueo Secuencial: Comieron Extra dulce la semana pasada. Debe descansar este fin de semana.`, "block");
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
        triggerPushNotification(`❌ Límite Alcanzado: Ya consumieron el máximo de 4 Extras dulces en este ciclo.`, "block");
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
    setActiveTab("dashboard");
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
        mixingMessage = `❌ Combinación Pesada (Evitar): Unir Salchipapa + ${hasPizza ? "Pizza" : "Hamburguesa"} junta demasiada grasa saturada y sodio. ¡Su cuerpo congelará el déficit de toda la semana!`;
      } else if (
        (hasHamburguesa && hasSushi) || 
        (hasPizza && hasHamburguesa) || 
        (hasSushi && hasPizza)
      ) {
        mixingStatus = "OPTIMAL";
        mixingMessage = `🟢 Mitad y Mitad Óptimo: Combinar ${mChoice} con ${fChoice} está aprobado. Es una excelente mezcla de proteína limpia y carbohidratos. ¡Compártanlo felices!`;
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
    mixingMessage = "No se ha registrado ninguna cena libre todavía para este fin de semana. ¡Seleccionen abajo para empezar!";
  }

  // Stock inventory calculation based on current state
  const getPortionQuantities = () => {
    if (apiResponse) {
      return apiResponse.inventario;
    }
    // Simple fallback calculation
    let hamburguesa = 5.0;
    let salchipapa = 2.0;
    let pizza = 5.0; // Same shared pool
    let sushi = 5.0;
    let extras = 4.0;
    let otra_comida = 1.0;

    state.history.forEach(h => {
      const mN = h.cena_novio;
      const mG = h.cena_novia;
      
      // Calculate healthy pool
      if (mN === "Hamburguesa" || mN === "Pizza" || mN === "Sushi") hamburguesa -= 0.5;
      if (mG === "Hamburguesa" || mG === "Pizza" || mG === "Sushi") hamburguesa -= 0.5;
      
      if (mN === "Salchipapa") salchipapa -= 0.5;
      if (mG === "Salchipapa") salchipapa -= 0.5;

      if (mN === "Otra") otra_comida -= 0.5;
      if (mG === "Otra") otra_comida -= 0.5;

      if (h.extra) extras -= 1.0;
    });

    pizza = hamburguesa;
    sushi = hamburguesa;

    return {
      hamburguesa: Math.max(0, hamburguesa),
      salchipapa: Math.max(0, salchipapa),
      pizza: Math.max(0, pizza),
      sushi: Math.max(0, sushi),
      otra_comida: Math.max(0, otra_comida),
      extras: Math.max(0, extras)
    };
  };

  const inventory = getPortionQuantities();

  const getInventoryBg = (qty: number, max: number) => {
    const percent = qty / max;
    if (percent === 0) return "bg-slate-100 border-slate-200 text-slate-400";
    if (percent <= 0.3) return "bg-rose-50 border-rose-100 text-rose-700";
    if (percent <= 0.6) return "bg-amber-50 border-amber-100 text-amber-700";
    return "bg-white border-slate-100/70 text-slate-800";
  };

  return (
    <div className="min-h-screen bg-slate-900 flex md:py-6 md:px-4 items-center justify-center font-sans select-none overflow-x-hidden">
      
      {/* Device frame centered on desktop, true fullscreen on mobile */}
      <div className="w-full max-w-sm h-[100dvh] md:h-[840px] md:max-h-[90vh] md:rounded-[40px] md:border-8 md:border-slate-800 bg-[#F4F7F9] relative flex flex-col md:shadow-2xl overflow-hidden shadow-none border-none rounded-none text-slate-800">
        
        {/* TOP STATUS AND APP BAR (Header) */}
        <header className="bg-white border-b border-slate-100/80 px-4 py-3 shrink-0 flex items-center justify-between z-30 shadow-xs relative">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-red-500 rounded-lg flex items-center justify-center text-white shadow-xs">
              <Heart size={14} className="fill-white" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-slate-950 flex items-center gap-1 font-display">
                FitCycle <span className="text-[10px] text-red-500 font-extrabold font-mono tracking-tighter">💕 PWA</span>
              </h1>
              <p className="text-[9px] text-slate-400 leading-none">Tracker Joss & Nati</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Week switch selector dropdown styled custom */}
            <div className="bg-slate-100 rounded-lg px-2 py-1 flex items-center gap-1 border border-slate-200/50">
              <Calendar size={11} className="text-sky-500" />
              <select
                value={state.current_week}
                onChange={(e) => selectCurrentWeek(parseInt(e.target.value))}
                className="font-black text-[11px] text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer pr-1"
              >
                {[1,2,3,4,5,6,7,8].map((w) => (
                  <option key={w} value={w}>Sem. {w}</option>
                ))}
              </select>
            </div>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationList(!showNotificationList)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition hover:bg-slate-100 relative cursor-pointer"
                title="Centro de alertas"
              >
                <Bell size={15} className={notifications.length > 0 ? "text-red-500 fill-red-50" : ""} />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              </button>

              {/* Overlaid notification drawer (Mobile safe size) */}
              {showNotificationList && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-3 z-50 animate-fade-in text-xs max-h-72 overflow-y-auto">
                  <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-slate-100">
                    <span className="font-extrabold text-slate-700 tracking-wider">Notificaciones 📱</span>
                    <button
                      onClick={() => setNotifications([])}
                      className="text-[10px] text-sky-500 font-black hover:underline"
                    >
                      Limpiar
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-[10px] text-slate-450 text-center py-4">Sin nuevas alertas de racha o porciones.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {notifications.map((n) => (
                        <div key={n.id} className="text-[10px] text-slate-700 leading-snug p-2 rounded-xl bg-slate-50 border border-slate-100/50">
                          <p>{n.text}</p>
                          <span className="text-[8px] text-slate-400 block mt-1">{n.time}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* DYNAMIC TOAST NOTIFICATE ON SCREEN TOP */}
        {toastMessage && (
          <div className="absolute top-14 left-4 right-4 z-50 animate-bounce bg-slate-900 border border-slate-800 text-white p-3 rounded-2xl shadow-lg flex items-center gap-2 text-[10px]">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping shrink-0" />
            <p className="font-bold leading-tight">{toastMessage}</p>
          </div>
        )}

        {/* MIDDLE CONTENTS WRAPPER (Smooth Inner Scroll) */}
        <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24 focus:outline-none scroll-smooth">
          
          {/* TAB 1: DASHBOARD FEATURE */}
          {activeTab === "dashboard" && (
            <div className="space-y-4 animate-fade-in">
              
              {/* RECOMMENDED MASTER MEAL CARD */}
              {(() => {
                const recommendation = getRecommendedMealForWeek(state.current_week);
                let recoIcon = "🍔";
                if (recommendation.meal === "Salchipapa") recoIcon = "🍟";
                if (recommendation.meal === "Pizza") recoIcon = "🍕";
                if (recommendation.meal === "Sushi") recoIcon = "🍣";
                if (recommendation.meal === "Otra") recoIcon = "🍱";

                return (
                  <div className="bg-white/90 rounded-2xl p-4 border border-rose-100 shadow-xs relative overflow-hidden">
                    <div className="absolute -top-3 -right-3 w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-xs opacity-40 leading-none">
                      👑
                    </div>
                    <span className="bg-rose-50 text-rose-600 text-[8px] uppercase tracking-widest font-black px-2 py-0.5 rounded-md">
                      Plan Maestro Sugerido
                    </span>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="text-3xl">{recoIcon}</div>
                      <div>
                        <h3 className="font-extrabold text-xs text-slate-900 leading-snug">
                          Semana {state.current_week}: {recommendation.meal}
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                          {recommendation.extra ? "Habilitado con extra dulce 🍨" : "Sin extra permitido esta semana 🔒"}
                        </p>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2.5 leading-snug border-t border-slate-100 pt-2 bg-slate-50/50 p-1.5 rounded-lg italic">
                      "{recommendation.desc}"
                    </p>
                  </div>
                );
              })()}

              {/* SEMAFORO STATUS CAPSULE */}
              <div className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${
                mixingStatus === "PROHIBITED"
                  ? "bg-rose-50 border-rose-200 text-rose-950"
                  : mixingStatus === "OPTIMAL"
                    ? "bg-teal-50 border-teal-200 text-teal-950"
                    : "bg-sky-50 border-sky-200 text-sky-950"
              }`}>
                <div className="text-2xl shrink-0 pt-0.5">
                  {mixingStatus === "PROHIBITED" ? "🔴" : mixingStatus === "OPTIMAL" ? "🟢" : "🟡"}
                </div>
                <div>
                  <h4 className="font-black text-[10px] uppercase tracking-widest mb-0.5">
                    Semáforo: {mixingStatus === "PROHIBITED" ? "Restricción" : mixingStatus === "OPTIMAL" ? "Sinergia" : "Alineación"}
                  </h4>
                  <p className="text-[11px] leading-relaxed font-semibold">{mixingMessage}</p>
                </div>
              </div>

              {/* JOSS & NATI ACTIVE PLATERS CARDS */}
              <div className="space-y-3.5">
                
                {/* 1. NOVIO SELECTOR (Joss) */}
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase text-sky-600 tracking-wider flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
                      Su Plato - {novioName}
                    </span>
                    {currentWeekInfo?.cena_novio && (
                      <button
                        onClick={() => setMealForUser("novio", null)}
                        className="text-[9px] text-slate-400 font-bold hover:text-red-500 flex items-center gap-0.5 transition"
                      >
                        <Trash2 size={10} /> Quitar
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between mb-3 bg-sky-50/50 p-2 rounded-xl border border-sky-100/30">
                    <span className="text-[10px] text-slate-500">Elección hoy:</span>
                    <span className="text-xs font-black text-sky-950 uppercase tracking-wide">
                      {currentWeekInfo?.cena_novio ? `🍔 ${currentWeekInfo.cena_novio}` : "⚪ Ninguno aún"}
                    </span>
                  </div>

                  {/* 5 direct buttons with absolute visibility */}
                  <div className="grid grid-cols-5 gap-1 pt-1">
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
                          className={`py-2 rounded-xl border text-xs font-black cursor-pointer flex flex-col items-center justify-center transition ${
                            isSelected
                              ? "bg-sky-500 border-sky-600 text-white shadow-md shadow-sky-100"
                              : blockInfo.blocked
                                ? "bg-slate-50 border-dashed border-slate-200 text-slate-300 opacity-40 cursor-not-allowed"
                                : "bg-white hover:bg-slate-50 border-slate-200/60 text-slate-700"
                          }`}
                          title={blockInfo.blocked ? blockInfo.reason : meal}
                        >
                          <span className="text-lg leading-none">{mealIcon}</span>
                          <span className="text-[8px] mt-0.5 font-bold tracking-tight block max-w-full truncate">{meal.substring(0, 4)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. NOVIA SELECTOR (Nati) */}
                <div className="bg-white rounded-2xl p-4 border border-rose-55 hover:border-rose-100 shadow-xs relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                      Su Plato - {noviaName}
                    </span>
                    {currentWeekInfo?.cena_novia && (
                      <button
                        onClick={() => setMealForUser("novia", null)}
                        className="text-[9px] text-slate-400 font-bold hover:text-red-500 flex items-center gap-0.5 transition"
                      >
                        <Trash2 size={10} /> Quitar
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between mb-3 bg-rose-50/50 p-2 rounded-xl border border-rose-100/30">
                    <span className="text-[10px] text-slate-500">Elección hoy:</span>
                    <span className="text-xs font-black text-rose-950 uppercase tracking-wide">
                      {currentWeekInfo?.cena_novia ? `🍔 ${currentWeekInfo.cena_novia}` : "⚪ Ninguno aún"}
                    </span>
                  </div>

                  {/* 5 direct buttons with absolute visibility */}
                  <div className="grid grid-cols-5 gap-1 pt-1">
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
                          className={`py-2 rounded-xl border text-xs font-black cursor-pointer flex flex-col items-center justify-center transition ${
                            isSelected
                              ? "bg-rose-400 border-rose-500 text-white shadow-md shadow-rose-100"
                              : blockInfo.blocked
                                ? "bg-slate-50 border-dashed border-slate-200 text-slate-300 opacity-40 cursor-not-allowed"
                                : "bg-white hover:bg-slate-50 border-slate-200/60 text-slate-700"
                          }`}
                          title={blockInfo.blocked ? blockInfo.reason : meal}
                        >
                          <span className="text-lg leading-none">{mealIcon}</span>
                          <span className="text-[8px] mt-0.5 font-bold tracking-tight block max-w-full truncate">{meal.substring(0, 4)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* POSTRE EXTRA SWITCHER */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="text-2xl">🍧</div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 leading-snug">Extra dulce (Helado / Granizado)</h4>
                    <p className="text-[9px] text-slate-400">Usar máximo cada 15 días (Semanas pares)</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.history.find(h => h.semana === state.current_week)?.extra || false}
                    onChange={() => toggleExtraForWeek(state.current_week)}
                    className="sr-only peer"
                    disabled={activeTab === "inventory"}
                  />
                  <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-450 bg-slate-200 peer-checked:bg-red-550"></div>
                </label>
              </div>

              {/* 💞 COORDINATION COMER LO MISMO SHORTCUT */}
              <button
                type="button"
                onClick={() => {
                  if (currentWeekInfo?.cena_novio) {
                    setMealForUser("novia", currentWeekInfo.cena_novio);
                    triggerPushNotification(`💞 ¡Alineados! Ambos comerán ${currentWeekInfo.cena_novio} juntos.`, "success");
                  } else if (currentWeekInfo?.cena_novia) {
                    setMealForUser("novio", currentWeekInfo.cena_novia);
                    triggerPushNotification(`💞 ¡Alineados! Ambos comerán ${currentWeekInfo.cena_novia} juntos.`, "success");
                  } else {
                    triggerPushNotification("⚠️ Registra el plato de uno de ustedes primero.", "block");
                  }
                }}
                className="w-full py-3 bg-red-100/50 hover:bg-rose-100 border border-red-200/50 rounded-2xl text-xs font-black text-red-600 transition flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95 duration-200"
              >
                💞 Comer lo Mismo (Duplicar elección)
              </button>

            </div>
          )}

          {/* TAB 2: INVENTORY FEATURE */}
          {activeTab === "inventory" && (
            <div className="space-y-4 animate-fade-in text-slate-800">
              
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs">
                <h3 className="font-extrabold text-xs text-slate-950 uppercase tracking-wider mb-1">Stock de Porciones del Ciclo</h3>
                <p className="text-[10px] text-slate-550 mb-4 leading-normal">Porciones disponibles calculadas por el motor inteligente para aguantar las 8 semanas de déficit.</p>
                
                <div className="grid grid-cols-2 gap-3 mb-2">
                  
                  {/* Category 1: Healthy group (5.0 max) */}
                  <div className={`p-3 rounded-xl border flex flex-col justify-between ${getInventoryBg(inventory.hamburguesa, 5.0)}`}>
                    <span className="text-[8px] font-black uppercase tracking-wider block text-slate-400 mb-1">Saludables</span>
                    <span className="text-xl">🍔🍕🍣</span>
                    <div className="mt-2">
                      <p className="text-xs font-black text-slate-950 leading-none">{inventory.hamburguesa.toFixed(1)} / 5.0</p>
                      <p className="text-[9px] text-slate-500 mt-1">Porciones de Hamb/Piz/Sushi</p>
                    </div>
                  </div>

                  {/* Category 2: Salchipapas (2.0 max) */}
                  <div className={`p-3 rounded-xl border flex flex-col justify-between ${getInventoryBg(inventory.salchipapa, 2.0)}`}>
                    <span className="text-[8px] font-black uppercase tracking-wider block text-slate-400 mb-1">Doble Grasa</span>
                    <span className="text-xl">🍟🍟</span>
                    <div className="mt-2">
                      <p className="text-xs font-black text-slate-950 leading-none">{inventory.salchipapa.toFixed(1)} / 2.0</p>
                      <p className="text-[9px] text-slate-500 mt-1">Porciones Salchipapa</p>
                    </div>
                  </div>

                  {/* Category 3: Extras (4.0 max) */}
                  <div className={`p-3 rounded-xl border flex flex-col justify-between ${getInventoryBg(inventory.extras, 4.0)}`}>
                    <span className="text-[8px] font-black uppercase tracking-wider block text-slate-400 mb-1">Extras</span>
                    <span className="text-xl">🍨🍧</span>
                    <div className="mt-2">
                      <p className="text-xs font-black text-slate-950 leading-none">{inventory.extras.toFixed(1)} / 4.0</p>
                      <p className="text-[9px] text-slate-500 mt-1">Míticos dulces permitidos</p>
                    </div>
                  </div>

                  {/* Category 4: Otras (1.0 max) */}
                  <div className={`p-3 rounded-xl border flex flex-col justify-between ${getInventoryBg(inventory.otra_comida, 1.0)}`}>
                    <span className="text-[8px] font-black uppercase tracking-wider block text-slate-400 mb-1">Otros antojos</span>
                    <span className="text-xl">🍱</span>
                    <div className="mt-2">
                      <p className="text-xs font-black text-slate-950 leading-none">{inventory.otra_comida.toFixed(1)} / 1.0</p>
                      <p className="text-[9px] text-slate-500 mt-1">Platos alternativos</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* BLOCKED STATS */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-3">
                <h3 className="font-extrabold text-xs text-slate-900 uppercase">Bloqueos de Racha y Re-consumo</h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <span className="font-bold flex items-center gap-1.5 text-slate-805">🍟 Salchipapa Consecutiva</span>
                    {inventory.salchipapa <= 0.5 ? (
                      <span className="bg-red-500 text-white font-bold text-[8px] px-2 py-0.5 rounded uppercase">BLOQUEADO</span>
                    ) : (
                      <span className="bg-emerald-500 text-white font-bold text-[8px] px-2 py-0.5 rounded uppercase">HABILITADO</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <span className="font-bold flex items-center gap-1.5 text-slate-805">🍦 Extra Dulce Paralelo</span>
                    {inventory.extras <= 0.5 ? (
                      <span className="bg-red-500 text-white font-bold text-[8px] px-2 py-0.5 rounded uppercase">BLOQUEADO</span>
                    ) : (
                      <span className="bg-emerald-500 text-white font-bold text-[8px] px-2 py-0.5 rounded uppercase">HABILITADO</span>
                    )}
                  </div>
                </div>
              </div>

              {/* TRAFFIC LIGHT INFO SHELLS */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-3">
                <h3 className="font-extrabold text-xs text-slate-900 uppercase">Resumen de Combinación "Mitad y Mitad"</h3>
                <div className="space-y-2.5 text-[11px] leading-relaxed">
                  <div className="border-l-2 border-emerald-500 pl-2">
                    <strong className="text-emerald-700">🟢 Mezcla Óptima</strong>: Hamb + Sushi, Pizza + Sushi. Proteína con carbohidratos equilibrados.
                  </div>
                  <div className="border-l-2 border-amber-400 pl-2">
                    <strong className="text-amber-600">🟡 Mezcla Seguro</strong>: Ambos comen el mismo plato (ej. Pizza + Pizza) o Subway.
                  </div>
                  <div className="border-l-2 border-red-500 pl-2">
                    <strong className="text-red-600">🔴 Combinación Prohibida</strong>: Salchipapa + Pizza, Salchipapa + Hamburguesa. Demasiados ácidos grasos y grasas trans saturando el hígado. ¡Evitar a toda costa de lunes a viernes y fines de semana!
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: WEEKLY MAP SEQUENCE */}
          {activeTab === "map" && (
            <div className="space-y-4 animate-fade-in">
              
              {/* TIMELINE PROGRESS GRID OVERVIEW */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs">
                <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wide mb-1">Mapa de 8 Semanas</h3>
                <p className="text-[10px] text-slate-400 mb-4 leading-normal">Haz clic en cualquier burbuja para reactivar hoy la edición de esa semana.</p>

                <div className="grid grid-cols-4 gap-2">
                  {state.history.map((h) => {
                    const isSelected = h.semana === state.current_week;
                    const hasSelection = h.cena_novio || h.cena_novia;

                    let displayIcon = "🍽️";
                    if (h.cena_novio === "Salchipapa" || h.cena_novia === "Salchipapa") displayIcon = "🍟";
                    else if (h.cena_novio === "Hamburguesa" || h.cena_novia === "Hamburguesa") displayIcon = "🍔";
                    else if (h.cena_novio === "Pizza" || h.cena_novia === "Pizza") displayIcon = "🍕";
                    else if (h.cena_novio === "Sushi" || h.cena_novia === "Sushi") displayIcon = "🍣";
                    else if (h.cena_novio === "Otra" || h.cena_novia === "Otra") displayIcon = "🍱";

                    return (
                      <button
                        key={h.semana}
                        onClick={() => selectCurrentWeek(h.semana)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition cursor-pointer relative ${
                          isSelected
                            ? "ring-2 ring-red-500 bg-white border-red-100"
                            : hasSelection
                              ? "bg-sky-50 border-sky-100 text-sky-950"
                              : "bg-slate-50/80 border-slate-200 text-slate-450"
                        }`}
                      >
                        <span className="text-[9px] font-black text-slate-500 opacity-80 uppercase">S. {h.semana}</span>
                        <span className="text-lg my-1 block">{displayIcon}</span>
                        <div className="flex gap-0.5 items-center">
                          {h.extra && <span className="text-[9px]">🍦</span>}
                          <span className="text-[8px] font-black tracking-tighter text-slate-400">
                            {hasSelection ? "Reg." : "Vacío"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RECOMMENDED SCHEDULER TIMELINE OVERVIEW */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-3">
                <h3 className="font-extrabold text-xs text-slate-900 uppercase">Cronograma Maestro Sugerido</h3>
                
                <div className="space-y-2 max-h-60 overflow-y-auto text-[11px] pr-1">
                  {[1,2,3,4,5,6,7,8].map((w) => {
                    const rec = getRecommendedMealForWeek(w);
                    return (
                      <div key={w} className={`p-2 rounded-lg border flex justify-between items-center ${w === state.current_week ? "bg-red-50/50 border-red-100" : "bg-slate-50/80 border-slate-100"}`}>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-600">Semana {w}</span>
                          <span className="text-slate-500">|</span>
                          <span className="font-bold text-slate-900">{rec.meal}</span>
                        </div>
                        <span className="text-[9px] text-slate-400 truncate max-w-28">{rec.extra ? "🍦 Postre Sí" : "🔒 Postre No"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: IA CHAT PROCESSOR */}
          {activeTab === "ai" && (
            <div className="flex flex-col h-[400px] md:h-[480px] bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden animate-fade-in">
              
              {/* Messages viewport */}
              <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/60"
              >
                {chatMessages.map((m) => {
                  const isBot = m.sender === "ai";
                  return (
                    <div 
                      key={m.id}
                      className={`flex flex-col max-w-[85%] ${isBot ? "self-start mr-auto" : "self-end ml-auto"}`}
                    >
                      <div className={`p-2.5 rounded-xl text-xs leading-relaxed ${
                        isBot 
                          ? "bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/50" 
                          : "bg-red-500 text-white rounded-tr-none"
                      }`}>
                        <p className="font-bold mb-0.5 text-[10px] uppercase opacity-75">
                          {isBot ? "Asistente IA" : `${novioName}/${noviaName}`}
                        </p>
                        <p>{m.text}</p>
                      </div>
                      <span className="text-[7.5px] text-slate-400 block mt-0.5 text-right px-1">{m.time}</span>
                    </div>
                  );
                })}
              </div>

              {/* HORIZONTAL QUICK COMMAND PILLS */}
              <div className="shrink-0 p-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto scrollbar-none whitespace-nowrap">
                {quickChatPills.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(p.text)}
                    className="p-1 px-2.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded-lg text-[9px] font-extrabold text-slate-600 transition tracking-tight shrink-0 border border-slate-200/50 cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* INPUT BAR FOR FAST CHAT MESSAGE */}
              <div className="shrink-0 p-2 bg-slate-50 border-t border-slate-100 flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  placeholder={`Di algo, ej: Joss comió pizza...`}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendMessage();
                  }}
                  className="flex-1 bg-white text-xs border border-slate-200 rounded-xl px-3 focus:outline-none focus:border-red-505 focus:ring-1 focus:ring-red-500 text-slate-800"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={loading}
                  className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition cursor-pointer shrink-0"
                >
                  <Send size={14} />
                </button>
              </div>

            </div>
          )}

          {/* TAB 5: ADJUSTMENT CONFIGURATION FOR ALERTS */}
          {activeTab === "settings" && (
            <div className="space-y-4 animate-fade-in text-slate-800">
              
              {/* Couple configuration names block */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-3">
                <h3 className="font-extrabold text-xs text-slate-900 uppercase">👥 Perfiles de la Pareja</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-[8px] uppercase font-bold text-slate-400 mb-1">Nombre Novio</label>
                    <input
                      type="text"
                      value={novioName}
                      onChange={(e) => {
                        setNovioName(e.target.value);
                        triggerPushNotification(`Perfil de Novio actualizado a ${e.target.value}`, "success");
                      }}
                      className="w-full bg-slate-50 px-3 py-1.5 text-xs border border-slate-100 rounded-xl focus:outline-none focus:border-red-500 focus:bg-white text-slate-800 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] uppercase font-bold text-slate-400 mb-1">Nombre Novia</label>
                    <input
                      type="text"
                      value={noviaName}
                      onChange={(e) => {
                        setNoviaName(e.target.value);
                        triggerPushNotification(`Perfil de Novia actualizado a ${e.target.value}`, "success");
                      }}
                      className="w-full bg-slate-50 px-3 py-1.5 text-xs border border-slate-100 rounded-xl focus:outline-none focus:border-red-500 focus:bg-white text-slate-800 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Interactive notification control engine */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-4">
                <h3 className="font-extrabold text-xs text-slate-900 uppercase">🔔 Alertas e Integración PWA</h3>
                
                {/* 1. Weekend Register reminder */}
                <div className="space-y-2 border-b border-slate-50 pb-3">
                  <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-xl">
                    <span className="font-bold text-[11px] text-slate-80s flex items-center gap-1">🗓️ Alerta de Registro Sábado</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableWeekendReminder}
                        onChange={(e) => {
                          setEnableWeekendReminder(e.target.checked);
                          triggerPushNotification(e.target.checked ? "🔔 Alerta de fin de semana encendida." : "🔕 Alerta apagada.", "info");
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-red-500"></div>
                    </label>
                  </div>
                  
                  {enableWeekendReminder && (
                    <div className="grid grid-cols-2 gap-2 text-[10px] pl-2">
                      <div className="flex flex-col">
                        <span className="text-slate-400">Día de alarma:</span>
                        <select
                          value={weekendReminderDay}
                          onChange={(e) => setWeekendReminderDay(e.target.value)}
                          className="font-bold bg-slate-100 rounded p-1"
                        >
                          <option value="Sábado">Sábado</option>
                          <option value="Viernes">Viernes</option>
                          <option value="Domingo">Domingo</option>
                        </select>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-400">Hora de alarma:</span>
                        <input
                          type="text"
                          value={weekendReminderTime}
                          onChange={(e) => setWeekendReminderTime(e.target.value)}
                          className="font-bold bg-slate-100 rounded p-1 text-center"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      triggerPushNotification(`📲 Recordatorio PWA: ¡Hola ${novioName} y ${noviaName}! Fin de semana activo. Recuerden registrar su cena libre de la Semana ${state.current_week} y tomar sus 3 Litros de agua hoy.`, "info");
                    }}
                    className="w-full mt-2 py-1 bg-slate-100 text-slate-700 font-extrabold text-[10px] rounded-lg cursor-pointer hover:bg-slate-200"
                  >
                    ⚡ Simular Recordatorio de Registro
                  </button>
                </div>

                {/* 2. Low Stock Alerts Custom Threshold */}
                <div className="space-y-2 border-b border-slate-50 pb-3">
                  <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-xl">
                    <span className="font-bold text-[11px] text-slate-80s flex items-center gap-1">🚨 Alerta Auto Stock Crítico</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableStockWarning}
                        onChange={(e) => {
                          setEnableStockWarning(e.target.checked);
                          if (e.target.checked) setNotifiedLowStocks([]);
                          triggerPushNotification(e.target.checked ? "🔔 Alertas auto de stock activas" : "🔕 Alertas inactivas", "info");
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-red-500"></div>
                    </label>
                  </div>

                  {enableStockWarning && (
                    <div className="flex flex-col text-[10px] pl-2">
                      <span className="text-slate-400">Límite de alerta:</span>
                      <select
                        value={stockWarningThreshold}
                        onChange={(e) => {
                          setStockWarningThreshold(parseFloat(e.target.value));
                          setNotifiedLowStocks([]);
                        }}
                        className="font-bold bg-slate-100 rounded p-1 w-full"
                      >
                        <option value="1.0">≤ 1.0 porción restante</option>
                        <option value="1.5">≤ 1.5 porciones restantes</option>
                        <option value="2.0">≤ 2.0 porciones restantes</option>
                      </select>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      const lows: string[] = [];
                      if (inventory.hamburguesa <= stockWarningThreshold) lows.push("Saludables (Ham/Piz/Sus)");
                      if (inventory.salchipapa <= stockWarningThreshold) lows.push("Salchipapas 🍟");
                      if (inventory.extras <= stockWarningThreshold) lows.push("Extras dulces 🍧");

                      if (lows.length > 0) {
                        triggerPushNotification(`🚨 ¡Alerta Crítica PWA!: Les queda poco stock de: ${lows.join(", ")}. ¡Corten el exceso de cheat-meals!`, "block");
                      } else {
                        triggerPushNotification("✅ ¡Inventario Seguro!: Todos sus platos de comida superan el umbral.", "success");
                      }
                    }}
                    className="w-full py-1 bg-slate-100 text-slate-700 font-extrabold text-[10px] rounded-lg cursor-pointer hover:bg-slate-200"
                  >
                    ⚡ Probar Alerta de Stock
                  </button>
                </div>

                {/* 3. Personalized Motivational Alert */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-xl">
                    <span className="font-bold text-[11px] text-slate-80s flex items-center gap-1">💌 Motivación Semanal Adaptable</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableMotivationalAlert}
                        onChange={(e) => {
                          setEnableMotivationalAlert(e.target.checked);
                          triggerPushNotification(e.target.checked ? "🔔 Mensajes semanales activos" : "🔕 Mensajes apagados", "info");
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-red-500"></div>
                    </label>
                  </div>

                  <button
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
                        default: motMsg = `🌟 ¡Con todo pareja! La salud y de Joss y Nati se construye plato a plato.`; break;
                      }
                      triggerPushNotification(`💌 Motivación: ${motMsg}`, "success");
                    }}
                    className="w-full py-1 bg-slate-100 text-slate-700 font-extrabold text-[10px] rounded-lg cursor-pointer hover:bg-slate-200"
                  >
                    ⚡ Probar Mensaje Motivacional
                  </button>
                </div>

              </div>

              {/* FACTORY DEVELOPER TOOLS */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-3">
                <h3 className="font-extrabold text-xs text-slate-900 uppercase">🛠️ Opciones de Fábrica</h3>
                <div className="flex gap-2">
                  <button
                    onClick={loadDemoState}
                    className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] rounded-xl cursor-pointer transition"
                  >
                    Cargar Historial Demo (S.6)
                  </button>
                  <button
                    onClick={resetCycle}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[10px] rounded-xl cursor-pointer transition border border-slate-200"
                  >
                    Reiniciar Todo (Borrar)
                  </button>
                </div>
              </div>

            </div>
          )}

        </main>

        {/* BOTTOM NAVIGATION TAB BAR (ALWAYS VISIBLE - FIX INTERNAL SCROLL SCENARIO) */}
        <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100/90 px-2 py-2 flex justify-around items-center z-40 shadow-lg shrink-0 rounded-b-[40px] md:rounded-b-none">
          
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex flex-col items-center py-1 px-3.5 rounded-xl transition-all cursor-pointer ${
              activeTab === "dashboard" ? "text-red-500 scale-105" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Home size={18} />
            <span className="text-[9px] font-black mt-0.5 tracking-tight">Inicio</span>
          </button>

          <button
            onClick={() => setActiveTab("inventory")}
            className={`flex flex-col items-center py-1 px-3.5 rounded-xl transition-all cursor-pointer ${
              activeTab === "inventory" ? "text-red-500 scale-105" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Database size={18} />
            <span className="text-[9px] font-black mt-0.5 tracking-tight">Abastos</span>
          </button>

          <button
            onClick={() => setActiveTab("map")}
            className={`flex flex-col items-center py-1 px-3.5 rounded-xl transition-all cursor-pointer ${
              activeTab === "map" ? "text-red-500 scale-105" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Calendar size={18} />
            <span className="text-[9px] font-black mt-0.5 tracking-tight">Mapa</span>
          </button>

          <button
            onClick={() => setActiveTab("ai")}
            className={`flex flex-col items-center py-1 px-3.5 rounded-xl transition-all cursor-pointer ${
              activeTab === "ai" ? "text-red-500 scale-105" : "text-slate-400 hover:text-slate-600 font-semibold"
            }`}
          >
            <div className="relative">
              <MessageSquare size={18} />
              <span className="absolute -top-1 -right-1.5 w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            </div>
            <span className="text-[9px] font-black mt-0.5 tracking-tight">IA Chat</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`flex flex-col items-center py-1 px-3.5 rounded-xl transition-all cursor-pointer ${
              activeTab === "settings" ? "text-red-500 scale-105" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Settings size={18} />
            <span className="text-[9px] font-black mt-0.5 tracking-tight">Ajustes</span>
          </button>

        </nav>

        {/* CUSTOM DESTRUCTION RESET CONFIRMATION DIALOG */}
        {showResetConfirm && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl p-5 max-w-xs w-full shadow-2xl border border-slate-100 flex flex-col gap-3 text-slate-800 text-xs text-center">
              <span className="text-3xl">⚠️</span>
              <h3 className="font-extrabold text-slate-900 text-sm">¿Reiniciar todo el ciclo?</h3>
              <p className="text-slate-500 leading-normal">Se borrará de forma irreversible el historial registrado de todas las semanas.</p>
              
              <div className="flex gap-2 justify-center mt-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setState(getInitialState());
                    setShowResetConfirm(false);
                    triggerPushNotification("🚀 Nuevo ciclo de 8 semanas iniciado con éxito.", "success");
                    setActiveTab("dashboard");
                  }}
                  className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black transition cursor-pointer"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
