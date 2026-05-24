import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { processFitCycle, getInitialState } from "./src/fitCycleEngine";
import { FitCycleState, MealType } from "./src/types";

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// REST API for FitCycle Engine
// 1. GET /api/fitcycle - Returns the results of a given or fresh state
app.post("/api/fitcycle/calculate", (req, res) => {
  try {
    const stateInput: FitCycleState = req.body.state || getInitialState();
    const result = processFitCycle(stateInput);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 2. POST /api/fitcycle/process - Process a natural language input to alter state
app.post("/api/fitcycle/process", async (req, res) => {
  try {
    const { message, state } = req.body;
    
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "El mensaje del usuario es requerido." });
    }

    const currentState: FitCycleState = state || getInitialState();

    // Attempt to invoke Gemini model to parse the request in Spanish and update the state object
    try {
      const ai = getGeminiClient();

      const systemInstruction = `
Eres la API lógica para "FitCycle", una app de rastreo de comidas libres (cheat meals) estilo "MeetYou" para parejas.
Tu trabajo es analizar el mensaje del usuario (en español) y actualizar el estado del ciclo de 8 semanas de forma lógica.

El estado del ciclo contiene:
- "current_week": El número de la semana activa actualmente (un entero de 1 a 8).
- "history": Un array de exactamente 8 elementos correspondientes a las semanas 1 a 8:
  {
    "semana": número,
    "cena_novio": "Hamburguesa" | "Salchipapa" | "Pizza" | "Sushi" | "Otra" | null,
    "cena_novia": "Hamburguesa" | "Salchipapa" | "Pizza" | "Sushi" | "Otra" | null,
    "cena": "Hamburguesa" | "Salchipapa" | "Pizza" | "Sushi" | "Otra" | null,
    "extra": true | false
  }

Las acciones típicas del usuario son:
1. Registrar lo que comieron (haciendo foco en si comió uno, la novia, o ambos mitad y mitad):
   - "Ambos comimos pizza" o "Comimos pizza" -> cena_novio = "Pizza", cena_novia = "Pizza", cena = "Pizza"
   - "Yo comí hamburguesa y ella sushi" -> cena_novio = "Hamburguesa", cena_novia = "Sushi", cena = "Hamburguesa"
   - "Ella salchipapa" -> cena_novia = "Salchipapa"
   - "Helado de extra" o "tomamos café" -> extra = true en la semana activa.
   - Podría mencionar una semana específica: "en la semana 3 comimos sushi" -> actualiza el registro de la semana 3.
2. Eliminar o reiniciar un registro:
   - "borrar el registro de la semana 2": pone cena_novio = null, cena_novia = null, cena = null, extra = false para esa semana.
3. Cambiar la semana activa corriente:
   - "pasar a la semana 3" o "siguiente semana": ajusta el valor de "current_week" según corresponda.

Reglas del estado:
- cena_novio, cena_novia y cena solo pueden ser: "Hamburguesa", "Salchipapa", "Pizza", "Sushi", "Otra" o null.
- El valor de "extra" es booleano. Representa helado, café, postres o extras similares.
- No modifiques los registros de otras semanas a no ser que el mensaje lo indique.

Debes responder estrictamente con un objeto JSON válido que representa la estructura FitCycleState actualizada. No inventes campos fuera de la estructura. No agregues texto explicativo, solo el JSON especificado por el esquema.
`;

      const prompt = `
Estado Actual: ${JSON.stringify(currentState)}
Mensaje del usuario: "${message}"

Analiza el mensaje y devuelve el estado FitCycleState completamente actualizado.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              current_week: { type: Type.INTEGER, description: "Semana activa actual (1 a 8)" },
              history: {
                type: Type.ARRAY,
                description: "Historial de registros de las 8 semanas",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    semana: { type: Type.INTEGER },
                    cena_novio: { type: Type.STRING, nullable: true },
                    cena_novia: { type: Type.STRING, nullable: true },
                    cena: { 
                      type: Type.STRING, 
                      nullable: true, 
                      description: "Una de: Hamburguesa, Salchipapa, Pizza, Sushi, Otra, o null." 
                    },
                    extra: { type: Type.BOOLEAN }
                  },
                  required: ["semana", "extra"]
                }
              }
            },
            required: ["current_week", "history"]
          }
        }
      });

      const responseText = response.text ? response.text.trim() : "";
      if (responseText) {
        const updatedState: FitCycleState = JSON.parse(responseText);
        
        // programmatically recalculate response with strict rules
        const fitCycleData = processFitCycle(updatedState);
        return res.json({
          state: updatedState,
          data: fitCycleData
        });
      }
    } catch (aiError: any) {
      console.error("Gemini processing error, falling back to heuristic parsing:", aiError);
    }

    // Heuristic Fallback in case Gemini fails or is unconfigured
    const text = message.toLowerCase();
    const updatedState = { ...currentState };
    const currentWeekIdx = updatedState.history.findIndex(h => h.semana === updatedState.current_week);
    
    if (currentWeekIdx !== -1) {
      let matchedMeal: MealType | null = null;
      if (text.includes("hamburguesa") || text.includes("burger")) {
        matchedMeal = "Hamburguesa";
      } else if (text.includes("salchipapa")) {
        matchedMeal = "Salchipapa";
      } else if (text.includes("pizza")) {
        matchedMeal = "Pizza";
      } else if (text.includes("sushi")) {
        matchedMeal = "Sushi";
      } else if (text.includes("perro")) {
        matchedMeal = "Perro Caliente";
      } else if (text.includes("sandwich") || text.includes("sándwich")) {
        matchedMeal = "Sándwich Callejero";
      } else if (text.includes("arepa")) {
        matchedMeal = "Arepa";
      }

      if (matchedMeal) {
        if (text.includes("ella") || text.includes("novia") || text.includes("noviapide")) {
          updatedState.history[currentWeekIdx].cena_novia = matchedMeal;
        } else if (text.includes("yo") || text.includes("novio") || text.includes("comi ")) {
          updatedState.history[currentWeekIdx].cena_novio = matchedMeal;
        } else {
          // Both
          updatedState.history[currentWeekIdx].cena_novio = matchedMeal;
          updatedState.history[currentWeekIdx].cena_novia = matchedMeal;
          updatedState.history[currentWeekIdx].cena = matchedMeal;
        }
      }

      if (text.includes("helado") || text.includes("cafe") || text.includes("café") || text.includes("extra")) {
        updatedState.history[currentWeekIdx].extra = true;
      }

      if (text.includes("borrar") || text.includes("eliminar") || text.includes("reiniciar")) {
        updatedState.history[currentWeekIdx].cena_novio = null;
        updatedState.history[currentWeekIdx].cena_novia = null;
        updatedState.history[currentWeekIdx].cena = null;
        updatedState.history[currentWeekIdx].extra = false;
      }
    }

    // Match week change command
    const weekMatch = text.match(/semana\s*([1-8])/);
    if (weekMatch) {
      updatedState.current_week = parseInt(weekMatch[1]);
    } else if (text.includes("siguiente semana") || text.includes("avanzar semana")) {
      updatedState.current_week = Math.min(8, updatedState.current_week + 1);
    }

    const fitCycleData = processFitCycle(updatedState);
    res.json({
      state: updatedState,
      data: fitCycleData,
      fallback: true
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Serve the front-end application
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FitCycle Server listening on port ${PORT}`);
  });
}

startServer();
