import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppBarComponent from './components/Appbar';
import AdminLayout from './components/admin/AdminLayout';
import LoginPage from './components/pages/LoginPage';
import RegisterPage from './components/pages/RegisterPage';
import KtvReadNotificationListener from './components/common/KtvReadNotificationListener';
import KtvInboxNotificationListener from './components/common/KtvInboxNotificationListener';
import {
  hasPermission,
  getFirstAllowedPath,
  canAccessAdminArea,
  getAdminPathForPermission,
} from './utils/permissions';

/** Lazy pages — giảm JS tải lần đầu; UI trang không đổi */
const MainWorkersPage = lazy(() => import('./components/pages/MainWorkersPage'));
const SupervisorsPage = lazy(() => import('./components/pages/SupervisorsPage'));
const CarsTodayPage = lazy(() => import('./components/pages/Home'));
const AddCarPage = lazy(() => import('./components/pages/AddCar'));
const ManageCarsPage = lazy(() => import('./components/pages/ManageCars'));
const AvailableWorkersPage = lazy(() => import('./components/pages/AvailableWorkersPage'));
const LocationManager = lazy(() => import('./components/pages/LocationManager'));
const WokerAssignment = lazy(() => import('./components/pages/WokerAssignment'));
const RepairHistoryPage = lazy(() => import('./components/pages/RepairHistoryPage'));
const WorkerRevenueChart = lazy(() => import('./components/pages/WorkerRevenueChart'));
const AdminDashboardPage = lazy(() => import('./components/pages/AdminDashboardPage'));
const WeeklyPraiseForm = lazy(() => import('./components/pages/WeeklyPraiseForm'));
const WeeklyWarningForm = lazy(() => import('./components/pages/WeeklyWarningForm'));
const TeamManagement = lazy(() => import('./components/pages/TeamManagement'));
const UserManagement = lazy(() => import('./components/pages/UserManagement'));
const AccountPermissionsPage = lazy(() => import('./components/pages/AccountPermissionsPage'));
const OperationHistoryPage = lazy(() => import('./components/pages/OperationHistoryPage'));
const KtvMessagesPage = lazy(() => import('./components/pages/KtvMessagesPage'));
const PayrollPage = lazy(() => import('./components/pages/PayrollPage'));
const AttendancePayrollPage = lazy(() => import('./components/pages/AttendancePayrollPage'));

const RouteFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
    <CircularProgress size={32} />
  </Box>
);

const withSuspense = (node) => (
  <Suspense fallback={<RouteFallback />}>{node}</Suspense>
);

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
    return <Navigate to={getFirstAllowedPath(user)} replace />;
  }

  return children;
};

const AdminOnlyRoute = ({ children }) => {
  const { user } = useAuth();

  if (!canAccessAdminArea(user)) {
    return <Navigate to={getFirstAllowedPath(user)} replace />;
  }

  return children;
};

/** Admin mở URL cũ → chuyển sang /admin/... ; giám sát giữ page trên app chính. */
const PreferAdminPath = ({ permission, children }) => {
  const { user } = useAuth();
  const adminPath = getAdminPathForPermission(permission);

  if (canAccessAdminArea(user) && adminPath) {
    return <Navigate to={adminPath} replace />;
  }

  return children;
};

const AppShell = () => {
  const { user } = useAuth();

  return (
    <>
      <AppBarComponent />
      <KtvReadNotificationListener user={user} />
      <KtvInboxNotificationListener user={user} />
      <Box component="main">
        <Outlet />
      </Box>
    </>
  );
};

const AdminShell = () => {
  const { user } = useAuth();

  return (
    <AdminOnlyRoute>
      <KtvReadNotificationListener user={user} />
      <KtvInboxNotificationListener user={user} />
      <AdminLayout />
    </AdminOnlyRoute>
  );
};

