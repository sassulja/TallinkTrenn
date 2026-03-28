import React from "react"

export default function ActionBlock({ children, style = {} }) {
    return (
        <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px", ...style }}>
            {children}
        </div>
    )
}
