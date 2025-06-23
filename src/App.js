// === FILE: App.js ===
import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import YouTube from "react-youtube";
import Countdown from "./Countdown";
import confetti from "canvas-confetti";
import "./App.css";

const socket = io("https://blind-test-server-vvgh.onrender.com");

export default function App() {
  const [view, setView] = useState("home");
  const [pseudo, setPseudo] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [players, setPlayers] = useState([]);
  const [inputLink, setInputLink] = useState("");
  const [currentVideoId, setCurrentVideoId] = useState(null);
  const [videoRevealed, setVideoRevealed] = useState(false);
  const [validatedTypes, setValidatedTypes] = useState({});
  const [countdownActive, setCountdownActive] = useState(false);
  const [guessInput, setGuessInput] = useState("");
  const [guesses, setGuesses] = useState([]);
  const [eventLog, setEventLog] = useState([]);
  const [winners, setWinners] = useState([]);
  const [volume, setVolume] = useState(50);
  const [isMuted, setMuted] = useState(true);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scoreLimit, setScoreLimit] = useState(10); // 10 par défaut
  const [history, setHistory] = useState([]);
  const [systemMessage, setSystemMessage] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const inputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]); // tableau {videoId, title}
  const [flashPlayer, setFlashPlayer] = useState(null);
    const [theme, setTheme] = useState("dark");

  const toggleTheme = () => {
  setTheme((prev) => (prev === "dark" ? "light" : "dark"));
};

const showSystemMessage = (msg, duration = 3000) => {
  setSystemMessage(msg);
  setTimeout(() => setSystemMessage(null), duration);
};

  const progressInterval = useRef(null);

  const playerRef = useRef(null);

