// --- LANCEMENT AUDIO ROBUSTE AU SURVOL / MOUVEMENT DE SOURIS ---
function initAudioAuSurvol() {
    const audio = document.getElementById('musique-fond');
    if (!audio) return;

    // Fonction qui tente de lancer la musique
    const tenterLecture = () => {
        audio.volume = 0.2;
        audio.play().then(() => {
            // Si la lecture réussit, on retire tous les écouteurs pour ne plus le faire
            nettoyerEcouteurs();
        }).catch(e => {
            // Le navigateur bloque encore, on attend le prochain mouvement
            console.log("En attente d'une interaction de survol valide...");
        });
    };

    const evenementsDeSurvol = ['pointermove', 'mousemove', 'mouseover', 'touchstart'];

    const gererInteraction = () => {
        tenterLecture();
    };

    const nettoyerEcouteurs = () => {
        evenementsDeSurvol.forEach(ev => {
            document.removeEventListener(ev, gererInteraction);
        });
    };

    // On écoute tous ces mouvements sur l'ensemble du document
    evenementsDeSurvol.forEach(ev => {
        document.addEventListener(ev, gererInteraction, { passive: true });
    });
}

// Lancer l'initialisation dès que le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
    const audio = document.getElementById('musique-fond');
    if (audio) {
        audio.load(); // Force le rechargement de l'audio pour éviter les bugs de cache au refresh
    }
    initAudioAuSurvol();
});


// --- 1. PHYSIQUE DES OIES FLOTTANTES ET DRAG & DROP ---
const oiesElements = document.querySelectorAll('.oie-flottante');
const btn = document.getElementById('btn-entrer');

let oieEnTrainDeGlisser = null;
let decalageX = 0;
let decalageY = 0;

// Cache la position du bouton pour éviter les ralentissements
let btnRect = btn.getBoundingClientRect();
window.addEventListener('resize', () => {
    btnRect = btn.getBoundingClientRect();
});

const oies = Array.from(oiesElements).map((el) => {
    el.style.width = '320px';
    
    let startX = Math.random() * Math.max(100, window.innerWidth - 380);
    let startY = Math.random() * Math.max(100, window.innerHeight - 380);

    const oieObj = {
        el: el,
        x: startX,
        y: startY,
        vx: (Math.random() - 0.5) * 1.5, 
        vy: (Math.random() - 0.5) * 1.5, 
        width: 340,  
        height: 340,
        isDragging: false
    };

    // --- ÉVÉNEMENTS DE GLISSER-DÉPOSER ---
    el.style.cursor = 'grab';

    el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        oieEnTrainDeGlisser = oieObj;
        oieObj.isDragging = true;
        decalageX = e.clientX - oieObj.x;
        decalageY = e.clientY - oieObj.y;
        el.style.cursor = 'grabbing';
    });

    return oieObj;
});

// Suivi du mouvement de la souris
window.addEventListener('mousemove', (e) => {
    if (!oieEnTrainDeGlisser) return;
    oieEnTrainDeGlisser.x = e.clientX - decalageX;
    oieEnTrainDeGlisser.y = e.clientY - decalageY;
});

// Relâché de clic
window.addEventListener('mouseup', () => {
    if (oieEnTrainDeGlisser) {
        oieEnTrainDeGlisser.el.style.cursor = 'grab';
        oieEnTrainDeGlisser.vx = (Math.random() - 0.5) * 2;
        oieEnTrainDeGlisser.vy = (Math.random() - 0.5) * 2;
        oieEnTrainDeGlisser.isDragging = false;
        oieEnTrainDeGlisser = null;
    }
});

