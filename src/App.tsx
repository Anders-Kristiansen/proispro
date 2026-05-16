import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useDiscs } from './hooks/useDiscs'
import { useBags } from './hooks/useBags'
import { LoginPage } from './pages/LoginPage'
import { InventoryPage } from './pages/InventoryPage'
import { BagsPage } from './pages/BagsPage'
import { CoursesPage } from './pages/CoursesPage'
import { CollectionsPage } from './pages/CollectionsPage'
import { WishlistPage } from './pages/WishlistPage'
import { ForSalePage } from './pages/ForSalePage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { Layout } from './components/Layout'

type Tab = 'inventory' | 'bags' | 'courses' | 'collections' | 'wishlist' | 'forsale' | 'analytics'

function AppShell() {
  const { user, isLoading } = useAuth()
  const { discs } = useDiscs()
  const { bags } = useBags()
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
      {activeTab === 'bags' && <BagsPage />}
      {activeTab === 'courses' && <CoursesPage allDiscs={discs} allBags={bags} />}
      {activeTab === 'collections' && <CollectionsPage allDiscs={discs} />}
      {activeTab === 'wishlist' && <WishlistPage />}
      {activeTab === 'forsale' && <ForSalePage allDiscs={discs} />}
      {activeTab === 'analytics' && <AnalyticsPage />}
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
