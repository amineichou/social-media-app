import React from 'react'

const Footer = () => {
    return (
        <footer className="">
            <div className="container flex flex-col gap-4 items-center justify-between py-4 mx-auto lg:flex-row">
                <img
                    className="w-auto h-7 p-1"
                    src="/logo.png"
                    alt="logo"
                />
                <div className="flex flex-wrap items-center justify-center gap-4 mt-6 lg:gap-6 lg:mt-0">
                    <a
                        href="#"
                        className="text-sm text-white transition-colors duration-300 hover:text-blue-500"
                    >
                        Overview
                    </a>
                    <a
                        href="#"
                        className="text-sm text-white transition-colors duration-300 hover:text-blue-500 dark:hover:text-blue-400"
                    >
                        Help
                    </a>
                    <a
                        href="#"
                        className="text-sm text-white transition-colors duration-300 hover:text-blue-500 dark:hover:text-blue-400"
                    >
                        Privacy
                    </a>
                </div>

                <p className="mt-6 text-sm text-gray-300 lg:mt-0 dark:text-gray-400">
                    © Copyright 2025 Jupiter.
                </p>
            </div>
        </footer>
    )
}

export default Footer
