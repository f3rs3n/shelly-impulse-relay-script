/*
 * SCRIPT SHELLY PRO 4 PM - GESTIONE RELÈ A IMPULSO (PASSO-PASSO)
 *
 * v29 - GESTIONE CANALI FLESSIBILE
 *
 * Aggiunge una mappa di configurazione "CHANNELS_TO_RUN"
 * per abilitare o disabilitare facilmente la logica dello script
 * su canali specifici (es. per usare un canale come 
 * interruttore standard per un contattore).
 *
 * ARCHITETTURA:
 * 1. USCITE (O1-O4): Collegate alle bobine dei relè Siemens.
 * 2. INGRESSI (S1-S4): Collegate all'uscita di potenza del relè
 * (il filo della lampadina) per leggere lo stato reale.
 * 3. VIRTUAL BOOLEAN (ID 200-203): Usati come interfaccia utente
 * (un pulsante ON/OFF per ogni canale).
 *
 * PREREQUISITI (per i canali attivi):
 * 1. 4 "Virtual Boolean" creati (ID 200, 201, 202, 203).
 * 2. Canali fisici (0-3) in "Modalità Staccata" (Detached).
 * 3. Ingressi (0-3) impostati su "Interruttore" (Toggle Switch).
 * 4. Uscite (0-3) con "Auto-OFF" impostato a 0.5 secondi.
 */

// --- CONFIGURAZIONE CANALI ATTIVI ---
// Imposta a 'true' i canali (ID 0, 1, 2, 3) che vuoi
// che questo script gestisca come relè a impulso.
// Imposta 'false' per ignorarli (verranno gestiti come normali relè).
let CHANNELS_TO_RUN = {
  0: true,  // Canale 1
  1: true,  // Canale 2
  2: true,  // Canale 3
  3: false  // Canale 4 (impostato a 'false' per contattore)
};
// ------------------------------------

// --- CONFIGURAZIONE INTERNA (NON MODIFICARE) ---
let CONFIG = {
  "input:0":  { RELAY_ID: 0, VIRTUAL_ID: 200, NAME: "Canale 1", LOCK_KEY: "0" },
  "boolean:200":{ RELAY_ID: 0, VIRTUAL_ID: 200, NAME: "Canale 1", LOCK_KEY: "0" },
  "input:1":  { RELAY_ID: 1, VIRTUAL_ID: 201, NAME: "Canale 2", LOCK_KEY: "1" },
  "boolean:201":{ RELAY_ID: 1, VIRTUAL_ID: 201, NAME: "Canale 2", LOCK_KEY: "1" },
  "input:2":  { RELAY_ID: 2, VIRTUAL_ID: 202, NAME: "Canale 3", LOCK_KEY: "2" },
  "boolean:202":{ RELAY_ID: 2, VIRTUAL_ID: 202, NAME: "Canale 3", LOCK_KEY: "2" },
  "input:3":  { RELAY_ID: 3, VIRTUAL_ID: 203, NAME: "Canale 4", LOCK_KEY: "3" },
  "boolean:203":{ RELAY_ID: 3, VIRTUAL_ID: 203, NAME: "Canale 4", LOCK_KEY: "3" }
};
let LOCK_DURATION_MS = 1500;
let gLocks = { "0": false, "1": false, "2": false, "3": false };
let gIsInitializing = true;
// ----------------------------

/**
 * Funzione di inizializzazione:
 * Sincronizza i Virtual Boolean SOLO per i canali attivi.
 */
