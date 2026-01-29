// src/components/LogBook.js
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  getDatabase,
  ref as dbRef,
  onValue,
  push,
  set,
  update,
  remove,
} from "firebase/database";
import { motion, AnimatePresence } from "framer-motion";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  Calendar,
  Plus,
  Save,
  X,
  Trash2,
  Clock,
  Download,
  Printer,
  Edit2,
  Car,
  Fuel,
  MapPin,
  User,
  FileText,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";

/** ---------- Time helpers (12-hour) ---------- */
const HOURS_12 = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);
const MINUTES = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0"),
);
const PERIODS = ["AM", "PM"];

const to12hString = (h, m, p) => {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${p}`;
};

const twelveToMinutes = (t12) => {
  if (!t12) return null;
  const m = t12.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const period = m[3].toUpperCase();
  if (hh === 12) hh = 0;
  let mins = hh * 60 + mm;
  if (period === "PM") mins += 12 * 60;
  return mins;
};

const from24hTo12h = (t24) => {
  if (!t24 || !/^\d{2}:\d{2}$/.test(t24)) return t24;
  const [hStr, mStr] = t24.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(
    2,
    "0",
  )} ${period}`;
};

const split12 = (t12) => {
  const m = t12?.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m)
    return {
      hh: String(m[1]).padStart(2, "0"),
      mm: m[2],
      pp: m[3].toUpperCase(),
    };
  return { hh: "12", mm: "00", pp: "AM" };
};

