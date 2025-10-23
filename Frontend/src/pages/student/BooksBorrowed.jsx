import React, { useEffect, useState } from "react";
import logo from "../../assets/fav_logo.png";
import bookIcon from "../../assets/books2.png";
import { useNavigate } from "react-router-dom";
import "./StudentDashboard.css";
import "./BooksBorrowed.css";
import { fetchStudentBorrowed, getUserId } from "../../api";

const BooksBorrowed = () => {
  const navigate = useNavigate();
  const userName = localStorage.getItem("userName") || "Guest";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    navigate("/signin");
  };

  // kineme
  const [borrowedBooks, setBorrowedBooks] = useState([
    { id: 1, title: " Fundamentals of Construction Estimating", author: "David Pratt", dueDate: "2025-11-15", status: "active" },
    { id: 2, title: "Reading Children's Literature", author: "Carrie Hintz", dueDate: "2025-11-20", status: "active" },
    { id: 3, title: "1984", author: "George Orwell", dueDate: "2023-11-10", status: "overdue" }
  ]);
  
  
  const [editingBookId, setEditingBookId] = useState(null);
  const [newDueDate, setNewDueDate] = useState("");

  
  const handleEditClick = (book) => {
    if (book.status === 'active') {
      setEditingBookId(book.id);
      setNewDueDate(book.dueDate);
    }
  };

  // Function to save the updated due date
  const handleSaveDueDate = (bookId) => {
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    

    const selectedDate = new Date(newDueDate);
    
    // Only save if the date is valid and in the future
    if (selectedDate && selectedDate >= today) {
      setBorrowedBooks(
        borrowedBooks.map((book) =>
          book.id === bookId ? { ...book, dueDate: newDueDate } : book
        )
      );
      setEditingBookId(null);
    } else {
      alert("Please select a future date. You cannot set due dates to today or past dates.");
    }
  };

  // cancel editing
  const handleCancelEdit = () => {
    setEditingBookId(null);
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="student-dashboard-container">
      {/* Header */}
      <header className="student-header">
        <div className="header-left">
          <img src={logo} alt="Logo" className="header-logo" />
          <h2 className="header-title">BOOKS BORROWED</h2>
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
        
        <div className="books-borrowed-container">
          <div className="books-borrowed-card">
            <div className="books-borrowed-header">
              <img src={bookIcon} alt="Books" className="books-icon" />
              <h2>Your Borrowed Books</h2>
            </div>
            
            {borrowedBooks.length > 0 ? (
              <div className="books-borrowed-table">
                <table>
                  <thead>
                    <tr>
                      <th>Book Title</th>
                      <th>Author</th>
                      <th>Due Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {borrowedBooks.map((book) => (
                      <tr key={book.id} className={book.status === 'overdue' ? 'overdue-row' : ''}>
                        <td>{book.title}</td>
                        <td>{book.author}</td>
                        <td>
                          {editingBookId === book.id ? (
                            <div className="date-input-container">
                              <input
                                type="date"
                                value={newDueDate}
                                onChange={(e) => {
                                  const selectedDate = new Date(e.target.value);
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  
                                  if (selectedDate >= today) {
                                    setNewDueDate(e.target.value);
                                  } else {
                                    // If user tries to select a past date, don't update the state
                                    alert("Please select a future date. Past dates are not allowed.");
                                  }
                                }}
                                min={new Date().toISOString().split('T')[0]}
                                className="due-date-input"
                              />
                              <small className="date-hint">Select a future date</small>
                            </div>
                          ) : (
                            formatDate(book.dueDate)
                          )}
                        </td>
                        <td>
                          <span className={`status-badge status-${book.status}`}>
                            {book.status.charAt(0).toUpperCase() + book.status.slice(1)}
                          </span>
                        </td>
                        <td>
                          {book.status === 'active' ? (
                            editingBookId === book.id ? (
                              <div className="edit-actions">
                                <button 
                                  className="save-btn" 
                                  onClick={() => handleSaveDueDate(book.id)}
                                >
                                  Save
                                </button>
                                <button 
                                  className="cancel-btn" 
                                  onClick={handleCancelEdit}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button 
                                className="edit-btn" 
                                onClick={() => handleEditClick(book)}
                              >
                                Edit Due Date
                              </button>
                            )
                          ) : (
                            <div className="overdue-message">
                              Return book to admin
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="no-borrowed-books">
                <p>You don't have any borrowed books at the moment.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BooksBorrowed;