function mettreAJourPhysique() {
    const largeurMax = document.documentElement.clientWidth - 340;
    const hauteurMax = document.documentElement.clientHeight - 340;
    const vitesseMin = 0.4; 

    oies.forEach((oie, index) => {
        if (oie.isDragging) {
            oie.el.style.transform = `translate(${Math.round(oie.x)}px, ${Math.round(oie.y)}px)`;
            return;
        }

        // Maintient une vitesse minimale pour éviter le piétinement
        const vitesseActuelle = Math.sqrt(oie.vx * oie.vx + oie.vy * oie.vy);
        if (vitesseActuelle < vitesseMin && vitesseActuelle > 0) {
            oie.vx = (oie.vx / vitesseActuelle) * vitesseMin;
            oie.vy = (oie.vy / vitesseActuelle) * vitesseMin;
        } else if (vitesseActuelle === 0) {
            oie.vx = (Math.random() - 0.5) * 1.5;
            oie.vy = (Math.random() - 0.5) * 1.5;
        }

        // Déplacement automatique
        oie.x += oie.vx;
        oie.y += oie.vy;

        // Rebond strict sur les bords de l'écran
        if (oie.x <= 0) { oie.x = 0; oie.vx = Math.abs(oie.vx) + 0.2; }
        if (oie.x >= largeurMax) { oie.x = largeurMax; oie.vx = -(Math.abs(oie.vx) + 0.2); }
        if (oie.y <= 0) { oie.y = 0; oie.vy = Math.abs(oie.vy) + 0.2; }
        if (oie.y >= hauteurMax) { oie.y = hauteurMax; oie.vy = -(Math.abs(oie.vy) + 0.2); }

        // Protection anti-blocage dans le bouton central
        const oieCenterX = oie.x + oie.width / 2;
        const oieCenterY = oie.y + oie.height / 2;
        
        const margeSecurite = 25;
        if (
            oieCenterX > btnRect.left - margeSecurite &&
            oieCenterX < btnRect.right + margeSecurite &&
            oieCenterY > btnRect.top - margeSecurite &&
            oieCenterY < btnRect.bottom + margeSecurite
        ) {
            const btnCenterX = btnRect.left + btnRect.width / 2;
            const btnCenterY = btnRect.top + btnRect.height / 2;
            const angleSortie = Math.atan2(oieCenterY - btnCenterY, oieCenterX - btnCenterX);
            
            oie.vx = Math.cos(angleSortie) * 1.8;
            oie.vy = Math.sin(angleSortie) * 1.8;
        }

        // Anti-chevauchement avec impulsion de rebond entre les oies
        for (let j = index + 1; j < oies.length; j++) {
            const autreOie = oies[j];
            if (autreOie.isDragging) continue;

            const dx = (autreOie.x + autreOie.width / 2) - (oie.x + oie.width / 2);
            const dy = (autreOie.y + autreOie.height / 2) - (oie.y + oie.height / 2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            const distanceMin = 280; 

            if (distance < distanceMin && distance > 0) {
                const nx = dx / distance;
                const ny = dy / distance;
                const force = (distanceMin - distance) / 2;

                oie.x -= nx * force;
                oie.y -= ny * force;
                autreOie.x += nx * force;
                autreOie.y += ny * force;

                const impulsion = 0.3;
                oie.vx -= nx * impulsion;
                oie.vy -= ny * impulsion;
                autreOie.vx += nx * impulsion;
                autreOie.vy += ny * impulsion;
            }
        }

        oie.el.style.transform = `translate(${Math.round(oie.x)}px, ${Math.round(oie.y)}px)`;
    });

    requestAnimationFrame(mettreAJourPhysique);
}

requestAnimationFrame(mettreAJourPhysique);


// --- 2. GESTION DU CLIC ET EXPLOSION DE CŒURS ---
btn.addEventListener('click', function(e) {
    e.preventDefault(); 
    
    if (btn.classList.contains('en-cours')) return;
    btn.classList.add('en-cours');

    const rect = btn.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Explosion de cœurs
    for (let i = 0; i < 50; i++) {
        creerCoeur(centerX, centerY, 'SVG/simple-heart.svg', 'coeurSimple');
        creerCoeur(centerX, centerY, 'SVG/double-hearts.svg', 'coeurDouble');
        creerCoeur(centerX, centerY, 'SVG/stylish-double-hearts.svg', 'coeurDoubleStyle');
    }

    btn.style.opacity = '0';
    btn.style.transform = 'scale(0.8)';


// Après l'animation des cœurs (4.5 secondes), on bascule de vue
setTimeout(() => {
    const sectionAccueil = document.getElementById('section-accueil');
    const sectionPrincipale = document.getElementById('section-principale');

    sectionAccueil.classList.add('cache');
    sectionPrincipale.classList.remove('cache'); // Sort du display: none
    
    // Double frame pour laisser le navigateur souffler et lancer l'animation
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            sectionPrincipale.classList.add('visible'); // Déclenche le fondu et le glissement CSS
        });
    });

    // --- ATTENDRE 4 SECONDES AVANT DE LANCER LES LANGUES ---
    setTimeout(() => {
        lancerApparitionLangues(); 
    }, 6000); 

}, 4500);
});


