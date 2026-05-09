import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    position: '',
    password: '',
  });

  // =========================
  // LOAD USERS (CLEAN EFFECT)
  // =========================
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);

        const result = await adminAPI.getAllUsers();

        setUsers(result?.users || []);
      } catch {
        toast.error('Error fetching users');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  // =========================
  // FORM HANDLER
  // =========================
  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      department: '',
      position: '',
      password: '',
    });

    setEditingUser(null);
  };

  const openEditModal = (user) => {
    setEditingUser(user);

    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      department: user?.department || '',
      position: user?.position || '',
      password: '',
    });

    setShowModal(true);
  };

  // =========================
  // SUBMIT (CREATE / UPDATE)
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingUser) {
        await adminAPI.updateUser(editingUser.id, formData);
        toast.success('User updated');
      } else {
        await fetch(
          `${import.meta.env.VITE_API_URL}/auth/register`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          }
        );

        toast.success('User created');
      }

      setShowModal(false);
      resetForm();

      // reload list
      const result = await adminAPI.getAllUsers();
      setUsers(result?.users || []);
    } catch (error) {
      toast.error(error?.message || 'Something went wrong');
    }
  };

  // =========================
  // ACTIONS
  // =========================
  const handleDelete = async (id) => {
    if (!confirm('Delete this user?')) return;

    try {
      await adminAPI.deleteUser(id);
      toast.success('User deleted');

      const result = await adminAPI.getAllUsers();
      setUsers(result?.users || []);
    } catch {
      toast.error('Delete failed');
    }
  };

  const toggleStatus = async (user) => {
    try {
      await adminAPI.updateUser(user.id, {
        is_active: !user.is_active,
      });

      toast.success('Status updated');

      const result = await adminAPI.getAllUsers();
      setUsers(result?.users || []);
    } catch {
      toast.error('Update failed');
    }
  };

  // =========================
  // UI
  // =========================
  if (loading) return <div>Loading users...</div>;

  return (
    <div className="manage-users">

      {/* HEADER */}
      <div className="page-header">
        <h2>Manage Users</h2>

        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          Add User
        </button>
      </div>

      {/* TABLE */}
      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Position</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user?.name}</td>
                <td>{user?.email}</td>
                <td>{user?.department}</td>
                <td>{user?.position}</td>

                <td>
                  <span
                    className={`status-badge ${
                      user.is_active ? 'active' : 'inactive'
                    }`}
                  >
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>

                <td>
                  <button onClick={() => openEditModal(user)}>
                    Edit
                  </button>

                  <button onClick={() => toggleStatus(user)}>
                    {user.is_active ? 'Deactivate' : 'Activate'}
                  </button>

                  <button onClick={() => handleDelete(user.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>
              {editingUser ? 'Edit User' : 'Create User'}
            </h3>

            <form onSubmit={handleSubmit}>
              <input
                name="name"
                placeholder="Name"
                value={formData.name}
                onChange={handleChange}
              />

              <input
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
              />

              <input
                name="department"
                placeholder="Department"
                value={formData.department}
                onChange={handleChange}
              />

              <input
                name="position"
                placeholder="Position"
                value={formData.position}
                onChange={handleChange}
              />

              {!editingUser && (
                <input
                  name="password"
                  type="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                />
              )}

              <div className="modal-actions">
                <button type="submit">
                  {editingUser ? 'Update' : 'Create'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}