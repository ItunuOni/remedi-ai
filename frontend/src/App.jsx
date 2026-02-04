import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DoctorDashboard from './pages/DoctorDashboard'; // <--- New Import

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* The "Home" Page */}
        <Route path="/" element={<Landing />} />
        
        {/* The Login/Signup Page */}
        <Route path="/login" element={<Login />} />
        
        {/* The Private Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* The Doctor Dashboard (New Route) */}
        <Route path="/doctor" element={<DoctorDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;