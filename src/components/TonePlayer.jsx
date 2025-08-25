import React from "react";

export default function TonePlayer({ sound }) {
  const playTone = () => {
    const audio = new Audio(sound);
    audio.play();
  };

  return <button onClick={playTone} style={{ marginTop: "20px" }}>Play Dispatch Tone</button>;
}