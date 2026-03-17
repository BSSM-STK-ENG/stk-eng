import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Inbound from './pages/Inbound';
import Outbound from './pages/Outbound';
import CurrentStock from './pages/CurrentStock';
import Ledger from './pages/Ledger';
import Closing from './pages/Closing';
import History from './pages/History';

interface PrivateRouteProps {
  children: React.ReactNode;
}

function PrivateRoute({ children }: PrivateRouteProps) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/stock/current" replace />} />
          <Route path="inbound" element={<Inbound />} />
          <Route path="outbound" element={<Outbound />} />
          <Route path="stock/current" element={<CurrentStock />} />
          <Route path="stock/ledger" element={<Ledger />} />
          <Route path="closing" element={<Closing />} />
          <Route path="history" element={<History />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
