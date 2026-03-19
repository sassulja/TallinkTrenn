import React from "react";

export function LoadingSpinner() {
    return (
        <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
            Laadimine...
        </div>
    );
}

export function ErrorMessage({ message }) {
    return (
        <div style={{ padding: "40px", textAlign: "center", color: "#ef4444" }}>
            <div style={{ fontSize: "18px", marginBottom: "8px" }}>⚠️ Viga</div>
            <div style={{ color: "#6b7280" }}>
                {message || "Andmete laadimine ebaõnnestus."}
            </div>
        </div>
    );
}

export function EmptyState({ message }) {
    return (
        <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af", fontSize: "15px" }}>
            {message}
        </div>
    );
}
