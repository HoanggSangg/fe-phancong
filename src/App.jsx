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
import CarWorkerHistoryPage from './components/pages/CarWorkerHistoryPage';
import WokerAssignment from './components/pages/WokerAssignment';
import RepairHistoryPage from './components/pages/RepairHistoryPage';
import WorkerRevenueChart from './components/pages/WorkerRevenueChart';
import WorkerKpiPage from './components/pages/WorkerKpiPage';
import WeeklyPraiseForm from './components/pages/WeeklyPraiseForm';
import WeeklyWarningForm from './components/pages/WeeklyWarningForm';
import TeamManagement from './components/pages/TeamManagement';
import UserManagement from './components/pages/UserManagement';
import OperationHistoryPage from './components/pages/OperationHistoryPage';

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

const RoleRoute = ({ roles, children }) => {
  const { user } = useAuth();

  if (roles && user && !roles.includes(user.role)) {
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
        <Route path="/cars" element={<CarsTodayPage />} />
        <Route path="/cars/add" element={<RoleRoute roles={['admin', 'giam_sat']}><AddCarPage /></RoleRoute>} />
        <Route path="/cars/manage" element={<RoleRoute roles={['admin', 'giam_sat', 'ktv']}><ManageCarsPage /></RoleRoute>} />
        <Route path="/cars/:id/history" element={<RoleRoute roles={['admin', 'giam_sat']}><CarWorkerHistoryPage /></RoleRoute>} />
        <Route path="/workers/main" element={<RoleRoute roles={['admin', 'giam_sat']}><MainWorkersPage /></RoleRoute>} />
        <Route path="/workers/available" element={<RoleRoute roles={['admin', 'giam_sat', 'ktv']}><AvailableWorkersPage /></RoleRoute>} />
        <Route path="/workers/kpi" element={<RoleRoute roles={['admin', 'giam_sat', 'ktv']}><WorkerKpiPage /></RoleRoute>} />
        <Route path="/workers/revenue-chart" element={<RoleRoute roles={['admin', 'giam_sat']}><WorkerRevenueChart /></RoleRoute>} />
        <Route path="/workers/weekly-praise" element={<RoleRoute roles={['admin', 'giam_sat']}><WeeklyPraiseForm /></RoleRoute>} />
        <Route path="/workers/weekly-warning" element={<RoleRoute roles={['admin', 'giam_sat']}><WeeklyWarningForm /></RoleRoute>} />
        <Route path="/woker" element={<RoleRoute roles={['admin', 'giam_sat', 'ktv']}><WokerAssignment /></RoleRoute>} />
        <Route path="/repair-history" element={<RoleRoute roles={['admin', 'giam_sat', 'ktv']}><RepairHistoryPage /></RoleRoute>} />
        <Route path="/locations" element={<RoleRoute roles={['admin']}><LocationManager /></RoleRoute>} />
        <Route path="/supervisors" element={<RoleRoute roles={['admin']}><SupervisorsPage /></RoleRoute>} />
        <Route path="/teams" element={<RoleRoute roles={['admin', 'giam_sat']}><TeamManagement /></RoleRoute>} />
        <Route path="/users" element={<RoleRoute roles={['admin']}><UserManagement /></RoleRoute>} />
        <Route path="/audit-logs" element={<RoleRoute roles={['admin']}><OperationHistoryPage /></RoleRoute>} />
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