const extractVideoId = (urlOrId) => {
  if (!urlOrId) return null;
  // 1) Si c’est déjà un ID de 11 caractères
  if (/^[A-Za-z0-9_-]{11}$/.test(urlOrId)) return urlOrId;
  // 2) Sinon on essaie d’extraire depuis une URL
  const m = urlOrId.match(/(?:v=|\/embed\/|\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
};


  useEffect(() => {
    socket.on("roomCreated", ({ roomCode }) => {
      setLoading(false);
      setRoomCode(roomCode);
      setIsAdmin(true);
      setView("lobby");
    });

    socket.on("roomJoined", ({ roomCode }) => {
      setLoading(false);
      setRoomCode(roomCode);
      setView("lobby");
    });

    socket.on("updatePlayers", (updatedPlayers) => {
      setPlayers(updatedPlayers);
    });

    socket.on("gameStarted", () => {
      setView(isAdmin ? "admin" : "player");
    });

    socket.on("playVideo", ({ videoId }) => {
      setCountdownActive(true);
      setTimeout(() => {
        setCurrentVideoId(videoId);
        setHistory((prev) => [
  ...prev,
  { videoId, guesses: [] }
]);
        setValidatedTypes({});
        setVideoRevealed(false);
        setCountdownActive(false);
setTimeout(() => {
  if (inputRef.current) {
    inputRef.current.focus();
  }
}, 500); // petit délai post-countdown
        setProgress(0);
if (progressInterval.current) clearInterval(progressInterval.current);

progressInterval.current = setInterval(() => {
  setProgress((prev) => {
    if (prev >= 100) {
      clearInterval(progressInterval.current);
      return 100;
    }
    return prev + 0.5; // ← ajuste pour la vitesse
  });
}, 300); // ← 0.5% toutes les 300ms ≈ 60s
      }, 3000);
    });

    socket.on("videoSkipped", () => {
      setCurrentVideoId(null);
      setVideoRevealed(false);
      setGuesses([]);
      setEventLog([]);
      
      setProgress(0);
if (progressInterval.current) clearInterval(progressInterval.current);
    });

socket.on("revealVideo", (videoId) => {
  setVideoRevealed(true);
  setGuessInput("");             // ← on vide le champ
  setProgress(0);
  if (progressInterval.current) clearInterval(progressInterval.current);
});


    socket.on("guessReceived", ({ pseudo, guess }) => {
      setGuesses((prev) => [...prev, { pseudo, guess }]);
    });

socket.on("guessValidated", ({ pseudo, guess, type }) => {
  // 1. Met à jour les scores
  setPlayers((prev) =>
    prev.map((p) =>
      p.pseudo === pseudo ? { ...p, score: p.score + 1 } : p
    )
  );

  // 2. Ajoute l'entrée au journal
  setEventLog((prev) => [
    ...prev,
    { type: "validated", pseudo, detail: `${type} : ${guess}` },
  ]);

  // 3. Met à jour l'historique
  setHistory((prev) =>
  prev.map((entry, i) =>
    i === prev.length - 1
      ? {
          ...entry,
          guesses: [...entry.guesses, { pseudo, type }]
        }
      : entry
  )
);

  // 4. Met à jour les types validés
  setValidatedTypes((prev) => {
    const types = prev[pseudo] || [];
    return {
      ...prev,
      [pseudo]: [...types, type],
    };
  });

  // 4. LANCE L’EFFET FLASH
  setFlashPlayer(pseudo);
  setTimeout(() => setFlashPlayer(null), 800);
});
    socket.on("guessRejected", ({ pseudo, guess }) => {
      setEventLog((prev) => [
        ...prev,
        { type: "rejected", pseudo, detail: guess }
      ]);
    });
    
    socket.on("guessClose", ({ pseudo, guess }) => {
      console.log("🟡 Pas loin reçu :", pseudo, guess);
  setEventLog((prev) => [
    ...prev,
    { type: "close", pseudo, detail: guess }
  ]);
});

    socket.on("endGame", ({ winners }) => {
      setWinners(winners);
      confetti({
  particleCount: 150,
  spread: 70,
  origin: { y: 0.6 }
});
      setView("victory");
    });

    return () => socket.removeAllListeners();
  }, [isAdmin]);

const handleCreateRoom = () => {
  if (pseudo.trim()) {
    setLoading(true);
    socket.emit("createRoom", { pseudo });
  }
};

const handleJoinRoom = () => {
  if (pseudo.trim() && joinCode.trim()) {
    setLoading(true);
    socket.emit("joinRoom", { pseudo, roomCode: joinCode.toUpperCase() });
  }
};

  const handleStart = () => {
    socket.emit("startGame", { roomCode, scoreLimit });
  };

const handleLaunchVideo = (videoIdParam) => {
  // Priorité au paramètre (clic sur résultat), sinon extrait du champ
  const videoId = videoIdParam || extractVideoId(inputLink);
  if (!videoId) {
    showSystemMessage("❌ Vidéo invalide : colle un lien YouTube complet ou choisis un résultat", 3000);
    return;
  }
  setLoading(true);
  socket.emit("playVideo", { roomCode, videoId });
  setInputLink("");
  showSystemMessage("🎵 Nouvelle vidéo lancée !");
  setTimeout(() => setLoading(false), 1000);
};


  const handleForceReveal = () => {
    socket.emit("forceReveal", { roomCode });
    showSystemMessage("🎬 Vidéo révélée !");
    setVideoRevealed(true);
  };

  const handleSkipVideo = () => {
      socket.emit("skipVideo", { roomCode });
      showSystemMessage("⏭️ Chanson passée !");
  };

  const handleGuessSubmit = (e) => {
    if (e.key === "Enter" && guessInput.trim()) {
      socket.emit("sendGuess", {
        roomCode,
        pseudo,
        guess: guessInput.trim()
      });
      setGuessInput("");
    }
  };

  const handleValidate = (guess, pseudo, type) => {
    socket.emit("validateGuess", { roomCode, pseudo, guess, type });
    setGuesses((prev) =>
      prev.filter((g) => !(g.pseudo === pseudo && g.guess === guess))
    );
  };

  const handleReject = (guess, pseudo) => {
    socket.emit("rejectGuess", { roomCode, pseudo, guess });
    setGuesses((prev) =>
      prev.filter((g) => !(g.pseudo === pseudo && g.guess === guess))
    );
  };
  
const handleCloseGuess = (guess, pseudo) => {
  socket.emit("guessClose", { roomCode, pseudo, guess });

  setGuesses((prev) =>
    prev.filter((g) => !(g.pseudo === pseudo && g.guess === guess))
  );

  setEventLog((prev) => [
    ...prev,
    { type: "close", pseudo, detail: guess }
  ]);
};


  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value, 10);
    setVolume(newVolume);
    if (playerRef.current?.setVolume) {
      playerRef.current.setVolume(newVolume);
    }
  };

  const toggleMute = () => {
    if (playerRef.current?.mute && playerRef.current?.unMute) {
      if (isMuted) {
        playerRef.current.unMute();
        setMuted(false);
      } else {
        playerRef.current.mute();
        setMuted(true);
      }
    }
  };

