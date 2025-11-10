// user-badge.js - Enhanced reusable user ID badge functionality
const USER_API = "http://localhost:8081/api/user";

class UserBadge {
    constructor() {
        this.init();
    }

    async init() {
        await this.loadUserInfo();
        this.setupCopyFunctionality();
    }

    async loadUserInfo() {
        try {
            // FIRST TRY TO USE STORED USER DATA
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                const userData = JSON.parse(storedUser);
                this.updateDisplay(userData.userId);
                return;
            }

            // FALLBACK TO EMAIL/NAME PROMPT
            const userEmail = localStorage.getItem('userEmail');
            const username = localStorage.getItem('username');

            let apiUrl = `${USER_API}/current?`;
            if (userEmail) {
                apiUrl += `email=${encodeURIComponent(userEmail)}`;
            } else if (username) {
                apiUrl += `username=${encodeURIComponent(username)}`;
            } else {
                const userInput = prompt("Please enter your email or username to load your User ID:");
                if (!userInput) {
                    this.updateDisplay('Input required');
                    return;
                }
                apiUrl += userInput.includes('@') ? `email=${encodeURIComponent(userInput)}` : `username=${encodeURIComponent(userInput)}`;
                localStorage.setItem(userInput.includes('@') ? 'userEmail' : 'username', userInput);
            }

            const response = await fetch(apiUrl);

            if (response.ok) {
                const userData = await response.json();
                this.updateDisplay(userData.userId);
                localStorage.setItem('currentUser', JSON.stringify(userData));
            } else {
                throw new Error('Failed to fetch user data');
            }
        } catch (error) {
            console.error('Error loading user info:', error);
            this.updateDisplay('Not Available');
        }
    }

    updateDisplay(userId) {
        const userIdElement = document.getElementById('userIdValue');
        if (userIdElement) {
            userIdElement.textContent = userId;
        }
    }

    setupCopyFunctionality() {
        const userIDCard = document.getElementById('userIDCard');
        const copyNotification = document.getElementById('copyNotification');

        if (userIDCard) {
            userIDCard.addEventListener('click', async () => {
                const userId = document.getElementById('userIdValue')?.textContent;

                if (userId && userId !== 'Loading...' && userId !== 'Not Available' && userId !== 'Input required') {
                    try {
                        await navigator.clipboard.writeText(userId);
                        this.showCopyNotification(copyNotification);
                    } catch (err) {
                        // Fallback for older browsers
                        const textArea = document.createElement('textarea');
                        textArea.value = userId;
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        this.showCopyNotification(copyNotification);
                    }
                }
            });
        }
    }

    showCopyNotification(notificationElement) {
        if (notificationElement) {
            notificationElement.classList.add('show');
            setTimeout(() => {
                notificationElement.classList.remove('show');
            }, 2000);
        }
    }

    refresh() {
        this.loadUserInfo();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.userBadge = new UserBadge();
});

// ADD GLOBAL FUNCTION FOR OTHER SCRIPTS TO USE
function refreshUserBadge() {
    if (window.userBadge) {
        window.userBadge.refresh();
    }
}