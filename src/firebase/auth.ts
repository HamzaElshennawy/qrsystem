import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    User,
    UserCredential,
    updateProfile,
} from "firebase/auth";
import { auth } from "./firebaseConfig";

export interface AuthUser extends User {
    displayName: string | null;
}

export const authService = {
    // Sign up with email and password
    signUp: async (
        email: string,
        password: string,
        displayName?: string
    ): Promise<UserCredential> => {
        try {
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

            // Update the user's display name if provided
            if (displayName && userCredential.user) {
                await updateProfile(userCredential.user, { displayName });
            }

            return userCredential;
        } catch (error) {
            throw error;
        }
    },

    // Sign in with email and password
    signIn: async (
        email: string,
        password: string
    ): Promise<UserCredential> => {
        try {
            return await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            throw error;
        }
    },

    // Sign out
    signOut: async (): Promise<void> => {
        try {
            await signOut(auth);
        } catch (error) {
            throw error;
        }
    },

    // Get current user
    getCurrentUser: (): User | null => {
        return auth.currentUser;
    },

    // Check if user is authenticated
    isAuthenticated: (): boolean => {
        return !!auth.currentUser;
    },
};
