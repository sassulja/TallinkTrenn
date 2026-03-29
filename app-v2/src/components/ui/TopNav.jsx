import React from "react"

export default function TopNav() {
    return (
        <div style={{
            height: "48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 var(--spacing-md)",
            borderBottom: "1px solid var(--color-border)",
            background: "white",
            position: "sticky",
            top: 0,
            zIndex: 10
        }}>
            <div style={{ fontWeight: "bold" }}>Tallink Trenn</div>
            <div style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
                Treeningud
            </div>
        </div>
    )
}
