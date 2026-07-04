import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppBarComponent from './components/Appbar';
import LoginPage from './components/pages/LoginPage';
import RegisterPage from './components/pages/RegisterPage';
import MainWorkersPage from './components/pages/MainWorkersPage';
import SupervisorsPage from './components/pages/SupervisorsPage';
import CarsTodayPage from './components/pages/Home';
import AddCarPage from './components/pages/AddCar';
import ManageCarsPage from './components/pages/ManageCars';
import AvailableWorkersPage from './components/pages/AvailableWorkersPage';
import LocationManager from './components/pages/LocationManager';
import WokerAssignment from './components/pages/WokerAssignment';
import RepairHistoryPage from './components/pages/RepairHistoryPage';
import WorkerRevenueChart from './components/pages/WorkerRevenueChart';
import WorkerKpiPage from './components/pages/WorkerKpiPage';
import WeeklyPraiseForm from './components/pages/WeeklyPraiseForm';
import WeeklyWarningForm from './components/pages/WeeklyWarningForm';
import TeamManagement from './components/pages/TeamManagement';
import UserManagement from './components/pages/UserManagement';
import AccountPermissionsPage from './components/pages/AccountPermissionsPage';
import OperationHistoryPage from './components/pages/OperationHistoryPage';
import { hasPermission } from './utils/permissions';

const RequireAuth = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
};

const PermissionRoute = ({ permission, children }) => {
  const { user } = useAuth();

  if (!user || !hasPermission(user, permission)) {
    return <Navigate to="/cars" replace />;
  }

  return children;
};

const AppLayout = () => (
  <>
    <AppBarComponent />
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Routes>
        <Route path="/" element={<Navigate to="/cars" />} />
        <Route path="/cars" element={<PermissionRoute permission="cars.today"><CarsTodayPage /></PermissionRoute>} />
        <Route path="/cars/add" element={<PermissionRoute permission="cars.add"><AddCarPage /></PermissionRoute>} />
        <Route path="/cars/manage" element={<PermissionRoute permission="cars.manage"><ManageCarsPage /></PermissionRoute>} />
        <Route path="/workers/main" element={<PermissionRoute permission="workers.main"><MainWorkersPage /></PermissionRoute>} />
        <Route path="/workers/available" element={<PermissionRoute permission="workers.available"><AvailableWorkersPage /></PermissionRoute>} />
        <Route path="/workers/kpi" element={<PermissionRoute permission="workers.kpi"><WorkerKpiPage /></PermissionRoute>} />
        <Route path="/workers/revenue-chart" element={<PermissionRoute permission="reports.revenue"><WorkerRevenueChart /></PermissionRoute>} />
        <Route path="/workers/weekly-praise" element={<PermissionRoute permission="reports.praise"><WeeklyPraiseForm /></PermissionRoute>} />
        <Route path="/workers/weekly-warning" element={<PermissionRoute permission="reports.warning"><WeeklyWarningForm /></PermissionRoute>} />
        <Route path="/woker" element={<PermissionRoute permission="workers.woker"><WokerAssignment /></PermissionRoute>} />
        <Route path="/repair-history" element={<PermissionRoute permission="workers.repair-history"><RepairHistoryPage /></PermissionRoute>} />
        <Route path="/locations" element={<PermissionRoute permission="system.locations"><LocationManager /></PermissionRoute>} />
        <Route path="/supervisors" element={<PermissionRoute permission="system.supervisors"><SupervisorsPage /></PermissionRoute>} />
        <Route path="/teams" element={<PermissionRoute permission="teams.manage"><TeamManagement /></PermissionRoute>} />
        <Route path="/users" element={<PermissionRoute permission="system.users"><UserManagement /></PermissionRoute>} />
        <Route path="/account-permissions" element={<PermissionRoute permission="system.permissions"><AccountPermissionsPage /></PermissionRoute>} />
        <Route path="/audit-logs" element={<PermissionRoute permission="system.audit-logs"><OperationHistoryPage /></PermissionRoute>} />
        <Route path="*" element={<Navigate to="/cars" />} />
      </Routes>
    </Box>
  </>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/*"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
