import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider, useApp } from './store/app'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Tasks } from './pages/Tasks'
import { TaskDetail } from './pages/TaskDetail'
import { Habits } from './pages/Habits'
import { Journal } from './pages/Journal'
import { Reviews } from './pages/Reviews'
import { Insights } from './pages/Insights'
import { About } from './pages/About'
import { Settings } from './pages/Settings'

function Guard() {
  const { user, ready } = useApp()
  if (!ready) {
    return (
      <div className="login-wrap">
        <div className="muted small">正在打开你的记录空间…</div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <Layout />
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Guard />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/tasks/:id" element={<TaskDetail />} />
            <Route path="/habits" element={<Habits />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/about" element={<About />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AppProvider>
  )
}
