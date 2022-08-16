let temp;
chrome.runtime.onMessage.addListener(
    function(message, sender, sendResponse) {
        switch(message.type) {
            case "setState":
                temp = message.active;
                break;
            case "getState":
                sendResponse(temp);
                break;
            default:
                console.error("Unrecognised message: ", message);
        }
    }
);