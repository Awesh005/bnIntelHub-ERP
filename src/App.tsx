import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';

// Pages & Views
import Login from './pages/Login';
import DashboardView from './components/DashboardView';
import ClientsView from './components/ClientsView';
import TeamView from './components/TeamView';

// Old components to be migrated
import ProjectsView from './components/ProjectsView';
import InvoicesView from './components/InvoicesView';
import QuotationsView from './components/QuotationsView';
import SettingsView from './components/SettingsView';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes inside AppLayout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardView />} />
              <Route path="/clients" element={<ClientsView />} />
              <Route path="/team" element={<TeamView />} />
              
              {/* These will be updated in the next batches */}
              <Route path="/projects" element={<ProjectsView />} />
              <Route path="/invoices" element={<InvoicesView />} />
              <Route path="/quotations" element={<QuotationsView />} />
              <Route path="/settings" element={<SettingsView />} />
              
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