const AppLayout = () => (
  <Routes>
    <Route element={<AppShell />}>
      <Route path="/" element={<Navigate to="/cars" replace />} />
      <Route path="/cars" element={withSuspense(<PermissionRoute permission="cars.today"><CarsTodayPage /></PermissionRoute>)} />
      <Route path="/cars/add" element={withSuspense(<PermissionRoute permission="cars.add"><AddCarPage /></PermissionRoute>)} />
      <Route path="/cars/manage" element={withSuspense(<PermissionRoute permission="cars.manage"><ManageCarsPage /></PermissionRoute>)} />
      <Route path="/workers/available" element={withSuspense(<PermissionRoute permission="workers.available"><AvailableWorkersPage /></PermissionRoute>)} />
      <Route path="/workers/revenue-chart" element={withSuspense(<PermissionRoute permission="reports.revenue"><WorkerRevenueChart /></PermissionRoute>)} />
      <Route path="/workers/weekly-praise" element={withSuspense(<PermissionRoute permission="reports.praise"><WeeklyPraiseForm /></PermissionRoute>)} />
      <Route path="/workers/weekly-warning" element={withSuspense(<PermissionRoute permission="reports.warning"><WeeklyWarningForm /></PermissionRoute>)} />
      <Route path="/woker" element={withSuspense(<PermissionRoute permission="workers.woker"><WokerAssignment /></PermissionRoute>)} />
      <Route path="/repair-history" element={withSuspense(<PermissionRoute permission="workers.repair-history"><RepairHistoryPage /></PermissionRoute>)} />

      <Route
        path="/workers/main"
        element={withSuspense(
          <PermissionRoute permission="workers.main">
            <PreferAdminPath permission="workers.main">
              <MainWorkersPage />
            </PreferAdminPath>
          </PermissionRoute>
        )}
      />
      <Route
        path="/teams"
        element={withSuspense(
          <PermissionRoute permission="teams.manage">
            <PreferAdminPath permission="teams.manage">
              <TeamManagement />
            </PreferAdminPath>
          </PermissionRoute>
        )}
      />
      <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/system" element={<Navigate to="/admin" replace />} />
      <Route path="/locations" element={<Navigate to="/admin/locations" replace />} />
      <Route path="/supervisors" element={<Navigate to="/admin/supervisors" replace />} />
      <Route path="/users" element={<Navigate to="/admin/users" replace />} />
      <Route path="/account-permissions" element={<Navigate to="/admin/account-permissions" replace />} />
      <Route path="/audit-logs" element={<Navigate to="/admin/audit-logs" replace />} />
      <Route path="/ktv-messages" element={<Navigate to="/admin/ktv-messages" replace />} />
      <Route path="/payroll" element={<Navigate to="/admin/payroll" replace />} />
      <Route path="/attendance-payroll" element={<Navigate to="/admin/attendance-payroll" replace />} />

      <Route path="*" element={<Navigate to="/cars" replace />} />
    </Route>
  </Routes>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/admin"
            element={(
              <RequireAuth>
                <AdminShell />
              </RequireAuth>
            )}
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={withSuspense(<PermissionRoute permission="reports.dashboard"><AdminDashboardPage /></PermissionRoute>)} />
            <Route path="workers" element={withSuspense(<PermissionRoute permission="workers.main"><MainWorkersPage /></PermissionRoute>)} />
            <Route path="teams" element={withSuspense(<PermissionRoute permission="teams.manage"><TeamManagement /></PermissionRoute>)} />
            <Route path="locations" element={withSuspense(<PermissionRoute permission="system.locations"><LocationManager /></PermissionRoute>)} />
            <Route path="supervisors" element={withSuspense(<PermissionRoute permission="system.supervisors"><SupervisorsPage /></PermissionRoute>)} />
            <Route path="users" element={withSuspense(<PermissionRoute permission="system.users"><UserManagement /></PermissionRoute>)} />
            <Route path="account-permissions" element={withSuspense(<PermissionRoute permission="system.permissions"><AccountPermissionsPage /></PermissionRoute>)} />
            <Route path="audit-logs" element={withSuspense(<PermissionRoute permission="system.audit-logs"><OperationHistoryPage /></PermissionRoute>)} />
            <Route path="ktv-messages" element={withSuspense(<PermissionRoute permission="system.ktv-messages"><KtvMessagesPage /></PermissionRoute>)} />
            <Route path="payroll" element={withSuspense(<PermissionRoute permission="payroll.manage"><PayrollPage /></PermissionRoute>)} />
            <Route path="attendance-payroll" element={withSuspense(<PermissionRoute permission="payroll.day-work"><AttendancePayrollPage /></PermissionRoute>)} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
          <Route
            path="/*"
            element={(
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            )}
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
