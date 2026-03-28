import React from "react"

export default function SecondaryButton({ onClick, children, disabled = false, style = {} }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            style={{
                padding: "8px 16px",
                background: "#fff",
                color: "#dc2626",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.6 : 1,
                fontWeight: "bold",
                width: "fit-content",
                ...style
            }}
        >
            {children}
        </button>
    )
}
