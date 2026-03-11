import { jsx as _jsx } from "react/jsx-runtime";
import '../css/app.css';
import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
createInertiaApp({
    resolve: name => {
        // @ts-expect-error import.meta.glob is a Vite feature
        const pages = import.meta.glob('./Pages/**/*.tsx', { eager: true });
        return pages[`./Pages/${name}.tsx`];
    },
    setup({ el, App, props }) {
        createRoot(el).render(_jsx(App, { ...props }));
    },
});
//# sourceMappingURL=app.js.map