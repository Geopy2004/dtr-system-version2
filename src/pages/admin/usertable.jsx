export default function UserTable({ users = [], onEdit, onDelete, onToggle }) {
  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Department</th>
            <th>Position</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan="6">No users found</td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.department}</td>
                <td>{user.position}</td>
                <td>{user.role || 'employee'}</td>
                <td>{user.is_active ? 'Active' : 'Inactive'}</td>

                <td>
                  <button onClick={() => onEdit(user)}>Edit</button>
                  <button onClick={() => onToggle(user)}>
                    {user.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => onDelete(user.id)}>Delete</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}