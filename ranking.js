// ReuseUp ranking local. No fake users or fabricated scores.
(function () {
  const KEY = "reuseup-ranking-history-v1";
  let periodo = "total";
  function historial() { try { const a = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(a) ? a : []; } catch { return []; } }
  function fechaLocal(d) { return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-"); }
  function registrar(cantidad) {
    if (!Number.isFinite(cantidad) || cantidad <= 0) return;
    const h = historial();
    h.push({ fecha: fechaLocal(new Date()), puntos: cantidad });
    localStorage.setItem(KEY, JSON.stringify(h));
  }
  function puntosPeriodo() {
    if (periodo === "total") return Math.max(0,Number(window.puntos) || Number(document.getElementById("puntos")?.textContent) || 0);
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const desde = new Date(hoy);
    if (periodo === "semana") desde.setDate(hoy.getDate() - ((hoy.getDay()+6)%7));
    else desde.setDate(1);
    return historial().filter(x => {const d = new Date(x.fecha+"T00:00:00");return d >= desde && d <= hoy;}).reduce((s,x)=>s+Math.max(0,Number(x.puntos)||0),0);
  }
  function render() {
    const podio=document.getElementById("rankingPodio"),lista=document.getElementById("rankingLista");
    if(!podio||!lista)return;
    document.getElementById("rankingPeriodo").textContent=({semana:"Esta semana",mes:"Este mes",total:"Histórico"})[periodo];
    document.querySelectorAll("[data-periodo]").forEach(b=>{const activo=b.dataset.periodo===periodo;b.classList.toggle("activo",activo);b.setAttribute("aria-pressed",String(activo));});
    const valor=puntosPeriodo();
    const nombre=String(window.nombre || document.getElementById("nombreMostrado")?.textContent || "Hojita").slice(0,20);
    podio.replaceChildren();
    const card=document.createElement("div");card.className="ranking-campeon";
    const insignia=document.createElement("span");insignia.className="ranking-medalla";insignia.textContent="1";
    const info=document.createElement("div");const titulo=document.createElement("strong");titulo.textContent=nombre+" · Tú";
    const subtitulo=document.createElement("span");subtitulo.textContent=valor.toLocaleString("es-PE")+" puntos";
    info.append(titulo,subtitulo);card.append(insignia,info);podio.append(card);
    lista.textContent="¡Sigue completando misiones para aumentar tus puntos!";
  }
  window.cambiarPeriodoRanking=function(p){if(!["semana","mes","total"].includes(p))return;periodo=p;render();};
  const sumarOriginal=window.sumar;
  if(typeof sumarOriginal==="function")window.sumar=function(c){const antes=Number(document.getElementById("puntos")?.textContent)||0;const resultado=sumarOriginal(c);const despues=Number(document.getElementById("puntos")?.textContent)||0;registrar(despues-antes);render();return resultado;};
  const mostrarOriginal=window.mostrar;
  if(typeof mostrarOriginal==="function")window.mostrar=function(id){mostrarOriginal(id);if(id==="ranking")render();};
  render();
})();
