import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Residents from './pages/Residents';
import Projects from './pages/Projects';
import Officials from './pages/Officials';
import Sessions from './pages/Sessions';
import Documents from './pages/Documents';
import Profile from './pages/Profile';
import Archives from './pages/Archives';
import ActivityLog from './pages/ActivityLog';
import Demographics from './pages/Demographics';

function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CssBaseline />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Navigate to="/login" replace />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
          <Route
            path="residents"
            element={
              <PrivateRoute adminOnly>
                <Residents />
              </PrivateRoute>
            }
          />
          <Route
            path="projects"
            element={
              <PrivateRoute adminOnly>
                <Projects />
              </PrivateRoute>
            }
          />
          <Route
            path="sessions"
            element={
              <PrivateRoute adminOnly>
                <Sessions />
              </PrivateRoute>
            }
          />
          <Route path="officials" element={<Officials />} />
          <Route path="documents" element={<Documents />} />
          <Route path="profile" element={<Profile />} />
            <Route
              path="archives"
              element={
                <PrivateRoute adminOnly>
                  <Archives />
                </PrivateRoute>
              }
            />
            <Route
              path="activity-log"
              element={
                <PrivateRoute adminOnly>
                  <ActivityLog />
                </PrivateRoute>
              }
            />
            <Route
              path="demographics"
              element={
                <PrivateRoute adminOnly>
                  <Demographics />
                </PrivateRoute>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