const handleSearch = async () => {
  if (!searchTerm.trim()) return;
  setSearchLoading(true);
  try {
    const res = await fetch(
      `https://blind-test-server-vvgh.onrender.com/search?q=${encodeURIComponent(searchTerm)}`
    );
    const data = await res.json();
    setSearchResults(data);
  } catch (err) {
    console.error("Recherche client échouée", err);
  } finally {
    setSearchLoading(false);
  }
};


  const renderLobby = () => (
    <div className="lobby">
      <h2>Lobby - Code : {roomCode}</h2>
      <p>Admin : {players.find((p) => p.admin)?.pseudo}</p>
      <div className="lobby-player-list">
  {players.map((p) => (
    <div className="lobby-player-tile" key={p.pseudo}>
      {p.pseudo}
      {p.admin && " 👑"}
    </div>
  ))}
  
</div>
      {isAdmin && (
  <>
    <div style={{ marginBottom: "1rem" }}>
      <label>Limite de score : </label>
      <input
        type="number"
        value={scoreLimit}
        min={1}
        onChange={(e) => setScoreLimit(Number(e.target.value))}
        style={{ width: "60px", marginLeft: "0.5rem" }}
      />
    </div>
    <button onClick={handleStart}>Lancer la partie</button>
  </>
)}

    </div>
  );