function InitVirtualSwitches() {
  print("Inizializzazione script relè esterni (v29)...");
  
  for (let channelIdKey in CHANNELS_TO_RUN) {
    // Se il canale è disattivato, saltalo
    if (CHANNELS_TO_RUN[channelIdKey] !== true) {
      print("Canale " + (parseInt(channelIdKey) + 1) + " ignorato (disattivato in configurazione).");
      continue;
    }
    
    // Il canale è attivo, procedi con l'inizializzazione
    let cfg = CONFIG["input:" + channelIdKey]; 
    if (!cfg) continue; // Sicurezza

    let inputStatus = Shelly.getComponentStatus("input:" + cfg.RELAY_ID);
    let virtualStatus = Shelly.getComponentStatus("boolean:" + cfg.VIRTUAL_ID);

    if (!inputStatus || !virtualStatus) {
      print(cfg.NAME + ": ERRORE! Componenti non trovati.");
      continue;
    }
    
    let initState = inputStatus.state;
    Shelly.call("Boolean.Set", { id: cfg.VIRTUAL_ID, value: initState }, null, null);
    print(cfg.NAME + ": Stato iniziale impostato a -> " + initState);
  }
}

/**
 * Funzione per sbloccare un canale dopo il timeout
 */
function clearLock(channelKey) {
  gLocks[channelKey] = false;
  print("Canale " + (parseInt(channelKey) + 1) + ": Lucchetto rimosso.");
}

/**
 * GESTORE GLOBALE DEGLI STATI
 * Ascolta tutti gli aggiornamenti di stato
 */
Shelly.addStatusHandler(
  function(event, ud) {
    
    // Ignora eventi durante l'avvio
    if (gIsInitializing === true) return;
    
    // Filtra eventi irrilevanti
    if (!event || !event.component) return;
    
    let componentName = event.component; 
    let cfg = CONFIG[componentName];
    
    // Se non è un componente che gestiamo, esci
    if (!cfg) return;

    // --- CONTROLLO DI ATTIVAZIONE ---
    let channelIdNum = parseInt(cfg.LOCK_KEY);
    // Se questo canale è disabilitato in CHANNELS_TO_RUN, ignora l'evento
    if (CHANNELS_TO_RUN[channelIdNum] !== true) {
      return; 
    }
    // --- FINE CONTROLLO ---
    
    let lockKey = cfg.LOCK_KEY;
    
    // Se il canale è bloccato, ignora
    if (gLocks[lockKey] === true) {
      return;
    }

    // --- LOGICA DI GESTIONE ---
    
    // CASO 1: È un INGRESSO FISICO che è cambiato
    if (componentName.indexOf("input:") === 0) {
      
      if (!event.delta || typeof event.delta.state === 'undefined') return;
      let newState = event.delta.state;
      let virtualStatus = Shelly.getComponentStatus("boolean:" + cfg.VIRTUAL_ID);
      
      if (virtualStatus && virtualStatus.value === newState) return; // Filtro anti-rumore
      
      print(cfg.NAME + ": Rilevato cambio fisico! Sincronizzo virtuale.");
      gLocks[lockKey] = true;
      Shelly.call("Boolean.Set", { id: cfg.VIRTUAL_ID, value: newState }, null, null);
      Timer.set(LOCK_DURATION_MS, false, clearLock, lockKey);
    }
    
    // CASO 2: È un BOOLEAN VIRTUALE che è cambiato (Comando da App)
    else if (componentName.indexOf("boolean:") === 0) {
      
      if (!event.delta || typeof event.delta.value === 'undefined') return;
      
      print(cfg.NAME + ": Rilevato comando da app! Invio impulso.");
      gLocks[lockKey] = true;
      Shelly.call("Switch.Toggle", { id: cfg.RELAY_ID }, null, null);
      Timer.set(LOCK_DURATION_MS, false, clearLock, lockKey);
    }
  },
  null
);

// --- AVVIO SCRIPT ---
InitVirtualSwitches();

// Avvia un timer per disattivare il flag di inizializzazione
Timer.set(
  3000, // 3 secondi
  false, // Non ripetere
  function() {
    gIsInitializing = false;
    print("--- INIZIALIZZAZIONE COMPLETATA. SCRIPT ATTIVO. ---");
  }
);