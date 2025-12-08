import { useState } from 'react'
import './App.css'
import Scene from './components/scene.jsx'

function App() {
  const [count, setCount] = useState(0)

  return (
    <Scene />
  )
}

export default App
