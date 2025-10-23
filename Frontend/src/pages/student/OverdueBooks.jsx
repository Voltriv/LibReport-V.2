import React, { useEffect, useState } from "react";
import logo from "../../assets/fav_logo.png";
import overdueIcon from "../../assets/ex.png";
import { useNavigate } from "react-router-dom";
import "./StudentDashboard.css";
import "./OverdueBooks.css";
import { fetchStudentBorrowed, getUserId } from "../../api";

const OverdueBooks = () => {
  const navigate = useNavigate();
  const userName = localStorage.getItem("userName") || "Guest";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    navigate("/signin");
  };

  // eme lng
  const overdueBooks = [
    { 
        id: 1, 
        title: "Money, Credit, and Crises", 
        dueDate: "October 9, 2025", 
        daysOverdue: 5 
    },
    { 
        id: 2, 
        title: "The Contested Territory of Architectural Theory", 
        dueDate: "October 12, 2025", 
        daysOverdue: 2 
    }
  ];

  const [overdueBooksState, setOverdueBooksState] = useState([]);

  useEffect(() => {
    const uid = getUserId();
    if (!uid) return;
    fetchStudentBorrowed(uid).then(items => {
      const now = new Date();
      const over = items.filter(x => new Date(x.dueAt) < now).map((x, i) => ({
        id: i + 1,
        title: x.title,
        author: x.author,
        dueDate: new Date(x.dueAt).toLocaleDateString(),
        daysOverdue: Math.ceil((now - new Date(x.dueAt)) / 86400000)
      }));
      setOverdueBooksState(over);
    }).catch(() => {});
  }, []);

  return (
    <div className="student-dashboard-container">
      {/* Header */}
      <header className="student-header">
        <div className="header-left">
          <img src={logo} alt="Logo" className="header-logo" />
          <h2 className="header-title">OVERDUE BOOKS</h2>
        </div>
        <div className="header-right">
          <span className="student-name">Hi, {userName}!</span>
        </div>
      </header>

      {/* Content */}
      <div className="student-dashboard full-width">
        <button className="top-back-btn" onClick={() => navigate("/student/dashboard")}>
          ← 
        </button>
        
        <div className="overdue-books-container">
          <div className="overdue-books-card">
            <div className="overdue-books-header">
              <img src={overdueIcon} alt="Overdue" className="overdue-icon" />
              <h2>Your Overdue Books</h2>
            </div>
            
            {overdueBooksState.length > 0 ? (
              <div className="overdue-books-table">
                <table>
                  <thead>
                    <tr>
                      <th>Book Title</th>
                      <th>Author</th>
                      <th>Due Date</th>
                      <th>Days Overdue</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdueBooksState.map((book) => (
                      <tr key={book.id}>
                        <td>{book.title}</td>
                        <td>{book.author}</td>
                        <td>{book.dueDate}</td>
                        <td>{book.daysOverdue}</td>
                        <td>
                          <span className="status-badge status-overdue">Overdue</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="no-overdue-books">
                <p>You don't have any overdue books. Great job!</p>
              </div>
            )}
            
            <div className="overdue-books-note">
              <p>Note: Please return overdue books as soon as possible to avoid additional fees.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverdueBooks;
