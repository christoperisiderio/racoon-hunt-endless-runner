import React, { useState } from 'react';
import './document.css';

export default function Documents() {
  const [zoomedImage, setZoomedImage] = useState(null);

  return (
    <div className="documents-page">
      {/* Zoom overlay */}
      {zoomedImage && (
        <div 
          className="zoom-overlay"
          onClick={() => setZoomedImage(null)}
        >
          <div className="zoom-content">
            <img src={zoomedImage} alt="Zoomed screenshot" />
            <p style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.7 }}>
              Click anywhere to close
            </p>
          </div>
        </div>
      )}
      
      {/* Back button – optional but nice to have */}
      <a href="/" className="back-button">
        ← Back to Game
      </a>
      
      <header className="documents-header">
        <h1>Raccoon Hunt - Documents</h1>
      </header>
      
      {/* Semantic + helps with flex spacing */}
      <main style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <section className="documents-section">
          <h2>Story</h2>
          <p>
            A man wanders upon a road full of trash dumpsters and finds himself in a dangerous 
            situation when a giant raccoon shows up. It chases him relentlessly, and the man must 
            run for his life. He needs to dodge obstacles, jump over trash cans, and sprint endlessly 
            to survive. Can you outrun the beast?
          </p>
        </section>

        <section className="documents-section">
          <h2>How to Play</h2>
          <p>Use your keyboard to survive as long as possible:</p>
          <ul>
            <li>← Left Arrow or A – Move left</li>
            <li>→ Right Arrow or D – Move right</li>
            <li>Space or ↑ Up Arrow – Jump (coming soon!)</li>
          </ul>
          <p style={{ marginTop: '1rem', fontWeight: 'bold', color: '#ff0044' }}>
            Don't get caught by the raccoon!
          </p>
        </section>

        {/* Show some game images: start.png, running.png, end.png */}
        <section className="documents-section">
          <h2>Screenshots</h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '1.5rem',
            marginTop: '1rem'
          }}>
            <div style={{ textAlign: 'center' }}>
              <img 
                src="start.png" 
                alt="Game Start Screen" 
                className="screenshot-img"
                onClick={() => setZoomedImage('start.png')}
              />
              <p style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '0.5rem' }}>Game Start</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <img 
                src="running.png" 
                alt="Running Scene" 
                className="screenshot-img"
                onClick={() => setZoomedImage('running.png')}
              />
              <p style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '0.5rem' }}>Running Scene</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <img 
                src="end.png" 
                alt="Game Over Screen" 
                className="screenshot-img"
                onClick={() => setZoomedImage('end.png')}
              />
              <p style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '0.5rem' }}>Game Over</p>
            </div>
          </div>
        </section>

        <section className="documents-section" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 'clamp(1.2rem, 3vw, 1.5rem)', color: '#00ffcc' }}>
            Good luck surviving the Raccoon Hunt!
          </p>
        </section>
      </main>

      <footer className="documents-footer">
        🌚 Amadeus 🌚
      </footer>
    </div>
  );
}