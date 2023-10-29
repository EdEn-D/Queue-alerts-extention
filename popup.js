document.addEventListener('DOMContentLoaded', function() {
    // Load saved settings when the popup opens
    chrome.storage.sync.get(['minutesToTrigger', 'isEnabled', 'colorOn', 'soundOn', 'notificationOn'], function(items) {

        document.getElementById('minutesInput').value = items.minutesToTrigger || 10;
        document.getElementById('enableCheckbox').checked = items.isEnabled || false;
        document.getElementById('enableColor').checked = items.colorOn || true;
        document.getElementById('enableSound').checked = items.soundOn || false;
        document.getElementById('enableNotification').checked = items.notificationOn || false; 

    });

    // Save settings when the Save button is clicked
    document.getElementById('saveButton').addEventListener('click', function() {
        const minutes = parseInt(document.getElementById('minutesInput').value, 10);
        const isEnabled = document.getElementById('enableCheckbox').checked;
        const colorOn = document.getElementById('enableColor').checked;
        const soundOn = document.getElementById('enableSound').checked;
        const notificationOn = document.getElementById('enableNotification').checked;  

        chrome.storage.sync.set({
            'minutesToTrigger': minutes,
            'isEnabled': isEnabled,
            'colorOn' : colorOn,
            'soundOn': soundOn,
            'notificationOn': notificationOn  
        }, function() {
            //window.close();  // Close popup after saving
        });
    });

});
