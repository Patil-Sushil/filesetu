import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { database } from "../firebase";
import { ref, onValue, remove, update, set } from "firebase/database";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  Trash2,
  Edit2,
  X,
  Save,
  Mail,
  Phone,
  User,
  Shield,
  Search,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Calendar,
} from "lucide-react";
import "../styles/UserManagement.css";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDEgCXNnqxyhwupjXglSivxjmqtXPTs1Ms",
  authDomain: "analysefiles.firebaseapp.com",
  databaseURL: "https://analysefiles-default-rtdb.firebaseio.com",
  projectId: "analysefiles",
  storageBucket: "analysefiles.firebasestorage.app",
  messagingSenderId: "436515745932",
  appId: "1:436515745932:web:1bbab619f87280a7004ba9",
  measurementId: "G-0EE2KGRX1H",
};

// Secondary Firebase app for user creation
let secondaryApp;
let secondaryAuth;

try {
  secondaryApp = initializeApp(firebaseConfig, "Secondary");
  secondaryAuth = getAuth(secondaryApp);
} catch (error) {
  const { getApp } = require("firebase/app");
  try {
    secondaryApp = getApp("Secondary");
    secondaryAuth = getAuth(secondaryApp);
  } catch (e) {
    console.error("Error initializing secondary app:", e);
  }
}