// --- 3. FONCTION DE CRÉATION DES CŒURS ---
function creerCoeur(x, y, cheminSvg, className) {
    const coeur = document.createElement('img');
    coeur.src = cheminSvg; 
    coeur.classList.add(className);

    coeur.style.left = x + 'px';
    coeur.style.top = y + 'px';

    const angle = Math.random() * Math.PI * 4;
    const distance = 150 + Math.random() * 1850; 
    const moveX = Math.cos(angle) * distance;
    const moveY = Math.sin(angle) * distance;
    const rotation = (Math.random() - 0.5) * 360; 

    coeur.style.setProperty('--move-x', `${moveX}px`);
    coeur.style.setProperty('--move-y', `${moveY}px`);
    coeur.style.setProperty('--rot', `${rotation}deg`);
    
    coeur.style.width = (40 + Math.random() * 50) + 'px';
    coeur.style.height = 'auto'; 
    coeur.style.animationDuration = (3.9 + Math.random() * 2.2) + 's';

    document.body.appendChild(coeur);

    setTimeout(() => {
        coeur.remove();
    }, 6200);
}


// --- 4. GESTION DE L'APPARITION DES LANGUES (PAGE 2) ---
const phrasesAmour = [
    "Estou loucamente apaixonado por você",
    "I'm madly in love with you",
    "je t'aime à la folie",
    "Te amo con locura",
    "Amo-te à loucura",
    "Ti amo alla follia",
    "Ich liebe dich über alles",
    "Я безумно люблю тебя",
    "我爱你爱到发疯",
    "狂おしいほど愛しています",
    "أحبك بجنون",
    "मैं तुमसे diwani मोहब्बत करता हूँ",
    "미친듯이 사랑해",
    "Ik ben stapelverliefd op jou",
    "Sana delicesine aşığım"
];

function lancerApparitionLangues() {
    const conteneur = document.getElementById('liste-langues');
    if (!conteneur) return;
    
    conteneur.innerHTML = ""; // Nettoie au cas où on revient en arrière

    phrasesAmour.forEach((phrase, index) => {
        setTimeout(() => {
            const span = document.createElement('div');
            span.classList.add('phrase-langue');
            span.textContent = phrase;
            conteneur.appendChild(span);

            // --- SI C'EST LA DERNIÈRE LANGUE, ON AFFICHE LE BOUTON NEXT ---
            if (index === phrasesAmour.length - 1) {
                // Petit délai supplémentaire (ex: 500ms) pour laisser le temps de lire la dernière
                setTimeout(() => {
                    const btnNext = document.getElementById('next');
                    if (btnNext) {
                        btnNext.classList.remove('cache');
                        // Petit effet d'apparition en fondu propre
                        btnNext.style.opacity = '0';
                        btnNext.style.transition = 'opacity 0.8s ease';
                        requestAnimationFrame(() => {
                            btnNext.style.opacity = '1';
                        });
                    }
                }, 800); 
            }

        }, index * 2600); // Ton délai actuel entre chaque langue
    });
}


// --- 5. GESTION DU BOUTON NEXT ---
document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'next') {
        e.preventDefault();
        
        const contenuPrincipal = document.getElementById('contenu-principal');
        const sectionSuivante = document.getElementById('section-suivante');

        // Fait disparaître le premier contenu en fondu
        contenuPrincipal.style.transition = 'opacity 0.6s ease';
        contenuPrincipal.style.opacity = '0';

        setTimeout(() => {
            contenuPrincipal.classList.add('cache');
            
            // Affiche la section suivante
            sectionSuivante.classList.remove('cache');
            sectionSuivante.style.opacity = '0';
            
            requestAnimationFrame(() => {
                sectionSuivante.style.transition = 'opacity 0.6s ease';
                sectionSuivante.style.opacity = '1';
            });

            // --- APPARITION DU 2E TITRE APRÈS 3 SECONDES ---
            setTimeout(() => {
                const bloc3s = document.getElementById('bloc-cache-3s');
                if (bloc3s) {
                    bloc3s.style.opacity = '1';
                }
            }, 3500); // 3 secondes

            // --- APPARITION DU RESTE DE LA SURPRISE APRÈS 6 SECONDES ---
            setTimeout(() => {
                const bloc6s = document.getElementById('bloc-cache-6s');
                if (bloc6s) {
                    bloc6s.style.opacity = '1';
                }
            }, 6000); // 6 secondes (soit 3 sec après le titre)

        }, 600); // Attend la fin du fondu sortant
    }
});