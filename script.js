async function recupererPronostic(code, equipeA, equipeB) {
    try {
        const reponse = await fetch(`/api/pronostic/${code}/${encodeURIComponent(equipeA)}/${encodeURIComponent(equipeB)}`);
        if (!reponse.ok) return null;
        const donnees = await reponse.json();
        if (donnees.erreur) return null;
        return donnees;
    } catch {
        return null;
    }
}

function texteProbable(pronostic) {
    const { victoireA, nul, victoireB } = pronostic.probabilites;
    const valeurs = [
        { texte: `Victoire ${pronostic.equipeA}`, valeur: parseFloat(victoireA) },
        { texte: "Match nul", valeur: parseFloat(nul) },
        { texte: `Victoire ${pronostic.equipeB}`, valeur: parseFloat(victoireB) }
    ];
    valeurs.sort((a, b) => b.valeur - a.valeur);
    return `${valeurs[0].texte} (${valeurs[0].valeur}%)`;
}

async function chargerMatchs() {
    const conteneur = document.getElementById("matchs");

    try {
        const reponse = await fetch("/api/matchs");
        const donnees = await reponse.json();

        if (!donnees.matches || donnees.matches.length === 0) {
            conteneur.innerHTML = "<p>Aucun match trouvé pour aujourd'hui.</p>";
            return;
        }

        for (const match of donnees.matches) {
            const ligue = match.competition.name;
            const code = match.competition.code;
            const equipeDomicile = match.homeTeam.name;
            const equipeExterieur = match.awayTeam.name;

            const carte = document.createElement("article");
            carte.innerHTML = `
                <p class="ligue">${ligue}</p>
                <div class="match">
                    <span>${equipeDomicile}</span>
                    <span>-</span>
                    <span>${equipeExterieur}</span>
                </div>
                <p class="pronostic">Calcul en cours...</p>
            `;
            conteneur.appendChild(carte);

            const pronosticElement = carte.querySelector(".pronostic");
            const pronostic = await recupererPronostic(code, equipeDomicile, equipeExterieur);

            if (pronostic) {
                pronosticElement.textContent = "Pronostic : " + texteProbable(pronostic);
            } else {
                pronosticElement.textContent = "Pronostic indisponible";
            }
        }

    } catch (erreur) {
        conteneur.innerHTML = "<p style='color:red'>Erreur : " + erreur.message + "</p>";
    }
}

chargerMatchs();
