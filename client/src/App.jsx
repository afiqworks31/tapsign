import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CreateRequest from './pages/CreateRequest';
import SignDocument from './pages/SignDocument';
import CheckStatus from './pages/CheckStatus';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<Navigate to="/create" replace />} />
                    <Route path="/create" element={<CreateRequest />} />
                    <Route path="/sign/:requestId" element={<SignDocument />} />
                    <Route path="/status/:requestId" element={<CheckStatus />} />
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route
                        path="/admin/dashboard"
                        element={
                            <ProtectedRoute>
                                <AdminDashboard />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
