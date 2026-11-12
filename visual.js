/* Local SVG illustrations. No icon font, external images, or emoji glyphs. */
(()=>{'use strict';const paths={
leaf:'<path d="M20 4C8 3 3 9 5 17c8 3 15-2 15-13Z"/><path d="M4 21 15 10"/>',
home:'<path d="m3 10 9-7 9 7v11H3Zm6 11v-8h6v8"/>',
camera:'<path d="m7 6 2-3h6l2 3h5v15H2V6Z"/><circle cx="12" cy="13" r="4"/>',
recycle:'<path d="m8 7 4-5 4 6m-4-1 4 1 1-4M18 11l4 7H14m3-3-3 3 3 3M9 18H2l4-7m-1 5 1-5-4 1"/>',
globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
trophy:'<path d="M7 3h10v7a5 5 0 0 1-10 0ZM7 5H3v4a4 4 0 0 0 5 4m9-8h4v4a4 4 0 0 1-5 4M12 15v6m-5 0h10"/>',
user:'<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
sprout:'<path d="M12 22V11C5 12 2 8 2 3c7-1 11 3 10 8Zm0 5c7 1 10-3 10-8-7-1-11 3-10 8Z"/>',
star:'<path d="m12 2 3 7 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1Z"/>',
check:'<path d="m5 12 4 4L19 6"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
water:'<path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z"/>',
book:'<path d="M12 5C8 2 4 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-3-2-7-1-10 1Zm0 0v16"/>',
lock:'<rect x="4" y="10" width="16" height="12" rx="3"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v3"/>',
cloud:'<path d="M6 18a5 5 0 0 1-1-10 7 7 0 0 1 13-1 5 5 0 0 1 0 11ZM12 10v5m-3-3 3 3 3-3"/>',
flower:'<circle cx="12" cy="11" r="3"/><path d="M12 8C5-1 19-1 12 8Zm3 3c9-7 9 7 0 0Zm-3 3c7 9-7 9 0 0Zm-3-3c-9 7-9-7 0 0ZM12 18v5"/>',
cactus:'<path d="M9 22V7a3 3 0 0 1 6 0v15M9 15H5a2 2 0 0 1-2-2V8m12 10h4a2 2 0 0 0 2-2V9M6 22h12"/>'};
const mapping={'\ud83c\udf43':'leaf','\ud83c\udf31':'sprout','\ud83c\udf3b':'flower','\ud83c\udf35':'cactus','\ud83d\udca7':'water','\ud83c\udf0e':'globe','\ud83c\udf0d':'globe','\ud83c\udfc6':'trophy','\u2b50':'star','\u267b':'recycle'};
function svg(name){return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">'+(paths[name]||paths.leaf)+'</svg>';}
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=svg(el.dataset.icon));
const imageIds=['avatar','consejoEmoji','ecoPreguntaEmoji'];
const textIds=['tituloMision','ecoPuntosHoy','ecoResultado','resultadoMision','resultado'];
const nodes=[...imageIds,...textIds].map(id=>document.getElementById(id)).filter(Boolean);
function render(){for(const id of imageIds){const el=document.getElementById(id);if(!el||el.querySelector('svg'))continue;const text=el.textContent.trim();const name=paths[text]?text:Object.entries(mapping).find(([key])=>text.startsWith(key))?.[1]||'leaf';el.innerHTML=svg(name);if(id==='avatar'){el.setAttribute('role','img');el.setAttribute('aria-label','Tu personaje ecol\u00f3gico');}}for(const id of textIds){const el=document.getElementById(id);if(!el)continue;const text=el.textContent.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu,'').trim();if(text!==el.textContent)el.textContent=text;}}
const observer=new MutationObserver(()=>{observer.disconnect();render();watch();});function watch(){nodes.forEach(el=>observer.observe(el,{childList:true,subtree:true,characterData:true}));}render();watch();
})();
