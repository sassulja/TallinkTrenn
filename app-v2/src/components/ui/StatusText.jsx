import React from "react"

const COLOR_MAP = {
    success: "#16a34a",
    warning: "#d97706",
    error: "#dc2626",
    muted: "var(--color-text-muted)"
}

export default function StatusText({ type, children, style = {} }) {
    return (
        <span style={{ fontWeight: "bold", color: COLOR_MAP[type], ...style }}>
            {children}
        </span>
    )
}
