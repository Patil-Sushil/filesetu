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
  ChevronRight,
  Lock,
} from "lucide-react";

// ============================================================
// FIREBASE CONFIGURATION
// ============================================================

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Secondary Firebase app for user creation
let secondaryApp;
let secondaryAuth;

try {
  secondaryApp = initializeApp(firebaseConfig, "Secondary");
  secondaryAuth = getAuth(secondaryApp);
} catch (error) {
  try {
    const { getApp } = require("firebase/app");
    secondaryApp = getApp("Secondary");
    secondaryAuth = getAuth(secondaryApp);
  } catch (e) {
    console.error("Error initializing secondary app:", e);
  }
}

// ============================================================
// USER DETAILS MODAL COMPONENT
// ============================================================

const UserDetailsModal = ({
  isOpen,
  onClose,
  user,
  onEdit,
  onDelete,
  currentUserId,
}) => {
  if (!isOpen || !user) return null;

  // Check if this is the default admin
  const isDefaultAdmin = user.isDefaultAdmin === true;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[3000] p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-2xl w-[90%] max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-6 pb-4 flex flex-col items-center text-center">
            <div className="w-18 h-18 rounded-full bg-white/30 backdrop-blur-md text-white flex items-center justify-center font-bold text-3xl border-4 border-white/50 shadow-lg mb-3">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <button
              className="absolute top-3 right-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm border-none rounded-full w-8 h-8 flex items-center justify-center cursor-pointer text-white transition-all duration-200 hover:rotate-90"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-white mb-1.5">{user.name}</h2>
            <div className="flex items-center gap-2">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-white/25 text-white border border-white/30">
                {user.role === "admin"
                  ? "👑 Administrator"
                  : "👤 Sub Administrator"}
              </span>
              {isDefaultAdmin && (
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-yellow-400/90 text-yellow-900 border border-yellow-500/50">
                  🔒 Default
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
            <div className="space-y-0 bg-white rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 p-4 bg-white border-b border-gray-200 hover:bg-purple-50 transition-colors duration-200">
                <Mail size={18} className="text-purple-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                    Email
                  </span>
                  <span className="block text-sm font-medium text-gray-800 break-words">
                    {user.email}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-white border-b border-gray-200 hover:bg-purple-50 transition-colors duration-200">
                <Phone size={18} className="text-purple-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                    Mobile
                  </span>
                  <span className="block text-sm font-medium text-gray-800">
                    {user.mobile}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-white border-b border-gray-200 hover:bg-purple-50 transition-colors duration-200">
                <Calendar size={18} className="text-purple-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                    Created At
                  </span>
                  <span className="block text-sm font-medium text-gray-800">
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

              <div className="flex items-center gap-3 p-4 bg-white hover:bg-purple-50 transition-colors duration-200">
                <Shield size={18} className="text-purple-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                    User ID
                  </span>
                  <span className="block text-xs font-medium text-gray-800 break-all">
                    {user.uid}
                  </span>
                </div>
              </div>
            </div>

            {/* Default Admin Notice */}
            {isDefaultAdmin && (
              <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                <div className="flex items-center gap-2 text-yellow-800">
                  <Lock size={16} className="flex-shrink-0" />
                  <span className="text-sm font-semibold">
                    This is the default administrator account. Role cannot be
                    changed.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 p-5 border-t border-gray-200 bg-white flex-col sm:flex-row">
            <motion.button
              className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl font-semibold text-sm shadow-lg shadow-purple-500/30 transition-all duration-200 flex items-center justify-center gap-2"
              onClick={() => {
                onEdit(user);
                onClose();
              }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Edit2 size={18} />
              Edit User
            </motion.button>

            {user.uid !== currentUserId && !isDefaultAdmin && (
              <motion.button
                className="flex-1 py-3 px-4 bg-white hover:bg-red-500 text-red-500 hover:text-white border-2 border-red-500 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:shadow-red-500/30"
                onClick={() => {
                  onDelete(user);
                  onClose();
                }}
                whileHover={{ scale: 1.02, y: -2 }}
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

// ============================================================
// DELETE CONFIRMATION DIALOG COMPONENT
// ============================================================

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
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[4000] p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-2xl p-6 md:p-8 w-[90%] max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-20 h-20 mx-auto mb-5 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center text-red-500">
            <AlertTriangle size={48} />
          </div>

          <h3 className="text-center text-xl md:text-2xl font-bold text-gray-800 mb-4">
            Delete User Account?
          </h3>

          <div className="mb-6">
            <p className="text-center text-gray-600 mb-4 text-sm md:text-base">
              You are about to permanently delete this user account:
            </p>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-gray-200 mb-2">
                <User size={16} className="text-gray-600 flex-shrink-0" />
                <span className="font-semibold text-gray-800">{userName}</span>
              </div>
              <div className="flex items-center gap-2.5 pt-2">
                <Mail size={16} className="text-gray-600 flex-shrink-0" />
                <span className="font-semibold text-gray-800 break-all text-sm">
                  {userEmail}
                </span>
              </div>
            </div>
            <p className="text-center text-red-600 text-xs md:text-sm font-semibold mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              ⚠️ This action cannot be undone. All associated data will be
              permanently removed.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2"
              onClick={onClose}
            >
              <X size={18} />
              Cancel
            </button>
            <button
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold shadow-lg shadow-red-500/50 hover:shadow-red-500/60 transition-all duration-200 flex items-center justify-center gap-2"
              onClick={onConfirm}
            >
              <Trash2 size={18} />
              Yes, Delete User
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ============================================================
// MAIN USER MANAGEMENT COMPONENT
// ============================================================

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

  // ============================================================
  // CHECK IF USER IS DEFAULT ADMIN
  // ============================================================

  const isDefaultAdminUser = (user) => {
    return user?.isDefaultAdmin === true;
  };

  // Check if role editing is disabled for a user
  const isRoleEditDisabled = (user) => {
    // Disable role editing for default admin
    if (isDefaultAdminUser(user)) return true;
    // Optionally: Also prevent users from changing their own role
    // if (user?.uid === currentUser?.uid) return true;
    return false;
  };

  // ============================================================
  // FETCH USERS
  // ============================================================

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
      },
    );

    return () => unsubscribe();
  }, [userRole]);

  // ============================================================
  // VALIDATION FUNCTIONS
  // ============================================================

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

  // ============================================================
  // FORM HANDLERS
  // ============================================================

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
        formData.password,
      );

      const uid = userCredential.user.uid;

      await set(ref(database, `user/${uid}`), {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        mobile: formData.mobile.trim(),
        role: formData.role,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.uid,
        isDefaultAdmin: false, // New users are never default admin
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
        errorMessages[error.code] || `Error: ${error.message}`,
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

      // Prepare update data
      const updateData = {
        name: formData.name.trim(),
        mobile: formData.mobile.trim(),
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.uid,
      };

      // Only update role if the user is NOT a default admin
      if (!isDefaultAdminUser(editingUser)) {
        updateData.role = formData.role;
      } else {
        // Show a warning if someone tries to change default admin role
        if (formData.role !== editingUser.role) {
          showToast?.warning?.(
            "Cannot change the role of the default administrator",
          );
        }
      }

      await update(userRef, updateData);

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

  // ============================================================
  // ACTION HANDLERS
  // ============================================================

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
    // Prevent deletion of default admin
    if (isDefaultAdminUser(user)) {
      showToast?.error?.("Cannot delete the default administrator account");
      return;
    }
    setDeleteDialog({ isOpen: true, user });
  };

  const handleDeleteConfirm = async () => {
    const user = deleteDialog.user;
    if (!user) return;

    // Double-check: Prevent deletion of default admin
    if (isDefaultAdminUser(user)) {
      showToast?.error?.("Cannot delete the default administrator account");
      setDeleteDialog({ isOpen: false, user: null });
      return;
    }

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

  // ============================================================
  // FILTERED USERS
  // ============================================================

  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.mobile?.includes(searchTerm),
  );

  // ============================================================
  // ACCESS DENIED CHECK
  // ============================================================

  if (userRole !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-2xl shadow-lg p-8 m-8">
        <Shield size={48} className="text-purple-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
        <p className="text-gray-600">
          Only administrators can access user management.
        </p>
      </div>
    );
  }

  // ============================================================
  // MAIN RENDER
  // ============================================================

  return (
    <div className="max-w-full mx-auto p-4 md:p-6 lg:p-8 w-full transition-all duration-300">
      {/* ========================================
          HEADER SECTION
          ======================================== */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            👥 User Management
          </h2>
          <p className="text-gray-600 text-sm md:text-base">
            Manage system users and permissions ({filteredUsers.length}{" "}
            {filteredUsers.length === 1 ? "user" : "users"})
          </p>
        </div>
        <motion.button
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl font-semibold shadow-lg shadow-purple-500/50 transition-all duration-300 whitespace-nowrap"
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <UserPlus size={20} />
          <span className="hidden sm:inline">Add New User</span>
          <span className="sm:hidden">Add User</span>
        </motion.button>
      </div>

      {/* ========================================
          SEARCH BAR
          ======================================== */}
      <div className="relative mb-6 md:mb-8">
        <Search
          size={20}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none z-10"
        />
        <input
          type="text"
          placeholder="Search by name, email, mobile, or role..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-12 py-3 md:py-4 border-2 border-purple-200 rounded-xl text-base focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all duration-300 bg-white"
        />
        {searchTerm && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-purple-100 hover:bg-purple-200 text-purple-600 p-2 rounded-full transition-all duration-200 z-10"
            onClick={() => setSearchTerm("")}
            aria-label="Clear search"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* ========================================
          DESKTOP TABLE VIEW
          ======================================== */}
      <div className="hidden lg:block bg-white rounded-2xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <User size={48} className="text-gray-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">
              No users found
            </h3>
            <p className="text-gray-600 mb-4 text-center">
              {searchTerm
                ? "Try adjusting your search terms"
                : "Start by adding your first user"}
            </p>
            {searchTerm && (
              <button
                className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                onClick={() => setSearchTerm("")}
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider whitespace-nowrap">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider whitespace-nowrap">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider whitespace-nowrap">
                    Mobile
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider whitespace-nowrap">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider whitespace-nowrap">
                    Created At
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredUsers.map((user, index) => (
                    <motion.tr
                      key={user.uid}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                      onClick={() => handleUserClick(user)}
                      className="border-b border-gray-200 hover:bg-purple-50 cursor-pointer transition-all duration-200"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-purple-700 text-white flex items-center justify-center font-semibold text-lg shadow-md flex-shrink-0">
                            {user.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800">
                              {user.name}
                            </span>
                            {isDefaultAdminUser(user) && (
                              <Lock
                                size={14}
                                className="text-yellow-600"
                                title="Default Admin"
                              />
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700 max-w-xs truncate">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                        {user.mobile}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap ${
                              user.role === "admin"
                                ? "bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md shadow-pink-500/30"
                                : "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/30"
                            }`}
                          >
                            {user.role === "admin"
                              ? "👑 Admin"
                              : "👤 Sub Admin"}
                          </span>
                          {isDefaultAdminUser(user) && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-300">
                              🔒 Default
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm whitespace-nowrap">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              },
                            )
                          : "N/A"}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================
          MOBILE CARD VIEW
          ======================================== */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 bg-white rounded-2xl">
            <User size={48} className="text-gray-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">
              No users found
            </h3>
            <p className="text-gray-600 text-center mb-4">
              {searchTerm
                ? "Try adjusting your search terms"
                : "Start by adding your first user"}
            </p>
            {searchTerm && (
              <button
                className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold transition-all duration-200"
                onClick={() => setSearchTerm("")}
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <AnimatePresence>
            {filteredUsers.map((user, index) => (
              <motion.div
                key={user.uid}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => handleUserClick(user)}
                className="bg-white rounded-xl p-4 border-2 border-purple-100 hover:border-purple-300 hover:shadow-md cursor-pointer transition-all duration-200"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-purple-700 text-white flex items-center justify-center font-bold text-lg shadow-md flex-shrink-0">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-800 truncate">
                        {user.name}
                      </h3>
                      {isDefaultAdminUser(user) && (
                        <Lock
                          size={14}
                          className="text-yellow-600 flex-shrink-0"
                          title="Default Admin"
                        />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {user.email}
                    </p>
                  </div>
                  <ChevronRight
                    size={20}
                    className="text-purple-400 flex-shrink-0"
                  />
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                      user.role === "admin"
                        ? "bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-sm"
                        : "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm"
                    }`}
                  >
                    {user.role === "admin"
                      ? "👑 Administrator"
                      : "👤 Sub Administrator"}
                  </span>
                  {isDefaultAdminUser(user) && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-300">
                      🔒 Default
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 md:gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <Phone
                      size={14}
                      className="text-purple-400 flex-shrink-0"
                    />
                    <span className="truncate">{user.mobile}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar
                      size={14}
                      className="text-purple-400 flex-shrink-0"
                    />
                    <span className="truncate">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* ========================================
          USER DETAILS MODAL
          ======================================== */}
      <UserDetailsModal
        isOpen={showUserDetails}
        onClose={() => setShowUserDetails(false)}
        user={selectedUser}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        currentUserId={currentUser?.uid}
      />

      {/* ========================================
          ADD/EDIT USER MODAL
          ======================================== */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 overflow-y-auto"
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
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden my-8"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-start p-4 md:p-6 border-b-2 border-purple-100 flex-shrink-0 bg-white sticky top-0 z-10">
                <div className="flex-1">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-1">
                    {editingUser ? "✏️ Edit User" : "➕ Add New User"}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {editingUser
                      ? "Update user information"
                      : "Create a new user account"}
                  </p>
                  {editingUser && isDefaultAdminUser(editingUser) && (
                    <div className="flex items-center gap-2 mt-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg w-fit">
                      <Lock size={14} className="text-yellow-600" />
                      <span className="text-xs font-semibold text-yellow-700">
                        Default Admin - Role cannot be changed
                      </span>
                    </div>
                  )}
                </div>
                <button
                  className="p-2 bg-purple-100 hover:bg-purple-200 text-purple-600 rounded-lg transition-all duration-200 flex items-center justify-center flex-shrink-0 ml-2"
                  onClick={() => {
                    if (!isSubmitting) {
                      setShowAddModal(false);
                      resetForm();
                    }
                  }}
                  disabled={isSubmitting}
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form */}
              <form
                onSubmit={editingUser ? handleUpdateUser : handleAddUser}
                className="flex flex-col flex-1 overflow-hidden"
              >
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 space-y-4 md:space-y-5">
                  {/* Name Field */}
                  <div>
                    <label
                      htmlFor="name"
                      className="flex items-center gap-2 font-semibold text-gray-700 mb-2 text-sm"
                    >
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
                      className={`w-full px-4 py-3 border-2 rounded-xl text-base transition-all duration-300 focus:outline-none focus:ring-4 ${
                        formErrors.name
                          ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-100"
                          : "border-purple-200 bg-white focus:border-purple-400 focus:ring-purple-100"
                      }`}
                      maxLength={50}
                      autoComplete="name"
                    />
                    {formErrors.name && (
                      <span className="flex items-center gap-1.5 text-red-500 text-sm mt-1.5 font-medium">
                        <AlertTriangle size={14} />
                        {formErrors.name}
                      </span>
                    )}
                    {!formErrors.name && formData.name && (
                      <span className="flex items-center gap-1.5 text-green-500 text-sm mt-1.5 font-medium">
                        <CheckCircle2 size={14} />
                        Looks good!
                      </span>
                    )}
                  </div>

                  {/* Email Field */}
                  <div>
                    <label
                      htmlFor="email"
                      className="flex items-center gap-2 font-semibold text-gray-700 mb-2 text-sm"
                    >
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
                      className={`w-full px-4 py-3 border-2 rounded-xl text-base transition-all duration-300 focus:outline-none focus:ring-4 ${
                        formErrors.email
                          ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-100"
                          : editingUser
                            ? "border-gray-200 bg-gray-100 cursor-not-allowed"
                            : "border-purple-200 bg-white focus:border-purple-400 focus:ring-purple-100"
                      }`}
                      autoComplete="email"
                    />
                    {formErrors.email && (
                      <span className="flex items-center gap-1.5 text-red-500 text-sm mt-1.5 font-medium">
                        <AlertTriangle size={14} />
                        {formErrors.email}
                      </span>
                    )}
                    {!formErrors.email && formData.email && !editingUser && (
                      <span className="flex items-center gap-1.5 text-green-500 text-sm mt-1.5 font-medium">
                        <CheckCircle2 size={14} />
                        Valid email format
                      </span>
                    )}
                    {editingUser && (
                      <span className="flex items-center gap-1.5 text-gray-600 text-sm mt-1.5">
                        ℹ️ Email cannot be changed after creation
                      </span>
                    )}
                  </div>

                  {/* Mobile Field */}
                  <div>
                    <label
                      htmlFor="mobile"
                      className="flex items-center gap-2 font-semibold text-gray-700 mb-2 text-sm"
                    >
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
                      maxLength={10}
                      disabled={isSubmitting}
                      className={`w-full px-4 py-3 border-2 rounded-xl text-base transition-all duration-300 focus:outline-none focus:ring-4 ${
                        formErrors.mobile
                          ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-100"
                          : "border-purple-200 bg-white focus:border-purple-400 focus:ring-purple-100"
                      }`}
                      autoComplete="tel"
                      inputMode="numeric"
                    />
                    {formErrors.mobile && (
                      <span className="flex items-center gap-1.5 text-red-500 text-sm mt-1.5 font-medium">
                        <AlertTriangle size={14} />
                        {formErrors.mobile}
                      </span>
                    )}
                    {!formErrors.mobile && formData.mobile.length === 10 && (
                      <span className="flex items-center gap-1.5 text-green-500 text-sm mt-1.5 font-medium">
                        <CheckCircle2 size={14} />
                        Valid mobile number
                      </span>
                    )}
                    {formData.mobile.length > 0 &&
                      formData.mobile.length < 10 &&
                      !formErrors.mobile && (
                        <span className="text-gray-600 text-sm mt-1.5 block">
                          {10 - formData.mobile.length} more digit
                          {10 - formData.mobile.length !== 1 ? "s" : ""}{" "}
                          required
                        </span>
                      )}
                  </div>

                  {/* Password Field */}
                  {!editingUser && (
                    <div>
                      <label
                        htmlFor="password"
                        className="flex items-center gap-2 font-semibold text-gray-700 mb-2 text-sm"
                      >
                        🔒 Password *
                      </label>
                      <div className="relative">
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="Min 6 characters"
                          minLength={6}
                          maxLength={50}
                          disabled={isSubmitting}
                          className={`w-full px-4 py-3 pr-12 border-2 rounded-xl text-base transition-all duration-300 focus:outline-none focus:ring-4 ${
                            formErrors.password
                              ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-100"
                              : "border-purple-200 bg-white focus:border-purple-400 focus:ring-purple-100"
                          }`}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-purple-600 p-1 transition-colors duration-200"
                          onClick={() => setShowPassword(!showPassword)}
                          tabIndex={-1}
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>
                      {formErrors.password && (
                        <span className="flex items-center gap-1.5 text-red-500 text-sm mt-1.5 font-medium">
                          <AlertTriangle size={14} />
                          {formErrors.password}
                        </span>
                      )}
                      {passwordStrength.level && !formErrors.password && (
                        <div className="mt-2 space-y-1.5">
                          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 rounded-full ${
                                passwordStrength.level === "weak"
                                  ? "w-1/3"
                                  : passwordStrength.level === "medium"
                                    ? "w-2/3"
                                    : "w-full"
                              }`}
                              style={{
                                backgroundColor: passwordStrength.color,
                              }}
                            ></div>
                          </div>
                          <span
                            className="text-sm font-semibold"
                            style={{ color: passwordStrength.color }}
                          >
                            {passwordStrength.text} password
                          </span>
                        </div>
                      )}
                      <span className="text-gray-600 text-sm mt-1.5 block">
                        💡 Use 8+ characters with uppercase, numbers & symbols
                      </span>
                    </div>
                  )}

                  {/* Role Field */}
                  <div>
                    <label
                      htmlFor="role"
                      className="flex items-center gap-2 font-semibold text-gray-700 mb-2 text-sm"
                    >
                      <Shield size={16} />
                      User Role *
                      {editingUser && isRoleEditDisabled(editingUser) && (
                        <Lock size={14} className="text-yellow-600 ml-1" />
                      )}
                    </label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      disabled={
                        isSubmitting ||
                        (editingUser && isRoleEditDisabled(editingUser))
                      }
                      className={`w-full px-4 py-3 border-2 rounded-xl text-base transition-all duration-300 focus:outline-none focus:ring-4 ${
                        editingUser && isRoleEditDisabled(editingUser)
                          ? "border-yellow-300 bg-yellow-50 cursor-not-allowed text-gray-600"
                          : "border-purple-200 bg-white focus:border-purple-400 focus:ring-purple-100"
                      }`}
                    >
                      <option value="subadmin">👤 Sub Administrator</option>
                      <option value="admin">👑 Administrator</option>
                    </select>

                    {/* Show different messages based on context */}
                    {editingUser && isRoleEditDisabled(editingUser) ? (
                      <div className="flex items-center gap-2 mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <Lock
                          size={16}
                          className="text-yellow-600 flex-shrink-0"
                        />
                        <span className="text-yellow-700 text-sm font-medium">
                          The role of the default administrator cannot be
                          changed for security reasons.
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-600 text-sm mt-1.5 block">
                        {formData.role === "admin"
                          ? "👑 Full access to all features"
                          : "👤 Limited access - files only"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex flex-col sm:flex-row gap-3 p-4 md:p-6 border-t-2 border-purple-100 bg-gray-50 flex-shrink-0 sticky bottom-0 z-10">
                  <button
                    type="button"
                    className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl font-semibold shadow-lg shadow-purple-500/50 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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

      {/* ========================================
          DELETE CONFIRMATION DIALOG
          ======================================== */}
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
