import React, { useEffect, useState } from "react";
import logo from "../../assets/fav_logo.png";
import browseIcon from "../../assets/library.png";
import { useNavigate } from "react-router-dom";
import "./StudentDashboard.css";
import "./BrowseLibrary.css";

import { getCoverForBook } from "./BookCoverSamples";

const BrowseLibrary = () => {
  const navigate = useNavigate();
  const userName = localStorage.getItem("userName") || "Guest";
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [selectedBook, setSelectedBook] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    navigate("/signin");
  };
                                       
  // Sample library books 
  const libraryBooks = [
    { id: 1, title: "Banking Business Models", author: "Rym Ayadi", genre: "Finance, Banking, Economics", available: true, isbn: "N/A", publishYear: 2018, pages: 300, description: "Definition, analytical framework, and financial stability assessment.", coverUrl: "/covers/banking.jpg" },
    { id: 2, title: "Investment Banking", author: "Joshua Rosenbaum", genre: "Finance, Banking, Economics", available: true, isbn: "978-1118656211", publishYear: 2013, pages: 448, description: "Valuation, Leveraged Buyouts, and Mergers & Acquisitions.", coverUrl: "/covers/investment.jpg" },
    { id: 3, title: "Money, Credit, and Crises", author: "Nektarios Michail", genre: "Finance, Banking, Economics", available: true, isbn: "978-0691178417", publishYear: 2017, pages: 320, description: "Understanding the Modern Banking System.", coverUrl: "/covers/money-credit-crises.svg" },
    { id: 4, title: "The Contested Territory of Architectural Theory", author: "Elie G. Haddad", genre: "Architecture, Design Theory, Urban Studies", available: true, isbn: "978-1138583115", publishYear: 2020, pages: 276, description: "Competing approaches and debates in architectural theory.", coverUrl: "/covers/contested-territory.svg" },
    { id: 5, title: "Philosophical Difference and Advanced Computation in Architectural Theory", author: "Jefferson Ellinger", genre: "Architecture, Design Theory, Urban Studies", available: false, isbn: "978-0367235543", publishYear: 2021, pages: 224, description: "Explores the intersection of philosophy and computational design.", coverUrl: "/covers/philosophical.jpg" },
    { id: 6, title: "Construction Estimating & Bidding", author: "Karl F. Schmid", genre: "Engineering, Construction Management", available: true, isbn: "978-0876290170", publishYear: 2011, pages: 240, description: "Theory and practice of construction cost estimating and bidding.", coverUrl: "/covers/construction.jpg" },
    { id: 7, title: "Fundamentals of Construction Estimating", author: "David Pratt", genre: "Engineering, Construction Management", available: false, isbn: "978-1439059647", publishYear: 2010, pages: 416, description: "Comprehensive guide to construction estimating principles.", coverUrl: "/covers/estimating.jpg" },
    { id: 8, title: "A Companion to Children's Literature", author: "Karen Coats", genre: "Literature, Education, Critical Theory", available: true, isbn: "978-1119038221", publishYear: 2020, pages: 608, description: "Explores the history and development of children's literature.", coverUrl: "/covers/companion.jpg" },
    { id: 9, title: "Reading Children's Literature", author: "Carrie Hintz", genre: "Literature, Education, Critical Theory", available: true, isbn: "978-1319465063", publishYear: 2019, pages: 552, description: "A critical approach to children's literature analysis.", coverUrl: "/covers/reading.jpg" }
  ];
  
  // Define available genres for filtering
  const genres = ["All", "Finance", "Banking", "Economics", "Architecture", "Design Theory", "Urban Studies", "Engineering", "Construction Management", "Literature", "Education", "Critical Theory"];

  // Filter books by search and genre (supports multi-genre strings)
  const filteredBooks = libraryBooks.filter(book => {
    const matchesSearch = (
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.isbn.includes(searchTerm)
    );

    const bookGenres = Array.isArray(book.genre)
      ? book.genre
      : String(book.genre).split(',').map(g => g.trim());

    const matchesGenre = selectedGenre === "All" || bookGenres.includes(selectedGenre);

    return matchesSearch && matchesGenre;
  });

  // yung mga penalty
  const penalties = {
    overdue: "₱20 per day overdue",
    lost: "Full replacement cost of the book plus ₱200 processing fee",
    damaged: "Assessment fee based on damage (₱50-₱500)"
  };

  return (
    <div className="student-dashboard-container">
      {/* Header */}
      <header className="student-header">
        <div className="header-left">
          <img src={logo} alt="Logo" className="header-logo" />
          <h2 className="header-title">BROWSE LIBRARY</h2>
        </div>
        <div className="header-right">
          <span className="student-name">Hi, {userName}!</span>
        </div>
      </header>

      {/* Content */}
      <div className="student-dashboard full-width">
        <div className="browse-library-container full-width">
          <button className="back-btn top-back-btn" onClick={() => navigate("/student/dashboard")}>
            ← 
          </button>
          
          <div className="browse-library-card">
            <div className="browse-library-header">
              <img src={browseIcon} alt="Browse" className="browse-icon" />
              <h2>Library Catalog</h2>
            </div>
            
            <div className="penalties-info">
              <h3>Technical Penalties:</h3>
              <ul>
                <li><strong>Overdue Books:</strong> {penalties.overdue}</li>
                <li><strong>Lost Books:</strong> {penalties.lost}</li>
                <li><strong>Damaged Books:</strong> {penalties.damaged}</li>
              </ul>
            </div>
            
            <div className="search-filter-container">
              <div className="search-container">
                <input 
                  type="text" 
                  placeholder="Search by title, author, or ISBN..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              
              <div className="genre-filter">
                <label htmlFor="genre-select">Genre:</label>
                <select 
                  id="genre-select" 
                  value={selectedGenre} 
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="genre-select"
                >
                  {genres.map(genre => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* GUIDE: Card Grid replaced the table for a modern look */}
            <div className="book-grid">
              {filteredBooks.map((book) => (
                <div className={`book-card ${book.available ? "" : "unavailable-card"}`} key={book.id}>
                  {/* GUIDE: Cover image; edit BookCoverSamples.js or set book.coverUrl */}
                  <div className="book-cover" style={{ backgroundImage: `url(${getCoverForBook(book)})` }} />
                  <div className="book-meta">
                    <p><strong>Title:</strong> {book.title}</p>
                    <p><strong>Author:</strong> {book.author}</p>
                    <p><strong>Genre:</strong> {book.genre}</p>
                    {/* GUIDE: Quick availability status visible on card */}
                    <p>
                      <strong>Status:</strong>
                      <span className={`status-badge ${book.available ? 'status-available' : 'status-unavailable'}`}>
                        {book.available ? 'Available' : 'Checked Out'}
                      </span>
                    </p>
                  </div>
                  <button
                    className="book-action"
                    onClick={() => setSelectedBook(book)}
                    aria-label={`View details for ${book.title}`}
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Book Detail Modal */}
      {selectedBook && (
        <div className="book-detail-modal">
          <div className="book-detail-content">
            <button className="close-modal" onClick={() => setSelectedBook(null)}>×</button>
            <h2>{selectedBook.title}</h2>
            <div className="book-details">
              <p><strong>Author:</strong> {selectedBook.author}</p>
              <p><strong>Genre:</strong> {selectedBook.genre}</p>
              <p><strong>ISBN:</strong> {selectedBook.isbn}</p>
              <p><strong>Published:</strong> {selectedBook.publishYear}</p>
              <p><strong>Pages:</strong> {selectedBook.pages}</p>
              <p><strong>Status:</strong> 
                <span className={`status-badge ${selectedBook.available ? 'status-available' : 'status-unavailable'}`}>
                  {selectedBook.available ? 'Available' : 'Checked Out'}
                </span>
              </p>
              <p><strong>Description:</strong> {selectedBook.description}</p>
            </div>
            
            {selectedBook.available && (
              <div className="borrower-slip">
                <h3>Borrower Slip</h3>
                <div className="slip-details">
                  <p><strong>Book Title:</strong> {selectedBook.title}</p>
                  <p><strong>ISBN:</strong> {selectedBook.isbn}</p>
                  <p><strong>Borrower:</strong> {userName}</p>
                  <p><strong>Borrow Date:</strong> {new Date().toLocaleDateString()}</p>
                  <p><strong>Due Date:</strong> {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                  <p className="slip-note"><strong>Note:</strong> Please return this book on or before the due date to avoid penalties.</p>
                </div>
                <button className="borrow-btn">Borrow Now</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BrowseLibrary;
