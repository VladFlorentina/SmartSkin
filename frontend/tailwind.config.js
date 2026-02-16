/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                // Paleta "Girly & Calm"
                brand: {
                    50: '#FFF1F2', // Fundal foarte pal (Rose 50)
                    100: '#FFE4E6', // Rose 100
                    200: '#FECDD3', // Rose 200
                    300: '#FDA4AF', // Rose 300
                    400: '#FB7185', // Primary Button (Rose 400) - Roz placut
                    500: '#F43F5E', // Rose 500
                    600: '#E11D48', // Text accent (Rose 600)
                    900: '#881337', // Text inchis (Rose 900)
                }
            }
        },
    },
    plugins: [],
}
