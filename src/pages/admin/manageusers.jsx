import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import AppShell from '../../components/common/AppShell';
import { seedEmployees } from '../../data/platformSeed';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiUserCheck,
  FiUserX,
  FiX,
  FiMail,
  FiBriefcase,
  FiShield,
  FiUsers,
} from 'react-icons/fi';
import './manageusers.css';

const getUserName = (user) => user?.full_name || user?.name || 'Employee';
const getUserInitial = (user) => getUserName(user).slice(0, 1).toUpperCase();

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const departments = [
    'Human Resources',
    'Finance',
    'IT Department',
    'Operations',
    'Marketing',
    'Sales',
    'Customer Support',
    'Administration',
  ];

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    role: 'employee',
    password: '',
  });

  // =========================
  // LOAD USERS
  // =========================
  const loadUsers = async () => {
    try {
      setLoading(true);

      const result = await adminAPI.getAllUsers();
      setUsers(Array.isArray(result) ? result : result?.users || []);
    } catch (error) {
      console.warn('Admin users preview data loaded:', error?.message);
      setUsers(seedEmployees);
      toast.error('Using preview users while the database is unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // =========================
  // HANDLERS
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
      role: 'employee',
      password: '',
    });

    setEditingUser(null);
  };

  const openEditModal = (user) => {
    setEditingUser(user);

    setFormData({
      name: getUserName(user),
      email: user?.email || '',
      department: user?.department || user?.departments?.name || '',
      role: user?.role || 'employee',
      password: '',
    });

    setShowModal(true);
  };

  // =========================
  // SUBMIT
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingUser) {
        await adminAPI.updateUser(editingUser.id, {
          full_name: formData.name,
          department: formData.department,
          role: formData.role,
          is_active: editingUser.is_active !== false,
        });

        toast.success('User updated');
      } else {
        await adminAPI.createEmployee({
          full_name: formData.name,
          email: formData.email,
          department: formData.department,
          role: formData.role,
          password: formData.password,
        });

        toast.success('User created');
      }

      setShowModal(false);
      resetForm();
      await loadUsers();
    } catch (error) {
      toast.error(error?.message || 'Something went wrong');
    }
  };

  // =========================
  // ACTIONS
  // =========================
  const handleDelete = async (id) => {
    if (!confirm('Archive this user?')) return;

    try {
      await adminAPI.deleteUser(id);

      toast.success('User archived');
      await loadUsers();
    } catch {
      toast.error('Archive failed');
    }
  };

  const toggleStatus = async (user) => {
    try {
      await adminAPI.archiveUser(user.id, user.is_active === false);

      toast.success('Status updated');
      await loadUsers();
    } catch {
      toast.error('Update failed');
    }
  };

  // =========================
  // STATS
  // =========================
  const activeUsers = users.filter(
    (u) => u.is_active !== false
  ).length;

  const admins = users.filter(
    (u) => u.role === 'admin'
  ).length;

  // =========================
  // UI
  // =========================
  if (loading) {
    return (
      <AppShell>
        <div className="users-loading">
          <div className="loader"></div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="manage-users-page">

      {/* HEADER */}
      <div className="users-header">

        <div>
          <p className="section-tag">
            Administration
          </p>

          <h1>Manage Users</h1>

          <span>
            Control employee accounts, roles,
            and access
          </span>
        </div>

        <button
          className="btn-primary"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <FiPlus />
          Add User
        </button>

      </div>

      {/* STATS */}
      <div className="stats-grid">

        <div className="stat-card">
          <div className="stat-icon blue">
            <FiUsers />
          </div>

          <div>
            <h3>{users.length}</h3>
            <p>Total Users</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <FiUserCheck />
          </div>

          <div>
            <h3>{activeUsers}</h3>
            <p>Active Users</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <FiShield />
          </div>

          <div>
            <h3>{admins}</h3>
            <p>Admins</p>
          </div>
        </div>

      </div>

      {/* TABLE */}
      <div className="table-wrapper">

        <table className="modern-table">

          <thead>
            <tr>
              <th>User</th>
              <th>Department</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>

            {users.map((user) => (
              <tr key={user.id}>

                <td>
                  <div className="user-info">

                    <div className="avatar">
                      {getUserInitial(user)}
                    </div>

                    <div>
                      <h4>{getUserName(user)}</h4>
                      <span>{user?.email}</span>
                    </div>

                  </div>
                </td>

                <td>
                  {user?.department || user?.departments?.name || '-'}
                </td>

                <td>
                  <span
                    className={`role-badge ${
                      user.role === 'admin'
                        ? 'admin'
                        : 'employee'
                    }`}
                  >
                    {user?.role}
                  </span>
                </td>

                <td>
                  <span
                    className={`status-badge ${
                      user.is_active !== false
                        ? 'active'
                        : 'inactive'
                    }`}
                  >
                    {user.is_active !== false
                      ? 'Active'
                      : 'Inactive'}
                  </span>
                </td>

                <td>
                  <div className="action-buttons">

                    <button
                      className="icon-btn edit"
                      data-tooltip="Edit user"
                      onClick={() =>
                        openEditModal(user)
                      }
                    >
                      <FiEdit2 />
                    </button>

                    <button
                      className={`icon-btn ${
                        user.is_active !== false
                          ? 'warning'
                          : 'success'
                      }`}
                      data-tooltip={user.is_active !== false ? 'Deactivate user' : 'Activate user'}
                      onClick={() =>
                        toggleStatus(user)
                      }
                    >
                      {user.is_active !== false ? (
                        <FiUserX />
                      ) : (
                        <FiUserCheck />
                      )}
                    </button>

                    <button
                      className="icon-btn danger"
                      data-tooltip="Archive user"
                      onClick={() =>
                        handleDelete(user.id)
                      }
                    >
                      <FiTrash2 />
                    </button>

                  </div>
                </td>

              </tr>
            ))}

          </tbody>

        </table>

      </div>

      {/* MODAL */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowModal(false);
            resetForm();
          }}
        >

          <div
            className="modern-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>
                <h2>
                  {editingUser
                    ? 'Edit User'
                    : 'Create User'}
                </h2>

                <p>
                  Manage user information and
                  permissions
                </p>
              </div>

              <button
                className="close-btn"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                <FiX />
              </button>

            </div>

            <form onSubmit={handleSubmit}>

              <div className="form-grid">

                {/* NAME */}
                <div className="form-group">
                  <label>Name</label>

                  <div className="input-wrapper">
                    <FiUsers />

                    <input
                      name="name"
                      placeholder="Enter full name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                {/* EMAIL */}
                <div className="form-group">
                  <label>Email</label>

                  <div className="input-wrapper">
                    <FiMail />

                    <input
                      name="email"
                      type="email"
                      placeholder="Enter email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                {/* DEPARTMENT */}
                <div className="form-group">
                  <label>Department</label>

                  <div className="input-wrapper">
                    <FiBriefcase />

                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      required
                    >
                      <option value="">
                        Select Department
                      </option>

                      {departments.map(
                        (department) => (
                          <option
                            key={department}
                            value={department}
                          >
                            {department}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                {/* ROLE */}
                <div className="form-group">
                  <label>Role</label>

                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                  >
                    <option value="employee">
                      Employee
                    </option>

                    <option value="admin">
                      Admin
                    </option>
                  </select>
                </div>

                {/* PASSWORD */}
                {!editingUser && (
                  <div className="form-group">
                    <label>Password</label>

                    <input
                      name="password"
                      type="password"
                      placeholder="Create password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                  </div>
                )}

              </div>

              <div className="modal-actions">

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn-primary"
                >
                  {editingUser
                    ? 'Update User'
                    : 'Create User'}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      </div>
    </AppShell>
  );
}
