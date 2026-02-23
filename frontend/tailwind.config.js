/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                // Paleta principala - Dusty Rose (calm, feminin, modern)
                brand: {
                    50:  '#FDF2F7', // fundal principal - alb cu tenta roz foarte pal
                    100: '#FAE3EF', // sectiuni/carduri pale
                    200: '#F4C2D8', // borduri, separatoare
                    300: '#E89BBF', // elemente secundare, placeholders
                    400: '#D97AAA', // butoane principale, accente - dusty rose
                    500: '#C45990', // hover / stare activa
                    600: '#A63D75', // text accent
                    900: '#5C1A40', // text inchis / titluri
                },
                // Lavanda - pentru variatii de culoare (chat, profile)
                lavender: {
                    50:  '#F5F3FF',
                    100: '#EDE9FE',
                    200: '#DDD6FE',
                    400: '#A78BFA',
                    600: '#7C3AED',
                },
                // Mint - pentru scor sigur / elemente pozitive
                mint: {
                    50:  '#F0FDF8',
                    100: '#DCFCE7',
                    200: '#BBF7D0',
                    400: '#4ADE80',
                    600: '#16A34A',
                },
                // Peach - pentru avertismente moderate (inlocuieste amber prea viu)
                peach: {
                    50:  '#FFF8F0',
                    100: '#FEECDC',
                    200: '#FDD0A2',
                    400: '#F97316',
                    600: '#C2410C',
                },
                // Sky - albastru pal pastel (search, info, accente secundare)
                sky: {
                    50:  '#F0F9FF',
                    100: '#E0F2FE',
                    200: '#BAE6FD',
                    300: '#7DD3FC',
                    400: '#38BDF8',
                    500: '#0EA5E9',
                    600: '#0284C7',
                },
                // Blush - roz si mai pal decat brand (carduri, fundaluri)
                blush: {
                    50:  '#FFF5F8',
                    100: '#FFE8F0',
                    200: '#FFCCE0',
                    300: '#FFA8C5',
                    400: '#FF80A8',
                },
                // Sage - verde pal (ingrediente sigure, note pozitive)
                sage: {
                    50:  '#F3FAF5',
                    100: '#E6F4EA',
                    200: '#C8E6D0',
                    300: '#96CFA5',
                    400: '#5FAF75',
                    600: '#2D7A44',
                },
                // Lilac - mov pal (profil, categorii speciale)
                lilac: {
                    50:  '#FAF8FF',
                    100: '#F3EFFE',
                    200: '#E5DAFD',
                    300: '#C9B4FA',
                    400: '#A87DF5',
                    600: '#7C3AED',
                },
            }
        },
    },
    plugins: [],
}
