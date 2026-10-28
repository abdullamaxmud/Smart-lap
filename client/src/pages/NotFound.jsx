import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

const NotFound = () => {
    useEffect(() => {
        document.title = 'Page Not Found · HU Smart Lab';
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="text-center max-w-md">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-hu-blue text-hu-gold flex items-center justify-center mb-6">
                    <Compass size={32} />
                </div>
                <p className="text-sm font-bold text-hu-blue">404</p>
                <h1 className="text-3xl font-bold heading-font text-slate-900 mt-1">Page not found</h1>
                <p className="text-slate-500 mt-2">The page you are looking for does not exist or has been moved.</p>
                <Link to="/dashboard" className="btn-primary mt-6">Back to Dashboard</Link>
            </div>
        </div>
    );
};

export default NotFound;
