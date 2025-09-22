import React from 'react'
import { Link } from 'react-router-dom'
import { getThemeCookie } from '../utils/auth'

const Logo = () => {

    const theme = getThemeCookie();

    const logoSrc = theme === 'dark' ? '/logo-dark.png' : '/logo.png';

    return (
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-start">
            <Link to="/" className="flex items-center gap-3">
                <img src={logoSrc} alt="Jupiter" className="h-8 w-auto" />
            </Link>
        </div>
    )
}

export default Logo
