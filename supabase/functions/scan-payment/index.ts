// @ts-nocheck — corre en Deno (Supabase Edge Functions)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_PROMPT =
  'Analiza este comprobante de pago. Si NO es un comprobante válido (ticket, boleta, voucher, captura de Yape/Plin), responde: {"error":"no_receipt","message":"Lo enviado no parece un comprobante de pago"}. Si ES válido pero NO se identifica producto o servicio (solo datos del banco o pasarela), responde: {"error":"no_product","message":"El comprobante no registra el producto o servicio","amount":0.00,"date":"DD/MM/YYYY"}. Si ES válido con producto identificable: extrae monto total, nombre SOLO del establecimiento o producto (NUNCA banco, tarjeta, RUC, pasarela, código de operación — solo el nombre comercial como \'Enrique Tomás\', \'Starbucks\', \'Café Americano\'), fecha DD/MM/YYYY (día/mes/año — año es SIEMPRE el último número), hora HH:MM si aparece. JSON: {"amount":0.00,"description":"nombre comercial","date":"DD/MM/YYYY","time":"HH:MM o null"}';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const sb = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: { user }, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !user) return json({ error: "No autenticado" }, 401);

    const { data: profile } = await sb.from("profiles").select("is_pro, scan_count, scan_window_start").eq("id", user.id).single();
    const isPro = profile?.is_pro ?? false;
    const limit = isPro ? 30 : 1;
    const windowMs = isPro ? 8 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    const now = Date.now();
    const windowStart = profile?.scan_window_start ? new Date(profile.scan_window_start).getTime() : 0;
    const count = now - windowStart < windowMs ? (profile?.scan_count ?? 0) : 0;
    if (count >= limit) {
      return json({ error: "rate_limit", reset_at: new Date(windowStart + windowMs).toISOString() }, 429);
    }
    await sb.from("profiles").update({
      scan_count: count + 1,
      scan_window_start: count === 0 ? new Date(now).toISOString() : profile.scan_window_start,
    }).eq("id", user.id);

    const body = await req.json();
    const { image_base64, media_type, prompt: customPrompt, voice_text } = body;
    if (!image_base64 && !customPrompt && !voice_text) return json({ error: "Faltan campos: image_base64, voice_text o prompt" }, 400);

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ error: "API key no configurada" }, 500);

    let messages;
    if (voice_text) {
      const voicePrompt = `El usuario dijo esto en voz alta al registrar un gasto: '${voice_text}'. Extrae: el monto en soles (número), la descripción del producto o establecimiento (solo el nombre comercial, sin banco ni datos irrelevantes), y la fecha si la menciona (si no, asumir hoy). Responde SOLO JSON sin markdown: {"amount":0.00,"description":"...","date":"DD/MM/YYYY","confidence":"high/low"}. Si no puedes identificar un monto claro responde: {"error":"no_amount","message":"No entendí el monto — intenta de nuevo"}`;
      messages = [{ role: "user", content: voicePrompt }];
    } else {
      const promptText = customPrompt || DEFAULT_PROMPT;
      messages = image_base64
        ? [{ role: "user", content: [
            { type: "image", source: { type: "base64", media_type, data: image_base64 } },
            { type: "text", text: promptText },
          ]}]
        : [{ role: "user", content: promptText }];
    }

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: "Eres un extractor de datos. Responde ÚNICAMENTE con JSON válido, sin texto previo, sin explicaciones, sin markdown, sin backticks. Solo el objeto JSON.",
        messages,
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.json();
      return json({ error: err.error?.message || "Error en API de IA" }, 502);
    }

    const data = await anthropicRes.json();
    const text = data.content?.find((b) => b.type === "text")?.text || "{}";
    const cleaned = text.replace(/```json?|```/g, "").trim();
    const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (!jsonMatch) throw new Error("No JSON en respuesta: " + cleaned.slice(0, 80));
    return json(JSON.parse(jsonMatch[1]));

  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Error interno" }, 500);
  }
});
