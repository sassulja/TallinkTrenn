import React from "react"

export default function PrimaryButton({ onClick, children, disabled = false, style = {} }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            style={{
                padding: "8px 16px",
                background: disabled ? "#d1d5db" : "var(--color-primary)",
                color: "white",
                border: "1px solid transparent",
                borderRadius: "8px",
                cursor: disabled ? "not-allowed" : "pointer",
                fontWeight: "bold",
                width: "fit-content",
                boxShadow: disabled ? "none" : "0 1px 2px rgba(0,0,0,0.12)",
                ...style
            }}
        >
            {children}
        </button>
    )
}
