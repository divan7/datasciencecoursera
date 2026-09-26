import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './store/useAppStore'
import Layout from './components/layout/Layout'
import Setup from './pages/Setup'
import Dashboard from './pages/Dashboard'
import Program from './pages/Program'
import WorkoutPage from './pages/WorkoutPage'
import CheckIn from './pages/CheckIn'
import Progress from './pages/Progress'
import Profile from './pages/Profile'

export default function App() {
  const { activeUser } = useAppStore()

  return (
    <BrowserRouter>
      <Routes>
        {!activeUser ? (
          <>
            <Route path="/setup" element={<Setup />} />
            <Route path="*" element={<Navigate to="/setup" replace />} />
          </>
        ) : (
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/program" element={<Program />} />
            <Route path="/workout/:workoutId" element={<WorkoutPage />} />
            <Route path="/checkin" element={<CheckIn />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  )
}
