import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Layout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="app-layout">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>IB Networking</h2>
          <p>{user?.email}</p>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end>
            📊 Dashboard
          </NavLink>
          <NavLink to="/firms">
            🏢 Firms
          </NavLink>
          <NavLink to="/contacts">
            👥 Contacts
          </NavLink>
          <NavLink to="/compose">
            ✉️ Compose Email
          </NavLink>
          <NavLink to="/scheduled">
            📅 Scheduled Emails
          </NavLink>
          <NavLink to="/templates">
            📄 Templates
          </NavLink>
          <NavLink to="/settings">
            ⚙️ Settings
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="main-content">{children}</div>
    </div>
  );
}

export default Layout;
