// lib/services/popupService.ts
let isPopupOpen = false;

export const showErrorPopup = (message: string) => {
  if (isPopupOpen) return;
  
  isPopupOpen = true;
  window.Telegram.WebApp.showPopup({
    title: 'Error',
    message,
    buttons: [{ 
      type: 'close',
      text: 'Close',
      onClick: () => {
        isPopupOpen = false;
      }
    }]
  });
};