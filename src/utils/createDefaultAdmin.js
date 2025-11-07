import { createUserWithEmailAndPassword } from "firebase/auth";
import { ref, set, get } from "firebase/database";
import { auth, database } from "../firebase";

/**
 * Creates a default admin user if none exists
 * Call this once during app initialization
 */
export const createDefaultAdmin = async () => {
  const defaultAdmin = {
    email: "admin@gmail.com",
    password: "admin@123",
    name: "System Administrator",
    mobile: "0000000000",
    role: "admin",
  };

  try {
    // Check if any admin exists
    const usersRef = ref(database, "user");
    const snapshot = await get(usersRef);

    if (snapshot.exists()) {
      const users = snapshot.val();
      const adminExists = Object.values(users).some(
        (user) => user.role === "admin"
      );

      if (adminExists) {
        console.log("✅ Admin user already exists");
        return { success: false, message: "Admin already exists" };
      }
    }

    // Create default admin
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      defaultAdmin.email,
      defaultAdmin.password
    );

    const uid = userCredential.user.uid;

    // Save to database
    await set(ref(database, `user/${uid}`), {
      name: defaultAdmin.name,
      email: defaultAdmin.email,
      mobile: defaultAdmin.mobile,
      role: defaultAdmin.role,
      createdAt: new Date().toISOString(),
      isDefaultAdmin: true,
    });

    console.log("✅ Default admin created successfully");
    return {
      success: true,
      message: "Default admin created",
      credentials: {
        email: defaultAdmin.email,
        password: defaultAdmin.password,
      },
    };
  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      console.log("ℹ️ Admin email already in use");
      return { success: false, message: "Admin email already exists" };
    }
    console.error("❌ Error creating default admin:", error);
    return { success: false, message: error.message };
  }
};
