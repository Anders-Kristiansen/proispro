import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { InventoryPage } from './pages/InventoryPage'
import { Layout } from './components/Layout'

type Tab = 'inventory' | 'bags' | 'courses' | 'collections' | 'wishlist' | 'forsale'

function AppShell() {
  const { user, isLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('inventory')

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--clr-bg)',
        color: 'var(--clr-muted)',
      }}>
        <img src="/img/logo.png" alt="" style={{ width: '60px', borderRadius: '50%' }} />
      </div>
    )
  }

  if (!user) return <LoginPage />

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'inventory' && <InventoryPage />}
      {activeTab !== 'inventory' && (
        <div style={{ color: 'var(--clr-muted)', padding: '2rem 0' }}>
          <p>📊 <strong style={{ color: 'var(--clr-text)' }}>{activeTab}</strong> tab — coming soon</p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Signed in as {user.email}</p>
        </div>
      )}
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
