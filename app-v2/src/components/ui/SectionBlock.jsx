import React from "react"

export default function SectionBlock({ children, style }) {
    return (
        <div style={{
            marginTop: "var(--spacing-md)",
            borderTop: "1px solid var(--color-border)",
            paddingTop: "var(--spacing-sm)",
            ...(style || {})
        }}>
            {children}
        </div>
    )
}
