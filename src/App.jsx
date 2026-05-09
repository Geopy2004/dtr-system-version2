import { Routes, Route } from 'react-router-dom';
import Login from "./pages/auth/login";
import AdminDashboard from "./pages/admin/admindashboard";
import UserDashboard from "./pages/users/userdashboard";  
function App() {
  console.log('App is rendering');
  
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/user/dashboard" element={<UserDashboard />} />
    </Routes>
  );
}

export default App;