// src/App.jsx
import { useEffect, useState } from 'react';
import Document from './components/document.jsx';
import './App.css';

function App() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showDocument, setShowDocument] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Show Document component if toggled
  if (showDocument) {
    return <Document goBack={() => setShowDocument(false)} />;
  }

  return (
    <div className="homepage">
      {/* Background Layers */}
      <div className="bg-layer fog-back" />
      <div className="bg-layer trees-far" />
      <div className="bg-layer trees-mid" />
      <div className="bg-layer fog-front" />

      {/* Glowing red raccoon eyes */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="glowing-eye"
          style={{
            top: `${20 + i * 15}%`,
            left: `${10 + i * 15}%`,
            transform: `translate(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px)`,
          }}
        />
      ))}

      {/* Title */}
      <header className="title-container">
        <h1 className="glitch-title" data-text="RACCOON HUNT">
          RACCOON HUNT
        </h1>
        <p className="subtitle">Endless Runner</p>
      </header>

      {/* Buttons */}
      <div className="cta-container">
        <a
          className="play-button"
          href="https://racoon-hunt-endless-runner.vercel.app/"
          rel="noopener noreferrer"
        >
          PLAY
        </a>

        <button
          className="doc-button"
          onClick={() => setShowDocument(true)}
        >
          <span>HOW TO PLAY</span>
        </button>
      </div>

      {/* Footer */}
      <footer className="eerie-footer">
        <p>They’re fast. They’re clever. And they know you’re coming.</p>
      </footer>
    </div>
  );
}

export default App;
