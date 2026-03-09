import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, X } from "lucide-react";

const ProfileModal = ({ onClose }) => {
  const { currentUser, userName, userRole } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      setLoading(true);

      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword,
      );

      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);

      setMessage("✅ Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setMessage("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const avatarLetter = (userName || currentUser?.email || "U")[0].toUpperCase();

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[1000]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-2xl w-[420px] p-6 relative"
          initial={{ scale: 0.85, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-red-500"
          >
            <X size={20} />
          </button>

          {/* Avatar */}
          <div className="flex flex-col items-center mb-5">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {avatarLetter}
            </div>

            <h2 className="text-lg font-bold mt-2 text-gray-800">
              {userName || currentUser?.email}
            </h2>

            <span className="text-sm text-gray-500">
              {userRole === "admin" ? "Administrator" : "Sub Admin"}
            </span>
          </div>

          {/* User Info */}
          <div className="mb-4 text-sm space-y-1 text-gray-700">
            <p>
              <b>Email:</b> {currentUser?.email}
            </p>
          </div>

          <hr className="mb-4" />

          {/* Change Password */}
          <h3 className="font-semibold mb-3">🔑 Change Password</h3>

          <form onSubmit={handlePasswordChange} className="space-y-3">
            {/* Current Password */}
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                placeholder="Current Password"
                className="border rounded w-full p-2 pr-10"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />

              <button
                type="button"
                className="absolute right-3 top-2.5 text-gray-500"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* New Password */}
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                placeholder="New Password"
                className="border rounded w-full p-2 pr-10"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />

              <button
                type="button"
                className="absolute right-3 top-2.5 text-gray-500"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white py-2 rounded-lg font-semibold transition"
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>

          {/* Message */}
          {message && (
            <motion.p
              className="mt-3 text-sm text-center font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {message}
            </motion.p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProfileModal;
