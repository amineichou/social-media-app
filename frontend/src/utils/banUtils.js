// Utility function to check if current user is banned
export const checkUserBanStatus = async () => {
  try {
    const response = await fetch('/api/users/me', {
      credentials: 'include'
    });
    
    if (response.ok) {
      const userData = await response.json();
      return {
        isBanned: userData.isBanned || false,
        banReason: userData.banReason || null
      };
    }
  } catch (error) {
    console.error('Failed to check ban status:', error);
  }
  
  return { isBanned: false, banReason: null };
};

// Show banned user alert
export const showBannedUserAlert = (banReason = null) => {
  const reason = banReason 
    ? `\n\nReason: ${banReason}` 
    : '\n\nPlease contact support for more information.';
  
  // Try to use global alert function if available, otherwise fallback to browser alert
  if (window.showGlobalAlert) {
    window.showGlobalAlert(`Your account has been banned and you cannot perform this action.${reason}`, 'error');
  } else {
    alert(`Your account has been banned and you cannot perform this action.${reason}`);
  }
};

// Check if action is allowed for banned users
export const isActionAllowed = async (actionType) => {
  const { isBanned, banReason } = await checkUserBanStatus();
  
  if (!isBanned) return true;
  
  // Banned users can only message, everything else is restricted
  const allowedActions = ['message', 'view'];
  
  if (!allowedActions.includes(actionType)) {
    showBannedUserAlert(banReason);
    return false;
  }
  
  return true;
};
