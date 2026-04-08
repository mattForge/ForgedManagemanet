/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { NotificationProvider } from './context/NotificationContext';
import SteelToast from './components/ui/SteelToast';
import PageLoader from './components/ui/PageLoader';

// Lazy load page components
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
const PlatformAdmin = lazy(() => import('./pages/PlatformAdmin'));
const WorkspaceAdmin = lazy(() => import('./pages/WorkspaceAdmin'));
import Workspace from './pages/Workspace';
const HRDashboard = lazy(() => import('./pages/hr/HRDashboard'));

export default function App() {
  return (
    <NotificationProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/platform-admin" element={<PlatformAdmin />} />
            <Route path="/workspace-admin" element={<WorkspaceAdmin />} />
            <Route path="/hr-dashboard" element={<HRDashboard />} />
            <Route path="/workspace" element={<Workspace />} />
          </Routes>
        </Suspense>
        <SteelToast />
      </BrowserRouter>
    </NotificationProvider>
  );
}
