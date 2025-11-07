// src/components/Dairy.js
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  getDatabase,
  ref as dbRef,
  onValue,
  push,
  set,
  remove,
  update,
} from "firebase/database";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Plus,
  Save,
  X,
  MapPin,
  Clock,
  Car,
  FileText,
  Trash2,
  Printer,
  Download,
  Edit2,
  Edit,
  AlertTriangle,
} from "lucide-react";

// PDF generation libraries
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const Dairy = ({ showToast }) => {
  const { currentUser } = useAuth();

  // ========== STATE MANAGEMENT ==========
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  // Report configuration with all editable fields
  const [reportConfig, setReportConfig] = useState({
    employeeName: "एम. बी. कर्नाळे",
    designation: "सहाय्यक अभियंता श्रेणी - 1",
    department: "",
    subDepartment: "",
    officeName: "",
    officeLocation: "",
    fieldWorkDays: "",
    outOfHQDays: "",
    hqDays: "",
    weeklyHolidays: "",
    totalDays: "",
  });

  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const printRef = useRef();

  // Form data for new/edit entry
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    travelFrom: "",
    travelTo: "",
    timeFromHour: "",
    timeFromMinute: "",
    timeFromPeriod: "AM",
    timeToHour: "",
    timeToMinute: "",
    timeToPeriod: "PM",
    distance: "",
    vehicle: "",
  });

  const [errors, setErrors] = useState({});

  // ========== LIFECYCLE EFFECTS ==========

  // Load report configuration from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("dairyReportConfig");
    if (saved) {
      setReportConfig(JSON.parse(saved));
    }
  }, []);

  // Fetch entries from Firebase Realtime Database
  useEffect(() => {
    if (!currentUser) return;

    const db = getDatabase();
    const dairyRef = dbRef(db, `dairy/${currentUser.uid}`);

    const unsubscribe = onValue(
      dairyRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const entriesArray = Object.entries(data)
            .map(([id, entry]) => ({ id, ...entry }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
          setEntries(entriesArray);
        } else {
          setEntries([]);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching entries:", err);
        showToast?.error("Failed to load entries");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, showToast]);

  // ========== UTILITY FUNCTIONS ==========

  /**
   * Format time for display (e.g., "09:30 AM")
   */
  const formatTimeDisplay = (hour, minute, period) => {
    if (!hour || !minute) return "";
    const h = String(hour).padStart(2, "0");
    const m = String(minute).padStart(2, "0");
    return `${h}:${m} ${period}`;
  };

  /**
   * Convert 12-hour time to 24-hour format
   */
  const convertTo24 = (hour, minute, period) => {
    let h = parseInt(hour, 10);
    const m = String(minute).padStart(2, "0");

    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;

    return `${String(h).padStart(2, "0")}:${m}`;
  };

  /**
   * Calculate duration between two times
   */
  const calculateDuration = (timeFrom, timeTo) => {
    if (!timeFrom || !timeTo) return "N/A";

    const parseTime = (timeStr) => {
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return null;
      const hour = parseInt(match[1], 10);
      const minute = parseInt(match[2], 10);
      const period = match[3].toUpperCase();
      return convertTo24(hour, minute, period);
    };

    const start24 = parseTime(timeFrom);
    const end24 = parseTime(timeTo);

    if (!start24 || !end24) return "N/A";

    let startDate = new Date(`2000-01-01T${start24}`);
    let endDate = new Date(`2000-01-01T${end24}`);

    // Handle overnight travel
    if (endDate <= startDate) {
      endDate = new Date(`2000-01-02T${end24}`);
    }

    const diff = endDate - startDate;
    if (diff <= 0) return "0h 0m";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  /**
   * Format date in Marathi locale
   */
  const formatDate = (d) =>
    new Date(d).toLocaleDateString("mr-IN", { day: "2-digit", month: "short" });

  /**
   * Format day name in Marathi
   */
  const formatDay = (d) =>
    new Date(d).toLocaleDateString("mr-IN", { weekday: "short" });

  /**
   * Get formatted month for report display (MM/YYYY)
   */
  const getFormattedMonth = () => {
    const [year, month] = selectedMonth.split("-");
    return `${month}/${year}`;
  };

  /**
   * Validate Indian vehicle registration number
   * Format: XX##XX#### or XX##X#### (e.g., MH10GF3456, MH12AB1234)
   */
  const validateVehicleNumber = (vehicleNo) => {
    const pattern = /^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/i;
    return pattern.test(vehicleNo.replace(/\s+/g, ""));
  };

  // ========== DATA COMPUTATION ==========

  /**
   * Filter entries by selected month
   */
  const getMonthlyEntries = () =>
    entries.filter((e) => e.date?.slice(0, 7) === selectedMonth);

  /**
   * Calculate monthly statistics
   */
  const calculateMonthlyStats = () => {
    const monthly = getMonthlyEntries();
    const totalDistance = monthly.reduce(
      (sum, e) => sum + (parseFloat(e.distance) || 0),
      0
    );
    return { totalTrips: monthly.length, totalDistance, entries: monthly };
  };

  // ========== FORM VALIDATION ==========

  /**
   * Validate entry form data
   */
  const validateForm = () => {
    const newErrors = {};

    if (!formData.date) newErrors.date = "Date is required";
    if (!formData.travelFrom.trim())
      newErrors.travelFrom = "Travel From is required";
    if (!formData.travelTo.trim()) newErrors.travelTo = "Travel To is required";

    // Validate start time
    if (!formData.timeFromHour || !formData.timeFromMinute) {
      newErrors.timeFrom = "Start time is required";
    } else {
      const hour = parseInt(formData.timeFromHour, 10);
      const minute = parseInt(formData.timeFromMinute, 10);
      if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
        newErrors.timeFrom = "Invalid time";
      }
    }

    // Validate end time
    if (!formData.timeToHour || !formData.timeToMinute) {
      newErrors.timeTo = "End time is required";
    } else {
      const hour = parseInt(formData.timeToHour, 10);
      const minute = parseInt(formData.timeToMinute, 10);
      if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
        newErrors.timeTo = "Invalid time";
      }
    }

    // Validate distance
    if (
      !formData.distance ||
      isNaN(formData.distance) ||
      parseFloat(formData.distance) <= 0
    )
      newErrors.distance = "Distance must be a positive number";

    // Validate vehicle number
    if (!formData.vehicle.trim()) {
      newErrors.vehicle = "Vehicle No is required";
    } else if (!validateVehicleNumber(formData.vehicle)) {
      newErrors.vehicle = "Invalid format. Use: MH10GF3456";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ========== EVENT HANDLERS ==========

  /**
   * Handle input change for form fields
   */
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Validate hour input (1-12)
    if (name === "timeFromHour" || name === "timeToHour") {
      const num = parseInt(value, 10);
      if (value && (num < 1 || num > 12)) return;
    }

    // Validate minute input (0-59)
    if (name === "timeFromMinute" || name === "timeToMinute") {
      const num = parseInt(value, 10);
      if (value && (num < 0 || num > 59)) return;
    }

    // Auto-format vehicle number (uppercase and remove spaces)
    if (name === "vehicle") {
      setFormData((f) => ({
        ...f,
        [name]: value.toUpperCase().replace(/\s+/g, ""),
      }));
    } else {
      setFormData((f) => ({ ...f, [name]: value }));
    }

    // Clear errors for the field being edited
    if (errors[name] || errors.timeFrom || errors.timeTo) {
      setErrors((er) => ({ ...er, [name]: "", timeFrom: "", timeTo: "" }));
    }
  };

  /**
   * Handle row click - show edit/delete options
   */
  const handleRowClick = (entry) => {
    setSelectedEntry(entry);
  };

  /**
   * Close entry options modal
   */
  const closeEntryOptions = () => {
    setSelectedEntry(null);
  };

  /**
   * Open edit modal with selected entry data
   */
  const handleEditEntry = () => {
    if (!selectedEntry) return;

    // Parse time from stored format
    const parseStoredTime = (timeStr) => {
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return { hour: "", minute: "", period: "AM" };
      return {
        hour: parseInt(match[1], 10),
        minute: parseInt(match[2], 10),
        period: match[3].toUpperCase(),
      };
    };

    const timeFrom = parseStoredTime(selectedEntry.timeFrom);
    const timeTo = parseStoredTime(selectedEntry.timeTo);

    // Set form data with existing entry values
    setFormData({
      date: selectedEntry.date,
      travelFrom: selectedEntry.travelFrom,
      travelTo: selectedEntry.travelTo,
      timeFromHour: timeFrom.hour,
      timeFromMinute: timeFrom.minute,
      timeFromPeriod: timeFrom.period,
      timeToHour: timeTo.hour,
      timeToMinute: timeTo.minute,
      timeToPeriod: timeTo.period,
      distance: selectedEntry.distance,
      vehicle: selectedEntry.vehicle,
    });

    // Store the ID for update operation
    setEditingEntryId(selectedEntry.id);

    // Close options modal and open edit modal
    setSelectedEntry(null);
    setShowEditModal(true);
  };

  /**
   * Show delete confirmation modal
   */
  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  /**
   * Cancel delete operation
   */
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  /**
   * Confirm and execute delete operation
   */
  const confirmDelete = async () => {
    if (!selectedEntry) return;

    try {
      const db = getDatabase();
      await remove(dbRef(db, `dairy/${currentUser.uid}/${selectedEntry.id}`));
      showToast?.success("Entry deleted successfully!");
      setShowDeleteConfirm(false);
      setSelectedEntry(null);
    } catch (err) {
      console.error("Delete error:", err);
      showToast?.error("Failed to delete entry");
      setShowDeleteConfirm(false);
    }
  };

  /**
   * Add new entry to database
   */
  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast?.error("Please fix validation errors");
      return;
    }

    const timeFrom = formatTimeDisplay(
      formData.timeFromHour,
      formData.timeFromMinute,
      formData.timeFromPeriod
    );
    const timeTo = formatTimeDisplay(
      formData.timeToHour,
      formData.timeToMinute,
      formData.timeToPeriod
    );

    try {
      const db = getDatabase();
      const newRef = push(dbRef(db, `dairy/${currentUser.uid}`));
      await set(newRef, {
        date: formData.date,
        travelFrom: formData.travelFrom,
        travelTo: formData.travelTo,
        timeFrom,
        timeTo,
        distance: formData.distance,
        vehicle: formData.vehicle,
        createdAt: new Date().toISOString(),
      });

      showToast?.success("Entry added successfully!");
      setShowAddModal(false);
      resetForm();
    } catch (err) {
      console.error("Add error:", err);
      showToast?.error("Failed to add entry");
    }
  };

  /**
   * Update existing entry in database
   */
  const handleUpdateEntry = async (e) => {
    e.preventDefault();

    // Check if we have the entry ID
    if (!editingEntryId) {
      showToast?.error("Entry ID not found");
      return;
    }

    if (!validateForm()) {
      showToast?.error("Please fix validation errors");
      return;
    }

    const timeFrom = formatTimeDisplay(
      formData.timeFromHour,
      formData.timeFromMinute,
      formData.timeFromPeriod
    );
    const timeTo = formatTimeDisplay(
      formData.timeToHour,
      formData.timeToMinute,
      formData.timeToPeriod
    );

    try {
      const db = getDatabase();
      const entryRef = dbRef(db, `dairy/${currentUser.uid}/${editingEntryId}`);
      await update(entryRef, {
        date: formData.date,
        travelFrom: formData.travelFrom,
        travelTo: formData.travelTo,
        timeFrom,
        timeTo,
        distance: formData.distance,
        vehicle: formData.vehicle,
        updatedAt: new Date().toISOString(),
      });

      showToast?.success("Entry updated successfully!");
      setShowEditModal(false);
      setEditingEntryId(null);
      resetForm();
    } catch (err) {
      console.error("Update error:", err);
      showToast?.error("Failed to update entry");
    }
  };

  /**
   * Reset form to initial state
   */
  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      travelFrom: "",
      travelTo: "",
      timeFromHour: "",
      timeFromMinute: "",
      timeFromPeriod: "AM",
      timeToHour: "",
      timeToMinute: "",
      timeToPeriod: "PM",
      distance: "",
      vehicle: "",
    });
    setErrors({});
  };

  /**
   * Save report configuration to localStorage
   */
  const saveReportConfig = () => {
    localStorage.setItem("dairyReportConfig", JSON.stringify(reportConfig));
    setIsEditingConfig(false);
    showToast?.success("Report configuration saved!");
  };

  // ========== PRINT & PDF FUNCTIONS ==========

  /**
   * Trigger browser print dialog
   */
  const handlePrint = () => window.print();

  /**
   * Generate and download PDF report
   */
  const handleDownloadPDF = async () => {
    try {
      const input = printRef.current;
      if (!input) return;

      // Generate canvas from HTML
      const canvas = await html2canvas(input, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");

      // Create PDF
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Fit to single page
      if (imgHeight > pageHeight) {
        const ratio = pageHeight / imgHeight;
        const finalWidth = imgWidth * ratio;
        const finalHeight = pageHeight;
        const x = (pageWidth - finalWidth) / 2;
        pdf.addImage(imgData, "PNG", x, 0, finalWidth, finalHeight);
      } else {
        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      }

      // Download with formatted filename
      const [yStr, mStr] = selectedMonth.split("-");
      pdf.save(`Monthly-Travel-${mStr}-${yStr}.pdf`);
      showToast?.success("PDF downloaded successfully!");
    } catch (e) {
      console.error("PDF generation error:", e);
      showToast?.error("PDF generation failed");
    }
  };

  // ========== COMPUTED VALUES ==========
  const monthly = calculateMonthlyStats();
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  // ========== RENDER ==========
  return (
    <>
      {/* ========== MAIN CONTAINER ========== */}
      <motion.div
        className="dairy-container"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Page Header */}
        <div className="dairy-header">
          <div className="dairy-header-left">
            <h2>
              <BookOpen size={24} />
              Travel Diary
            </h2>
            <p>Track your travel & print monthly report</p>
          </div>
          <div className="dairy-header-actions">
            <motion.button
              className="btn-report"
              onClick={() => setShowReportModal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FileText size={18} />
              Monthly Report
            </motion.button>
            <motion.button
              className="btn-add-dairy"
              onClick={() => setShowAddModal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus size={18} />
              New Entry
            </motion.button>
          </div>
        </div>

        {/* ========== ENTRIES TABLE ========== */}
        {loading ? (
          // Loading State
          <div className="dairy-loading">
            <div className="spinner-dairy" />
            <p>Loading entries...</p>
          </div>
        ) : entries.length === 0 ? (
          // Empty State
          <div className="dairy-empty">
            <BookOpen size={64} color="#94a3b8" />
            <h3>No Travel Entries Yet</h3>
            <p>Start tracking your travel by creating your first entry</p>
            <button
              className="btn-empty-dairy"
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={18} />
              Create First Entry
            </button>
          </div>
        ) : (
          // Entries Table
          <div className="dairy-table-container">
            <table className="dairy-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Time</th>
                  <th>Duration</th>
                  <th>Distance</th>
                  <th>Vehicle No</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {entries.map((entry) => (
                    <motion.tr
                      key={entry.id}
                      className="clickable-row"
                      onClick={() => handleRowClick(entry)}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      whileHover={{ backgroundColor: "#fffbeb" }}
                    >
                      <td className="td-date">
                        {new Date(entry.date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="td-location">
                        <MapPin size={14} className="inline-icon" />
                        {entry.travelFrom}
                      </td>
                      <td className="td-location">
                        <MapPin size={14} className="inline-icon" />
                        {entry.travelTo}
                      </td>
                      <td className="td-time">
                        <Clock size={14} className="inline-icon" />
                        {entry.timeFrom} - {entry.timeTo}
                      </td>
                      <td className="td-duration">
                        {calculateDuration(entry.timeFrom, entry.timeTo)}
                      </td>
                      <td className="td-distance">{entry.distance} km</td>
                      <td className="td-vehicle">
                        <Car size={14} className="inline-icon" />
                        {entry.vehicle}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* ========== ENTRY OPTIONS MODAL (Edit/Delete) ========== */}
      <AnimatePresence>
        {selectedEntry && !showDeleteConfirm && (
          <motion.div
            className="entry-options-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeEntryOptions}
          >
            <motion.div
              className="entry-options-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="entry-options-header">
                <h3>Entry Options</h3>
                <button
                  onClick={closeEntryOptions}
                  className="btn-close-options"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="entry-details">
                <div className="detail-row">
                  <span className="label">Date:</span>
                  <span className="value">
                    {new Date(selectedEntry.date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">From:</span>
                  <span className="value">{selectedEntry.travelFrom}</span>
                </div>
                <div className="detail-row">
                  <span className="label">To:</span>
                  <span className="value">{selectedEntry.travelTo}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Time:</span>
                  <span className="value">
                    {selectedEntry.timeFrom} - {selectedEntry.timeTo}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Distance:</span>
                  <span className="value">{selectedEntry.distance} km</span>
                </div>
                <div className="detail-row">
                  <span className="label">Vehicle No:</span>
                  <span className="value">{selectedEntry.vehicle}</span>
                </div>
              </div>

              <div className="entry-options-actions">
                <button onClick={handleEditEntry} className="btn-edit-entry">
                  <Edit size={18} />
                  Edit Entry
                </button>
                <button
                  onClick={handleDeleteClick}
                  className="btn-delete-entry-modal"
                >
                  <Trash2 size={18} />
                  Delete Entry
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== DELETE CONFIRMATION MODAL ========== */}
      <AnimatePresence>
        {showDeleteConfirm && selectedEntry && (
          <motion.div
            className="delete-confirm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={cancelDelete}
          >
            <motion.div
              className="delete-confirm-modal"
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Warning Icon */}
              <div className="delete-icon-container">
                <motion.div
                  className="delete-icon-circle"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                >
                  <AlertTriangle size={48} />
                </motion.div>
              </div>

              {/* Content */}
              <div className="delete-content">
                <h3>Delete Entry?</h3>
                <p>
                  Are you sure you want to delete this travel entry? This action
                  cannot be undone.
                </p>

                {/* Entry Summary */}
                <div className="delete-entry-summary">
                  <div className="summary-item">
                    <span className="summary-label">Date:</span>
                    <span className="summary-value">
                      {new Date(selectedEntry.date).toLocaleDateString(
                        "en-IN",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Route:</span>
                    <span className="summary-value">
                      {selectedEntry.travelFrom} → {selectedEntry.travelTo}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Distance:</span>
                    <span className="summary-value">
                      {selectedEntry.distance} km
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="delete-actions">
                <button onClick={cancelDelete} className="btn-cancel-delete">
                  Cancel
                </button>
                <button onClick={confirmDelete} className="btn-confirm-delete">
                  <Trash2 size={18} />
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== ADD ENTRY MODAL ========== */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            className="dairy-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowAddModal(false);
              resetForm();
            }}
          >
            <motion.div
              className="dairy-modal-content"
              initial={{ scale: 0.94, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="dairy-modal-header">
                <h3>
                  <BookOpen size={22} />
                  New Travel Entry
                </h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="btn-close-modal"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddEntry} className="dairy-form">
                {/* Date Field */}
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="date">
                      Date <span className="required">*</span>
                    </label>
                    <input
                      id="date"
                      name="date"
                      type="date"
                      value={formData.date}
                      onChange={handleChange}
                      className={errors.date ? "error" : ""}
                      max={new Date().toISOString().split("T")[0]}
                    />
                    {errors.date && (
                      <span className="error-text">{errors.date}</span>
                    )}
                  </div>
                </div>

                {/* From/To Fields */}
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="travelFrom">
                      Travel From <span className="required">*</span>
                    </label>
                    <input
                      id="travelFrom"
                      name="travelFrom"
                      type="text"
                      placeholder="e.g., मुंबई / Mumbai"
                      value={formData.travelFrom}
                      onChange={handleChange}
                      className={errors.travelFrom ? "error" : ""}
                    />
                    {errors.travelFrom && (
                      <span className="error-text">{errors.travelFrom}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="travelTo">
                      Travel To <span className="required">*</span>
                    </label>
                    <input
                      id="travelTo"
                      name="travelTo"
                      type="text"
                      placeholder="e.g., पुणे / Pune"
                      value={formData.travelTo}
                      onChange={handleChange}
                      className={errors.travelTo ? "error" : ""}
                    />
                    {errors.travelTo && (
                      <span className="error-text">{errors.travelTo}</span>
                    )}
                  </div>
                </div>

                {/* Time Fields */}
                <div className="form-row">
                  {/* Time From */}
                  <div className="form-group">
                    <label>
                      Time From <span className="required">*</span>
                    </label>
                    <div className="time-input-group">
                      <select
                        name="timeFromHour"
                        value={formData.timeFromHour}
                        onChange={handleChange}
                        className={
                          errors.timeFrom ? "error time-select" : "time-select"
                        }
                      >
                        <option value="">HH</option>
                        {hours.map((h) => (
                          <option key={h} value={h}>
                            {String(h).padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                      <span className="time-separator">:</span>
                      <select
                        name="timeFromMinute"
                        value={formData.timeFromMinute}
                        onChange={handleChange}
                        className={
                          errors.timeFrom ? "error time-select" : "time-select"
                        }
                      >
                        <option value="">MM</option>
                        {minutes.map((m) => (
                          <option key={m} value={m}>
                            {String(m).padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                      <select
                        name="timeFromPeriod"
                        value={formData.timeFromPeriod}
                        onChange={handleChange}
                        className="time-period"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                    {errors.timeFrom && (
                      <span className="error-text">{errors.timeFrom}</span>
                    )}
                  </div>

                  {/* Time To */}
                  <div className="form-group">
                    <label>
                      Time To <span className="required">*</span>
                    </label>
                    <div className="time-input-group">
                      <select
                        name="timeToHour"
                        value={formData.timeToHour}
                        onChange={handleChange}
                        className={
                          errors.timeTo ? "error time-select" : "time-select"
                        }
                      >
                        <option value="">HH</option>
                        {hours.map((h) => (
                          <option key={h} value={h}>
                            {String(h).padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                      <span className="time-separator">:</span>
                      <select
                        name="timeToMinute"
                        value={formData.timeToMinute}
                        onChange={handleChange}
                        className={
                          errors.timeTo ? "error time-select" : "time-select"
                        }
                      >
                        <option value="">MM</option>
                        {minutes.map((m) => (
                          <option key={m} value={m}>
                            {String(m).padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                      <select
                        name="timeToPeriod"
                        value={formData.timeToPeriod}
                        onChange={handleChange}
                        className="time-period"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                    {errors.timeTo && (
                      <span className="error-text">{errors.timeTo}</span>
                    )}
                  </div>
                </div>

                {/* Distance/Vehicle Fields */}
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="distance">
                      Distance (km) <span className="required">*</span>
                    </label>
                    <input
                      id="distance"
                      name="distance"
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="e.g., 150"
                      value={formData.distance}
                      onChange={handleChange}
                      className={errors.distance ? "error" : ""}
                    />
                    {errors.distance && (
                      <span className="error-text">{errors.distance}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="vehicle">
                      Vehicle No <span className="required">*</span>
                    </label>
                    <input
                      id="vehicle"
                      name="vehicle"
                      type="text"
                      placeholder="e.g., MH10GF3456"
                      value={formData.vehicle}
                      onChange={handleChange}
                      className={errors.vehicle ? "error" : ""}
                      maxLength="13"
                    />
                    {errors.vehicle && (
                      <span className="error-text">{errors.vehicle}</span>
                    )}
                  </div>
                </div>

                {/* Form Footer */}
                <div className="dairy-modal-footer">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-save">
                    <Save size={18} />
                    Save Entry
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== EDIT ENTRY MODAL ========== */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            className="dairy-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowEditModal(false);
              setEditingEntryId(null);
              resetForm();
            }}
          >
            <motion.div
              className="dairy-modal-content"
              initial={{ scale: 0.94, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="dairy-modal-header">
                <h3>
                  <Edit2 size={22} />
                  Edit Travel Entry
                </h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingEntryId(null);
                    resetForm();
                  }}
                  className="btn-close-modal"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Same form structure as Add Modal */}
              <form onSubmit={handleUpdateEntry} className="dairy-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-date">
                      Date <span className="required">*</span>
                    </label>
                    <input
                      id="edit-date"
                      name="date"
                      type="date"
                      value={formData.date}
                      onChange={handleChange}
                      className={errors.date ? "error" : ""}
                      max={new Date().toISOString().split("T")[0]}
                    />
                    {errors.date && (
                      <span className="error-text">{errors.date}</span>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-travelFrom">
                      Travel From <span className="required">*</span>
                    </label>
                    <input
                      id="edit-travelFrom"
                      name="travelFrom"
                      type="text"
                      placeholder="e.g., मुंबई / Mumbai"
                      value={formData.travelFrom}
                      onChange={handleChange}
                      className={errors.travelFrom ? "error" : ""}
                    />
                    {errors.travelFrom && (
                      <span className="error-text">{errors.travelFrom}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-travelTo">
                      Travel To <span className="required">*</span>
                    </label>
                    <input
                      id="edit-travelTo"
                      name="travelTo"
                      type="text"
                      placeholder="e.g., पुणे / Pune"
                      value={formData.travelTo}
                      onChange={handleChange}
                      className={errors.travelTo ? "error" : ""}
                    />
                    {errors.travelTo && (
                      <span className="error-text">{errors.travelTo}</span>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>
                      Time From <span className="required">*</span>
                    </label>
                    <div className="time-input-group">
                      <select
                        name="timeFromHour"
                        value={formData.timeFromHour}
                        onChange={handleChange}
                        className={
                          errors.timeFrom ? "error time-select" : "time-select"
                        }
                      >
                        <option value="">HH</option>
                        {hours.map((h) => (
                          <option key={h} value={h}>
                            {String(h).padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                      <span className="time-separator">:</span>
                      <select
                        name="timeFromMinute"
                        value={formData.timeFromMinute}
                        onChange={handleChange}
                        className={
                          errors.timeFrom ? "error time-select" : "time-select"
                        }
                      >
                        <option value="">MM</option>
                        {minutes.map((m) => (
                          <option key={m} value={m}>
                            {String(m).padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                      <select
                        name="timeFromPeriod"
                        value={formData.timeFromPeriod}
                        onChange={handleChange}
                        className="time-period"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                    {errors.timeFrom && (
                      <span className="error-text">{errors.timeFrom}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>
                      Time To <span className="required">*</span>
                    </label>
                    <div className="time-input-group">
                      <select
                        name="timeToHour"
                        value={formData.timeToHour}
                        onChange={handleChange}
                        className={
                          errors.timeTo ? "error time-select" : "time-select"
                        }
                      >
                        <option value="">HH</option>
                        {hours.map((h) => (
                          <option key={h} value={h}>
                            {String(h).padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                      <span className="time-separator">:</span>
                      <select
                        name="timeToMinute"
                        value={formData.timeToMinute}
                        onChange={handleChange}
                        className={
                          errors.timeTo ? "error time-select" : "time-select"
                        }
                      >
                        <option value="">MM</option>
                        {minutes.map((m) => (
                          <option key={m} value={m}>
                            {String(m).padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                      <select
                        name="timeToPeriod"
                        value={formData.timeToPeriod}
                        onChange={handleChange}
                        className="time-period"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                    {errors.timeTo && (
                      <span className="error-text">{errors.timeTo}</span>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-distance">
                      Distance (km) <span className="required">*</span>
                    </label>
                    <input
                      id="edit-distance"
                      name="distance"
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="e.g., 150"
                      value={formData.distance}
                      onChange={handleChange}
                      className={errors.distance ? "error" : ""}
                    />
                    {errors.distance && (
                      <span className="error-text">{errors.distance}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-vehicle">
                      Vehicle No <span className="required">*</span>
                    </label>
                    <input
                      id="edit-vehicle"
                      name="vehicle"
                      type="text"
                      placeholder="e.g., MH10GF3456"
                      value={formData.vehicle}
                      onChange={handleChange}
                      className={errors.vehicle ? "error" : ""}
                      maxLength="13"
                    />
                    {errors.vehicle && (
                      <span className="error-text">{errors.vehicle}</span>
                    )}
                  </div>
                </div>

                <div className="dairy-modal-footer">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingEntryId(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-save">
                    <Save size={18} />
                    Update Entry
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== MONTHLY REPORT MODAL ========== */}
      {/* Keep the existing monthly report modal code unchanged */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div
            className="report-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowReportModal(false)}
          >
            <motion.div
              className="report-modal-content compact-report"
              initial={{ scale: 0.94, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="report-modal-header no-print">
                <h3>
                  <FileText size={22} />
                  Monthly Travel Report
                </h3>
                <div className="report-controls">
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    max={new Date().toISOString().slice(0, 7)}
                  />
                  <button
                    onClick={() => setIsEditingConfig(!isEditingConfig)}
                    className="btn-edit-config"
                    title="Edit Report Details"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button onClick={handleDownloadPDF} className="btn-download">
                    <Download size={18} />
                    PDF
                  </button>
                  <button onClick={handlePrint} className="btn-print">
                    <Printer size={18} />
                    Print
                  </button>
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="btn-close-report"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {isEditingConfig && (
                <div className="config-panel no-print">
                  <h4>📝 Edit Report Details</h4>

                  <div className="config-section">
                    <h5>Basic Information</h5>
                    <div className="config-grid">
                      <div className="config-field">
                        <label>Employee Name (कर्मचारी नाव)</label>
                        <input
                          type="text"
                          value={reportConfig.employeeName}
                          onChange={(e) =>
                            setReportConfig({
                              ...reportConfig,
                              employeeName: e.target.value,
                            })
                          }
                          placeholder="श्री. नाव"
                        />
                      </div>
                      <div className="config-field">
                        <label>Designation (पदनाम)</label>
                        <input
                          type="text"
                          value={reportConfig.designation}
                          onChange={(e) =>
                            setReportConfig({
                              ...reportConfig,
                              designation: e.target.value,
                            })
                          }
                          placeholder="सहाय्यक अभियंता श्रेणी - 1"
                        />
                      </div>
                      <div className="config-field">
                        <label>Department (विभाग)</label>
                        <input
                          type="text"
                          value={reportConfig.department}
                          onChange={(e) =>
                            setReportConfig({
                              ...reportConfig,
                              department: e.target.value,
                            })
                          }
                          placeholder="विभाग"
                        />
                      </div>
                      <div className="config-field">
                        <label>Sub Department (उप विभाग)</label>
                        <input
                          type="text"
                          value={reportConfig.subDepartment}
                          onChange={(e) =>
                            setReportConfig({
                              ...reportConfig,
                              subDepartment: e.target.value,
                            })
                          }
                          placeholder="उप विभाग"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="config-section">
                    <h5>Office Information</h5>
                    <div className="config-grid">
                      <div className="config-field">
                        <label>Office Name (कार्यालयाचे नाव)</label>
                        <input
                          type="text"
                          value={reportConfig.officeName}
                          onChange={(e) =>
                            setReportConfig({
                              ...reportConfig,
                              officeName: e.target.value,
                            })
                          }
                          placeholder="कार्यालयाचे नाव"
                        />
                      </div>
                      <div className="config-field">
                        <label>Office Location (कार्यालयाचे ठिकाण/गाव)</label>
                        <input
                          type="text"
                          value={reportConfig.officeLocation}
                          onChange={(e) =>
                            setReportConfig({
                              ...reportConfig,
                              officeLocation: e.target.value,
                            })
                          }
                          placeholder="ठिकाण/गाव"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="config-section">
                    <h5>Gosavara Details (गोषवारा तपशील)</h5>
                    <div className="config-grid">
                      <div className="config-field">
                        <label>क्षेत्रीय कामाचे एकूण दिवस</label>
                        <input
                          type="text"
                          value={reportConfig.fieldWorkDays}
                          onChange={(e) =>
                            setReportConfig({
                              ...reportConfig,
                              fieldWorkDays: e.target.value,
                            })
                          }
                          placeholder="उदा. 10"
                        />
                      </div>
                      <div className="config-field">
                        <label>मुख्यालयाबाहेरील कामाचे दिवस</label>
                        <input
                          type="text"
                          value={reportConfig.outOfHQDays}
                          onChange={(e) =>
                            setReportConfig({
                              ...reportConfig,
                              outOfHQDays: e.target.value,
                            })
                          }
                          placeholder="उदा. 5"
                        />
                      </div>
                      <div className="config-field">
                        <label>मुख्यालयातील एकूण दिवस</label>
                        <input
                          type="text"
                          value={reportConfig.hqDays}
                          onChange={(e) =>
                            setReportConfig({
                              ...reportConfig,
                              hqDays: e.target.value,
                            })
                          }
                          placeholder="उदा. 12"
                        />
                      </div>
                      <div className="config-field">
                        <label>साप्ताहीक सुट्टी व इतर सुट्टी</label>
                        <input
                          type="text"
                          value={reportConfig.weeklyHolidays}
                          onChange={(e) =>
                            setReportConfig({
                              ...reportConfig,
                              weeklyHolidays: e.target.value,
                            })
                          }
                          placeholder="उदा. 4"
                        />
                      </div>
                      <div className="config-field">
                        <label>एकूण दिवस</label>
                        <input
                          type="text"
                          value={reportConfig.totalDays}
                          onChange={(e) =>
                            setReportConfig({
                              ...reportConfig,
                              totalDays: e.target.value,
                            })
                          }
                          placeholder="उदा. 31"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={saveReportConfig}
                    className="btn-save-config"
                  >
                    <Save size={16} />
                    Save Configuration
                  </button>
                </div>
              )}

              <div className="report-content" ref={printRef}>
                <div className="gov-header">
                  {reportConfig.department && (
                    <p className="line-center">
                      विभाग - {reportConfig.department}
                    </p>
                  )}
                  {reportConfig.subDepartment && (
                    <p className="line-center">
                      उप विभाग - {reportConfig.subDepartment}
                    </p>
                  )}
                  <p className="line-center title">मासिक दैनंदिनी</p>
                  <p className="line-center report-subtitle">
                    श्री. {reportConfig.employeeName},{" "}
                    {reportConfig.designation} यांची माहे -{" "}
                    {getFormattedMonth()} ची मासिक दौरा नोंद
                  </p>
                </div>

                <table className="gov-table">
                  <thead>
                    <tr>
                      <th style={{ width: "50px" }}>दिनांक</th>
                      <th style={{ width: "45px" }}>वार</th>
                      <th style={{ width: "115px" }}>कुठून</th>
                      <th style={{ width: "115px" }}>कुठे</th>
                      <th style={{ width: "80px" }}>वाहन</th>
                      <th style={{ width: "50px" }}>अंतर</th>
                      <th style={{ width: "90px" }}>वेळ</th>
                      <th style={{ width: "90px" }}>शेरा</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthly.entries.length === 0 ? (
                      <tr>
                        <td
                          colSpan="8"
                          style={{ textAlign: "center", padding: "1.5rem" }}
                        >
                          No entries for selected month
                        </td>
                      </tr>
                    ) : (
                      monthly.entries.map((row) => (
                        <tr key={row.id}>
                          <td>{formatDate(row.date)}</td>
                          <td>{formatDay(row.date)}</td>
                          <td>{row.travelFrom}</td>
                          <td>{row.travelTo}</td>
                          <td>{row.vehicle}</td>
                          <td>{row.distance}</td>
                          <td className="time-cell">
                            {row.timeFrom} - {row.timeTo}
                          </td>
                          <td className="shera-cell"></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="5" className="text-right">
                        <strong>एकूण:</strong>
                      </td>
                      <td>
                        <strong>{monthly.totalDistance.toFixed(2)}</strong>
                      </td>
                      <td colSpan="2"></td>
                    </tr>
                  </tfoot>
                </table>

                <div className="gosavara-box">
                  <div className="gosavara-inner">
                    <div className="gos-title">गोषवारा</div>
                    <div className="gos-lines">
                      <div>
                        क्षेत्रीय कामाचे एकूण दिवस -{" "}
                        {reportConfig.fieldWorkDays}
                      </div>
                      <div>
                        मुख्यालयाबाहेरील कामाचे दिवस -{" "}
                        {reportConfig.outOfHQDays}
                      </div>
                      <div>मुख्यालयातील एकूण दिवस - {reportConfig.hqDays}</div>
                      <div>
                        साप्ताहीक सुट्टी व इतर सुट्टी -{" "}
                        {reportConfig.weeklyHolidays}
                      </div>
                      <div>एकूण दिवस - {reportConfig.totalDays}</div>
                    </div>
                  </div>
                </div>

                <div className="sign-section">
                  <div className="sign-name">
                    ( {reportConfig.employeeName}{" "}
                    )&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                  </div>
                  <div className="sign-name">{reportConfig.designation},</div>
                  {reportConfig.officeName && (
                    <div className="sign-office">
                      कार्यालयाचे नाव - {reportConfig.officeName}
                    </div>
                  )}
                  {reportConfig.officeLocation && (
                    <div className="sign-location">
                      कार्यालयाचे ठिकाण/गाव - {reportConfig.officeLocation}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== STYLES ========== */}
      <style>{`
        /* ========== CSS VARIABLES ========== */
        :root {
          --brand: #2563eb;
          --brand2: #1d4ed8;
          --accent: #f59e0b;
          --ink: #0f172a;
          --muted: #64748b;
          --line: #e2e8f0;
          --danger: #dc2626;
          --danger-dark: #b91c1c;
        }

        /* ========== MAIN CONTAINER ========== */
        .dairy-container {
          padding: 1.25rem;
          max-width: 1300px;
          margin: 0 auto;
        }

        /* ========== HEADER SECTION ========== */
        .dairy-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }

        .dairy-header-left h2 {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin: 0;
          font-size: 1.6rem;
          background: linear-gradient(135deg, var(--accent), #fbbf24);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .dairy-header-left p {
          margin: 0.15rem 0 0;
          color: var(--muted);
        }

        .dairy-header-actions {
          display: flex;
          gap: 0.6rem;
        }

        /* ========== BUTTONS ========== */
        .btn-add-dairy,
        .btn-report {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1rem;
          color: #fff;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-add-dairy {
          background: linear-gradient(135deg, var(--accent), #fbbf24);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);
        }

        .btn-add-dairy:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(245, 158, 11, 0.35);
        }

        .btn-report {
          background: linear-gradient(135deg, var(--brand), var(--brand2));
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
        }

        .btn-report:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
        }

        /* ========== LOADING & EMPTY STATES ========== */
        .dairy-loading,
        .dairy-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1rem;
          color: var(--muted);
          text-align: center;
        }

        .spinner-dairy {
          width: 36px;
          height: 36px;
          border: 4px solid #e2e8f0;
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 0.75rem;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .dairy-empty h3 {
          margin: 1rem 0 0.5rem;
          color: var(--muted);
        }

        .dairy-empty p {
          color: var(--muted);
          margin: 0.25rem 0;
        }

        .btn-empty-dairy {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 1rem;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, var(--accent), #fbbf24);
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-empty-dairy:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(245, 158, 11, 0.35);
        }

        /* ========== ENTRIES TABLE ========== */
        .dairy-table-container {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(2, 6, 23, 0.06);
          overflow: hidden;
        }

        .dairy-table {
          width: 100%;
          border-collapse: collapse;
        }

        .dairy-table thead {
          background: linear-gradient(135deg, var(--accent), #fbbf24);
        }

        .dairy-table th {
          padding: 0.8rem 0.75rem;
          text-align: left;
          font-size: 0.83rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #fff;
        }

        .dairy-table td {
          padding: 0.8rem 0.75rem;
          border-bottom: 1px solid var(--line);
          font-size: 0.92rem;
        }

        /* Clickable row styles */
        .clickable-row {
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .clickable-row:hover {
          background-color: #fffbeb !important;
        }

        .inline-icon {
          margin-right: 0.35rem;
          color: #64748b;
          vertical-align: middle;
        }

        .td-date {
          font-weight: 700;
          color: #0ea5e9;
        }

        .td-duration {
          font-weight: 700;
          color: #0891b2;
        }

        .td-distance {
          font-weight: 700;
          color: #059669;
        }

        /* ========== ENTRY OPTIONS MODAL ========== */
        .entry-options-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(3px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 6000;
          padding: 1rem;
        }

        .entry-options-modal {
          background: #fff;
          border-radius: 16px;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 22px 60px rgba(0, 0, 0, 0.35);
        }

        .entry-options-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          border-bottom: 2px solid var(--line);
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
        }

        .entry-options-header h3 {
          margin: 0;
          font-size: 1.15rem;
          color: var(--ink);
        }

        .btn-close-options {
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          padding: 0.5rem;
          cursor: pointer;
          color: #64748b;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-close-options:hover {
          background: #e2e8f0;
          color: #334155;
        }

        /* Entry details display */
        .entry-details {
          padding: 1.25rem;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem 0;
          border-bottom: 1px solid var(--line);
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-row .label {
          font-weight: 600;
          color: var(--muted);
          font-size: 0.9rem;
        }

        .detail-row .value {
          font-weight: 500;
          color: var(--ink);
          text-align: right;
        }

        /* Entry action buttons */
        .entry-options-actions {
          display: flex;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          border-top: 2px solid var(--line);
          background: #f8fafc;
        }

        .btn-edit-entry {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: linear-gradient(135deg, var(--brand), var(--brand2));
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-edit-entry:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
        }

        .btn-delete-entry-modal {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-delete-entry-modal:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(220, 38, 38, 0.35);
        }

        /* ========== DELETE CONFIRMATION MODAL ========== */
        .delete-confirm-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 7000;
          padding: 1rem;
        }

        .delete-confirm-modal {
          background: #fff;
          border-radius: 20px;
          max-width: 480px;
          width: 100%;
          box-shadow: 0 25px 70px rgba(220, 38, 38, 0.3);
          overflow: hidden;
        }

        .delete-icon-container {
          display: flex;
          justify-content: center;
          padding: 2rem 1.5rem 1rem;
          background: linear-gradient(135deg, #fef2f2, #fee2e2);
        }

        .delete-icon-circle {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          background: linear-gradient(135deg, #fecaca, #fca5a5);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--danger);
          box-shadow: 0 8px 24px rgba(220, 38, 38, 0.25);
        }

        .delete-content {
          padding: 1.5rem 1.75rem;
          text-align: center;
        }

        .delete-content h3 {
          margin: 0 0 0.75rem;
          font-size: 1.5rem;
          color: var(--danger);
          font-weight: 700;
        }

        .delete-content p {
          margin: 0 0 1.25rem;
          color: var(--muted);
          font-size: 0.95rem;
          line-height: 1.6;
        }

        .delete-entry-summary {
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          padding: 1rem;
          text-align: left;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid #e2e8f0;
        }

        .summary-item:last-child {
          border-bottom: none;
        }

        .summary-label {
          font-weight: 600;
          color: var(--muted);
          font-size: 0.88rem;
        }

        .summary-value {
          font-weight: 600;
          color: var(--ink);
          font-size: 0.92rem;
        }

        .delete-actions {
          display: flex;
          gap: 0.75rem;
          padding: 1.25rem 1.75rem;
          background: #f8fafc;
          border-top: 2px solid var(--line);
        }

        .btn-cancel-delete {
          flex: 1;
          padding: 0.85rem 1.25rem;
          background: #fff;
          border: 2px solid #cbd5e1;
          border-radius: 12px;
          color: #64748b;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-cancel-delete:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
          color: #334155;
          transform: translateY(-1px);
        }

        .btn-confirm-delete {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.85rem 1.25rem;
          background: linear-gradient(135deg, var(--danger), var(--danger-dark));
          border: none;
          border-radius: 12px;
          color: white;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
        }

        .btn-confirm-delete:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(220, 38, 38, 0.4);
        }

        .btn-confirm-delete:active {
          transform: translateY(0);
        }

        /* ========== ADD/EDIT MODALS ========== */
        .dairy-modal-backdrop,
        .report-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(3px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 5000;
          padding: 1rem;
        }

        .dairy-modal-content {
          background: #fff;
          border-radius: 16px;
          max-width: 700px;
          width: 100%;
          max-height: 92vh;
          overflow: auto;
          box-shadow: 0 22px 60px rgba(0, 0, 0, 0.28);
        }

        .report-modal-content {
          background: #fff;
          border-radius: 16px;
          width: 95%;
          max-width: 950px;
          max-height: 92vh;
          overflow: auto;
          box-shadow: 0 22px 60px rgba(0, 0, 0, 0.28);
        }

        .compact-report {
          max-width: 900px;
        }

        .dairy-modal-header,
        .report-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          border-bottom: 2px solid var(--line);
          background: #f8fafc;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .dairy-modal-header h3,
        .report-modal-header h3 {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin: 0;
          font-size: 1.15rem;
          color: var(--ink);
        }

        .btn-close-modal,
        .btn-close-report {
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          padding: 0.5rem;
          cursor: pointer;
          color: #64748b;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-close-modal:hover,
        .btn-close-report:hover {
          background: #e2e8f0;
          color: #334155;
        }

        /* ========== REPORT CONTROLS ========== */
        .report-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .report-controls input[type="month"] {
          padding: 0.45rem 0.6rem;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.9rem;
        }

        .btn-print,
        .btn-download,
        .btn-edit-config {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 0.8rem;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          color: #fff;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-edit-config {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
        }

        .btn-edit-config:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.35);
        }

        .btn-print {
          background: linear-gradient(135deg, var(--brand), var(--brand2));
        }

        .btn-print:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
        }

        .btn-download {
          background: linear-gradient(135deg, #0ea5e9, #0284c7);
        }

        .btn-download:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(14, 165, 233, 0.35);
        }

        /* ========== CONFIGURATION PANEL ========== */
        .config-panel {
          padding: 1.25rem;
          background: #f8fafc;
          border-bottom: 2px solid var(--line);
          max-height: 60vh;
          overflow-y: auto;
        }

        .config-panel h4 {
          margin: 0 0 1rem;
          color: var(--ink);
          font-size: 1.1rem;
        }

        .config-section {
          margin-bottom: 1.5rem;
        }

        .config-section h5 {
          margin: 0 0 0.75rem;
          color: var(--muted);
          font-size: 0.95rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .config-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .config-field label {
          display: block;
          margin-bottom: 0.35rem;
          font-weight: 600;
          font-size: 0.85rem;
          color: var(--muted);
        }

        .config-field input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.9rem;
          transition: all 0.2s ease;
        }

        .config-field input:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12);
        }

        .btn-save-config {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.6rem 1.2rem;
          background: linear-gradient(135deg, var(--accent), #fbbf24);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 1rem;
        }

        .btn-save-config:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.35);
        }

        /* ========== FORM STYLES ========== */
        .dairy-form {
          padding: 1rem 1.25rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          margin-bottom: 0.4rem;
          font-weight: 600;
          color: var(--ink);
          font-size: 0.9rem;
        }

        .required {
          color: #dc2626;
        }

        .form-group input,
        .form-group select {
          padding: 0.7rem;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.95rem;
          transition: all 0.2s ease;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12);
        }

        .form-group .error {
          border-color: #dc2626;
        }

        .error-text {
          color: #dc2626;
          font-size: 0.8rem;
          margin-top: 0.25rem;
        }

        /* ========== TIME INPUT ========== */
        .time-input-group {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .time-select {
          flex: 1;
          padding: 0.7rem 0.5rem;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.95rem;
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .time-select:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12);
        }

        .time-select.error {
          border-color: #dc2626;
        }

        .time-separator {
          font-weight: 700;
          font-size: 1.2rem;
          color: var(--muted);
        }

        .time-period {
          flex: 0.8;
          padding: 0.7rem 0.5rem;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 600;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .time-period:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12);
        }

        /* ========== MODAL FOOTER ========== */
        .dairy-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.6rem;
          padding: 1rem 1.25rem;
          border-top: 2px solid var(--line);
          background: #f8fafc;
          position: sticky;
          bottom: 0;
        }

        .btn-cancel {
          padding: 0.6rem 1.2rem;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          color: #64748b;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-cancel:hover {
          background: #e2e8f0;
          border-color: #94a3b8;
          color: #334155;
        }

        .btn-save {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          background: linear-gradient(135deg, var(--accent), #fbbf24);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 0.6rem 1.2rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-save:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
        }

        /* ========== REPORT CONTENT (PRINTABLE) ========== */
        .report-content {
          padding: 0.5cm 0.5cm;
          font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans Devanagari", "Noto Sans", "Hind", "Mangal", Arial, sans-serif;
        }

        .gov-header {
          margin-bottom: 0.3cm;
          text-align: center;
        }

        .gov-header .line-center {
          margin: 0.05rem 0;
          font-size: 0.88rem;
        }

        .gov-header .title {
          font-weight: 800;
          font-size: 1.05rem;
          margin: 0.1rem 0;
          text-decoration: underline;
        }

        .gov-header .report-subtitle {
          font-size: 0.88rem;
          margin: 0.08rem 0;
          font-weight: 500;
        }

        /* ========== REPORT TABLE ========== */
        .gov-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.78rem;
          margin-bottom: 0.4cm;
        }

        .gov-table th,
        .gov-table td {
          border: 1.3px solid #000;
          padding: 0.18rem 0.25rem;
          line-height: 1.15;
        }

        .gov-table th {
          font-weight: 800;
          text-align: center;
          background: #f3f4f6;
          font-size: 0.76rem;
        }

        .gov-table td {
          vertical-align: top;
        }

        .gov-table tfoot td {
          text-align: right;
          font-weight: 700;
        }

        .time-cell {
          font-size: 0.72rem;
          line-height: 1.1;
        }

        .shera-cell {
          min-width: 60px;
        }

        .text-right {
          text-align: right;
        }

        /* ========== GOSAVARA BOX ========== */
        .gosavara-box {
          margin-top: 0.35cm;
        }

        .gosavara-inner {
          width: 9cm;
          border: 1.5px solid #000;
          padding: 0.25cm 0.3cm;
        }

        .gos-title {
          font-weight: 800;
          text-align: center;
          margin-bottom: 0.12cm;
          font-size: 0.88rem;
        }

        .gos-lines > div {
          padding: 0.05cm 0;
          border-bottom: 1px solid #bbb;
          font-size: 0.82rem;
        }

        .gos-lines > div:last-child {
          border-bottom: none;
        }

        /* ========== SIGNATURE SECTION ========== */
        .sign-section {
          margin-top: 0.6cm;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          text-align: right;
          gap: 0.1rem;
          font-size: 0.88rem;
        }

        .sign-name {
          font-size: 0.9rem;
          font-weight: 500;
        }

        .sign-designation {
          font-size: 0.88rem;
          font-weight: 500;
          text-align: center;
          align-self: center;
          margin-top: 0.05cm;
        }

        .sign-office,
        .sign-location {
          font-size: 0.85rem;
          margin-top: 0.08cm;
        }

        /* ========== PRINT STYLES ========== */
        @media print {
          body * {
            visibility: hidden;
          }

          .report-content,
          .report-content * {
            visibility: visible;
          }

          .report-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0.4cm 0.5cm;
          }

          .no-print {
            display: none !important;
          }

          @page {
            size: A4;
            margin: 0.8cm;
          }

          .gov-header {
            margin-bottom: 0.25cm;
          }

          .gov-header .line-center {
            margin: 0.03rem 0;
            font-size: 0.85rem;
          }

          .gov-header .title {
            font-size: 1rem;
            margin: 0.08rem 0;
          }

          .gov-header .report-subtitle {
            font-size: 0.85rem;
            margin: 0.05rem 0;
          }

          .gov-table {
            font-size: 9px;
            margin-bottom: 0.3cm;
          }

          .gov-table th,
          .gov-table td {
            padding: 0.15rem 0.22rem;
          }

          .time-cell {
            font-size: 8px;
          }

          .gosavara-box {
            margin-top: 0.3cm;
            break-inside: avoid;
          }

          .gosavara-inner {
            width: 8.5cm;
            padding: 0.2cm 0.25cm;
          }

          .gos-title {
            font-size: 0.85rem;
            margin-bottom: 0.1cm;
          }

          .gos-lines > div {
            padding: 0.04cm 0;
            font-size: 0.78rem;
          }

          .sign-section {
            margin-top: 0.5cm;
            break-inside: avoid;
          }

          .sign-name {
            font-size: 0.88rem;
          }

          .sign-designation {
            font-size: 0.85rem;
          }

          .sign-office,
          .sign-location {
            font-size: 0.82rem;
          }
        }

        /* ========== RESPONSIVE STYLES ========== */
        @media (max-width: 768px) {
          .dairy-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .dairy-header-actions {
            width: 100%;
            flex-direction: column;
          }

          .btn-add-dairy,
          .btn-report {
            width: 100%;
            justify-content: center;
          }

          .dairy-table-container {
            overflow-x: auto;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .time-input-group {
            gap: 0.3rem;
          }

          .report-controls {
            width: 100%;
          }

          .report-controls input[type="month"],
          .btn-print,
          .btn-download,
          .btn-edit-config {
            width: 100%;
          }

          .config-grid {
            grid-template-columns: 1fr;
          }

          .report-modal-content {
            width: 95vw;
          }

          .entry-options-actions {
            flex-direction: column;
          }

          .btn-edit-entry,
          .btn-delete-entry-modal {
            width: 100%;
          }

          .delete-actions {
            flex-direction: column;
          }

          .btn-cancel-delete,
          .btn-confirm-delete {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
};

export default Dairy;
