import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CalendarPage } from './pages/CalendarPage';
import { DashboardPage } from './pages/DashboardPage';
import { GardenDetailPage } from './pages/GardenDetailPage';
import { GardensPage } from './pages/GardensPage';
import { LibraryPage } from './pages/LibraryPage';
import { LibraryPlantPage } from './pages/LibraryPlantPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PlantDetailPage } from './pages/PlantDetailPage';
import { RegisterPage } from './pages/RegisterPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/gardens" element={<GardensPage />} />
        <Route path="/gardens/:id" element={<GardenDetailPage />} />
        <Route path="/gardens/:id/plants/:plantId" element={<PlantDetailPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/library/:id" element={<LibraryPlantPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
