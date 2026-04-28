import React from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Skeleton from './components/Skeleton';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import type { PagePermissionKey } from './types/api';
import {
  getDefaultRouteForRole,
  getStoredRole,
  getStoredToken,
  hasStoredPagePermission,
  requiresPasswordSetup,
} from './utils/auth-session';

const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Inbound = React.lazy(() => import('./pages/Inbound'));
const Outbound = React.lazy(() => import('./pages/Outbound'));
const CurrentStock = React.lazy(() => import('./pages/CurrentStock'));
const Ledger = React.lazy(() => import('./pages/Ledger'));
const Closing = React.lazy(() => import('./pages/Closing'));
const History = React.lazy(() => import('./pages/History'));
const SetupPassword = React.lazy(() => import('./pages/SetupPassword'));
const AdminAccounts = React.lazy(() => import('./pages/AdminAccounts'));
const ChangePassword = React.lazy(() => import('./pages/ChangePassword'));
const MasterData = React.lazy(() => import('./pages/MasterData'));
const Materials = React.lazy(() => import('./pages/Materials'));

interface PrivateRouteProps {
  children: React.ReactNode;
}

function PrivateRoute({ children }: PrivateRouteProps) {
  const token = getStoredToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (requiresPasswordSetup()) {
    return <Navigate to="/setup-password" replace />;
  }
  return children;
}

function GuestRoute({ children }: PrivateRouteProps) {
  if (!getStoredToken()) {
    return children;
  }
  return (
    <Navigate to={requiresPasswordSetup() ? '/setup-password' : getDefaultRouteForRole(getStoredRole())} replace />
  );
}

function PasswordSetupRoute({ children }: PrivateRouteProps) {
  if (!getStoredToken()) {
    return <Navigate to="/login" replace />;
  }
  if (!requiresPasswordSetup()) {
    return <Navigate to={getDefaultRouteForRole(getStoredRole())} replace />;
  }
  return children;
}

function SuperAdminRoute({ children }: PrivateRouteProps) {
  return getStoredRole() === 'SUPER_ADMIN' ? (
    children
  ) : (
    <Navigate to={getDefaultRouteForRole(getStoredRole())} replace />
  );
}

function PermissionRoute({ children, permission }: PrivateRouteProps & { permission: PagePermissionKey }) {
  return hasStoredPagePermission(permission) ? (
    children
  ) : (
    <Navigate to={getDefaultRouteForRole(getStoredRole())} replace />
  );
}

function App() {
  return (
    <Router>
      <React.Suspense fallback={<Skeleton />}>
        <ErrorBoundary>
          <Routes>
            <Route
              path="/login"
              element={
                <GuestRoute>
                  <Login />
                </GuestRoute>
              }
            />
            <Route
              path="/register"
              element={
                <GuestRoute>
                  <Register />
                </GuestRoute>
              }
            />
            <Route
              path="/verify-email"
              element={
                <GuestRoute>
                  <VerifyEmail />
                </GuestRoute>
              }
            />
            <Route
              path="/setup-password"
              element={
                <PasswordSetupRoute>
                  <SetupPassword />
                </PasswordSetupRoute>
              }
            />

            <Route
              path="/"
              element={
                <PrivateRoute>
                  <MainLayout />
                </PrivateRoute>
              }
            >
              <Route index element={<Navigate to={getDefaultRouteForRole(getStoredRole())} replace />} />
              <Route
                path="dashboard"
                element={
                  <PermissionRoute permission="DASHBOARD">
                    <Dashboard />
                  </PermissionRoute>
                }
              />
              <Route
                path="inbound"
                element={
                  <PermissionRoute permission="INBOUND">
                    <Inbound />
                  </PermissionRoute>
                }
              />
              <Route
                path="outbound"
                element={
                  <PermissionRoute permission="OUTBOUND">
                    <Outbound />
                  </PermissionRoute>
                }
              />
              <Route
                path="stock/current"
                element={
                  <PermissionRoute permission="CURRENT_STOCK">
                    <CurrentStock />
                  </PermissionRoute>
                }
              />
              <Route
                path="stock/ledger"
                element={
                  <PermissionRoute permission="STOCK_LEDGER">
                    <Ledger />
                  </PermissionRoute>
                }
              />
              <Route
                path="closing"
                element={
                  <PermissionRoute permission="CLOSING">
                    <Closing />
                  </PermissionRoute>
                }
              />
              <Route
                path="history"
                element={
                  <PermissionRoute permission="HISTORY">
                    <History />
                  </PermissionRoute>
                }
              />
              <Route
                path="master-data"
                element={
                  <PermissionRoute permission="MASTER_DATA">
                    <MasterData />
                  </PermissionRoute>
                }
              />
              <Route
                path="materials"
                element={
                  <PermissionRoute permission="MASTER_DATA">
                    <Materials />
                  </PermissionRoute>
                }
              />
              <Route path="account/password" element={<ChangePassword />} />
              <Route
                path="admin/accounts"
                element={
                  <SuperAdminRoute>
                    <AdminAccounts />
                  </SuperAdminRoute>
                }
              />
            </Route>
          </Routes>
        </ErrorBoundary>
      </React.Suspense>
    </Router>
  );
}

export default App;
