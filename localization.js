import {BASE_EXTRA} from './localization-base-extra.js?v=49496';
import {EXTRA_ROWS} from './localization-extra.js?v=49496';
export const LANGUAGES={de:'Deutsch',it:'Italiano',en:'English',es:'Español',fr:'Français',pt:'Português',ur:'اردو'};
// English is the source language. Missing phrases deliberately retain readable English.
const rows=[
['Settings','Ajustes','Paramètres','Configurações','ترتیبات'],['Music','Música','Musique','Música','موسیقی'],['Sound effects','Efectos de sonido','Effets sonores','Efeitos sonoros','صوتی اثرات'],['Language','Idioma','Langue','Idioma','زبان'],['Notifications','Notificaciones','Notifications','Notificações','اطلاعات'],['Daily reminder','Recordatorio diario','Rappel quotidien','Lembrete diário','روزانہ یاد دہانی'],['Play','Jugar','Jouer','Jogar','کھیلیں'],['Adventure','Aventura','Aventure','Aventura','مہم'],['Endless','Sin fin','Infini','Infinito','لامحدود'],['Games','Juegos','Jeux','Jogos','کھیل'],['View Map','Ver mapa','Voir la carte','Ver mapa','نقشہ دیکھیں'],['Shop','Tienda','Boutique','Loja','دکان'],['Profile','Perfil','Profil','Perfil','پروفائل'],['Quests','Misiones','Quêtes','Missões','مہمات'],['Daily','Diarias','Quotidiennes','Diárias','روزانہ'],['Achievements','Logros','Succès','Conquistas','کامیابیاں'],['Leaderboard','Clasificación','Classement','Classificação','درجہ بندی'],['Collect','Recoger','Récupérer','Coletar','وصول کریں'],['Collect all','Recoger todo','Tout récupérer','Coletar tudo','سب وصول کریں'],['Collected','Recogido','Récupéré','Coletado','وصول ہو گیا'],['Collected!','¡Recogido!','Récupéré !','Coletado!','وصول ہو گیا!'],['Task complete!','¡Misión completada!','Quête terminée !','Missão concluída!','مہم مکمل!'],['New task','Nueva misión','Nouvelle quête','Nova missão','نئی مہم'],['Boosts','Potenciadores','Bonus','Impulsos','بوسٹ'],['Avatars','Avatares','Avatars','Avatares','اوتار'],['Frames','Marcos','Cadres','Molduras','فریم'],['Worlds','Mundos','Mondes','Mundos','دنیا'],['Buy','Comprar','Acheter','Comprar','خریدیں'],['Equip','Equipar','Équiper','Equipar','استعمال کریں'],['Equipped','Equipado','Équipé','Equipado','منتخب'],['Locked','Bloqueado','Verrouillé','Bloqueado','بند'],['Upgrade','Mejorar','Améliorer','Melhorar','بہتر کریں'],['Max level','Nivel máximo','Niveau maximum','Nível máximo','آخری درجہ'],['Shield','Escudo','Bouclier','Escudo','ڈھال'],['Double Time','Tiempo doble','Temps doublé','Tempo dobrado','دوگنا وقت'],['Five-times Rewards','Recompensas ×5','Récompenses ×5','Recompensas ×5','پانچ گنا انعام'],['Pause','Pausa','Pause','Pausa','وقفہ'],['Paused','En pausa','En pause','Pausado','رکا ہوا'],['Resume','Reanudar','Reprendre','Continuar','جاری رکھیں'],['Continue','Continuar','Continuer','Continuar','جاری رکھیں'],['Main menu','Menú principal','Menu principal','Menu principal','مرکزی مینو'],['Retry','Reintentar','Réessayer','Tentar novamente','دوبارہ کوشش'],['Restart','Reiniciar','Recommencer','Reiniciar','دوبارہ شروع'],['Levels','Niveles','Niveaux','Níveis','درجات'],['Next level','Siguiente nivel','Niveau suivant','Próximo nível','اگلا درجہ'],['Keep going','Sigue jugando','Continuez','Continue jogando','کھیلتے رہیں'],['Run over','Partida terminada','Partie terminée','Fim da partida','کھیل ختم'],['Score','Puntos','Score','Pontuação','اسکور'],['Easy','Fácil','Facile','Fácil','آسان'],['Normal','Normal','Normal','Normal','عام'],['Hard','Difícil','Difficile','Difícil','مشکل'],['Extreme','Extremo','Extrême','Extremo','انتہائی مشکل'],['Done','Listo','Terminé','Pronto','مکمل'],['Cancel','Cancelar','Annuler','Cancelar','منسوخ'],['Got it','Entendido','Compris','Entendi','سمجھ گیا'],['How to play','Cómo jugar','Comment jouer','Como jogar','کھیلنے کا طریقہ'],['Privacy and support','Privacidad y ayuda','Confidentialité et aide','Privacidade e suporte','رازداری اور مدد'],['Terms & gameplay data','Términos y datos','Conditions et données','Termos e dados','شرائط اور کھیل کا ڈیٹا'],['Delete online profile','Eliminar perfil en línea','Supprimer le profil en ligne','Excluir perfil online','آن لائن پروفائل حذف کریں'],['Ad privacy choices','Privacidad de anuncios','Confidentialité des annonces','Privacidade dos anúncios','اشتہارات کی رازداری'],['Match the shape','Iguala la forma','Associez la forme','Combine a forma','شکل ملائیں'],['Match the color','Iguala el color','Associez la couleur','Combine a cor','رنگ ملائیں'],['Avoid a mismatch','Evita errores','Évitez une erreur','Evite erros','غلط انتخاب سے بچیں'],['No match? Let it pass','¿Sin coincidencia? Espera','Aucune correspondance ? Attendez','Sem combinação? Espere','کوئی میل نہیں؟ انتظار کریں'],['Tap the highlighted ability','Toca la habilidad resaltada','Touchez le pouvoir indiqué','Toque na habilidade destacada','نمایاں صلاحیت کو چھوئیں'],['Starburst','Estallido estelar','Éclat stellaire','Explosão estelar','ستاروں کا دھماکا'],['Rewind','Rebobinar','Retour','Rebobinar','واپس'],['Heart Refill','Recuperar vidas','Recharge de vies','Recuperar vidas','جانیں بحال کریں'],['Time Crystal','Cristal del tiempo','Cristal du temps','Cristal do tempo','وقت کا کرسٹل'],['Shield Crystal','Cristal de escudo','Cristal de bouclier','Cristal de escudo','ڈھال کا کرسٹل'],['Finish line!','¡Meta!','Arrivée !','Chegada!','منزل!'],['Try again','Inténtalo de nuevo','Réessayez','Tente novamente','دوبارہ کوشش کریں'],['Circle','Círculo','Cercle','Círculo','دائرہ'],['Triangle','Triángulo','Triangle','Triângulo','مثلث'],['Square','Cuadrado','Carré','Quadrado','مربع'],['Star','Estrella','Étoile','Estrela','ستارہ'],['Swipe left / right to transform','Desliza para transformarte','Glissez pour vous transformer','Deslize para transformar','شکل بدلنے کے لیے دائیں یا بائیں سوائپ کریں'],['First flight','Primer vuelo','Premier vol','Primeiro voo','پہلی پرواز'],['Shape shuffle','Mezcla de formas','Mélange de formes','Mistura de formas','شکلوں کی تبدیلی'],['Moving gates','Puertas móviles','Portes mobiles','Portões móveis','حرکت کرتے دروازے'],['Ready for another round?','¿Listo para otra partida?','Prêt pour une nouvelle partie ?','Pronto para outra partida?','ایک اور کھیل کے لیے تیار ہیں؟'],['Your daily quests are waiting. Play whenever you like.','Tus misiones diarias te esperan. Juega cuando quieras.','Vos quêtes quotidiennes vous attendent. Jouez quand vous voulez.','Suas missões diárias esperam. Jogue quando quiser.','روزانہ کی مہمات آپ کی منتظر ہیں۔ جب چاہیں کھیلیں۔'],['Available in the Android app','Disponible en la app de Android','Disponible dans l’application Android','Disponível no aplicativo Android','اینڈرائیڈ ایپ میں دستیاب'],['One reminder after 24 hours away.','Un recordatorio tras 24 horas sin jugar.','Un rappel après 24 heures d’absence.','Um lembrete após 24 horas sem jogar.','24 گھنٹے نہ کھیلنے پر ایک یاد دہانی۔'],['Allow notifications in Android settings.','Permite notificaciones en los ajustes de Android.','Autorisez les notifications dans Android.','Permita notificações nas configurações do Android.','اینڈرائیڈ کی ترتیبات میں اطلاعات کی اجازت دیں۔']
];
const catalog=Object.fromEntries(rows.map(row=>[row[0],Object.fromEntries(['es','fr','pt','ur'].map((code,i)=>[code,row[i+1]]))]));
for(const row of EXTRA_ROWS)catalog[row[0]]={...catalog[row[0]],...Object.fromEntries(['pt','es','fr','de','it'].map((code,i)=>[code,row[i+1]]))};
for(const [key,de,it] of BASE_EXTRA)catalog[key]={...catalog[key],de,it};
const STORAGE_KEY='shape-shift-language-v1';
export const normalizeLanguage=code=>String(code||'').toLowerCase().split(/[-_]/)[0];
let saved='';try{saved=window.ShapeShiftPlatform.storage.getItem(STORAGE_KEY)||'';}catch{}
let language=normalizeLanguage(saved||window.ShapeShiftPlatform.language||navigator.language);if(!LANGUAGES[language])language='en';
export const currentLanguage=()=>language;
const labels={de:['Level','Rekord:','Nächste:','Übung','Tastenkürzel:','Münzen'],it:['Livello','Record:','Prossima:','Esercizio','Scorciatoia:','monete'],pt:['Nível','Recorde:','Próxima:','Treino','Atalho:','moedas'],es:['Nivel','Récord:','Siguiente:','Práctica','Atajo:','monedas'],fr:['Niveau','Record :','Suivante :','Exercice','Raccourci :','pièces'],ur:['درجہ','بہترین:','اگلا:','مشق','شارٹ کٹ:','سکے']};
export function translate(text,code=language){
 code=normalizeLanguage(code);if(code==='en'||!LANGUAGES[code])return text;
 if(catalog[text]?.[code])return catalog[text][code];
 const l=labels[code];let m;
 const idx=['pt','es','fr','de','it'].indexOf(code);
 if(idx>=0){
  const shapes={circle:['círculo','círculo','cercle','Kreis','cerchio'],triangle:['triângulo','triángulo','triangle','Dreieck','triangolo'],square:['quadrado','cuadrado','carré','Quadrat','quadrato'],star:['estrela','estrella','étoile','Stern','stella']};
  const colors={red:['vermelho','rojo','rouge','rot','rosso'],blue:['azul','azul','bleu','blau','blu'],green:['verde','verde','vert','grün','verde'],yellow:['amarelo','amarillo','jaune','gelb','giallo']};
  if(m=text.match(/^(You are: )?(red|blue|green|yellow) (circle|triangle|square|star)$/i)){
   const shape=m[3].toLowerCase();let color=colors[m[2].toLowerCase()][idx];
   if(shape==='star'){if(idx===0)color={vermelho:'vermelha',amarelo:'amarela'}[color]||color;if(idx===1)color={rojo:'roja',amarillo:'amarilla'}[color]||color;if(idx===2)color={bleu:'bleue',vert:'verte'}[color]||color;if(idx===4)color={rosso:'rossa',giallo:'gialla'}[color]||color;}
   return (m[1]?['Você é: ','Eres: ','Vous êtes : ','Du bist: ','Sei: '][idx]:'')+(idx===3?color+' · '+shapes[shape][idx]:shapes[shape][idx]+' '+color);
  }
  const patterns=[
   [/^Make (\d+) correct picks$/,['Acerte $1 escolhas','Haz $1 elecciones correctas','Faites $1 bons choix','Triff $1 richtige Entscheidungen','Fai $1 scelte corrette']],
   [/^Score (\d+) points$/,['Marque $1 pontos','Consigue $1 puntos','Marquez $1 points','Erziele $1 Punkte','Ottieni $1 punti']],
   [/^Score (\d+) in one run$/,['Marque $1 pontos em uma partida','Consigue $1 puntos en una partida','Marquez $1 points en une partie','Erziele $1 Punkte in einer Partie','Ottieni $1 punti in una partita']],
   [/^Match (\d+) circles consecutively$/,['Combine $1 círculos seguidos','Combina $1 círculos seguidos','Associez $1 cercles à la suite','Kombiniere $1 Kreise hintereinander','Abbina $1 cerchi consecutivi']],
   [/^Pick (\d+) blue shapes$/,['Escolha $1 formas azuis','Elige $1 figuras azules','Choisissez $1 formes bleues','Wähle $1 blaue Formen','Scegli $1 forme blu']],
   [/^(\d+) endless games$/,['$1 jogos infinitos','$1 juegos sin fin','$1 jeux sans fin','$1 Endlosspiele','$1 giochi senza fine']]
  ];for(const [re,values] of patterns)if(re.test(text))return text.replace(re,values[idx]);
 }

 if(m=text.match(/^Level (\d+)$/))return l[0]+' '+m[1];
 if(m=text.match(/^Best: (.+)$/))return l[1]+' '+m[1];
 if(m=text.match(/^Next: (Circle|Triangle|Square|Star)$/))return l[2]+' '+translate(m[1],code);
 if(m=text.match(/^Practice (\d+) \/ (\d+)$/))return l[3]+' '+m[1]+' / '+m[2];
 if(m=text.match(/^(.*) Shortcut: ([123])\.$/))return translate(m[1],code)+' '+l[4]+' '+m[2]+'.';
 if(m=text.match(/^(\d+) coins$/))return m[1]+' '+l[5];
 return text;
}
export function setLanguage(code){code=normalizeLanguage(code);if(!LANGUAGES[code])return;language=code;try{window.ShapeShiftPlatform.storage.setItem(STORAGE_KEY,code);}catch{}document.documentElement.lang=code==='pt'?'pt-BR':code;document.body.dataset.language=code;window.dispatchEvent(new Event('languagechange'));}
export function initLocalization(){
 window.ShapeShiftI18n={translate,currentLanguage};
 const originals=new WeakMap(),attributes=new WeakMap();let pending=false;
 const excluded='script,style,input,textarea,select,[data-no-translate],#terms-dialog,#privacy-policy-dialog,#profile-name,.rank-name';
 const observer=new MutationObserver(()=>{if(!pending){pending=true;window.requestAnimationFrame(update);}});
 function update(){
  pending=false;observer.disconnect();
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
  while(node=walker.nextNode()){
   if(node.parentElement?.closest(excluded))continue;
   const raw=node.nodeValue,old=originals.get(node),source=old&&raw===old.result?old.source:raw,trimmed=source.trim();
   const result=trimmed?source.replace(trimmed,translate(trimmed)):source;
   if(result!==raw)node.nodeValue=result;originals.set(node,{source,result});
  }
  for(const element of document.querySelectorAll('[aria-label],[title],[placeholder]')){
   if(element.closest('[data-no-translate],#terms-dialog,#privacy-policy-dialog'))continue;
   const records=attributes.get(element)||{};
   for(const name of ['aria-label','title','placeholder']){
    if(!element.hasAttribute(name))continue;const raw=element.getAttribute(name),old=records[name],source=old&&raw===old.result?old.source:raw,result=translate(source);
    if(raw!==result)element.setAttribute(name,result);records[name]={source,result};
   }attributes.set(element,records);
  }
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title','placeholder']});
 }
 window.addEventListener('languagechange',update);document.documentElement.lang=language==='pt'?'pt-BR':language;document.body.dataset.language=language;update();
}
