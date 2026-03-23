import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Inbound from './pages/Inbound';
import Outbound from './pages/Outbound';
import CurrentStock from './pages/CurrentStock';
import Ledger from './pages/Ledger';
import Closing from './pages/Closing';
import History from './pages/History';
import SetupPassword from './pages/SetupPassword';
import AdminAccounts from './pages/AdminAccounts';
import ChangePassword from './pages/ChangePassword';
import { getDefaultRouteForRole, getStoredRole, getStoredToken, requiresPasswordSetup } from './utils/auth-session';

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
  return <Navigate to={requiresPasswordSetup() ? '/setup-password' : getDefaultRouteForRole(getStoredRole())} replace />;
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
  return getStoredRole() === 'SUPER_ADMIN' ? children : <Navigate to={getDefaultRouteForRole(getStoredRole())} replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/setup-password" element={<PasswordSetupRoute><SetupPassword /></PasswordSetupRoute>} />

        <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
          <Route index element={<Navigate to={getDefaultRouteForRole(getStoredRole())} replace />} />
          <Route path="inbound" element={<Inbound />} />
          <Route path="outbound" element={<Outbound />} />
          <Route path="stock/current" element={<CurrentStock />} />
          <Route path="stock/ledger" element={<Ledger />} />
          <Route path="closing" element={<Closing />} />
          <Route path="history" element={<History />} />
          <Route path="account/password" element={<ChangePassword />} />
          <Route path="admin/accounts" element={<SuperAdminRoute><AdminAccounts /></SuperAdminRoute>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