const renderAdmin = () => (
  <div className="admin">
    {/* ─── Barre Recherche + Lien ─────────────────────────── */}
    <div className="admin-search">
      {/* Recherche par mot-clé */}
      <input
        type="text"
        placeholder="Rechercher une chanson"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <button
        onClick={handleSearch}
        disabled={searchLoading}
        className="admin-button btn-launch"
      >
        {searchLoading ? <span className="spinner" /> : "🔍"}
      </button>

      {/* Coller un lien YouTube */}
      <input
        type="text"
        placeholder="Ou coller un lien YouTube"
        value={inputLink}
        onChange={(e) => setInputLink(e.target.value)}
      />
      <button
        onClick={() => handleLaunchVideo()}
        disabled={loading}
        className="admin-button btn-launch"
      >
        {loading ? <span className="spinner" /> : "▶️"}
      </button>
    </div>

    {/* ─── Résultats de Recherche ─────────────────────────── */}
    {searchResults.length > 0 && (
      <ul className="search-results">
        {searchResults.map(({ videoId, title, thumbnail }) => (
          <li
            key={videoId}
            onClick={() => handleLaunchVideo(videoId)}
            style={{
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              padding: "0.5rem 0"
            }}
          >
            <img
              src={thumbnail}
              alt={title}
              width={80}
              style={{ marginRight: "0.5rem", borderRadius: "4px" }}
            />
            <span style={{ flex: 1, textAlign: "left" }}>{title}</span>
          </li>
        ))}
      </ul>
    )}

    {/* ─── Contrôles Admin ─────────────────────────────────── */}
    <div className="admin-controls">
      <button
        onClick={handleForceReveal}
        className="admin-button btn-reveal"
      >
        🎬 Reveal
      </button>
      <button onClick={handleSkipVideo} className="admin-button btn-skip">
        ⏭️ Skip
      </button>
    </div>

    {/* ─── Compte à rebours ───────────────────────────────── */}
    {countdownActive && <Countdown onEnd={() => {}} />}

    {/* ─── Progression Vidéo ───────────────────────────────── */}
    {currentVideoId && (
      <div className="progress-bar-container">
        <div
          className="progress-bar"
          style={{ width: `${progress}%` }}
        />
      </div>
    )}

    {/* ─── Lecteur YouTube ────────────────────────────────── */}
    {currentVideoId && (
      <YouTube
        videoId={currentVideoId}
        opts={{
          height: "360",
          width: "640",
          playerVars: { autoplay: 1 }
        }}
        onReady={(e) => {
          playerRef.current = e.target;
          e.target.setVolume(volume);
          isMuted ? e.target.mute() : e.target.unMute();
        }}
      />
    )}

    {/* ─── Contrôle du Volume ──────────────────────────────── */}
    <div style={{ margin: "1rem 0" }}>
      <input
        type="range"
        min="0"
        max="100"
        value={volume}
        onChange={handleVolumeChange}
      />
      <button onClick={toggleMute}>
        {isMuted ? "🔇" : "🔊"}
      </button>
    </div>

    {/* ─── Progression de la Manche ────────────────────────── */}
    <h3>
      Progression sur la chanson :{" "}
      {Object.values(validatedTypes).flat().length} / 2
    </h3>

    {/* ─── Réponses à valider ──────────────────────────────── */}
    <h3>Réponses à valider</h3>
    <ul>
      {guesses.map(({ pseudo, guess }, idx) => (
        <li key={idx} style={{ marginBottom: "0.5rem" }}>
          {pseudo} : {guess}
          <button
            onClick={() => handleValidate(guess, pseudo, "artiste")}
            disabled={validatedTypes[pseudo]?.includes("artiste")}
          >
            ✅ Artiste
          </button>
          <button
            onClick={() => handleValidate(guess, pseudo, "titre")}
            disabled={validatedTypes[pseudo]?.includes("titre")}
          >
            ✅ Titre
          </button>
          <button onClick={() => handleReject(guess, pseudo)}>❌</button>
          <button onClick={() => handleCloseGuess(guess, pseudo)}>
            🟡 Pas loin
          </button>
        </li>
      ))}
    </ul>

    {/* ─── Classement ──────────────────────────────────────── */}
    <h3>Classement</h3>
    <ol className="score-animated">
      {[...players]
        .filter((p) => !p.admin)
        .sort((a, b) => b.score - a.score)
        .map((p, idx) => (
          <li
            key={p.pseudo}
            className={`
              ${p.pseudo === pseudo ? "current-player" : ""}
              ${p.pseudo === flashPlayer ? "flash-guess" : ""}
            `.trim()}
          >
            {idx === 0
              ? "🥇 "
              : idx === 1
              ? "🥈 "
              : idx === 2
              ? "🥉 "
              : ""}
            {p.pseudo} — {p.score} pts
          </li>
        ))}
    </ol>
  </div>
);


  const renderPlayer = () => (
    <div className="player">
      {countdownActive && <Countdown />}
      {currentVideoId && (
  <div className="progress-bar-container">
    <div className="progress-bar" style={{ width: `${progress}%` }} />
  </div>
)}
      {currentVideoId && (
        <YouTube
          videoId={currentVideoId}
          opts={{
            height: videoRevealed ? "360" : "0",
            width: videoRevealed ? "640" : "0",
            playerVars: { autoplay: 1, mute: 0 }
          }}
          onReady={(e) => {
            playerRef.current = e.target;
            e.target.setVolume(volume);
            e.target.playVideo();
            if (isMuted) e.target.mute();
            else e.target.unMute();
          }}
        />
      )}
      <div>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={handleVolumeChange}
        />
        <button onClick={toggleMute}>{isMuted ? "🔇" : "🔊"}</button>
      </div>
<input
  ref={inputRef}
  type="text"
  placeholder="Votre réponse"
  value={guessInput}
  onChange={(e) => setGuessInput(e.target.value)}
  onKeyDown={handleGuessSubmit}
  disabled={videoRevealed}    // ← bloqué dès le reveal
/>

      <h3>Historique</h3>
<ul className="event-log">
  {eventLog.map((e, idx) => (
    <li key={idx} className={e.type}>
      <strong>{e.pseudo}</strong> : {e.detail}
    </li>
  ))}
</ul>
      <h3>Classement</h3>
<ol className="score-animated">
  {[...players]
    .filter((p) => !p.admin) // ← on exclut l’admin
    .sort((a, b) => b.score - a.score)
    .map((p, idx) => (
      <li
  key={p.pseudo}
  className={`
    ${p.pseudo === pseudo ? "current-player" : ""}
    ${p.pseudo === flashPlayer ? "flash-guess" : ""}
  `.trim()}
>
        {idx === 0 ? "🥇 " : idx === 1 ? "🥈 " : idx === 2 ? "🥉 " : ""}
        {p.pseudo} — {p.score} pts
      </li>
    ))}
</ol>

    </div>
  );

  const renderVictory = () => (
    <div className="victory">
      <h2>🎉 Victoire !</h2>
      <ol>
        {winners.map((p, idx) => (
          <li key={idx}>
            {p.pseudo} - {p.score} pts
          </li>
        ))}
      </ol>
      <h3>Historique de la partie</h3>
<ul>
  {history.map((entry, idx) => (
    <li key={idx} className="history-entry">
      🎬 <strong>Vidéo {idx + 1}</strong><br />
      {entry.guesses.length > 0 ? (
        <ul>
          {entry.guesses.map((g, i) => (
            <li key={i}>
              {g.pseudo} a trouvé : {g.type}
            </li>
          ))}
        </ul>
      ) : (
        <em>Personne n’a deviné</em>
      )}
    </li>
  ))}
</ul>
<button
  onClick={() => {
    socket.emit("restartGame", { roomCode });
    setCurrentVideoId(null);
    setGuesses([]);
    setEventLog([]);
    setValidatedTypes({});
    setVideoRevealed(false);
    setWinners([]);
    setHistory([]);
    setProgress(0);
    setView(isAdmin ? "admin" : "player");
  }}
>
  🔁 Relancer une partie
</button>
    </div>
  );

  const renderHome = () => (
    <div className="home">
      <h1>🎵 Blind Test 🎵</h1>
<input
  type="text"
  placeholder="Pseudo (max 20 caractères)"
  value={pseudo}
  onChange={(e) => {
    if (e.target.value.length <= 20) {
      setPseudo(e.target.value);
    }
  }}
/>
<small>{pseudo.length} / 20 caractères</small>
      <div>
        <button onClick={handleCreateRoom} disabled={loading}>
  Créer une partie
  {loading && <span className="spinner" />}
</button>
      </div>
      <div>
        <input
          type="text"
          placeholder="Code"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
        />
        <button onClick={handleJoinRoom} disabled={loading}>
  Rejoindre
  {loading && <span className="spinner" />}
</button>

      </div>
    </div>
  );

  return (
<>
  <button className="theme-toggle" onClick={toggleTheme}>
    🎨 Thème : {theme === "dark" ? "Sombre" : "Clair"}
  </button>
    {systemMessage && (
    <div className="system-banner">{systemMessage}</div>
  )}

  {view !== "home" && (
  <div className="role-banner">
    Rôle : {isAdmin ? "Admin 👑" : "Joueur 🎧"}
  </div>

  
)}

  <div className={`App ${theme === "dark" ? "theme-dark" : "theme-light"}`}>
    {view === "home" && renderHome()}
    {view === "lobby" && renderLobby()}
    {view === "admin" && renderAdmin()}
    {view === "player" && renderPlayer()}
    {view === "victory" && renderVictory()}
  </div>
</>
  );
}
