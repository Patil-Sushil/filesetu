// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { ref, set, get } from "firebase/database";
import { auth, database } from "../firebase";

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState(null);
  const [loading, setLoading] = useState(true);

  // Create default admin user if it doesn't exist
  const createDefaultAdmin = async () => {
    const adminEmail = "patilsushil794@gmail.com";
    const adminPassword = "142203";

    try {
      // Check if admin already exists in database
      const usersRef = ref(database, "user");
      const snapshot = await get(usersRef);

      let adminExists = false;
      if (snapshot.exists()) {
        const users = snapshot.val();
        adminExists = Object.values(users).some(
          (user) => user.email === adminEmail,
        );
      }

      if (adminExists) {
        return;
      }

      // Try to create admin user
      const result = await createUserWithEmailAndPassword(
        auth,
        adminEmail,
        adminPassword,
      );

      const uid = result.user.uid;

      // Store admin data in database
      await set(ref(database, `user/${uid}`), {
        name: "Admin",
        email: adminEmail,
        mobile: "9420788100",
        role: "admin",
        createdAt: new Date().toISOString(),
        isDefaultAdmin: true,
      });

      // Sign out after creation
      await signOut(auth);
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        // Admin exists in Auth, check database
        try {
          const loginResult = await signInWithEmailAndPassword(
            auth,
            adminEmail,
            adminPassword,
          );

          const uid = loginResult.user.uid;
          const userRef = ref(database, `user/${uid}`);
          const userSnapshot = await get(userRef);

          if (!userSnapshot.exists()) {
            // User exists in Auth but not in Database
            await set(ref(database, `user/${uid}`), {
              name: "Admin",
              email: adminEmail,
              mobile: "9420788100",
              role: "admin",
              createdAt: new Date().toISOString(),
              isDefaultAdmin: true,
            });
            console.log("✅ Admin data added to database");
          }

          await signOut(auth);
        } catch (loginError) {
          console.error("Error verifying admin:", loginError.message);
        }
      }
    }
  };

  const signup = async (email, password, userData) => {
    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const uid = result.user.uid;

      await set(ref(database, `user/${uid}`), {
        name: userData.name,
        email: email,
        mobile: userData.mobile,
        role: userData.role,
        createdAt: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    return signOut(auth);
  };

  const getUserRole = async (uid) => {
    try {
      const userRef = ref(database, `user/${uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists() && snapshot.val().role) {
        return snapshot.val().role;
      }
      return null;
    } catch (error) {
      console.error("Error fetching user role:", error);
      return null;
    }
  };

  const getUserName = async (uid) => {
    try {
      const userRef = ref(database, `user/${uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists() && snapshot.val().name) {
        return snapshot.val().name;
      }
      return null;
    } catch (error) {
      console.error("Error fetching user name:", error);
      return null;
    }
  };

  // Initialize app
  useEffect(() => {
    let isMounted = true;
    let unsubscribe;

    const initializeApp = async () => {
      try {
        // Create default admin only
        await createDefaultAdmin();

        // Set up auth state listener
        unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (isMounted) {
            if (user) {
              setCurrentUser(user);
              const role = await getUserRole(user.uid);
              const name = await getUserName(user.uid);
              setUserRole(role);
              setUserName(name);
            } else {
              setCurrentUser(null);
              setUserRole(null);
              setUserName(null);
            }
            setLoading(false);
          }
        });
      } catch (error) {
        console.error("Error initializing app:", error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeApp();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const value = {
    currentUser,
    userRole,
    userName,
    signup,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
