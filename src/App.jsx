// App.jsx
import { Routes, Route } from 'react-router-dom';
import Login from './pages/auth/login';        // lowercase 'login'
import AdminDashboard from './pages/admin/admindashboard';  // lowercase 'admindashboard'
import UserDashboard from './pages/users/userdashboard';   // 'users' not 'user'

function App() {
  console.log('App is rendering'); // Check console for this
  
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/user" element={<UserDashboard />} />
    </Routes>
  );
}

export default App;