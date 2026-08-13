import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import PageLayout from '../components/PageLayout'
import AdminPanel from '../components/AdminPanel'

function AdminPage() {
  const [token, setToken] = useState<string | null>(null);

  const backendUrl = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
    ? "http://127.0.0.1:8787" 
    : "https://play-backend.flowmaticai.workers.dev";

  useEffect(() => {
    const savedToken = localStorage.getItem("arcade_token");
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  return (
    <PageLayout pageTitle="Admin Panel">
      <AdminPanel 
        onBack={() => { window.location.href = "/"; }} 
        token={token} 
        backendUrl={backendUrl} 
      />
    </PageLayout>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdminPage />
  </StrictMode>,
)
