import { useState, useEffect } from 'react';
import { FaBan } from 'react-icons/fa';

const BannedUserBanner = () => {
    const [user, setUser] = useState(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const checkBanStatus = async () => {
            try {
                const response = await fetch('/api/users/ban-status', {
                    credentials: 'include'
                });

                if (response.ok) {
                    const banData = await response.json();
                    console.log('Ban status check:', banData);

                    // Don't show banner for admin accounts
                    if (banData.isBanned && !banData.isAdmin) {
                        setUser({
                            username: banData.username,
                            isBanned: banData.isBanned,
                            banReason: banData.banReason
                        });
                        setIsVisible(true);
                        console.log("User is banned - showing banner");
                    }
                } else {
                    console.log('Failed to fetch ban status:', response.status);
                }
            } catch (error) {
                console.error('Failed to check ban status:', error);
            }
        };

        checkBanStatus();
    }, []);

    if (!isVisible || !user?.isBanned) {
        return null;
    }

    return (
        <div className="bg-red-600 flex items-center justify-end text-white p-4">
            <div className="flex items-center gap-10">
                <FaBan size={40} />
                <div>
                    <p className="font-semibold">Your account has been banned</p>
                    <p className="text-sm opacity-90">
                        {user.banReason
                            ? `Reason: ${user.banReason}`
                            : 'Please contact support for more information.'
                        }
                    </p>
                    <p className="text-xs opacity-75 mt-1">
                        You can still access messages but cannot post, comment, or like content.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BannedUserBanner;
