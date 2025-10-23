import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/fav_logo.png";
import "./StudentDashboard.css";
import "./StudentProfile.css";
import { api } from "../../api";

const StudentProfile = () => {
  const navigate = useNavigate();
  const userName = localStorage.getItem("userName") || "Guest";

  const [profile, setProfile] = useState({
    fullName: "Izzy Lasala",
    studentId: "12345",
    email: "izzy@email.com",
    contactNumber: "0912-345-6789",
    courseYear: "BS CS, 2nd Year",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("studentProfile");
    if (saved) {
      try { setProfile(JSON.parse(saved)); } catch (e) {}
    }
    // Fetch current user profile from API if token present
    api.get('/api/auth/me').then(({ data }) => {
      if (data && data.fullName) {
        setProfile(p => ({
          ...p,
          fullName: data.fullName,
          studentId: data.studentId,
          email: data.email
        }));
      }
    }).catch(() => {});
    const onDocClick = (e) => {
      const target = e.target;
      if (!target.closest || !target.closest('.header-right')) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    navigate("/signin");
  };

  const handleViewProfile = () => {
    setMenuOpen(false);
    // already on profile; no-op
  };

  const handleEditProfile = () => setIsEditing(true);

  const handleSaveProfile = () => {
    localStorage.setItem("studentProfile", JSON.stringify(profile));
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    const saved = localStorage.getItem("studentProfile");
    if (saved) {
      try { setProfile(JSON.parse(saved)); } catch {}
    }
    setIsEditing(false);
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

      <div className="student-dashboard full-width">
        <button className="top-back-btn" onClick={() => navigate("/student/dashboard")}>
          ←
        </button>

        <div className="profile-container">
          <div className="profile-card">
            <div className="profile-header">
              <h2>View My Profile</h2>
              {!isEditing ? (
                <button className="edit-profile-btn" onClick={handleEditProfile}>Edit Profile</button>
              ) : (
                <div className="edit-actions">
                  <button className="save-btn" onClick={handleSaveProfile}>Save</button>
                  <button className="cancel-btn" onClick={handleCancelEdit}>Cancel</button>
                </div>
              )}
            </div>

            <div className="profile-overview">
              <h3 className="profile-name">{profile.fullName}</h3>
              <p>Student ID: {profile.studentId}</p>
              <p>Email: {profile.email}</p>
              <hr />
            </div>

            <div className="profile-section">
              <h4>Personal Information:</h4>
              <div className="profile-field">
                <label>Full Name:</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  />
                ) : (
                  <span>{profile.fullName}</span>
                )}
              </div>
              <div className="profile-field">
                <label>Contact Number:</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.contactNumber}
                    onChange={(e) => setProfile({ ...profile, contactNumber: e.target.value })}
                  />
                ) : (
                  <span>{profile.contactNumber}</span>
                )}
              </div>
            </div>

            <div className="profile-section">
              <h4>Academic Information:</h4>
              <div className="profile-field">
                <label>Course / Year:</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.courseYear}
                    onChange={(e) => setProfile({ ...profile, courseYear: e.target.value })}
                  />
                ) : (
                  <span>{profile.courseYear}</span>
                )}
              </div>
              <div className="profile-field">
                <label>Student ID:</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.studentId}
                    onChange={(e) => setProfile({ ...profile, studentId: e.target.value })}
                  />
                ) : (
                  <span>{profile.studentId}</span>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
