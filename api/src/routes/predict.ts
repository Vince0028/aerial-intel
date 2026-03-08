import { Router, type Request, type Response } from "express";

const router = Router();

/**
 * POST /api/intel/predict
 * Uses Groq AI (llama-3.3-70b-versatile) to predict aircraft behavior
 * Body: { callsign, lat, lng, altitude, heading, speed, originCountry }
 * Returns: AI prediction of destination, threat level, classification
 */
router.post("/", async (req: Request, res: Response) => {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(200).json({
            prediction: null,
            hint: "Set GROQ_API_KEY in .env — get free at console.groq.com",
        });
    }

    const { callsign, lat, lng, altitude, heading, speed, originCountry } = req.body;

    if (!lat || !lng) {
        return res.status(400).json({ error: "lat and lng are required" });
    }

    const prompt = `You are a military intelligence analyst AI for a Command & Control system called "Aerial Intel". Analyze this aircraft contact and provide a tactical assessment.

Aircraft Data:
- Callsign: ${callsign || "UNKNOWN"}
- Position: ${lat}°N, ${lng}°E
- Altitude: ${altitude || "unknown"} meters
- Heading: ${heading || "unknown"}°
- Speed: ${speed || "unknown"} m/s
- Origin Country: ${originCountry || "unknown"}

Provide a JSON response with ONLY this structure (no markdown, no code blocks):
{
  "classification": "CIVILIAN | MILITARY | SURVEILLANCE | CARGO | VIP | UNKNOWN",
  "threatLevel": "NONE | LOW | MEDIUM | HIGH | CRITICAL",
  "predictedDestination": "Most likely destination city/base",
  "flightProfile": "Brief description of the flight pattern",
  "confidence": 0.0 to 1.0,
  "recommendation": "One-line tactical recommendation"
}`;

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.3,
                max_tokens: 300,
            }),
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Groq responded ${response.status}: ${errBody}`);
        }

        const data = await response.json() as any;
        const content = data.choices?.[0]?.message?.content || "";

        // Try to parse the JSON from the response
        let prediction: any;
        try {
            // Extract JSON from possible markdown code blocks
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            prediction = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
        } catch {
            prediction = { raw: content };
        }

        res.json({
            prediction,
            model: data.model,
            usage: data.usage,
        });
    } catch (err: any) {
        console.error("[predict]", err.message);
        res.status(502).json({ error: "Failed to get AI prediction", detail: err.message });
    }
});

export default router;
