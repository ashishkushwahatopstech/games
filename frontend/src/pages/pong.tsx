import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import PageLayout from '../components/PageLayout'
import DualPong from '../games/DualPong'

import GameGuide from '../components/GameGuide'

function PongPage() {
  return (
    <PageLayout pageTitle="Dual Pong">
      <DualPong onBack={() => { window.location.href = "/"; }} />
      <GameGuide gameId="dual-pong" />
    </PageLayout>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PongPage />
  </StrictMode>,
)
