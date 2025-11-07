import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db, storage, database } from "../firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { ref as dbRef, push } from "firebase/database";
import { v4 as uuidv4 } from "uuid";
import { useParams } from "react-router-dom";
import { get, child, set } from "firebase/database";
import { motion, AnimatePresence } from "framer-motion";

// Toast Notification Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getBackgroundColor = () => {
    switch (type) {
      case "success":
        return "linear-gradient(135deg, #10b981, #059669)";
      case "error":
        return "linear-gradient(135deg, #ef4444, #dc2626)";
      case "warning":
        return "linear-gradient(135deg, #f59e0b, #d97706)";
      case "info":
        return "linear-gradient(135deg, #3b82f6, #2563eb)";
      default:
        return "linear-gradient(135deg, #4f46e5, #9333ea)";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "info":
        return "ℹ️";
      default:
        return "📢";
    }
  };

  return (
    <motion.div
      className="toast-notification"
      style={{ background: getBackgroundColor() }}
      initial={{ opacity: 0, x: 300, scale: 0.3 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.5 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
    >
      <span className="toast-icon">{getIcon()}</span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose}>
        ✕
      </button>
    </motion.div>
  );
};

const FileUpload = ({ selectedId }) => {
  const { currentUser, userRole, userName } = useAuth();
  const { id } = useParams();
  const [isEditing, setIsEditing] = useState(false);
  const [initialFileInfo, setInitialFileInfo] = useState(null);
  const hasLoadedData = useRef(false);
  const hasShownToast = useRef(false);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validatingInward, setValidatingInward] = useState(false);
  const [inwardNumberExists, setInwardNumberExists] = useState(false);

  const [formData, setFormData] = useState({
    department: "",
    publicRepType: "",
    receivedFrom: "",
    subject: "",
    allocatedTo: "",
    status: "Pending",
    inwardNumber: "",
    inwardDate: "",
    receivingDate: "",
    description: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [toasts, setToasts] = useState([]);

  // File types mapping
  const supportedFileTypes = {
    "application/pdf": { icon: "📄", category: "document", label: "PDF" },
    "application/msword": { icon: "📝", category: "document", label: "DOC" },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      icon: "📝",
      category: "document",
      label: "DOCX",
    },
    "application/vnd.ms-excel": {
      icon: "📊",
      category: "spreadsheet",
      label: "XLS",
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
      icon: "📊",
      category: "spreadsheet",
      label: "XLSX",
    },
    "text/csv": { icon: "📈", category: "spreadsheet", label: "CSV" },
    "image/jpeg": { icon: "🖼️", category: "image", label: "JPG" },
    "image/jpg": { icon: "🖼️", category: "image", label: "JPG" },
    "image/png": { icon: "🖼️", category: "image", label: "PNG" },
    "image/gif": { icon: "🖼️", category: "image", label: "GIF" },
    "image/bmp": { icon: "🖼️", category: "image", label: "BMP" },
    "image/webp": { icon: "🖼️", category: "image", label: "WebP" },
    "text/plain": { icon: "📃", category: "text", label: "TXT" },
    "text/rtf": { icon: "📃", category: "text", label: "RTF" },
    "application/vnd.ms-powerpoint": {
      icon: "📊",
      category: "presentation",
      label: "PPT",
    },
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      {
        icon: "📊",
        category: "presentation",
        label: "PPTX",
      },
    "application/zip": { icon: "🗂️", category: "archive", label: "ZIP" },
    "application/x-rar-compressed": {
      icon: "🗂️",
      category: "archive",
      label: "RAR",
    },
  };

  const showToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Check if inward number exists
  const checkInwardNumberExists = async (inwardNumber) => {
    if (!inwardNumber.trim()) {
      setInwardNumberExists(false);
      return false;
    }

    setValidatingInward(true);
    try {
      const dbRefInstance = dbRef(database);
      const snapshot = await get(child(dbRefInstance, "data"));

      if (snapshot.exists()) {
        const data = snapshot.val();
        const exists = Object.entries(data).some(([key, value]) => {
          if (isEditing && key === selectedId) return false;
          return value.inwardNumber === inwardNumber;
        });

        setInwardNumberExists(exists);
        if (exists) {
          showToast("⚠️ Inward Number already exists!", "warning");
        }
        return exists;
      }

      setInwardNumberExists(false);
      return false;
    } catch (error) {
      console.error("Error checking inward number:", error);
      return false;
    } finally {
      setValidatingInward(false);
    }
  };

  // Debounce inward number validation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.inwardNumber) {
        checkInwardNumberExists(formData.inwardNumber);
      } else {
        setInwardNumberExists(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.inwardNumber]);

  useEffect(() => {
    hasLoadedData.current = false;
    hasShownToast.current = false;
  }, [selectedId]);

  useEffect(() => {
    if (selectedId && !hasLoadedData.current) {
      const fetchData = async () => {
        try {
          const dbRefInstance = dbRef(database);
          const snapshot = await get(
            child(dbRefInstance, `data/${selectedId}`)
          );

          if (snapshot.exists()) {
            const data = snapshot.val();
            setFormData({
              department: data.department || "",
              publicRepType: data.publicRepType || "",
              receivedFrom: data.receivedFrom || "",
              subject: data.subject || "",
              allocatedTo: data.allocatedTo || "",
              status: data.status || "Pending",
              inwardNumber: data.inwardNumber || "",
              inwardDate: data.inwardDate || "",
              receivingDate: data.receivingDate || "",
              description: data.description || "",
            });
            setInitialFileInfo(data);
            setIsEditing(true);
            hasLoadedData.current = true;

            if (!hasShownToast.current) {
              showToast("📂 File loaded successfully", "success");
              hasShownToast.current = true;
            }
          } else {
            showToast("⚠️ No file data found", "warning");
          }
        } catch (error) {
          console.error("Error fetching record:", error);
          showToast("❌ Error loading file", "error");
        }
      };
      fetchData();
    }
  }, [selectedId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getFileIcon = (fileType) => supportedFileTypes[fileType]?.icon || "📎";
  const getFileCategory = (fileType) =>
    supportedFileTypes[fileType]?.category || "other";
  const getFileLabel = (fileType) =>
    supportedFileTypes[fileType]?.label || "Unknown";

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const validateFileType = (file) => {
    const allowedTypes = Object.keys(supportedFileTypes);
    if (!allowedTypes.includes(file.type)) {
      showToast(
        `❌ Unsupported file format: ${file.type.split("/")[1].toUpperCase()}`,
        "error"
      );
      return false;
    }
    return true;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!validateFileType(file)) {
        e.target.value = "";
        return;
      }

      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        showToast("⚠️ File size must be less than 50MB", "warning");
        e.target.value = "";
        return;
      }

      setSelectedFile(file);
      showToast(`✅ "${file.name}" selected`, "success");
    }
  };

  const validateForm = async () => {
    if (!formData.department || !formData.subject) {
      showToast("❌ Department and Subject are required", "error");
      return false;
    }

    if (
      formData.department === "Public Representation" &&
      !formData.publicRepType
    ) {
      showToast("❌ Select MLA or MP", "error");
      return false;
    }

    if (!isEditing && !selectedFile) {
      showToast("❌ Please select a file", "error");
      return false;
    }

    if (formData.inwardNumber) {
      const exists = await checkInwardNumberExists(formData.inwardNumber);
      if (exists) {
        showToast("❌ Inward Number already exists", "error");
        return false;
      }
    }

    return true;
  };

  const uploadFile = async (file) => {
    if (!currentUser) throw new Error("User not authenticated");

    try {
      const fileExtension = file.name.split(".").pop().toLowerCase();
      const fileName = `${Date.now()}_${uuidv4()}.${fileExtension}`;
      const category = getFileCategory(file.type);
      const filePath = `files/${currentUser.uid}/${category}/${fileName}`;

      const storageRef = ref(storage, filePath);
      const metadata = {
        contentType: file.type,
        customMetadata: {
          uploadedBy: currentUser.uid,
          uploaderEmail: currentUser.email || "",
          uploaderRole: userRole || "subadmin",
          uploaderName: userName || "Unknown",
          originalName: file.name,
          category: category,
        },
      };

      const uploadTask = uploadBytesResumable(storageRef, file, metadata);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(Math.round(progress));
          },
          (error) => reject(new Error(`Upload failed: ${error.message}`)),
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve({
                fileName: file.name,
                fileURL: downloadURL,
                fileSize: file.size,
                fileType: file.type,
                fileCategory: category,
                storagePath: filePath,
              });
            } catch (error) {
              reject(new Error(`Failed to get download URL: ${error.message}`));
            }
          }
        );
      });
    } catch (error) {
      throw new Error(`Upload setup failed: ${error.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      showToast("❌ Please log in", "error");
      return;
    }

    const isValid = await validateForm();
    if (!isValid) return;

    const hasFormChanged =
      isEditing &&
      JSON.stringify(formData) !==
        JSON.stringify({
          department: initialFileInfo?.department || "",
          publicRepType: initialFileInfo?.publicRepType || "",
          receivedFrom: initialFileInfo?.receivedFrom || "",
          subject: initialFileInfo?.subject || "",
          allocatedTo: initialFileInfo?.allocatedTo || "",
          status: initialFileInfo?.status || "Pending",
          inwardNumber: initialFileInfo?.inwardNumber || "",
          inwardDate: initialFileInfo?.inwardDate || "",
          receivingDate: initialFileInfo?.receivingDate || "",
          description: initialFileInfo?.description || "",
        });

    const hasNewFile = !!selectedFile;

    if (isEditing && !hasFormChanged && !hasNewFile) {
      showToast("ℹ️ No changes detected", "info");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      let uploadResult = null;
      if (selectedFile) {
        uploadResult = await uploadFile(selectedFile);
      }

      const recordData = {
        ...formData,
        ...(uploadResult || {
          fileName: initialFileInfo.fileName,
          fileURL: initialFileInfo.fileURL,
          fileSize: initialFileInfo.fileSize,
          fileType: initialFileInfo.fileType,
          fileCategory: initialFileInfo.fileCategory,
          storagePath: initialFileInfo.storagePath,
        }),
        uploadedBy: currentUser.uid,
        uploaderEmail: currentUser.email || "",
        uploaderRole: userRole || "subadmin",
        uploaderName: userName || "Unknown",
        updatedAt: Date.now(),
        createdAt: initialFileInfo?.createdAt || Date.now(),
      };

      const dataRef = dbRef(database, `data/${selectedId || ""}`);
      if (isEditing) {
        await set(dataRef, recordData);
        showToast("✅ File updated successfully!", "success");
      } else {
        await push(dbRef(database, "data"), recordData);
        showToast("🎉 File uploaded successfully!", "success");
      }

      // Reset form
      setFormData({
        department: "",
        publicRepType: "",
        receivedFrom: "",
        subject: "",
        allocatedTo: "",
        status: "Pending",
        inwardNumber: "",
        inwardDate: "",
        receivingDate: "",
        description: "",
      });
      setSelectedFile(null);
      setInwardNumberExists(false);

      const fileInput = document.getElementById("file-input");
      if (fileInput) fileInput.value = "";
    } catch (error) {
      console.error(error);
      showToast(`❌ Failed: ${error.message}`, "error");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    const fileInput = document.getElementById("file-input");
    if (fileInput) fileInput.value = "";
    showToast("🗑️ File cleared", "info");
  };

  return (
    <div className="upload-container">
      <div className="upload-header">
        <h2>📤 Upload Files</h2>
      </div>

      <form onSubmit={handleSubmit} className="upload-form">
        {/* Compact File Upload Section */}
        <div className="file-upload-section">
          <label htmlFor="file-input" className="file-upload-label">
            {selectedFile ? (
              <div className="file-selected">
                <span className="file-icon">
                  {getFileIcon(selectedFile.type)}
                </span>
                <div className="file-info">
                  <strong>{selectedFile.name}</strong>
                  <span className="file-size">
                    {formatFileSize(selectedFile.size)} •{" "}
                    {getFileLabel(selectedFile.type)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleClearFile();
                  }}
                  className="clear-btn"
                  disabled={uploading}
                >
                  ✕
                </button>
              </div>
            ) : !isEditing || !initialFileInfo ? (
              <div className="file-placeholder">
                <span className="upload-icon">📎</span>
                <span>Click to select file *</span>
              </div>
            ) : (
              <div className="file-selected">
                <span className="file-icon">
                  {getFileIcon(initialFileInfo.fileType)}
                </span>
                <div className="file-info">
                  <strong>{initialFileInfo.fileName}</strong>
                  <span className="file-size">
                    {formatFileSize(initialFileInfo.fileSize)} •{" "}
                    {getFileLabel(initialFileInfo.fileType)}
                  </span>
                </div>
                <a
                  href={initialFileInfo.fileURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="view-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  View
                </a>
              </div>
            )}
            <input
              type="file"
              id="file-input"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.gif,.bmp,.webp,.txt,.rtf,.ppt,.pptx,.zip,.rar"
              required={!isEditing}
              disabled={uploading}
              style={{ display: "none" }}
            />
          </label>
        </div>

        {/* Compact Form Grid */}
        <div className="form-grid">
          <div className="form-group">
            <label>
              Department <span className="req">*</span>
            </label>
            <select
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              required
              disabled={uploading}
            >
              <option value="">Select</option>
              <option value="Public Representation">Public Rep.</option>
              <option value="Executive Engineer">Exec. Engineer</option>
              <option value="Contractor">Contractor</option>
              <option value="Farmer">Farmer</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {formData.department === "Public Representation" && (
            <div className="form-group">
              <label>
                Type <span className="req">*</span>
              </label>
              <select
                name="publicRepType"
                value={formData.publicRepType}
                onChange={handleInputChange}
                required
                disabled={uploading}
              >
                <option value="">Select</option>
                <option value="MLA">MLA</option>
                <option value="MP">MP</option>
              </select>
            </div>
          )}

          <div className="form-group">
            <label>
              Subject <span className="req">*</span>
            </label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              placeholder="Enter subject"
              required
              disabled={uploading}
            />
          </div>

          <div className="form-group">
            <label>Received From</label>
            <input
              type="text"
              name="receivedFrom"
              value={formData.receivedFrom}
              onChange={handleInputChange}
              placeholder="Sender name"
              disabled={uploading}
            />
          </div>

          <div className="form-group">
            <label>Allocated To</label>
            <input
              type="text"
              name="allocatedTo"
              value={formData.allocatedTo}
              onChange={handleInputChange}
              placeholder="Assignee name"
              disabled={uploading}
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              disabled={uploading}
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Under Review">Under Review</option>
              <option value="Completed">Completed</option>
              <option value="On Hold">On Hold</option>
              <option value="Rejected">Rejected</option>
              <option value="Archived">Archived</option>
            </select>
          </div>

          <div className="form-group">
            <label>
              Inward Number
              {validatingInward && <span className="validating">⏳</span>}
              {inwardNumberExists && <span className="error-txt">⚠️</span>}
            </label>
            <input
              type="text"
              name="inwardNumber"
              value={formData.inwardNumber}
              onChange={handleInputChange}
              placeholder="Enter unique number"
              disabled={uploading}
              className={inwardNumberExists ? "error-input" : ""}
            />
          </div>

          <div className="form-group">
            <label>Inward Date</label>
            <input
              type="date"
              name="inwardDate"
              value={formData.inwardDate}
              onChange={handleInputChange}
              disabled={uploading}
            />
          </div>

          <div className="form-group">
            <label>Receiving Date</label>
            <input
              type="date"
              name="receivingDate"
              value={formData.receivingDate}
              onChange={handleInputChange}
              disabled={uploading}
            />
          </div>

          <div className="form-group full">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Additional notes"
              rows={2}
              disabled={uploading}
            />
          </div>
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="upload-progress">
            <div className="progress-header">
              <span>📤 Uploading...</span>
              <span className="percent">{uploadProgress}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="form-actions">
          <button
            type="submit"
            className="submit-btn"
            disabled={uploading || inwardNumberExists}
          >
            {uploading ? (
              <>
                <span className="spinner"></span>
                {uploadProgress < 100 ? "Uploading..." : "Processing..."}
              </>
            ) : isEditing ? (
              <>💾 Update</>
            ) : (
              <>📤 Upload</>
            )}
          </button>
        </div>
      </form>

      {/* Toast Container */}
      <div className="toast-container">
        <AnimatePresence>
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      <style>{`
        .upload-container {
          max-width: 900px;
          margin: 1rem auto;
          padding: 1.25rem;
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .upload-header {
          margin-bottom: 1rem;
          text-align: center;
        }

        .upload-header h2 {
          font-size: 1.5rem;
          font-weight: 700;
          background: linear-gradient(135deg, #4f46e5, #9333ea);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
        }

        .file-upload-section {
          margin-bottom: 1rem;
        }

        .file-upload-label {
          display: block;
          cursor: pointer;
        }

        .file-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem;
          border: 2px dashed #cbd5e1;
          border-radius: 10px;
          background: #f9fafb;
          transition: all 0.2s ease;
          font-weight: 600;
          color: #64748b;
        }

        .file-placeholder:hover {
          border-color: #6366f1;
          background: #eef2ff;
          color: #4f46e5;
        }

        .upload-icon {
          font-size: 1.5rem;
        }

        .file-selected {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          background: #f8fafc;
          transition: all 0.2s ease;
        }

        .file-selected:hover {
          border-color: #cbd5e1;
          background: #f1f5f9;
        }

        .file-icon {
          font-size: 1.8rem;
          flex-shrink: 0;
        }

        .file-info {
          flex: 1;
          min-width: 0;
        }

        .file-info strong {
          display: block;
          font-size: 0.9rem;
          font-weight: 600;
          color: #1e293b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .file-size {
          display: block;
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 2px;
        }

        .clear-btn, .view-link {
          flex-shrink: 0;
          padding: 0.4rem 0.75rem;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .clear-btn {
          background: #fee2e2;
          color: #dc2626;
          border: none;
          cursor: pointer;
        }

        .clear-btn:hover {
          background: #fecaca;
        }

        .view-link {
          background: #dbeafe;
          color: #2563eb;
        }

        .view-link:hover {
          background: #bfdbfe;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.85rem;
          margin-bottom: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .form-group.full {
          grid-column: 1 / -1;
        }

        .form-group label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #334155;
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .req {
          color: #ef4444;
        }

        .validating, .error-txt {
          font-size: 0.75rem;
          margin-left: auto;
        }

        .validating {
          color: #f59e0b;
        }

        .error-txt {
          color: #ef4444;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 0.6rem 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.9rem;
          background: #ffffff;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          border-color: #6366f1;
          outline: none;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .error-input {
          border-color: #ef4444 !important;
        }

        .upload-progress {
          margin-bottom: 1rem;
          padding: 0.85rem;
          background: #f1f5f9;
          border-radius: 8px;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: #334155;
        }

        .percent {
          color: #4f46e5;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e0e7ff;
          border-radius: 999px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #6366f1, #9333ea);
          transition: width 0.3s ease;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
        }

        .submit-btn {
          padding: 0.7rem 2rem;
          background: linear-gradient(135deg, #4f46e5, #9333ea);
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .submit-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #4338ca, #7e22ce);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .toast-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .toast-notification {
          padding: 12px 16px;
          border-radius: 8px;
          color: white;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          min-width: 280px;
          max-width: 350px;
        }

        .toast-icon {
          font-size: 1.1rem;
          flex-shrink: 0;
        }

        .toast-message {
          flex: 1;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .toast-close {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          cursor: pointer;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 1rem;
          flex-shrink: 0;
        }

        .toast-close:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
          
          .upload-container {
            padding: 1rem;
            margin: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default FileUpload;
