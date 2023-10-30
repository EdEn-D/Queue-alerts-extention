// const ALERT_SOUND_PATH = 'notification.mp3'; 
const ALERT_SOUND_PATH = chrome.runtime.getURL('notification.mp3');
const DEFAULT_BG_COLOR = 'lightblue';
const TRIGGER_BG_COLOR = 'red';
const ALERT_INTERVAL = 5000;

const TELEGRAM_TOKEN = '6406293699:AAHfs7oIonXCN7WX5ni85FctPlYa0ClGTsA';
const TELEGRAM_CHAT_ID = '-1001998994957';
const TELEGRAM_CHAT_ID_TEST = '-1002107398827';

function sendMessageToTelegramGroup(message) {
    const apiUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

    const payload = {
        chat_id: TELEGRAM_CHAT_ID_TEST,
        text: message
    };

    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.ok) {
            console.log('Message sent successfully:', data.result.text);
        } else {
            console.error('Failed to send message:', data.description);
        }
    })
    .catch(error => {
        console.error('Error sending message:', error);
    });
}

function parseRowToMessage(row) {
    const headers = [
        'שם התור',
        'זמן כניסת שיחה',
        'מספר מחויג',
        'מזהה שיחה',
        'מידע מצורף',
        'זמן המתנה כולל',
        'זמן המתנה בתור'
    ];

    let messageParts = [];

    for (let i = 0; i < headers.length; i++) {
        messageParts.push(`${headers[i]}: ${row[i]}`);
    }

    return messageParts.join('\n');
}

function handleNewCallsNotification(rows){
    for (let row of rows) {
        const message = parseRowToMessage(row);
        sendMessageToTelegramGroup(message);
    }
}

// returns array with each row as an array of data about caller
function parseTableData(data) {
    let tableData = [];
    
    // Get all rows from the table except the header row
    const rows = document.querySelectorAll("#WaitingCallsRealTime table.RealTimeGridStyle tr:not(.RealTimeGridHeaderStyle)");

    rows.forEach(row => {
        let rowData = [];

        // Get all cells from the row
        const cells = row.querySelectorAll("td");
        cells.forEach(cell => {
            rowData.push(cell.textContent.trim());
        });

        tableData.push(rowData);
    });

    return tableData;
}

// returns minutes from each row of callers
function extractMinutesFromData(tableData) {
    let minutesArray = [];

    tableData.forEach(row => {
        const timestamp = row[6]; // Getting the 7th element
        const [hours, minutes, seconds] = timestamp.split(':').map(Number);

        const totalMinutes = hours * 60 + minutes + seconds / 60;
        minutesArray.push(totalMinutes);
    });

    return minutesArray;
}

// returns an array of callers which are exceeding the triger time
function getExeedingCallerList(tableData, minutesToTrigger) {
    let resultRows = [];

    tableData.forEach(row => {
        const timestamp = row[6]; // Assuming the 7th element is the timestamp
        const [hours, minutes, seconds] = timestamp.split(':').map(Number);

        const totalMinutes = hours * 60 + minutes + seconds / 60;

        // Check if the total minutes for this row exceed the minutesToTrigger
        if (totalMinutes > minutesToTrigger) {
            resultRows.push(row); // Push the entire row to the result
        }
    });
    //chrome.storage.sync.set({'currentExceedingCalls': resultRows}); // this shouldn't be done here becasue i want to later compare this iteration with the previous iteration
    return resultRows;
}

// returns true if there is a new caller that enters the exceeding list, then updates current list
function getNewExceedingCalls(currentExceedingCalls, newExeedingCalls) {
    let newCalls = []; // Array to hold new calls
    if (newExeedingCalls.length == 0)
        return newCalls;

    const currentPhoneNumbers = currentExceedingCalls.map(row => row[3]); // Extract phone numbers from current rows
    

    for (let newRow of newExeedingCalls) {
        if (!currentPhoneNumbers.includes(newRow[3])) {
            // If a new phone number is found that wasn't in the previous list
            newCalls.push(newRow);
        }
    }

    // if (newCalls.length > 0) {
    //     // Update the storage if new calls are found
    //     chrome.storage.sync.set({'currentExceedingCalls': newExeedingCalls});
    // }

    return newCalls; // Returns an array of new rows
}

function isTimeExceeded(minutesArray, minutesToTrigger) {
    for (let minutes of minutesArray) {
        if (minutes > minutesToTrigger) {
            return true;
        }
    }
    return false;
}

function handleSound(soundOn, lastPlayedTime){
    const now = Date.now();
    if (soundOn && (now - lastPlayedTime > ALERT_INTERVAL)) {
        const audio = new Audio(ALERT_SOUND_PATH);
        audio.play();

        lastPlayedTime = now;
        chrome.storage.sync.set({ lastPlayedTime: now });
    }
}

// Check what bg color the screen is and flash screen
function flashScreen(){
    if (document.body.style.backgroundColor == DEFAULT_BG_COLOR){
        document.body.style.backgroundColor = TRIGGER_BG_COLOR;
    }
    else{
        document.body.style.backgroundColor = DEFAULT_BG_COLOR;
    }
}

// The main function which orchestrates everything
function main() {
    let lastPlayedTime = 0;  // Default value
    let currentExceedingCalls = []; // To store rows from the last check
    let currColor = DEFAULT_BG_COLOR;

    // Fetch user settings from storage
    chrome.storage.sync.get(['minutesToTrigger', 'isEnabled', 'flashOn','soundOn', 'lastPlayedTime', 'notificationOn', 'currentExceedingCalls'], function(items) {
        lastPlayedTime = items.lastPlayedTime || 0;
        let currentExceedingCalls = items.currentExceedingCalls || [];

        // Only proceed if the feature is enabled
        if (items.isEnabled) {
            const tableData = parseTableData();
            console.log("parseTableData : ");
            console.log(tableData);
            const minutesData = extractMinutesFromData(tableData);
            const deviationTrigger = isTimeExceeded(minutesData, items.minutesToTrigger);
            console.log("extractMinutesFromData");
            console.log(minutesData);
            


            const exeedingCalls = getExeedingCallerList(tableData, items.minutesToTrigger)
            console.log('current exeedingCalls : ');
            console.log(exeedingCalls);
            console.log(currentExceedingCalls);

            const newExeedingCalls = getNewExceedingCalls(currentExceedingCalls, exeedingCalls)
            console.log('newExeedingCalls : ');
            console.log(newExeedingCalls);

            chrome.storage.sync.set({'currentExceedingCalls': exeedingCalls});
            console.log("---")
            // if there are new callers exeeding the time, play sound and notify telegram
            if (newExeedingCalls.length > 0){
                console.log("new client is calling")
                handleSound(items.soundOn, lastPlayedTime); // change to play every time a new caller exeeds
                if (items.notificationOn) {
                    //sendMessageToTelegramGroup('Hello from my Telegram bot!');
                    handleNewCallsNotification(newExeedingCalls);
                }
            }

            // The bg will be red whenever there is at least one caller that is exeeding the time
            if (deviationTrigger) {
                if (items.flashOn){
                    flashScreen()
                }
                else
                {
                    document.body.style.backgroundColor = TRIGGER_BG_COLOR;
                    currColor = TRIGGER_BG_COLOR;
                }
            } else {
                document.body.style.backgroundColor = DEFAULT_BG_COLOR;
                currColor = DEFAULT_BG_COLOR;
            }
            
        } else {
            document.body.style.backgroundColor = DEFAULT_BG_COLOR;
            currColor = DEFAULT_BG_COLOR;
        }

    });
}



// Setting an interval to run the main function every second
setInterval(main, 1000);