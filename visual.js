// Replace decorative emoji glyphs with illustrated SVG images; preserve text and game logic.
(function () {
  const emojis=/\p{Extended_Pictographic}/u;
  const mapping={"🌱":"sprout","🍃":"leaf","🌻":"flower","🌵":"cactus","♻️":"recycle","🌎":"earth","🌍":"earth","🏆":"trophy","⭐":"star","💧":"water","📸":"camera","🏠":"home","🔍":"search","🌳":"tree","🌲":"tree","🌿":"leaf","💚":"heart","🤖":"robot","🧠":"brain"};
  const shapes={
    leaf:'<path d="M46 12C22 13 10 28 13 45c19 8 40-8 33-33Z"/><path d="M14 50c9-12 18-19 30-27"/>',
    sprout:'<path d="M32 53V30M32 38C14 38 11 25 12 16c17-1 24 8 20 22ZM32 31c-1-15 9-22 23-20 0 15-8 24-23 20Z"/>',
    flower:'<circle cx="32" cy="32" r="7"/><path d="M32 25C16 7 48 7 32 25ZM39 32c18-16 18 16 0 0ZM32 39c16 18-16 18 0 0ZM25 32C7 48 7 16 25 32Z"/>',
    cactus:'<path d="M25 53V22a7 7 0 0 1 14 0v31M25 41h-7a6 6 0 0 1-6-6V25m27 12h7a6 6 0 0 0 6-6V21M18 53h28"/>',
    recycle:'<path d="m27 13 5-8 6 9M32 5l-8 14h18l-5-6M47 24l10 1-5 10M57 25l-9-1 8 14-9 15H34M24 50l-5 9-6-10M19 59l8-15H9l-7-13 9-15"/>',
    earth:'<circle cx="32" cy="32" r="24"/><path d="m15 18 11 3 4 11-9 6 4 15M40 10l-4 12 12 8-7 10 3 12M9 32h46"/>',
    trophy:'<path d="M20 10h24v16a12 12 0 0 1-24 0V10ZM20 15H9v8c0 9 8 11 14 11M44 15h11v8c0 9-8 11-14 11M32 38v12M21 54h22"/>',
    star:'<path d="m32 7 8 16 18 3-13 13 3 18-16-9-16 9 3-18L6 26l18-3Z"/>',
    water:'<path d="M32 7C23 22 15 31 15 41a17 17 0 0 0 34 0C49 31 41 22 32 7Z"/>',
    camera:'<rect x="8" y="18" width="48" height="34" rx="7"/><circle cx="32" cy="35" r="10"/><path d="m18 18 5-7h18l5 7"/>',
    home:'<path d="m7 30 25-21 25 21M14 27v27h36V27M26 54V38h12v16"/>',
    search:'<circle cx="28" cy="28" r="17"/><path d="m41 41 15 15"/>',
    tree:'<path d="M32 54V35M20 54h24M32 8 14 35h36L32 8Z"/>',
    heart:'<path d="M32 54 9 32C-2 17 19 4 32 20 45 4 66 17 55 32Z"/>',
    robot:'<rect x="13" y="18" width="38" height="34" rx="9"/><path d="M32 18V9M24 35h1m14 0h1M23 44h18"/>',
    brain:'<path d="M32 15c-11-14-28 2-20 15-8 13 4 25 20 17 16 8 28-4 20-17 8-13-9-29-20-15ZM32 15v32"/>'
  };
  function svg(tipo){const path=shapes[tipo]||shapes.leaf;return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="#e2f5e9"/><g fill="none" stroke="#25835d" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">'+path+'</g></svg>');}
  function decorar(el) {
    if(!el||el.dataset.visualDecorado)return;
    const text=el.textContent.trim();
    if(!text||!emojis.test(text))return;
    const emoji=Object.keys(mapping).find(e=>text.startsWith(e));
    if(!emoji)return;
    const img=document.createElement("img");img.src=svg(mapping[emoji]);img.className="eco-ilustracion";img.alt="";img.setAttribute("aria-hidden","true");
    el.textContent=text.slice(emoji.length).trimStart();el.prepend(img);el.dataset.visualDecorado="1";
  }
  function aplicar(){
    document.querySelectorAll(".menu button,.cuadricula h3,.mascota,.planeta-icono,.eco-consejo-emoji,.eco-pregunta-emoji,.eco-etiqueta,.tarjeta h2").forEach(decorar);
  }
  // Dynamic illustrations in quiz and tips are converted after text changes.
  const observer=new MutationObserver(()=>{observer.disconnect();aplicar();observer.observe(document.body,{subtree:true,childList:true,characterData:true});});
  aplicar();observer.observe(document.body,{subtree:true,childList:true,characterData:true});
})();
