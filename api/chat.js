'use strict';

// Independent text-chat endpoint. Does not change scanner, points or accounts.
const DEFAULT_MODEL = 'gemini-3-flash-preview';
const MAX_TEXT = 4000;
const MAX_MESSAGES = 21;
const MAX_TOTAL = 24000;
const buckets = new Map();
const SYSTEM = [
  'Eres el Asistente ReuseUp, un chat educativo amable en espa\u00f1ol. No eres EcoBot: son proyectos distintos.',
  'Ayuda con reciclaje, ahorro de agua, plantas, sostenibilidad y dudas educativas. S\u00e9 claro y cercano, sin emojis, sin HTML y sin Markdown complejo.',
  'Recuerda el contexto que recibes, pero no inventes recuerdos. No saludes en cada respuesta. Prefiere respuestas breves con ejemplos pr\u00e1cticos.',
  'ReuseUp tiene Esc\u00e1ner, Misiones, Planeta con EcoQuiz y perfil. El chat solo orienta: no puede analizar fotos, aprobar misiones, sumar puntos ni cambiar cuentas.',
  'Para fotograf\u00edas indica la secci\u00f3n Esc\u00e1ner. Para demostrar acciones indica Misiones. Nunca afirmes haber ejecutado acciones.',
  'Las normas de reciclaje var\u00edan seg\u00fan la localidad. Reconoce la incertidumbre. No inventes direcciones ni datos recientes; no tienes b\u00fasqueda web.',
  'No solicites contrase\u00f1as, claves API, nombre completo o direcci\u00f3n. No recomiendes manipular residuos peligrosos; sugiere ayuda adulta y centros autorizados.'
].join(' ');
function key() {
  for (const raw of [process.env.GEMINI_API_KEY, process.env.GOOGLE_API_KEY]) {
    const value = typeof raw === 'string' ? raw.trim().replace(/^(["'])(.*)\1$/, '$2').trim() : '';
    if (value) return value;
  }
  return '';
}
function fail(res, status, code, error) { return res.status(status).json({ code, error }); }
function throttle(req) {
  // Best-effort per-instance guard, NOT a durable distributed rate limiter.
  const now = Date.now();
  for (const [id, value] of buckets) if (value.until <= now) buckets.delete(id);
  const id = String(req.headers?.['x-real-ip'] || req.socket?.remoteAddress || 'unknown').slice(0,80);
  let value = buckets.get(id);
  if (!value) {
    if (buckets.size >= 2000) return false;
    value = {count:0,until:now+60000}; buckets.set(id,value);
  }
  value.count += 1;
  return value.count <= 12;
}
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  const model = process.env.GEMINI_CHAT_MODEL?.trim() || DEFAULT_MODEL;
  if (!/^gemini-[a-zA-Z0-9.-]+$/.test(model)) return fail(res,503,'CHAT_CONFIG','El modelo de chat no est\u00e1 configurado correctamente.');
  if (req.method === 'GET') return res.status(200).json({servicio:'Asistente ReuseUp',modelo:model,configured:Boolean(key()),release:'reuseup-chat-1'});
  if (req.method !== 'POST') {res.setHeader('Allow','GET, POST');return fail(res,405,'METHOD_NOT_ALLOWED','Usa POST para enviar tu mensaje.');}
  if (req.headers?.['sec-fetch-site'] === 'cross-site') return fail(res,403,'CROSS_SITE','Abre el chat desde ReuseUp.');
  if (req.headers?.origin && req.headers?.host) {
    try {if (new URL(req.headers.origin).host !== req.headers.host) return fail(res,403,'CROSS_SITE','Abre el chat desde ReuseUp.');}
    catch {return fail(res,403,'CROSS_SITE','Origen de solicitud inv\u00e1lido.');}
  }
  let body = req.body;
  if (Buffer.isBuffer(body)) body = body.toString('utf8');
  if (typeof body === 'string') {
    if (Buffer.byteLength(body,'utf8') > 100000) return fail(res,413,'CHAT_TOO_LARGE','La conversaci\u00f3n es demasiado larga. Empieza un chat nuevo.');
    try {body=JSON.parse(body);} catch {return fail(res,400,'INVALID_JSON','No se pudo leer el mensaje.');}
  }
  const messages=body?.messages;
  if (!Array.isArray(messages) || !messages.length || messages.length>MAX_MESSAGES || messages.length%2!==1)
    return fail(res,400,'INVALID_MESSAGES','Env\u00eda una conversaci\u00f3n v\u00e1lida que termine con tu pregunta.');
  let total=0;
  const contents=[];
  for(let i=0;i<messages.length;i++) {
    const m=messages[i],expected=i%2===0?'user':'assistant';
    if(!m || m.role!==expected || typeof m.text!=='string' || !m.text.trim() || m.text.length>MAX_TEXT)
      return fail(res,400,'INVALID_MESSAGES','Cada mensaje debe tener entre 1 y 4000 caracteres, con turnos alternados.');
    const text=m.text.trim();total+=text.length;
    contents.push({role:expected==='user'?'user':'model',parts:[{text}]});
  }
  if(total>MAX_TOTAL) return fail(res,413,'CHAT_TOO_LARGE','La conversaci\u00f3n es demasiado larga. Empieza un chat nuevo.');
  const apiKey=key();
  if(!apiKey) return fail(res,503,'GEMINI_NOT_CONFIGURED','Falta configurar la clave de Gemini para este entorno de Vercel.');
  if(!throttle(req)){res.setHeader('Retry-After','60');return fail(res,429,'CHAT_RATE_LIMIT','Has enviado muchos mensajes. Espera un minuto antes de reintentar.');}
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
  try {
    const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent',{
      method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},signal:controller.signal,
      body:JSON.stringify({systemInstruction:{parts:[{text:SYSTEM}]},contents,generationConfig:{maxOutputTokens:2048}})
    });
    let data;try{data=await response.json();}catch(e){if(controller.signal.aborted)throw e;data=null;}
    if(!response.ok){
      if(response.status===429){res.setHeader('Retry-After','60');return fail(res,429,'GEMINI_QUOTA','Gemini alcanz\u00f3 su l\u00edmite de uso. Prueba m\u00e1s tarde.');}
      if(response.status===404)return fail(res,502,'GEMINI_MODEL_UNAVAILABLE','El modelo del chat no est\u00e1 disponible para este proyecto de Google.');
      if([401,403].includes(response.status)||data?.error?.details?.some?.(d=>['API_KEY_INVALID','API_KEY_EXPIRED'].includes(d?.reason)))
        return fail(res,502,'GEMINI_ACCESS','Google rechaz\u00f3 la clave o sus permisos. Revisa la configuraci\u00f3n en Vercel.');
      return fail(res,502,'GEMINI_UPSTREAM','El servicio de IA no pudo responder. Int\u00e9ntalo m\u00e1s tarde.');
    }
    const c=data?.candidates?.[0];
    if(data?.promptFeedback?.blockReason || ['SAFETY','RECITATION','BLOCKLIST','PROHIBITED_CONTENT','SPII'].includes(c?.finishReason))
      return fail(res,422,'CHAT_BLOCKED','No pude responder a ese mensaje. Reformula tu pregunta sin datos personales.');
    const reply=Array.isArray(c?.content?.parts)?c.content.parts.filter(p=>p?.thought!==true&&typeof p?.text==='string').map(p=>p.text).join('\n').trim():'';
    if(!reply)return fail(res,502,'GEMINI_EMPTY','No recib\u00ed una respuesta. Prueba de nuevo.');
    const truncated=reply.length>MAX_TEXT || c?.finishReason==='MAX_TOKENS';
    return res.status(200).json({reply:reply.slice(0,MAX_TEXT),modelo:model,truncated});
  } catch(e){
    if(controller.signal.aborted)return fail(res,504,'CHAT_TIMEOUT','La respuesta tard\u00f3 demasiado. Reintenta en unos momentos.');
    return fail(res,502,'CHAT_NETWORK','No se pudo conectar con la IA. Int\u00e9ntalo de nuevo.');
  } finally {clearTimeout(timer);}
};
