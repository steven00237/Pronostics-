require("dotenv").config();
const express = require("express");
const https = require("https");

const app = express();
const PORT = 3000;
const API_KEY = process.env.API_KEY;

app.use(express.static("."));

app.get("/api/matchs", (req, res) => {
    const options = {
        hostname: "api.football-data.org",
        path: "/v4/matches",
        headers: {
            "X-Auth-Token": API_KEY
        }
    };

    https.get(options, (apiRes) => {
        let data = "";
        apiRes.on("data", (chunk) => {
            data += chunk;
        });
        apiRes.on("end", () => {
            res.json(JSON.parse(data));
        });
    }).on("error", (erreur) => {
        res.status(500).json({ erreur: erreur.message });
    });
});
// Fonction de calcul de la factorielle
function factorielle(n) {
    if (n === 0) return 1;
    let resultat = 1;
    for (let i = 1; i <= n; i++) {
        resultat *= i;
    }
    return resultat;
}

// Fonction de la loi de Poisson
function probabilitePoisson(lambda, k) {
    return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorielle(k);
}

// Route pour calculer un pronostic entre deux équipes
app.get("/api/pronostic/:competition/:equipeA/:equipeB", (req, res) => {
    const { competition, equipeA, equipeB } = req.params;

    const options = {
        hostname: "api.football-data.org",
        path: `/v4/competitions/${competition}/standings`,
        headers: {
            "X-Auth-Token": API_KEY
        }
    };

    https.get(options, (apiRes) => {
        let data = "";
        apiRes.on("data", (chunk) => { data += chunk; });
        apiRes.on("end", () => {
            const reponseJson = JSON.parse(data);

if (!reponseJson.standings || !reponseJson.standings[0]) {
    return res.status(404).json({ erreur: "Classement non disponible pour cette compétition" });
}

const classement = reponseJson.standings[0].table;

            const equipeDomicile = classement.find(e => e.team.name.includes(equipeA));
            const equipeExterieur = classement.find(e => e.team.name.includes(equipeB));

            if (!equipeDomicile || !equipeExterieur) {
                return res.status(404).json({ erreur: "Équipe non trouvée" });
            }

            // Moyennes de buts marqués et encaissés par match
            const moyenneButsMarquesA = equipeDomicile.goalsFor / equipeDomicile.playedGames;
            const moyenneButsEncaissesA = equipeDomicile.goalsAgainst / equipeDomicile.playedGames;
            const moyenneButsMarquesB = equipeExterieur.goalsFor / equipeExterieur.playedGames;
            const moyenneButsEncaissesB = equipeExterieur.goalsAgainst / equipeExterieur.playedGames;

            // Lambda : buts attendus pour chaque équipe dans CE match
            const lambdaA = (moyenneButsMarquesA + moyenneButsEncaissesB) / 2;
            const lambdaB = (moyenneButsMarquesB + moyenneButsEncaissesA) / 2;

            // Calcul des probabilités pour chaque score possible (0 à 5 buts)
            let probVictoireA = 0;
            let probNul = 0;
            let probVictoireB = 0;

            for (let butsA = 0; butsA <= 5; butsA++) {
                for (let butsB = 0; butsB <= 5; butsB++) {
                    const proba = probabilitePoisson(lambdaA, butsA) * probabilitePoisson(lambdaB, butsB);
                    if (butsA > butsB) probVictoireA += proba;
                    else if (butsA === butsB) probNul += proba;
                    else probVictoireB += proba;
                }
            }

            res.json({
                equipeA: equipeDomicile.team.name,
                equipeB: equipeExterieur.team.name,
                lambdaA: lambdaA.toFixed(2),
                lambdaB: lambdaB.toFixed(2),
                probabilites: {
                    victoireA: (probVictoireA * 100).toFixed(1) + "%",
                    nul: (probNul * 100).toFixed(1) + "%",
                    victoireB: (probVictoireB * 100).toFixed(1) + "%"
                }
            });
        });
    }).on("error", (erreur) => {
        res.status(500).json({ erreur: erreur.message });
    });
});
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
