import React from "react"

export default function MessageItem({ message }) {
    return (
        <div style={{ marginBottom: "6px", fontSize: "12px" }}>
            <span style={{ fontWeight: "bold", color: "#333" }}>
                {message.createdByName}
            </span>
            <span style={{ color: "var(--color-text-muted)", marginLeft: "6px" }}>
                {new Date(message.createdAt).toLocaleString("et-EE", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit"
                })}
            </span>
            <div style={{ color: "var(--color-text-secondary)", marginTop: "2px" }}>
                {message.text}
            </div>
        </div>
    )
}
