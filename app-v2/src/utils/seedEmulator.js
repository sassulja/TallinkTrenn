import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth"
import { ref, set } from "firebase/database"
import { auth, database as db } from "../services/firebase"

export async function seedAdminUser() {
    let uid

    try {
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            "admin@test.com",
            "password123"
        )
        uid = userCredential.user.uid
        console.log("✅ Admin created:", uid)

    } catch (error) {
        if (error.code === "auth/email-already-in-use") {
            const existing = await signInWithEmailAndPassword(
                auth,
                "admin@test.com",
                "sassulja"
            )
            uid = existing.user.uid
            console.log("ℹ️ Admin already exists, using UID:", uid)
        } else {
            console.error("❌ Seed failed:", error)
            return
        }
    }

    await set(ref(db, `users/${uid}`), {
        role: "admin",
        email: "admin@test.com",
        displayName: "Admin User",
        createdAt: new Date().toISOString()
    })

    console.log("✅ RTDB role ensured")
}

export async function seedCoachUser() {
    let uid

    try {
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            "coach@test.com",
            "sassulja"
        )
        uid = userCredential.user.uid
        console.log("✅ Coach created:", uid)

    } catch (error) {
        if (error.code === "auth/email-already-in-use") {
            const existing = await signInWithEmailAndPassword(
                auth,
                "coach@test.com",
                "sassulja"
            )
            uid = existing.user.uid
            console.log("ℹ️ Coach already exists, using UID:", uid)
        } else {
            console.error("❌ Seed failed:", error)
            return
        }
    }

    await set(ref(db, `users/${uid}`), {
        role: "coach",
        email: "coach@test.com",
        displayName: "Test Coach",
        createdAt: new Date().toISOString()
    })

    console.log("✅ RTDB role ensured")
}

export async function seedPlayerUser() {
    let uid

    try {
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            "player@test.com",
            "sassulja"
        )
        uid = userCredential.user.uid
        console.log("✅ Player created:", uid)

    } catch (error) {
        if (error.code === "auth/email-already-in-use") {
            const existing = await signInWithEmailAndPassword(
                auth,
                "player@test.com",
                "sassulja"
            )
            uid = existing.user.uid
            console.log("ℹ️ Player already exists, using UID:", uid)
        } else {
            console.error("❌ Seed failed:", error)
            return
        }
    }

    // Workaround: We must write the role to the DB, but "player" role can't write to their own users node.
    // So we sign in as admin temporarily to perform the write.
    await signInWithEmailAndPassword(
        auth,
        "admin@test.com",
        "password123"
    )

    await set(ref(db, `users/${uid}`), {
        role: "player",
        email: "player@test.com",
        displayName: "Test Player",
        playerId: "-OmTUsruwG264qqpDxUF",
        createdAt: new Date().toISOString()
    })

    // Sign back in as the seeded user so the emulator session is the player
    await signInWithEmailAndPassword(
        auth,
        "player@test.com",
        "sassulja"
    )

    console.log("✅ RTDB role ensured")
}