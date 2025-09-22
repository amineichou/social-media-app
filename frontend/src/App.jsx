import { useState, useEffect } from "react";
import Home from "./pages/Home.jsx";
import NewPost from "./pages/NewPost.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Nav from "./components/Nav.jsx";
import Profile from "./pages/Profile.jsx";
import ProfileEdit from "./pages/ProfileEdit.jsx";
import { SocketProvider } from "./contexts/SocketContext.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { ThemeProvider } from "./contexts/ThemeContext.jsx";
import { AlertProvider } from "./components/Alert.jsx";
import { ConfirmProvider } from "./components/ConfirmAlert.jsx";
import Inbox from "./pages/chat/Inbox.jsx";
import Notifications from "./pages/Notifications.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminRoute from "./components/AdminRoute.jsx";
import { isLoggedIn } from "./utils/auth.js";
import LandPage from "./pages/LandPage.jsx";
import BannedUserBanner from "./components/BannedUserBanner.jsx";
import NotFound from "./pages/NotFound.jsx";
import Settings from "./pages/Settings.jsx";
import TermsConditions from "./pages/TermsConditions.jsx";


function AuthenticatedApp() {
  return (
    <ThemeProvider>
      <AlertProvider>
        <ConfirmProvider>
          <AuthProvider>
            <SocketProvider>
              <BrowserRouter>
                <BannedUserBanner />
                <div className="flex min-h-screen">
                  <Nav />
                  {/* Main Content */}
                  <div className="flex-1 lg:ml-64 lg:pb-0 dark:bg-gray-900 bg-gray-100">
                    <div className="p-4 lg:p-0">
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/new" element={<NewPost />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/notifications" element={<Notifications />} />
                        <Route path="/profile/:userId" element={<Profile />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/edit-profile" element={<ProfileEdit />} />
                        <Route path="/inbox" element={<Inbox />} />
                        <Route path="/inbox/:userId" element={<Inbox />} />
                        <Route path="*" element={<NotFound />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/terms" element={<TermsConditions />} />
                        <Route path="/admin" element={
                          <AdminRoute>
                            <AdminDashboard />
                          </AdminRoute>
                        } />
                      </Routes>
                    </div>
                  </div>
                </div>
                {/* <Footer /> */}
              </BrowserRouter>
            </SocketProvider>
          </AuthProvider>
        </ConfirmProvider>
      </AlertProvider>
    </ThemeProvider>
  )
}


function UnauthenticatedApp() {
  return (
    <ThemeProvider>
      <AlertProvider>
        <ConfirmProvider>
          <AuthProvider>
            <SocketProvider>
              <BrowserRouter>
                <div className="dark:bg-white bg-white">
                  <Routes>
                    <Route path="/" element={<LandPage />} />
                    <Route path="/terms" element={<TermsConditions />} />
                    <Route path="*" element={<LandPage />} />
                  </Routes>
                </div>
              </BrowserRouter>
            </SocketProvider>
          </AuthProvider>
        </ConfirmProvider>
      </AlertProvider>
    </ThemeProvider>
  )
}


export default function App() {
  const [authenticated, setAuthenticated] = useState(null); // null = loading, true/false = determined

  useEffect(() => {
    async function checkAuth() {
      const loggedIn = await isLoggedIn();
      setAuthenticated(loggedIn);
    }
    checkAuth();
  }, []);

  // Show loading while checking authentication
  if (authenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    authenticated ? <AuthenticatedApp /> : <UnauthenticatedApp />
  );
}
