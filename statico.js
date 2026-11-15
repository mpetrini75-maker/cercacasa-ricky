// La pagina del cercacasa SENZA il programma acceso (per GitHub Pages, 15/11/2026).
// Risponde lei alle 4 richieste /api/... leggendo dati.json, preparato ogni giorno da
// riccardo/pubblica.py. Criteri e voti restano in questo telefono/computer (localStorage).
// Il filtro e' la copia di passa() in agenti/filtro.py: se cambia uno, va cambiato l'altro.
(() => {
  const vero = window.fetch.bind(window);
  let dati = null;
  const carica = async () => dati || (dati = await (await vero("dati.json", { cache: "no-store" })).json());
  const leggi = (k, base) => { try { return JSON.parse(localStorage.getItem(k)) ?? base; } catch { return base; } };
  const scrivi = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* niente memoria: pazienza */ } };
  const risposta = o => new Response(JSON.stringify(o), { headers: { "Content-Type": "application/json" } });

  function passa(a, c) {
    if (c.comuni.length && !c.comuni.includes(a.comune)) return false;
    if (a.prezzo == null || a.prezzo < dati.affitto_minimo) return false;
    if (!(c.prezzo_min <= a.prezzo && a.prezzo <= (c.prezzo_max || 1e9))) return false;
    if ((c.mq_min || c.mq_max) && (a.mq == null || !(c.mq_min <= a.mq && a.mq <= (c.mq_max || 1e9)))) return false;
    if (c.camere.length && (a.camere == null || (!c.camere.includes(a.camere) && !(c.camere.includes(4) && a.camere >= 4)))) return false;
    if (c.contratto === "anno" && ["si", "forse"].includes(a.stagionale)) return false;
    if (c.contratto === "stagionali" && !["si", "forse"].includes(a.stagionale)) return false;
    if (c.solo_preferite && !a.preferita) return false;
    return true;
  }

  window.fetch = async (url, opzioni = {}) => {
    const percorso = new URL(url, location.href).pathname;
    const api = percorso.slice(percorso.lastIndexOf("/api/"));
    if (!percorso.includes("/api/")) return vero(url, opzioni);
    await carica();
    const criteri = { ...dati.criteri, ...leggi("cercacasa-criteri", {}) };
    if (api === "/api/criteri") {
      if (opzioni.method === "POST") { scrivi("cercacasa-criteri", JSON.parse(opzioni.body)); return risposta({ ok: true }); }
      return risposta({ criteri, comuni: dati.comuni });
    }
    if (api === "/api/voto") {
      const { id, voto } = JSON.parse(opzioni.body);
      const voti = leggi("cercacasa-voti", {});
      if (voto) voti[id] = voto; else delete voti[id];
      scrivi("cercacasa-voti", voti);
      return risposta({ ok: true });
    }
    if (api === "/api/agenzie") return risposta({ agenzie: dati.agenzie });
    if (api === "/api/annunci") {
      const voti = leggi("cercacasa-voti", {});
      const annunci = dati.annunci.filter(a => passa(a, criteri)).map(a => ({ ...a, voto: voti[a.id] || null }));
      return risposta({ ...dati.testata, annunci });
    }
    return risposta({ errore: "non trovato" });
  };
})();