// User Details Modal
const UserDetailsModal = ({
  isOpen,
  onClose,
  user,
  onEdit,
  onDelete,
  currentUserId,
}) => {
  if (!isOpen || !user) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="user-details-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="user-details-modal"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="user-details-header">
            <div className="user-details-avatar-large">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <button className="btn-close-details" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className="user-details-content">
            <h2>{user.name}</h2>
            <span className={`role-badge-large ${user.role}`}>
              {user.role === "admin"
                ? "👑 Administrator"
                : "👤 Sub Administrator"}
            </span>

            <div className="user-info-grid">
              <div className="user-info-item">
                <Mail size={18} />
                <div>
                  <span className="info-label">Email</span>
                  <span className="info-value">{user.email}</span>
                </div>
              </div>

              <div className="user-info-item">
                <Phone size={18} />
                <div>
                  <span className="info-label">Mobile</span>
                  <span className="info-value">{user.mobile}</span>
                </div>
              </div>

              <div className="user-info-item">
                <Calendar size={18} />
                <div>
                  <span className="info-label">Created At</span>
                  <span className="info-value">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "N/A"}
                  </span>
                </div>
              </div>

              <div className="user-info-item">
                <Shield size={18} />
                <div>
                  <span className="info-label">User ID</span>
                  <span
                    className="info-value"
                    style={{ fontSize: "0.85rem", wordBreak: "break-all" }}
                  >
                    {user.uid}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="user-details-actions">
            <motion.button
              className="btn-action-edit"
              onClick={() => {
                onEdit(user);
                onClose();
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Edit2 size={18} />
              Edit User
            </motion.button>

            {user.uid !== currentUserId && (
              <motion.button
                className="btn-action-delete"
                onClick={() => {
                  onDelete(user);
                  onClose();
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Trash2 size={18} />
                Delete User
              </motion.button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Enhanced Delete Confirmation Dialog
const DeleteConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  userName,
  userEmail,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="delete-dialog-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="delete-dialog-box"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="delete-dialog-icon">
            <AlertTriangle size={48} />
          </div>

          <h3 className="delete-dialog-title">Delete User Account?</h3>

          <div className="delete-dialog-content">
            <p className="delete-warning-text">
              You are about to permanently delete this user account:
            </p>
            <div className="user-info-box">
              <div className="user-info-row">
                <User size={16} />
                <span>{userName}</span>
              </div>
              <div className="user-info-row">
                <Mail size={16} />
                <span>{userEmail}</span>
              </div>
            </div>
            <p className="delete-consequence-text">
              ⚠️ This action cannot be undone. All associated data will be
              permanently removed.
            </p>
          </div>

          <div className="delete-dialog-actions">
            <button className="btn-cancel-delete" onClick={onClose}>
              <X size={18} />
              Cancel
            </button>
            <button className="btn-confirm-delete" onClick={onConfirm}>
              <Trash2 size={18} />
              Yes, Delete User
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const UserManagement = ({ showToast }) => {
  const { currentUser, userRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    role: "subadmin",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    user: null,
  });
  const [passwordStrength, setPasswordStrength] = useState({
    level: "",
    color: "",
    text: "",
  });

  // Fetch all users
  useEffect(() => {
    if (userRole !== "admin") return;

    const usersRef = ref(database, "user");
    const unsubscribe = onValue(
      usersRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const usersData = [];
          snapshot.forEach((childSnapshot) => {
            usersData.push({
              uid: childSnapshot.key,
              ...childSnapshot.val(),
            });
          });
          setUsers(usersData);
        } else {
          setUsers([]);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching users:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userRole]);

  // Validation functions
  const validateName = (name) => {
    if (!name.trim()) return "Name is required";
    if (name.trim().length < 2) return "Name must be at least 2 characters";
    if (name.trim().length > 50) return "Name must not exceed 50 characters";
    if (!/^[a-zA-Z\s]+$/.test(name))
      return "Name can only contain letters and spaces";
    return "";
  };

  const validateEmail = (email) => {
    if (!email.trim()) return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    return "";
  };

  const validateMobile = (mobile) => {
    if (!mobile.trim()) return "Mobile number is required";
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobile.replace(/[\s-]/g, ""))) {
      return "Mobile number must be exactly 10 digits";
    }
    return "";
  };

  const validatePassword = (password) => {
    if (!password) return "Password is required";
    if (password.length < 6) return "Password must be at least 6 characters";
    if (password.length > 50) return "Password must not exceed 50 characters";
    return "";
  };

  const checkPasswordStrength = (password) => {
    if (!password) {
      setPasswordStrength({ level: "", color: "", text: "" });
      return;
    }

    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) {
      setPasswordStrength({ level: "weak", color: "#ef4444", text: "Weak" });
    } else if (strength <= 3) {
      setPasswordStrength({
        level: "medium",
        color: "#f59e0b",
        text: "Medium",
      });
    } else {
      setPasswordStrength({
        level: "strong",
        color: "#10b981",
        text: "Strong",
      });
    }
  };

  const validateForm = () => {
    const errors = {};

    const nameError = validateName(formData.name);
    if (nameError) errors.name = nameError;

    if (!editingUser) {
      const emailError = validateEmail(formData.email);
      if (emailError) errors.email = emailError;

      const passwordError = validatePassword(formData.password);
      if (passwordError) errors.password = passwordError;
    }

    const mobileError = validateMobile(formData.mobile);
    if (mobileError) errors.mobile = mobileError;

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormErrors((prev) => ({ ...prev, [name]: "" }));

    if (name === "mobile") {
      const numericValue = value.replace(/[^0-9]/g, "").slice(0, 10);
      setFormData((prev) => ({ ...prev, [name]: numericValue }));
      return;
    }

    if (name === "name") {
      const alphaValue = value.replace(/[^a-zA-Z\s]/g, "");
      setFormData((prev) => ({ ...prev, [name]: alphaValue }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "password") {
      checkPasswordStrength(value);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast?.error?.("Please fix all errors before submitting");
      return;
    }

    setIsSubmitting(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        formData.email.trim(),
        formData.password
      );

      const uid = userCredential.user.uid;

      await set(ref(database, `user/${uid}`), {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        mobile: formData.mobile.trim(),
        role: formData.role,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.uid,
      });

      await secondaryAuth.signOut();

      showToast?.success?.(`User "${formData.name}" created successfully!`);
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error("Error adding user:", error);
      const errorMessages = {
        "auth/email-already-in-use": "This email is already registered",
        "auth/invalid-email": "Invalid email address format",
        "auth/weak-password": "Password is too weak",
        "auth/operation-not-allowed": "User creation is not enabled",
      };
      showToast?.error?.(
        errorMessages[error.code] || `Error: ${error.message}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast?.error?.("Please fix all errors before submitting");
      return;
    }

    setIsSubmitting(true);

    try {
      const userRef = ref(database, `user/${editingUser.uid}`);
      await update(userRef, {
        name: formData.name.trim(),
        mobile: formData.mobile.trim(),
        role: formData.role,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.uid,
      });

      showToast?.success?.(`User "${formData.name}" updated successfully!`);
      setEditingUser(null);
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error("Error updating user:", error);
      showToast?.error?.(`Failed to update user: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      password: "",
    });
    setFormErrors({});
    setPasswordStrength({ level: "", color: "", text: "" });
    setShowAddModal(true);
  };

  const handleDeleteClick = (user) => {
    setDeleteDialog({ isOpen: true, user });
  };

  const handleDeleteConfirm = async () => {
    const user = deleteDialog.user;
    if (!user) return;

    try {
      await remove(ref(database, `user/${user.uid}`));
      showToast?.success?.(`User "${user.name}" has been permanently deleted`);
      setDeleteDialog({ isOpen: false, user: null });
    } catch (error) {
      console.error("Error deleting user:", error);
      showToast?.error?.(`Failed to delete user: ${error.message}`);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, user: null });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      mobile: "",
      password: "",
      role: "subadmin",
    });
    setFormErrors({});
    setPasswordStrength({ level: "", color: "", text: "" });
    setShowPassword(false);
    setEditingUser(null);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.mobile?.includes(searchTerm)
  );

  if (userRole !== "admin") {
    return (
      <div className="access-denied">
        <Shield size={48} />
        <h2>Access Denied</h2>
        <p>Only administrators can access user management.</p>
      </div>
    );
  }

  return (
    <div className="user-management-container">
      {/* Header */}
      <div className="um-header">
        <div>
          <h2>👥 User Management</h2>
          <p>
            Manage system users and permissions ({filteredUsers.length}{" "}
            {filteredUsers.length === 1 ? "user" : "users"})
          </p>
        </div>
        <motion.button
          className="btn-add-user"
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <UserPlus size={20} />
          Add New User
        </motion.button>
      </div>

      {/* Search Bar */}
      <div className="search-bar">
        <Search size={20} />
        <input
          type="text"
          placeholder="Search by name, email, mobile, or role..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Users Table */}
      <div className="users-table-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <User size={48} />
            <p>No users found</p>
            {searchTerm && (
              <button
                className="btn-clear-search"
                onClick={() => setSearchTerm("")}
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Role</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filteredUsers.map((user) => (
                  <motion.tr
                    key={user.uid}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => handleUserClick(user)}
                    className="clickable-row"
                    whileHover={{ backgroundColor: "#f8fafc", scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">
                          {user.name?.charAt(0).toUpperCase()}
                        </div>
                        <span>{user.name}</span>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.mobile}</td>
                    <td>
                      <span className={`role-badge ${user.role}`}>
                        {user.role === "admin" ? "👑 Admin" : "👤 Sub Admin"}
                      </span>
                    </td>
                    <td>
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "N/A"}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      {/* User Details Modal */}
      <UserDetailsModal
        isOpen={showUserDetails}
        onClose={() => setShowUserDetails(false)}
        user={selectedUser}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        currentUserId={currentUser?.uid}
      />

      {/* Add/Edit User Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!isSubmitting) {
                setShowAddModal(false);
                resetForm();
              }
            }}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div>
                  <h3>{editingUser ? "✏️ Edit User" : "➕ Add New User"}</h3>
                  <p className="modal-subtitle">
                    {editingUser
                      ? "Update user information"
                      : "Create a new user account"}
                  </p>
                </div>
                <button
                  className="btn-close"
                  onClick={() => {
                    if (!isSubmitting) {
                      setShowAddModal(false);
                      resetForm();
                    }
                  }}
                  disabled={isSubmitting}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={editingUser ? handleUpdateUser : handleAddUser}>
                {/* Name Field */}
                <div className="form-group">
                  <label htmlFor="name">
                    <User size={16} />
                    Full Name *
                  </label>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., John Doe"
                    disabled={isSubmitting}
                    className={formErrors.name ? "error" : ""}
                    maxLength="50"
                  />
                  {formErrors.name && (
                    <span className="error-message">
                      <AlertTriangle size={14} />
                      {formErrors.name}
                    </span>
                  )}
                  {!formErrors.name && formData.name && (
                    <span className="success-message">
                      <CheckCircle2 size={14} />
                      Looks good!
                    </span>
                  )}
                </div>

                {/* Email Field */}
                <div className="form-group">
                  <label htmlFor="email">
                    <Mail size={16} />
                    Email Address *
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g., john@example.com"
                    disabled={!!editingUser || isSubmitting}
                    className={formErrors.email ? "error" : ""}
                  />
                  {formErrors.email && (
                    <span className="error-message">
                      <AlertTriangle size={14} />
                      {formErrors.email}
                    </span>
                  )}
                  {!formErrors.email && formData.email && !editingUser && (
                    <span className="success-message">
                      <CheckCircle2 size={14} />
                      Valid email format
                    </span>
                  )}
                  {editingUser && (
                    <span className="info-message">
                      ℹ️ Email cannot be changed after creation
                    </span>
                  )}
                </div>

                {/* Mobile Field */}
                <div className="form-group">
                  <label htmlFor="mobile">
                    <Phone size={16} />
                    Mobile Number *
                  </label>
                  <input
                    id="mobile"
                    type="tel"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleChange}
                    placeholder="e.g., 9876543210"
                    maxLength="10"
                    disabled={isSubmitting}
                    className={formErrors.mobile ? "error" : ""}
                  />
                  {formErrors.mobile && (
                    <span className="error-message">
                      <AlertTriangle size={14} />
                      {formErrors.mobile}
                    </span>
                  )}
                  {!formErrors.mobile && formData.mobile.length === 10 && (
                    <span className="success-message">
                      <CheckCircle2 size={14} />
                      Valid mobile number
                    </span>
                  )}
                  {formData.mobile.length > 0 &&
                    formData.mobile.length < 10 &&
                    !formErrors.mobile && (
                      <span className="info-message">
                        {10 - formData.mobile.length} more digit
                        {10 - formData.mobile.length !== 1 ? "s" : ""} required
                      </span>
                    )}
                </div>

                {/* Password Field */}
                {!editingUser && (
                  <div className="form-group">
                    <label htmlFor="password">🔒 Password *</label>
                    <div className="password-input-wrapper">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Min 6 characters"
                        minLength="6"
                        maxLength="50"
                        disabled={isSubmitting}
                        className={formErrors.password ? "error" : ""}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex="-1"
                      >
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                    {formErrors.password && (
                      <span className="error-message">
                        <AlertTriangle size={14} />
                        {formErrors.password}
                      </span>
                    )}
                    {passwordStrength.level && !formErrors.password && (
                      <div className="password-strength">
                        <div className="strength-bar-container">
                          <div
                            className={`strength-bar strength-${passwordStrength.level}`}
                            style={{ backgroundColor: passwordStrength.color }}
                          ></div>
                        </div>
                        <span
                          style={{
                            color: passwordStrength.color,
                            fontSize: "0.85rem",
                            fontWeight: "600",
                          }}
                        >
                          {passwordStrength.text} password
                        </span>
                      </div>
                    )}
                    <span className="info-message" style={{ marginTop: "4px" }}>
                      💡 Use 8+ characters with uppercase, numbers & symbols
                    </span>
                  </div>
                )}

                {/* Role Field */}
                <div className="form-group">
                  <label htmlFor="role">
                    <Shield size={16} />
                    User Role *
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  >
                    <option value="subadmin">👤 Sub Administrator</option>
                    <option value="admin">👑 Administrator</option>
                  </select>
                  <span className="info-message">
                    {formData.role === "admin"
                      ? "👑 Full access to all features"
                      : "👤 Limited access - files only"}
                  </span>
                </div>

                {/* Form Actions */}
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    disabled={isSubmitting}
                  >
                    <X size={16} />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="spinner-small"></div>
                        {editingUser ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        {editingUser ? "Update User" : "Create User"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        userName={deleteDialog.user?.name}
        userEmail={deleteDialog.user?.email}
      />
    </div>
  );
};

export default UserManagement;
