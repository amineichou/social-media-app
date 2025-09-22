import React from 'react'
import Login from './Login'
import Register from './Register'
import Footer from '../components/Footer'

const LandPage = () => {
    const [isLogin, setIsLogin] = React.useState(true);


    return (
        <>
            <div className="flex">


                <div className="hidden md:flex flex-col justify-end items-center bg-[url('/jupiter_2.jpg')] bg-cover w-1/2 p-12">
                    <Footer />
                </div>
                <div className="flex flex-col items-center justify-between w-full md:w-1/2 p-8 h-screen">
                    {/* Modern Toggle Switch */}
                    <div className="bg-gray-100 rounded-full p-1 flex w-72 relative">
                        {/* Sliding Background */}
                        <div className={`absolute top-1 bottom-1 w-1/2 bg-white rounded-full shadow-md transition-transform duration-300 ease-in-out ${isLogin ? 'translate-x-0' : 'translate-x-full'
                            }`}></div>

                        {/* Toggle Buttons */}
                        <button
                            className={`relative z-10 flex-1 py-3 px-6 text-center font-medium rounded-full transition-colors duration-300 ${isLogin
                                ? 'text-blue-600'
                                : 'text-gray-600 hover:text-blue-600'
                                }`}
                            onClick={() => setIsLogin(true)}
                        >
                            Sign in
                        </button>
                        <button
                            className={`relative z-10 flex-1 py-3 px-6 text-center font-medium rounded-full transition-colors duration-300 ${!isLogin
                                ? 'text-blue-600'
                                : 'text-gray-600 hover:text-blue-600'
                                }`}
                            onClick={() => setIsLogin(false)}
                        >
                            Sign up
                        </button>
                    </div>
                    <div className="w-full">
                        {isLogin ? <Login /> : <Register />}
                    </div>
                </div>
            </div>
            <div className='md:hidden'>
                <div className="container flex flex-col items-center  py-4 mx-auto lg:flex-row">
                    <img
                        className="w-auto h-7 p-1"
                        src="/logo.png"
                        alt="logo"
                    />
                    <div className="flex flex-wrap items-center justify-center gap-4 mt-6 lg:gap-6 lg:mt-0">
                        <a
                            href="#"
                            className="text-sm text-gray-500 transition-colors duration-300 hover:text-blue-500"
                        >
                            Overview
                        </a>
                        <a
                            href="#"
                            className="text-sm text-gray-500 transition-colors duration-300 hover:text-blue-500 dark:hover:text-blue-400"
                        >
                            Help
                        </a>
                        <a
                            href="#"
                            className="text-sm text-gray-500 transition-colors duration-300 hover:text-blue-500 dark:hover:text-blue-400"
                        >
                            Privacy
                        </a>
                    </div>

                    <p className="mt-6 text-sm text-gray-300 lg:mt-0 dark:text-gray-400">
                        © Copyright 2025 Jupiter.
                    </p>
                </div>
            </div>
        </>
    )
}

export default LandPage
