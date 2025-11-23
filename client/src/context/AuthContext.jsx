import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('adminToken'));
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('adminUser') || 'null'));

    const login = (newToken, userData) => {
        setToken(newToken);
        setUser(userData);
        localStorage.setItem('adminToken', newToken);
        localStorage.setItem('adminUser', JSON.stringify(userData));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
    };

    const isAuthenticated = () => {
        return !!token;
    };

    return (
        <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
};
