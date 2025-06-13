// === FILE: App.js ===
import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import YouTube from "react-youtube";
import Countdown from "./Countdown";
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

  const playerRef = useRef(null);

  const extractVideoId = (url) => {
    const regex = /(?:\?v=|\/embed\/|\.be\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  useEffect(() => {
    socket.on("roomCreated", ({ roomCode }) => {
      setRoomCode(roomCode);
      setIsAdmin(true);
      setView("lobby");
    });

    socket.on("roomJoined", ({ roomCode }) => {
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
        setValidatedTypes({});
        setVideoRevealed(false);
        setCountdownActive(false);
      }, 3000);
    });

    socket.on("videoSkipped", () => {
      setCurrentVideoId(null);
      setVideoRevealed(false);
      setGuesses([]);
      setEventLog([]);
    });

    socket.on("revealVideo", (videoId) => {
      setVideoRevealed(true);
    });

    socket.on("guessReceived", ({ pseudo, guess }) => {
      setGuesses((prev) => [...prev, { pseudo, guess }]);
    });

    socket.on("guessValidated", ({ pseudo, guess, type }) => {
      setPlayers((prev) =>
        prev.map((p) =>
          p.pseudo === pseudo ? { ...p, score: p.score + 1 } : p
        )
      );
      setEventLog((prev) => [
        ...prev,
        { type: "validated", pseudo, detail: `${type} : ${guess}` }
      ]);
      setValidatedTypes((prev) => {
        const types = prev[pseudo] || [];
        return {
          ...prev,
          [pseudo]: [...types, type]
  };
});
    });

    socket.on("guessRejected", ({ pseudo, guess }) => {
      setEventLog((prev) => [
        ...prev,
        { type: "rejected", pseudo, detail: guess }
      ]);
    });

    socket.on("endGame", ({ winners }) => {
      setWinners(winners);
      setView("victory");
    });

    return () => socket.removeAllListeners();
  }, [isAdmin]);

  const handleCreateRoom = () => {
    if (pseudo.trim()) socket.emit("createRoom", { pseudo });
  };

  const handleJoinRoom = () => {
    if (pseudo.trim() && joinCode.trim())
      socket.emit("joinRoom", { pseudo, roomCode: joinCode.toUpperCase() });
  };

  const handleStart = () => {
    socket.emit("startGame", { roomCode });
  };

  const handleLaunchVideo = () => {
    const videoId = extractVideoId(inputLink);
    if (videoId) {
      setCurrentVideoId(videoId);
      setVideoRevealed(false);
      setGuesses([]);
      setEventLog([]);
      socket.emit("playVideo", { roomCode, videoId });
      setInputLink("");
    }
  };

  const handleForceReveal = () => {
    socket.emit("forceReveal", { roomCode });
    setVideoRevealed(true);
  };

  const handleSkipVideo = () => {
      socket.emit("skipVideo", { roomCode });
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

  const renderLobby = () => (
    <div className="lobby">
      <h2>Lobby - Code : {roomCode}</h2>
      <p>Admin : {players.find((p) => p.admin)?.pseudo}</p>
      <ul>{players.map((p) => <li key={p.pseudo}>{p.pseudo}</li>)}</ul>
      {isAdmin && <button onClick={handleStart}>Lancer la partie</button>}
    </div>
  );

  const renderAdmin = () => (
    <div className="admin">
      <h2>Admin</h2>
      <input
        type="text"
        placeholder="Lien YouTube"
        value={inputLink}
        onChange={(e) => setInputLink(e.target.value)}
      />
      <button onClick={handleLaunchVideo}>Lancer</button>
      <button onClick={handleSkipVideo}>⏭️ Skip</button>
      <button onClick={handleForceReveal}>🎬 Reveal</button>
      {countdownActive && <Countdown />}
      {currentVideoId && (
        <YouTube
          videoId={currentVideoId}
          opts={{ height: "360", width: "640", playerVars: { autoplay: 1 } }}
          onReady={(e) => {
            playerRef.current = e.target;
            e.target.setVolume(volume);
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
      <h3>Progression sur la chanson : {Object.values(validatedTypes).flat().length} / 2</h3>
      <h3>Réponses à valider</h3>
      <ul>
        {guesses.map(({ pseudo, guess }, idx) => (
          <li key={idx}>
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
          </li>
        ))}
      </ul>
      <h3>Classement</h3>
<ol className="score-animated">
  {[...players]
    .filter((p) => !p.admin) // ← on exclut l’admin
    .sort((a, b) => b.score - a.score)
    .map((p, idx) => (
      <li key={p.pseudo}>
        {idx === 0 ? "🥇 " : idx === 1 ? "🥈 " : idx === 2 ? "🥉 " : ""}
        {p.pseudo} — {p.score} pts
      </li>
    ))}
</ol>

    </div>
  );

  const renderPlayer = () => (
    <div className="player">
      <h2>Joueur</h2>
      {countdownActive && <Countdown />}
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
        type="text"
        placeholder="Votre réponse"
        value={guessInput}
        onChange={(e) => setGuessInput(e.target.value)}
        onKeyDown={handleGuessSubmit}
      />
      <h3>Historique</h3>
      <ul>
        {eventLog.map((e, idx) => (
          <li
            key={idx}
            style={{ color: e.type === "rejected" ? "red" : "green" }}
          >
            {e.pseudo} : {e.detail}
          </li>
        ))}
      </ul>
      <h3>Classement</h3>
<ol className="score-animated">
  {[...players]
    .filter((p) => !p.admin) // ← on exclut l’admin
    .sort((a, b) => b.score - a.score)
    .map((p, idx) => (
      <li key={p.pseudo}>
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
    </div>
  );

  const renderHome = () => (
    <div className="home">
      <h1>🎵 Blind Test 🎵</h1>
      <input
        type="text"
        placeholder="Pseudo"
        value={pseudo}
        onChange={(e) => setPseudo(e.target.value)}
      />
      <div>
        <button onClick={handleCreateRoom}>Créer une partie</button>
      </div>
      <div>
        <input
          type="text"
          placeholder="Code"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
        />
        <button onClick={handleJoinRoom}>Rejoindre</button>
      </div>
    </div>
  );

  return (
    <div className="App">
      {view === "home" && renderHome()}
      {view === "lobby" && renderLobby()}
      {view === "admin" && renderAdmin()}
      {view === "player" && renderPlayer()}
      {view === "victory" && renderVictory()}
    </div>
  );
}
