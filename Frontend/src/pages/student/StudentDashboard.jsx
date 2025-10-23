import React, { useEffect, useState } from "react";
import bookIcon from "../../assets/books2.png";
import browseIcon from "../../assets/library.png";
import clockIcon from "../../assets/clock.png";
import overdueIcon from "../../assets/ex.png";
import "./StudentDashboard.css";
import "./StudentCard.css";
import logo from "../../assets/fav_logo.png";
import { Link, useNavigate } from "react-router-dom"; 

const StudentDashboard = () => {
  const [userName, setUserName] = useState(localStorage.getItem("userName") || "Guest");
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    if (storedName) setUserName(storedName);
    const onDocClick = (e) => {
      // close menu if clicking outside of header-right
      const target = e.target;
      if (!target.closest || !target.closest('.header-right')) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleLogout = () => {
    // Clear session data
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    // Redirect to sign-in page
    navigate("/signin");
  };

  const handleViewProfile = () => {
    setMenuOpen(false);
    navigate('/student/profile');
  };

  return (
    <div className="student-dashboard-container">
      {/* Header */}
      <header className="student-header">
        <div className="header-left">
          <img src={logo} alt="Logo" className="header-logo" />
          <h2 className="header-title">LibReport</h2>
        </div>
        <div className="header-right">
          <div className="user-menu">
            <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)}>
              Hi, {userName}! <span className="caret">▾</span>
            </button>
            {menuOpen && (
              <div className="dropdown-menu">
                <button className="dropdown-item" onClick={handleViewProfile}>View Profile</button>
                <button className="dropdown-item logout" onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Dashboard Section */}
      <div className="student-dashboard">
        <div className="dashboard-cards-container">
          <Link to="/student/books-borrowed" className="no-link-style">
            <div className="student-card">
              <img src={bookIcon} alt="Books Borrowed" className="student-card-icon" />
              <p className="student-card-title">Books Borrowed</p>
            </div>
          </Link>
          
          <Link to="/student/browse-library" className="no-link-style">
            <div className="student-card">
              <img src={browseIcon} alt="Browse Library" className="student-card-icon" />
              <p className="student-card-title">Browse Library</p>
            </div>
          </Link>
          
          <Link to="/student/library-hours" className="no-link-style">
            <div className="student-card">
              <img src={clockIcon} alt="Library Hours" className="student-card-icon" />
              <p className="student-card-title">Library Hours</p>
            </div>
          </Link>
          
          <Link to="/student/overdue-books" className="no-link-style">
            <div className="student-card">
              <img src={overdueIcon} alt="Overdue Books" className="student-card-icon" />
              <p className="student-card-title">Overdue Books</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;