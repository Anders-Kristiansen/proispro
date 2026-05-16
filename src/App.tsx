import { BrowserRouter, Routes, Route } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
        <h1>ProIsPro</h1>
        <p>React migration in progress — inventory, bags, and analytics coming soon.</p>
        <p style={{ color: '#888', fontSize: '0.9rem' }}>
          Stack: React 18 + Vite + TypeScript + Supabase
        </p>
      </div>
      <Routes>
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