const LogBook = () => {
  const { currentUser, userRole } = useAuth();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  const printRef = useRef();

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    fuel: "",
    oil: "",
    depHour: "09",
    depMinute: "00",
    depPeriod: "AM",
    arrHour: "06",
    arrMinute: "00",
    arrPeriod: "PM",
    from: "",
    to: "",
    beforeMeterReading: "",
    afterMeterReading: "",
    kilometers: "",
    purpose: "",
    usedBy: "",
  });

  const [errors, setErrors] = useState({});

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  // ========== HELPER FUNCTION TO GET DATABASE PATH ==========
  const getDatabasePath = () => {
    if (userRole === "admin") {
      return "logbook/admin";
    }
    return `logbook/${currentUser.uid}`;
  };

  // Auto-calculate kilometers
  useEffect(() => {
    const before = parseFloat(formData.beforeMeterReading);
    const after = parseFloat(formData.afterMeterReading);

    if (!isNaN(before) && !isNaN(after) && after > before) {
      const calculated = (after - before).toFixed(1);
      setFormData((prev) => ({ ...prev, kilometers: calculated }));
    } else if (formData.beforeMeterReading && formData.afterMeterReading) {
      if (formData.kilometers) {
        setFormData((prev) => ({ ...prev, kilometers: "" }));
      }
    }
  }, [formData.beforeMeterReading, formData.afterMeterReading]);

  // Fetch logs from Firebase
  useEffect(() => {
    if (!currentUser || userRole === null || userRole === undefined) {
      setLoading(false);
      return;
    }

    const db = getDatabase();
    const logbookRef = dbRef(db, getDatabasePath());

    const unsubscribe = onValue(
      logbookRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const logsArray = Object.entries(data)
            .map(([id, log]) => {
              let departureTime = log.departureTime;
              let arrivalTime = log.arrivalTime;
              if (/^\d{2}:\d{2}$/.test(log.departureTime || "")) {
                departureTime = from24hTo12h(log.departureTime);
              }
              if (/^\d{2}:\d{2}$/.test(log.arrivalTime || "")) {
                arrivalTime = from24hTo12h(log.arrivalTime);
              }
              return { id, ...log, departureTime, arrivalTime };
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));
          setLogs(logsArray);
          console.log("✅ LogBook entries loaded:", logsArray.length);
        } else {
          setLogs([]);
          console.log("ℹ️ No logbook entries found");
        }
        setLoading(false);
      },
      (err) => {
        console.error("❌ Error fetching log entries:", err);
        showToast("Failed to load log entries", "error");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser, userRole]);

  // ========== COMPREHENSIVE VALIDATION (NO REQUIRED FIELDS) ==========
  const validateForm = () => {
    const newErrors = {};

    // ===== DATE VALIDATION =====
    if (formData.date) {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      if (isNaN(selectedDate.getTime())) {
        newErrors.date = "Please enter a valid date";
      } else if (selectedDate > today) {
        newErrors.date = "Date cannot be in the future";
      }
    }

    // ===== FUEL VALIDATION =====
    if (
      formData.fuel !== "" &&
      formData.fuel !== null &&
      formData.fuel !== undefined
    ) {
      const fuelStr = String(formData.fuel).trim();
      if (fuelStr) {
        const fuelValue = parseFloat(fuelStr);
        if (isNaN(fuelValue)) {
          newErrors.fuel = "Please enter a valid number";
        } else if (fuelValue < 0) {
          newErrors.fuel = "Fuel cannot be negative";
        } else if (fuelValue > 500) {
          newErrors.fuel = "Please enter a realistic fuel amount (max 500L)";
        } else if (!/^\d+(\.\d{1,2})?$/.test(fuelStr)) {
          newErrors.fuel = "Maximum 2 decimal places allowed";
        }
      }
    }

    // ===== OIL VALIDATION =====
    if (
      formData.oil !== "" &&
      formData.oil !== null &&
      formData.oil !== undefined
    ) {
      const oilStr = String(formData.oil).trim();
      if (oilStr) {
        const oilValue = parseFloat(oilStr);
        if (isNaN(oilValue)) {
          newErrors.oil = "Please enter a valid number";
        } else if (oilValue < 0) {
          newErrors.oil = "Oil cannot be negative";
        } else if (oilValue > 50) {
          newErrors.oil = "Please enter a realistic oil amount (max 50L)";
        } else if (!/^\d+(\.\d{1,2})?$/.test(oilStr)) {
          newErrors.oil = "Maximum 2 decimal places allowed";
        }
      }
    }

    // ===== TIME VALIDATION =====
    const dep12 = to12hString(
      formData.depHour,
      formData.depMinute,
      formData.depPeriod,
    );
    const arr12 = to12hString(
      formData.arrHour,
      formData.arrMinute,
      formData.arrPeriod,
    );
    const depMins = twelveToMinutes(dep12);
    const arrMins = twelveToMinutes(arr12);

    if (depMins != null && arrMins != null && arrMins <= depMins) {
      newErrors.arrival = "Arrival time must be after departure time";
    }

    // ===== FROM LOCATION VALIDATION =====
    if (formData.from && formData.from.trim()) {
      const fromValue = formData.from.trim();

      if (/^\d+$/.test(fromValue)) {
        newErrors.from = "Location cannot be only numbers";
      } else if (fromValue.length < 2) {
        newErrors.from = "Location must be at least 2 characters";
      } else if (fromValue.length > 100) {
        newErrors.from = "Location is too long (max 100 characters)";
      } else if (/^[^a-zA-Z\u0900-\u097F]+$/.test(fromValue)) {
        newErrors.from = "Location must contain letters";
      }
    }

    // ===== TO LOCATION VALIDATION =====
    if (formData.to && formData.to.trim()) {
      const toValue = formData.to.trim();

      if (/^\d+$/.test(toValue)) {
        newErrors.to = "Location cannot be only numbers";
      } else if (toValue.length < 2) {
        newErrors.to = "Location must be at least 2 characters";
      } else if (toValue.length > 100) {
        newErrors.to = "Location is too long (max 100 characters)";
      } else if (/^[^a-zA-Z\u0900-\u097F]+$/.test(toValue)) {
        newErrors.to = "Location must contain letters";
      }
    }

    // ===== BEFORE METER READING VALIDATION =====
    if (
      formData.beforeMeterReading !== "" &&
      formData.beforeMeterReading !== null
    ) {
      const beforeStr = String(formData.beforeMeterReading).trim();
      if (beforeStr) {
        const beforeValue = parseFloat(beforeStr);
        if (isNaN(beforeValue)) {
          newErrors.beforeMeterReading = "Please enter a valid number";
        } else if (beforeValue < 0) {
          newErrors.beforeMeterReading = "Reading cannot be negative";
        } else if (beforeValue > 9999999) {
          newErrors.beforeMeterReading = "Reading value is too large";
        } else if (!/^\d+(\.\d{1})?$/.test(beforeStr)) {
          newErrors.beforeMeterReading = "Maximum 1 decimal place allowed";
        }
      }
    }

    // ===== AFTER METER READING VALIDATION =====
    if (
      formData.afterMeterReading !== "" &&
      formData.afterMeterReading !== null
    ) {
      const afterStr = String(formData.afterMeterReading).trim();
      if (afterStr) {
        const afterValue = parseFloat(afterStr);
        if (isNaN(afterValue)) {
          newErrors.afterMeterReading = "Please enter a valid number";
        } else if (afterValue < 0) {
          newErrors.afterMeterReading = "Reading cannot be negative";
        } else if (afterValue > 9999999) {
          newErrors.afterMeterReading = "Reading value is too large";
        } else if (!/^\d+(\.\d{1})?$/.test(afterStr)) {
          newErrors.afterMeterReading = "Maximum 1 decimal place allowed";
        } else {
          const beforeValue = parseFloat(formData.beforeMeterReading);
          if (!isNaN(beforeValue) && afterValue <= beforeValue) {
            newErrors.afterMeterReading = "Must be greater than before reading";
          }
        }
      }
    }

    // ===== KILOMETERS VALIDATION =====
    if (formData.kilometers !== "" && formData.kilometers !== null) {
      const kmStr = String(formData.kilometers).trim();
      if (kmStr) {
        const kmValue = parseFloat(kmStr);
        if (isNaN(kmValue)) {
          newErrors.kilometers = "Please enter a valid number";
        } else if (kmValue < 0) {
          newErrors.kilometers = "Distance cannot be negative";
        } else if (kmValue > 2000) {
          newErrors.kilometers =
            "Please enter a realistic distance (max 2000 km)";
        }
      }
    }

    // ===== PURPOSE VALIDATION =====
    if (formData.purpose && formData.purpose.trim()) {
      const purposeValue = formData.purpose.trim();

      if (/^\d+$/.test(purposeValue)) {
        newErrors.purpose = "Purpose cannot be only numbers";
      } else if (purposeValue.length < 3) {
        newErrors.purpose = "Purpose must be at least 3 characters";
      } else if (purposeValue.length > 200) {
        newErrors.purpose = "Purpose is too long (max 200 characters)";
      } else if (/^[^a-zA-Z\u0900-\u097F]+$/.test(purposeValue)) {
        newErrors.purpose = "Purpose must contain letters";
      }
    }

    // ===== DRIVER NAME (USED BY) VALIDATION =====
    if (formData.usedBy && formData.usedBy.trim()) {
      const nameValue = formData.usedBy.trim();

      if (/^\d+$/.test(nameValue)) {
        newErrors.usedBy = "Name cannot be only numbers";
      } else if (/\d/.test(nameValue)) {
        newErrors.usedBy = "Name should not contain numbers";
      } else if (nameValue.length < 2) {
        newErrors.usedBy = "Name must be at least 2 characters";
      } else if (nameValue.length > 50) {
        newErrors.usedBy = "Name is too long (max 50 characters)";
      } else if (!/^[a-zA-Z\u0900-\u097F\s.\-']+$/.test(nameValue)) {
        newErrors.usedBy = "Name contains invalid characters";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((s) => ({ ...s, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: "" }));
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      fuel: "",
      oil: "",
      depHour: "09",
      depMinute: "00",
      depPeriod: "AM",
      arrHour: "06",
      arrMinute: "00",
      arrPeriod: "PM",
      from: "",
      to: "",
      beforeMeterReading: "",
      afterMeterReading: "",
      kilometers: "",
      purpose: "",
      usedBy: "",
    });
    setErrors({});
    setIsEditing(false);
    setSelectedLog(null);
  };

  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast("Please fix the errors before saving", "error");
      return;
    }

    const departureTime = to12hString(
      formData.depHour,
      formData.depMinute,
      formData.depPeriod,
    );
    const arrivalTime = to12hString(
      formData.arrHour,
      formData.arrMinute,
      formData.arrPeriod,
    );

    try {
      const db = getDatabase();
      const logbookRef = dbRef(db, getDatabasePath());
      const newLogRef = push(logbookRef);

      await set(newLogRef, {
        date: formData.date || new Date().toISOString().split("T")[0],
        fuel: formData.fuel || "",
        oil: formData.oil || "",
        departureTime,
        arrivalTime,
        from: formData.from?.trim() || "",
        to: formData.to?.trim() || "",
        beforeMeterReading: formData.beforeMeterReading || "",
        afterMeterReading: formData.afterMeterReading || "",
        kilometers: formData.kilometers || "",
        purpose: formData.purpose?.trim() || "",
        usedBy: formData.usedBy?.trim() || "",
        remarks: "",
        createdAt: new Date().toISOString(),
        createdBy: currentUser.uid,
        updatedAt: new Date().toISOString(),
      });

      showToast("Log added successfully!", "success");
      setShowAddModal(false);
      resetForm();
    } catch (err) {
      console.error("Error adding log:", err);
      showToast("Failed to add log", "error");
    }
  };

  const handleUpdateLog = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast("Please fix the errors before saving", "error");
      return;
    }

    const departureTime = to12hString(
      formData.depHour,
      formData.depMinute,
      formData.depPeriod,
    );
    const arrivalTime = to12hString(
      formData.arrHour,
      formData.arrMinute,
      formData.arrPeriod,
    );

    try {
      const db = getDatabase();
      const logRef = dbRef(db, `${getDatabasePath()}/${selectedLog.id}`);

      await update(logRef, {
        date: formData.date || new Date().toISOString().split("T")[0],
        fuel: formData.fuel || "",
        oil: formData.oil || "",
        departureTime,
        arrivalTime,
        from: formData.from?.trim() || "",
        to: formData.to?.trim() || "",
        beforeMeterReading: formData.beforeMeterReading || "",
        afterMeterReading: formData.afterMeterReading || "",
        kilometers: formData.kilometers || "",
        purpose: formData.purpose?.trim() || "",
        usedBy: formData.usedBy?.trim() || "",
        remarks: "",
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.uid,
      });

      showToast("Log updated successfully!", "success");
      setShowAddModal(false);
      setShowDetailModal(false);
      resetForm();
    } catch (err) {
      console.error("Error updating log:", err);
      showToast("Failed to update log", "error");
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const confirmDelete = async () => {
    if (!selectedLog) return;
    try {
      const db = getDatabase();
      await remove(dbRef(db, `${getDatabasePath()}/${selectedLog.id}`));
      showToast("Log deleted successfully!", "success");
      setShowDeleteConfirm(false);
      setShowDetailModal(false);
      setSelectedLog(null);
      resetForm();
    } catch (err) {
      console.error("Error deleting log:", err);
      showToast("Failed to delete log", "error");
      setShowDeleteConfirm(false);
    }
  };

  const handleLogClick = (log) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const handleEditClick = () => {
    const depPieces = split12(selectedLog.departureTime);
    const arrPieces = split12(selectedLog.arrivalTime);

    setFormData({
      date: selectedLog.date,
      fuel: selectedLog.fuel || "",
      oil: selectedLog.oil || "",
      depHour: depPieces.hh,
      depMinute: depPieces.mm,
      depPeriod: depPieces.pp,
      arrHour: arrPieces.hh,
      arrMinute: arrPieces.mm,
      arrPeriod: arrPieces.pp,
      from: selectedLog.from,
      to: selectedLog.to,
      beforeMeterReading:
        selectedLog.beforeMeterReading || selectedLog.meterReading || "",
      afterMeterReading: selectedLog.afterMeterReading || "",
      kilometers: selectedLog.kilometers,
      purpose: selectedLog.purpose,
      usedBy: selectedLog.usedBy,
    });
    setIsEditing(true);
    setShowDetailModal(false);
    setShowAddModal(true);
  };

  // --- PRINT FUNCTION ---
  const handlePrint = () => {
    window.print();
  };

  // --- PDF DOWNLOAD FUNCTION ---
  const downloadPDF = async () => {
    try {
      showToast("Preparing PDF...", "success");

      setShowPdfPreview(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const element = printRef.current;
      if (!element) {
        showToast("Content not found", "error");
        setShowPdfPreview(false);
        return;
      }

      showToast("Generating PDF...", "success");

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4");

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

      const now = new Date();
      const filename = `LogBook-${now.getMonth() + 1}-${now.getFullYear()}.pdf`;
      pdf.save(filename);

      setShowPdfPreview(false);
      showToast("PDF downloaded successfully!", "success");
    } catch (error) {
      console.error("PDF error:", error);
      setShowPdfPreview(false);
      showToast("PDF generation failed", "error");
    }
  };

  // --- PRINT CONTENT COMPONENT ---
  const PrintContent = () => (
    <div className="print-only">
      <div className="print-container">
        <h1 className="print-title">
          सरकारी मोटार वाहनांकरिता लॉग बुकचा नमुना
        </h1>
        <table className="print-table">
          <thead>
            <tr>
              <th className="w-idx" rowSpan="2">
                क्र.
              </th>
              <th className="w-date" rowSpan="2">
                तारीख
              </th>
              <th className="w-supply" colSpan="2">
                पुरवठा
              </th>
              <th className="w-dep" rowSpan="2">
                गाडी नेण्याची वेळ
              </th>
              <th className="w-arr" rowSpan="2">
                गाडी आल्याची वेळ
              </th>
              <th className="w-from" rowSpan="2">
                कोठून
              </th>
              <th className="w-to" rowSpan="2">
                कोठे
              </th>
              <th className="w-meter" colSpan="2">
                प्रवासापूर्वी व नंतरचे मिटरवरील पाठ्यांक
              </th>
              <th className="w-km" rowSpan="2">
                कि.मी
              </th>
              <th className="w-purpose" rowSpan="2">
                प्रवासाचा हेतू
              </th>
              <th className="w-user" rowSpan="2">
                गाडी कोणी वापरली
              </th>
              <th className="w-remark" rowSpan="2">
                शेरा
              </th>
            </tr>
            <tr>
              <th className="w-supply-child">जळण</th>
              <th className="w-supply-child">तेल</th>
              <th className="w-meter-child">पूर्वी</th>
              <th className="w-meter-child">नंतर</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, index) => (
              <tr key={log.id}>
                <td className="td-center">{index + 1}</td>
                <td>{new Date(log.date).toLocaleDateString("en-GB")}</td>
                <td className="td-center">{log.fuel || "-"}</td>
                <td className="td-center">{log.oil || "-"}</td>
                <td>{log.departureTime || "-"}</td>
                <td>{log.arrivalTime || "-"}</td>
                <td>{log.from || "-"}</td>
                <td>{log.to || "-"}</td>
                <td className="td-right">
                  {log.beforeMeterReading || log.meterReading || "-"}
                </td>
                <td className="td-right">{log.afterMeterReading || "-"}</td>
                <td className="td-center">
                  <strong>
                    {log.kilometers
                      ? Math.round(parseFloat(log.kilometers))
                      : "-"}
                  </strong>
                </td>
                <td>{log.purpose || "-"}</td>
                <td>{log.usedBy || "-"}</td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="print-footer">
          <p>
            <strong>Generated on:</strong>{" "}
            {new Date().toLocaleString("en-GB", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Toast - TOP RIGHT */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            className={`toast toast-${toast.type}`}
            initial={{ opacity: 0, y: -50, x: 100 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -50, x: 100 }}
          >
            {toast.type === "success" ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Print Content - Hidden on screen, visible when printing */}
      <PrintContent />

      {/* PDF Preview Modal (Visible during PDF capture) */}
      <AnimatePresence>
        {showPdfPreview && (
          <div className="pdf-preview-modal">
            <div className="pdf-preview-content" ref={printRef}>
              <div className="print-container">
                <h1 className="print-title">
                  सरकारी मोटार वाहनांकरिता लॉग बुकचा नमुना
                </h1>
                <table className="print-table">
                  <thead>
                    <tr>
                      <th className="w-idx" rowSpan="2">
                        क्र.
                      </th>
                      <th className="w-date" rowSpan="2">
                        तारीख
                      </th>
                      <th className="w-supply" colSpan="2">
                        पुरवठा
                      </th>
                      <th className="w-dep" rowSpan="2">
                        गाडी नेण्याची वेळ
                      </th>
                      <th className="w-arr" rowSpan="2">
                        गाडी आल्याची वेळ
                      </th>
                      <th className="w-from" rowSpan="2">
                        कोठून
                      </th>
                      <th className="w-to" rowSpan="2">
                        कोठे
                      </th>
                      <th className="w-meter" colSpan="2">
                        प्रवासापूर्वी व नंतरचे मिटरवरील पाठ्यांक
                      </th>
                      <th className="w-km" rowSpan="2">
                        कि.मी
                      </th>
                      <th className="w-purpose" rowSpan="2">
                        प्रवासाचा हेतू
                      </th>
                      <th className="w-user" rowSpan="2">
                        गाडी कोणी वापरली
                      </th>
                      <th className="w-remark" rowSpan="2">
                        शेरा
                      </th>
                    </tr>
                    <tr>
                      <th className="w-supply-child">जळण</th>
                      <th className="w-supply-child">तेल</th>
                      <th className="w-meter-child">पूर्वी</th>
                      <th className="w-meter-child">नंतर</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, index) => (
                      <tr key={log.id}>
                        <td className="td-center">{index + 1}</td>
                        <td>
                          {new Date(log.date).toLocaleDateString("en-GB")}
                        </td>
                        <td className="td-center">{log.fuel || "-"}</td>
                        <td className="td-center">{log.oil || "-"}</td>
                        <td>{log.departureTime || "-"}</td>
                        <td>{log.arrivalTime || "-"}</td>
                        <td>{log.from || "-"}</td>
                        <td>{log.to || "-"}</td>
                        <td className="td-right">
                          {log.beforeMeterReading || log.meterReading || "-"}
                        </td>
                        <td className="td-right">
                          {log.afterMeterReading || "-"}
                        </td>
                        <td className="td-center">
                          <strong>
                            {log.kilometers
                              ? Math.round(parseFloat(log.kilometers))
                              : "-"}
                          </strong>
                        </td>
                        <td>{log.purpose || "-"}</td>
                        <td>{log.usedBy || "-"}</td>
                        <td></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="print-footer">
                  <p>
                    <strong>Generated on:</strong>{" "}
                    {new Date().toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <motion.div
        className="logbook-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="logbook-header">
          <div className="logbook-header-left">
            <h2>
              <Car size={24} />
              Vehicle Log Book
            </h2>
            <p>Track and manage your daily vehicle records</p>
          </div>
          <div className="logbook-header-actions">
            {logs.length > 0 && (
              <>
                <motion.button
                  className="btn-action btn-print"
                  onClick={handlePrint}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  title="Print"
                >
                  <Printer size={18} />
                  Print
                </motion.button>
                <motion.button
                  className="btn-action btn-download"
                  onClick={downloadPDF}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  title="Download PDF"
                >
                  <Download size={18} />
                  Download PDF
                </motion.button>
              </>
            )}
            <motion.button
              className="btn-add-log"
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus size={18} />
              Add Log
            </motion.button>
          </div>
        </div>

        {loading ? (
          <div className="logbook-loading">
            <div className="spinner-logbook"></div>
            <p>Loading logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="logbook-empty">
            <Car size={64} color="#94a3b8" />
            <h3>No Logs Yet</h3>
            <p>Start tracking your daily vehicle records</p>
            <button
              className="btn-empty-log"
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
            >
              <Plus size={18} />
              Create First Log
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="log-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Route</th>
                  <th>Time</th>
                  <th>Distance</th>
                  <th>Supply</th>
                  <th>Purpose</th>
                  <th>Driver</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {logs.map((log, index) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => handleLogClick(log)}
                      className="clickable-row"
                    >
                      <td>
                        <div className="td-date">
                          <Calendar size={14} />
                          {new Date(log.date).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </td>
                      <td>
                        <div className="td-route">
                          <div className="route-item">
                            <MapPin size={12} className="icon-from" />
                            {log.from || "-"}
                          </div>
                          <div className="route-arrow">→</div>
                          <div className="route-item">
                            <MapPin size={12} className="icon-to" />
                            {log.to || "-"}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="td-time">
                          <div>
                            <Clock size={12} /> {log.departureTime || "-"}
                          </div>
                          <div className="time-arrival">
                            → {log.arrivalTime || "-"}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="td-distance">
                          <strong>{log.kilometers || "0"} km</strong>
                          <small>
                            Before:{" "}
                            {log.beforeMeterReading || log.meterReading || "-"}
                          </small>
                          <small>After: {log.afterMeterReading || "-"}</small>
                        </div>
                      </td>
                      <td>
                        <div className="td-supply">
                          {log.fuel && (
                            <span className="supply-badge fuel">
                              <Fuel size={11} />
                              {log.fuel}L
                            </span>
                          )}
                          {log.oil && (
                            <span className="supply-badge oil">
                              Oil: {log.oil}L
                            </span>
                          )}
                          {!log.fuel && !log.oil && "-"}
                        </div>
                      </td>
                      <td>
                        <div className="td-purpose">{log.purpose || "-"}</div>
                      </td>
                      <td>
                        <div className="td-user">
                          <User size={12} />
                          {log.usedBy || "-"}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* ========== DELETE CONFIRMATION MODAL ========== */}
      <AnimatePresence>
        {showDeleteConfirm && selectedLog && (
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

              <div className="delete-content">
                <h3>Delete Log Entry?</h3>
                <p>
                  Are you sure you want to delete this log entry? This action
                  cannot be undone.
                </p>

                <div className="delete-entry-summary">
                  <div className="summary-item">
                    <span className="summary-label">Date:</span>
                    <span className="summary-value">
                      {new Date(selectedLog.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Route:</span>
                    <span className="summary-value">
                      {selectedLog.from || "-"} → {selectedLog.to || "-"}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Distance:</span>
                    <span className="summary-value">
                      {selectedLog.kilometers || "0"} km
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Driver:</span>
                    <span className="summary-value">
                      {selectedLog.usedBy || "-"}
                    </span>
                  </div>
                </div>
              </div>

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

      {/* ========== ADD/EDIT LOG MODAL ========== */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            className="logbook-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowAddModal(false);
              resetForm();
            }}
          >
            <motion.div
              className="logbook-modal-content compact-modal"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="logbook-modal-header">
                <h3>
                  <Car size={20} />
                  {isEditing ? "Edit Log Entry" : "New Log Entry"}
                </h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={isEditing ? handleUpdateLog : handleAddLog}
                className="compact-form"
              >
                <div className="form-grid">
                  <div className="form-group">
                    <label>Date</label>
                    <input
                      name="date"
                      type="date"
                      value={formData.date}
                      onChange={handleChange}
                      max={new Date().toISOString().split("T")[0]}
                      className={errors.date ? "error" : ""}
                    />
                    {errors.date && (
                      <span className="error-text">{errors.date}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Fuel (Liters)</label>
                    <input
                      name="fuel"
                      type="number"
                      step="0.01"
                      min="0"
                      max="500"
                      placeholder="e.g., 25.50"
                      value={formData.fuel}
                      onChange={handleChange}
                      className={errors.fuel ? "error" : ""}
                    />
                    {errors.fuel && (
                      <span className="error-text">{errors.fuel}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Oil (Liters)</label>
                    <input
                      name="oil"
                      type="number"
                      step="0.01"
                      min="0"
                      max="50"
                      placeholder="e.g., 2.5"
                      value={formData.oil}
                      onChange={handleChange}
                      className={errors.oil ? "error" : ""}
                    />
                    {errors.oil && (
                      <span className="error-text">{errors.oil}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Departure Time</label>
                    <div className="time-12h">
                      <select
                        value={formData.depHour}
                        onChange={(e) =>
                          setFormData({ ...formData, depHour: e.target.value })
                        }
                        className={errors.departure ? "error" : ""}
                      >
                        {HOURS_12.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                      <span className="sep">:</span>
                      <select
                        value={formData.depMinute}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            depMinute: e.target.value,
                          })
                        }
                        className={errors.departure ? "error" : ""}
                      >
                        {MINUTES.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <select
                        value={formData.depPeriod}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            depPeriod: e.target.value,
                          })
                        }
                        className={errors.departure ? "error" : ""}
                      >
                        {PERIODS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.departure && (
                      <span className="error-text">{errors.departure}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Arrival Time</label>
                    <div className="time-12h">
                      <select
                        value={formData.arrHour}
                        onChange={(e) =>
                          setFormData({ ...formData, arrHour: e.target.value })
                        }
                        className={errors.arrival ? "error" : ""}
                      >
                        {HOURS_12.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                      <span className="sep">:</span>
                      <select
                        value={formData.arrMinute}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            arrMinute: e.target.value,
                          })
                        }
                        className={errors.arrival ? "error" : ""}
                      >
                        {MINUTES.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <select
                        value={formData.arrPeriod}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            arrPeriod: e.target.value,
                          })
                        }
                        className={errors.arrival ? "error" : ""}
                      >
                        {PERIODS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.arrival && (
                      <span className="error-text">{errors.arrival}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>From (Starting Location)</label>
                    <input
                      name="from"
                      type="text"
                      placeholder="e.g., Mumbai Office"
                      maxLength="100"
                      value={formData.from}
                      onChange={handleChange}
                      className={errors.from ? "error" : ""}
                    />
                    {errors.from && (
                      <span className="error-text">{errors.from}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>To (Destination)</label>
                    <input
                      name="to"
                      type="text"
                      placeholder="e.g., Pune Station"
                      maxLength="100"
                      value={formData.to}
                      onChange={handleChange}
                      className={errors.to ? "error" : ""}
                    />
                    {errors.to && (
                      <span className="error-text">{errors.to}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Before Meter Reading</label>
                    <input
                      name="beforeMeterReading"
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="e.g., 45230"
                      value={formData.beforeMeterReading}
                      onChange={handleChange}
                      className={errors.beforeMeterReading ? "error" : ""}
                    />
                    {errors.beforeMeterReading && (
                      <span className="error-text">
                        {errors.beforeMeterReading}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>After Meter Reading</label>
                    <input
                      name="afterMeterReading"
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="e.g., 45380"
                      value={formData.afterMeterReading}
                      onChange={handleChange}
                      className={errors.afterMeterReading ? "error" : ""}
                    />
                    {errors.afterMeterReading && (
                      <span className="error-text">
                        {errors.afterMeterReading}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Kilometers (Auto-calculated)</label>
                    <input
                      name="kilometers"
                      type="number"
                      step="0.1"
                      placeholder="Auto-calculated from readings"
                      value={formData.kilometers}
                      onChange={handleChange}
                      className={errors.kilometers ? "error" : ""}
                      readOnly
                      style={{
                        backgroundColor: "#f1f5f9",
                        cursor: "not-allowed",
                      }}
                    />
                    {errors.kilometers && (
                      <span className="error-text">{errors.kilometers}</span>
                    )}
                  </div>

                  <div className="form-group full-width">
                    <label>Purpose of Trip</label>
                    <input
                      name="purpose"
                      type="text"
                      placeholder="e.g., Official meeting at Collector Office"
                      maxLength="200"
                      value={formData.purpose}
                      onChange={handleChange}
                      className={errors.purpose ? "error" : ""}
                    />
                    {errors.purpose && (
                      <span className="error-text">{errors.purpose}</span>
                    )}
                  </div>

                  <div className="form-group full-width">
                    <label>Driver Name</label>
                    <input
                      name="usedBy"
                      type="text"
                      placeholder="e.g., Ramesh Kumar"
                      maxLength="50"
                      value={formData.usedBy}
                      onChange={handleChange}
                      className={errors.usedBy ? "error" : ""}
                    />
                    {errors.usedBy && (
                      <span className="error-text">{errors.usedBy}</span>
                    )}
                  </div>
                </div>

                <div className="compact-modal-footer">
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
                    {isEditing ? "Update" : "Save"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== DETAIL VIEW MODAL ========== */}
      <AnimatePresence>
        {showDetailModal && selectedLog && (
          <motion.div
            className="logbook-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowDetailModal(false);
              setSelectedLog(null);
            }}
          >
            <motion.div
              className="logbook-modal-content detail-modal"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="logbook-modal-header">
                <h3>
                  <Car size={20} />
                  Log Details
                </h3>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedLog(null);
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="detail-content">
                <div className="detail-row">
                  <div className="detail-label">
                    <Calendar size={16} /> Date
                  </div>
                  <div className="detail-value">
                    {new Date(selectedLog.date).toLocaleDateString("en-GB", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-label">
                    <Clock size={16} /> Time
                  </div>
                  <div className="detail-value">
                    {selectedLog.departureTime || "-"} -{" "}
                    {selectedLog.arrivalTime || "-"}
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-label">
                    <MapPin size={16} /> Route
                  </div>
                  <div className="detail-value">
                    {selectedLog.from || "-"} → {selectedLog.to || "-"}
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-label">
                    <FileText size={16} /> Meter Readings
                  </div>
                  <div className="detail-value">
                    Before:{" "}
                    {selectedLog.beforeMeterReading ||
                      selectedLog.meterReading ||
                      "-"}
                    <br />
                    After: {selectedLog.afterMeterReading || "-"}
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-label">
                    <FileText size={16} /> Distance
                  </div>
                  <div className="detail-value">
                    <strong>{selectedLog.kilometers || "0"} km</strong>
                  </div>
                </div>

                {(selectedLog.fuel || selectedLog.oil) && (
                  <div className="detail-row">
                    <div className="detail-label">
                      <Fuel size={16} /> Supply
                    </div>
                    <div className="detail-value">
                      {selectedLog.fuel && (
                        <span>Fuel: {selectedLog.fuel}L</span>
                      )}
                      {selectedLog.fuel && selectedLog.oil && <span> | </span>}
                      {selectedLog.oil && <span>Oil: {selectedLog.oil}L</span>}
                    </div>
                  </div>
                )}

                <div className="detail-row">
                  <div className="detail-label">
                    <FileText size={16} /> Purpose
                  </div>
                  <div className="detail-value">
                    {selectedLog.purpose || "-"}
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-label">
                    <User size={16} /> Driver
                  </div>
                  <div className="detail-value">
                    {selectedLog.usedBy || "-"}
                  </div>
                </div>
              </div>

              <div className="detail-modal-footer">
                <button
                  className="btn-delete-detail"
                  onClick={handleDeleteClick}
                >
                  <Trash2 size={18} />
                  Delete
                </button>
                <button className="btn-edit-detail" onClick={handleEditClick}>
                  <Edit2 size={18} />
                  Edit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== COMPLETE STYLES ========== */}
      <style>{`
        /* ===== GLOBAL RESETS ===== */
        * {
          box-sizing: border-box;
        }

        /* ===== ADMIN BADGE ===== */
        .admin-badge {
          display: inline-block;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          font-size: 0.7rem;
          padding: 0.2rem 0.6rem;
          border-radius: 12px;
          margin-left: 0.5rem;
          font-weight: 600;
          vertical-align: middle;
        }

        /* ===== TOAST - TOP RIGHT ===== */
        .toast {
          position: fixed;
          top: 20px;
          right: 20px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-radius: 10px;
          font-weight: 600;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          z-index: 10000;
          min-width: 300px;
          backdrop-filter: blur(10px);
        }
        .toast-success {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
        }
        .toast-error {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
        }

        /* ===== PRINT STYLES - REMOVE URL/DATE/TITLE ===== */
        .print-only {
          display: none;
        }

        @media print {
          /* Remove default headers and footers */
          @page {
            size: A4 landscape;
            margin: 10mm;
          }

          /* Hide URL, date, page title from browser */
          html {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide everything except print content */
          body * {
            visibility: hidden;
          }

          .print-only,
          .print-only * {
            visibility: visible;
          }

          .print-only {
            display: block;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }

          /* Hide all other elements */
          .logbook-container,
          .toast,
          .logbook-modal-backdrop,
          .delete-confirm-backdrop,
          .pdf-preview-modal,
          header,
          footer,
          nav,
          aside {
            display: none !important;
          }
        }

        /* ===== PDF PREVIEW MODAL ===== */
        .pdf-preview-modal {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          padding: 20px;
        }

        .pdf-preview-content {
          background: white;
          width: 297mm;
          min-height: 210mm;
          box-shadow: 0 0 40px rgba(0, 0, 0, 0.5);
        }

        .print-container {
          background: #ffffff;
          color: #0f172a;
          padding: 20px;
          font-family: Arial, Helvetica, sans-serif;
        }

        .print-title {
          text-align: center;
          margin: 0 0 15px 0;
          font-size: 22px;
          font-weight: 700;
          color: #1e293b;
          border-bottom: 3px solid #3b82f6;
          padding-bottom: 10px;
        }

        .print-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 11px;
        }

        .print-table thead th {
          color: #000;
          border: 1px solid #1d4ed8;
          text-align: center;
          font-weight: 700;
          padding: 8px 4px;
          line-height: 1.3;
          vertical-align: middle;
          word-wrap: break-word;
          white-space: normal;
          background: #dbeafe;
        }

        .print-table tbody td {
          border: 1px solid #333;
          padding: 8px 4px;
          vertical-align: top;
          word-wrap: break-word;
          white-space: normal;
          line-height: 1.4;
        }

        .print-table tbody tr:nth-child(even) {
          background: #f8fafc;
        }

        .w-idx { width: 3%; }
        .w-date { width: 7%; }
        .w-supply { width: 10%; }
        .w-supply-child { width: 5%; }
        .w-dep { width: 8%; }
        .w-arr { width: 8%; }
        .w-from { width: 11%; }
        .w-to { width: 11%; }
        .w-meter { width: 14%; }
        .w-meter-child { width: 7%; }
        .w-km { width: 5%; }
        .w-purpose { width: 13%; }
        .w-user { width: 9%; }
        .w-remark { width: 8%; }

        .td-center { text-align: center; }
        .td-right { text-align: right; }

        .print-footer {
          margin-top: 15px;
          text-align: center;
          font-size: 10px;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
          padding-top: 8px;
        }

        /* ===== MAIN CONTAINER ===== */
        .logbook-container {
          padding: 1.5rem;
          max-width: 1400px;
          margin: 0 auto;
          transition: all 0.3s ease;
        }

        /* Sidebar state adjustments */
        .main-content:not(.sidebar-collapsed) .logbook-container {
          max-width: calc(100vw - 280px - 4rem);
        }

        .main-content.sidebar-collapsed .logbook-container {
          max-width: calc(100vw - 80px - 4rem);
        }

        .logbook-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .logbook-header-left h2 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 0 0 0.5rem 0;
          font-size: 1.75rem;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .logbook-header-left p {
          margin: 0;
          color: #64748b;
          font-size: 0.95rem;
        }

        .logbook-header-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .btn-action {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 1.25rem;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-print {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .btn-print:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(139, 92, 246, 0.4);
        }

        .btn-download {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .btn-download:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
        }

        .btn-add-log {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .btn-add-log:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
        }

        /* ===== LOADING & EMPTY STATES ===== */
        .logbook-loading,
        .logbook-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          color: #64748b;
          text-align: center;
        }

        .spinner-logbook {
          width: 40px;
          height: 40px;
          border: 4px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .logbook-empty h3 {
          margin: 1rem 0 0.5rem 0;
          color: #64748b;
          font-size: 1.25rem;
        }

        .btn-empty-log {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 1.5rem;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        /* ===== TABLE ===== */
        .table-wrapper {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          overflow-x: auto;
          border: 1px solid #e2e8f0;
        }

        .log-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }

        .log-table thead {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
        }

        .log-table th {
          padding: 1rem 0.75rem;
          text-align: left;
          font-weight: 700;
          font-size: 0.85rem;
          white-space: nowrap;
        }

        .log-table tbody tr {
          border-bottom: 1px solid #e2e8f0;
          transition: all 0.2s ease;
        }

        .log-table tbody tr.clickable-row {
          cursor: pointer;
        }

        .log-table tbody tr.clickable-row:hover {
          background: #f1f5f9;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          transform: scale(1.005);
        }

        .log-table td {
          padding: 1rem 0.75rem;
          color: #475569;
        }

        .td-date {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: #1e293b;
          white-space: nowrap;
        }

        .td-route {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
        }

        .route-item {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .icon-from {
          color: #10b981;
        }

        .icon-to {
          color: #ef4444;
        }

        .route-arrow {
          color: #94a3b8;
          font-weight: bold;
        }

        .td-time {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          font-size: 0.85rem;
        }

        .td-time > div {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .time-arrival {
          color: #10b981;
          font-weight: 600;
        }

        .td-distance {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .td-distance strong {
          color: #3b82f6;
          font-size: 1rem;
        }

        .td-distance small {
          color: #94a3b8;
          font-size: 0.75rem;
        }

        .td-supply {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .supply-badge {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          width: fit-content;
        }

        .supply-badge.fuel {
          background: #dbeafe;
          color: #1e40af;
        }

        .supply-badge.oil {
          background: #fef3c7;
          color: #92400e;
        }

        .td-purpose {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          font-size: 0.85rem;
          line-height: 1.4;
        }

        .td-user {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 500;
          font-size: 0.85rem;
        }

        /* ===== DELETE MODAL ===== */
        .delete-confirm-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
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
          box-shadow: 0 25px 70px rgba(248, 113, 113, 0.3);
          overflow: hidden;
        }

        .delete-icon-container {
          display: flex;
          justify-content: center;
          padding: 2rem 1.5rem 1rem;
          background: linear-gradient(135deg, #fee2e2, #fecaca);
        }

        .delete-icon-circle {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          background: linear-gradient(135deg, #fecaca, #fca5a5);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #dc2626;
          box-shadow: 0 8px 24px rgba(248, 113, 113, 0.25);
        }

        .delete-content {
          padding: 1.5rem 1.75rem;
          text-align: center;
        }

        .delete-content h3 {
          margin: 0 0 0.75rem;
          font-size: 1.5rem;
          color: #dc2626;
          font-weight: 700;
        }

        .delete-content p {
          margin: 0 0 1.25rem;
          color: #64748b;
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
          color: #64748b;
          font-size: 0.88rem;
        }

        .summary-value {
          font-weight: 600;
          color: #1e293b;
          font-size: 0.92rem;
        }

        .delete-actions {
          display: flex;
          gap: 0.75rem;
          padding: 1.25rem 1.75rem;
          background: #f8fafc;
          border-top: 2px solid #e2e8f0;
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
          color: #475569;
          transform: translateY(-1px);
        }

        .btn-confirm-delete {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.85rem 1.25rem;
          background: linear-gradient(135deg, #fca5a5, #f87171);
          border: none;
          border-radius: 12px;
          color: white;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(248, 113, 113, 0.3);
        }

        .btn-confirm-delete:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(248, 113, 113, 0.4);
        }

        /* ===== MODAL BACKDROP ===== */
        .logbook-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 6000;
          padding: 1rem;
          overflow-y: auto;
        }

        /* ===== MODAL CONTENT ===== */
        .logbook-modal-content {
          background: white;
          border-radius: 16px;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .compact-modal {
          max-width: 800px;
        }

        .detail-modal {
          max-width: 600px;
        }

        .logbook-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 2px solid #e2e8f0;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
        }

        .logbook-modal-header h3 {
          margin: 0;
          font-size: 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #1e293b;
        }

        .logbook-modal-header button {
          background: none;
          border: none;
          cursor: pointer;
          color: #64748b;
          padding: 0.5rem;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .logbook-modal-header button:hover {
          background: #e2e8f0;
          color: #1e293b;
        }

        /* ===== FORM ===== */
        .compact-form {
          padding: 1.5rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.25rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-group label {
          font-weight: 600;
          color: #1e293b;
          font-size: 0.9rem;
        }

        .required {
          color: #ef4444;
        }

        .form-group input,
        .form-group select {
          padding: 0.75rem;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.95rem;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-group input.error,
        .form-group select.error {
          border-color: #ef4444;
          background-color: #fef2f2;
        }

        .error-text {
          color: #ef4444;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .time-12h {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .time-12h select {
          flex: 1;
          padding: 0.75rem;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.95rem;
          background: white;
          cursor: pointer;
        }

        .time-12h .sep {
          font-weight: bold;
          color: #64748b;
          font-size: 1.2rem;
        }

        /* ===== MODAL FOOTER ===== */
        .compact-modal-footer {
          display: flex;
          gap: 0.75rem;
          padding: 1.25rem 1.5rem;
          background: #f8fafc;
          border-top: 2px solid #e2e8f0;
        }

        .btn-cancel,
        .btn-save {
          flex: 1;
          padding: 0.85rem 1.25rem;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .btn-cancel {
          background: white;
          border: 2px solid #cbd5e1;
          color: #64748b;
        }

        .btn-cancel:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
          color: #475569;
        }

        .btn-save {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          border: none;
          color: white;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .btn-save:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
        }

        /* ===== DETAIL MODAL ===== */
        .detail-content {
          padding: 1.5rem;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 1rem 0;
          border-bottom: 1px solid #e2e8f0;
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: #64748b;
          font-size: 0.9rem;
          flex: 0 0 40%;
        }

        .detail-value {
          font-weight: 500;
          color: #1e293b;
          font-size: 0.95rem;
          text-align: right;
          flex: 1;
        }

        .detail-modal-footer {
          display: flex;
          gap: 0.75rem;
          padding: 1.25rem 1.5rem;
          background: #f8fafc;
          border-top: 2px solid #e2e8f0;
        }

        .btn-delete-detail,
        .btn-edit-detail {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.85rem 1.25rem;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .btn-delete-detail {
          background: linear-gradient(135deg, #fca5a5, #f87171);
          color: white;
          box-shadow: 0 4px 12px rgba(248, 113, 113, 0.3);
        }

        .btn-delete-detail:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(248, 113, 113, 0.4);
        }

        .btn-edit-detail {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .btn-edit-detail:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
        }

        /* ===== RESPONSIVE ===== */
        
        @media (min-width: 1024px) {
          .main-content:not(.sidebar-collapsed) .logbook-container {
            max-width: calc(100vw - 280px - 4rem);
          }

          .main-content.sidebar-collapsed .logbook-container {
            max-width: calc(100vw - 80px - 4rem);
          }
        }

        @media (max-width: 1023px) and (min-width: 768px) {
          .main-content:not(.sidebar-collapsed) .logbook-container {
            max-width: calc(100vw - 280px - 3rem);
          }

          .main-content.sidebar-collapsed .logbook-container {
            max-width: calc(100vw - 80px - 3rem);
          }
        }

        @media (max-width: 768px) {
          .main-content .logbook-container,
          .main-content.sidebar-collapsed .logbook-container,
          .main-content:not(.sidebar-collapsed) .logbook-container {
            margin-left: 0 !important;
            max-width: 100% !important;
          }

          .logbook-header {
            flex-direction: column;
            align-items: stretch;
          }

          .logbook-header-actions {
            width: 100%;
          }

          .btn-action,
          .btn-add-log {
            flex: 1;
            justify-content: center;
          }

          .table-wrapper {
            overflow-x: scroll;
          }

          .log-table {
            min-width: 900px;
          }

          .toast {
            min-width: 250px;
            font-size: 0.9rem;
            right: 10px;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .compact-modal,
          .detail-modal {
            max-width: 95%;
          }

          .detail-row {
            flex-direction: column;
            gap: 0.5rem;
          }

          .detail-label {
            flex: 1;
          }

          .detail-value {
            text-align: left;
          }
        }

        @media (max-width: 480px) {
          .logbook-container {
            padding: 1rem;
          }

          .logbook-header-left h2 {
            font-size: 1.5rem;
          }

          .btn-action {
            padding: 0.5rem 0.75rem;
            font-size: 0.85rem;
          }

          .btn-action span:not(.sr-only) {
            display: none;
          }

          .compact-modal-footer,
          .detail-modal-footer,
          .delete-actions {
            flex-direction: column;
          }

          .btn-cancel,
          .btn-save,
          .btn-delete-detail,
          .btn-edit-detail,
          .btn-cancel-delete,
          .btn-confirm-delete {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
};

export default LogBook;
