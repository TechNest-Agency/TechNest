import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Bars3Icon, XMarkIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import { useCart } from '../context/CartContext';
import Search from './Search';

const Navbar = (props) => {
    const { isDarkMode, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { getCartCount, setIsCartOpen } = useCart();

    const handleLogoClick = (e) => {
        console.log('Logo clicked');
        navigate('/', { replace: true });
    };

    const navLinks = [
        { path: '/', label: 'Home' },
        { path: '/about', label: 'About' },
        { path: '/team', label: 'Team' },
        { path: '/services', label: 'Services' },        
        { path: '/portfolio', label: 'Portfolio' },
        // { path: '/courses', label: 'Courses' },
        { path: '/contact', label: 'Contact' }
    ];

    return (
        <nav className={`sticky top-0 z-50 ${isDarkMode ? 'bg-gray-900/80' : 'bg-white/80'} backdrop-blur-md shadow-md`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <div 
                            onClick={handleLogoClick}
                            className="flex items-center hover:opacity-80 transition-opacity cursor-pointer mr-8"
                        >
                            <img 
                                src="/logo.png" 
                                alt="TechNest Logo" 
                                className="h-8"
                            />
                        </div>
                        
                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-8">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`${
                                        location.pathname === link.path
                                            ? isDarkMode
                                                ? 'text-blue-400'
                                                : 'text-blue-600'
                                            : isDarkMode
                                            ? 'text-gray-300 hover:text-white'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Right side items */}
                    <div className="flex items-center space-x-4">
                        {/* Search component */}
                        <div className="hidden md:block w-64">
                            <Search />
                        </div>

                        {/* Cart */}
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="relative p-2 text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400"
                        >
                            <ShoppingCartIcon className="h-6 w-6" />
                            {getCartCount() > 0 && (
                                <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                    {getCartCount()}
                                </span>
                            )}
                        </button>

                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className={`p-2 rounded-full ${
                                isDarkMode ? 'text-yellow-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {isDarkMode ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                            )}
                        </button>

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className={`md:hidden p-2 rounded-lg transition-colors duration-200 ${
                                isDarkMode 
                                    ? 'hover:bg-gray-800/50 text-gray-300' 
                                    : 'hover:bg-gray-100/50 text-gray-600'
                            }`}
                        >
                            {isMenuOpen ? (
                                <XMarkIcon className="h-6 w-6" />
                            ) : (
                                <Bars3Icon className="h-6 w-6" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                <div className={`md:hidden transition-all duration-300 ease-in-out ${
                    isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
                }`}>
                    <div className={`py-4 space-y-2 rounded-lg shadow-lg ${
                        isDarkMode 
                            ? 'bg-gray-900/90 backdrop-blur-xl border border-gray-800/50' 
                            : 'bg-white/90 backdrop-blur-xl border border-gray-200/50'
                    }`}>
                        {/* Mobile Search */}
                        <div className="px-4 mb-4">
                            <Search />
                        </div>

                        {/* Mobile Navigation Links */}
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`block px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                                    isDarkMode 
                                        ? 'text-gray-300 hover:text-white hover:bg-gray-800/50 hover:translate-x-2' 
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50 hover:translate-x-2'
                                }`}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;