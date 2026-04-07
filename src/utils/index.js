// src/utils/index.js

export const estonianDate = (dateString, withTime = false) => {
    if (!dateString) return "";
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
    };
    if (withTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    return new Date(dateString).toLocaleDateString('et-EE', options);
};
