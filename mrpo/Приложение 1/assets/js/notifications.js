export function showNotification(message, type = 'success', options = {}) {
    const { persistent = false, showDots = false } = options;

    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach((note) => note.remove());

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    // Store reference for programmatic dismissal
    if (persistent) {
        window._currentNotification = notification;
    }

    // Remove emoji from message (we use CSS ::before for emoji)
    let cleanMessage = message.replace(/[✅❌⚠️🔄⏱️📍🎨📋📊👥⚙️🗺️💾🔍📝⏰🚀✨🌟💡🔔📢📣⚡⏳]/g, '').trim();

    // Remove text in parentheses (синхронизация...) etc
    cleanMessage = cleanMessage.replace(/\s*\([^)]*\)/g, '').trim();

    // Remove trailing dots for animated version
    if (showDots) {
        cleanMessage = cleanMessage.replace(/\.+$/, '');
    }

    // Create text span to avoid emoji duplication from ::before
    const textSpan = document.createElement('span');
    textSpan.textContent = cleanMessage;
    notification.appendChild(textSpan);

    // Add animated dots if requested
    if (showDots) {
        const dotsSpan = document.createElement('span');
        dotsSpan.className = 'loading-dots';
        dotsSpan.innerHTML = '<span>.</span><span>.</span><span>.</span>';
        notification.appendChild(dotsSpan);
    }

    // Swipe-to-dismiss functionality
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    const handleTouchStart = (e) => {
        startY = e.touches[0].clientY;
        isDragging = true;
        notification.classList.add('swiping');
    };

    const handleTouchMove = (e) => {
        if (!isDragging) return;

        currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;

        // Only allow upward swipe (keep centered with translateX)
        if (deltaY < 0) {
            notification.style.transform = `translateX(-50%) translateY(${deltaY}px)`;
            notification.style.opacity = Math.max(0, 1 + deltaY / 100);
        }
    };

    const handleTouchEnd = (e) => {
        if (!isDragging) return;

        isDragging = false;
        notification.classList.remove('swiping');

        const deltaY = currentY - startY;

        // If swiped up more than 50px, dismiss
        if (deltaY < -50) {
            notification.classList.add('dismissed');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        } else {
            // Reset position (keep centered)
            notification.style.transform = 'translateX(-50%)';
            notification.style.opacity = '';
        }
    };

    // Add touch event listeners
    notification.addEventListener('touchstart', handleTouchStart, { passive: true });
    notification.addEventListener('touchmove', handleTouchMove, { passive: false });
    notification.addEventListener('touchend', handleTouchEnd, { passive: true });

    document.body.appendChild(notification);

    // Auto-dismiss after 5 seconds (unless persistent)
    if (!persistent) {
        setTimeout(() => {
            if (notification.parentNode && !notification.classList.contains('dismissed')) {
                notification.classList.add('dismissed');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 5000);
    }

    return notification;
}

// Helper function to dismiss current notification
export function dismissNotification() {
    if (window._currentNotification && window._currentNotification.parentNode) {
        window._currentNotification.classList.add('dismissed');
        setTimeout(() => {
            if (window._currentNotification && window._currentNotification.parentNode) {
                window._currentNotification.remove();
                window._currentNotification = null;
            }
        }, 300);
    }
}








